import { recoverExpiredJobs } from "./processing-maintenance";
import { watermarkInput, type WatermarkInput } from "./watermark";

export type Preview = { kind: "THUMBNAIL" | "SMALL" | "MEDIUM" | "WATERMARKED"; data: Uint8Array; width: number; height: number };
export type Renderer = (bytes: Uint8Array, settings: WatermarkInput) => Promise<Preview[]>;
export type ImageBindings = { DB: D1Database; ASSETS: R2Bucket };

export async function processNextImage({ DB, ASSETS }: ImageBindings, render: Renderer, options: { now?: () => number; leaseMs?: number } = {}) {
  const now = options.now ?? Date.now;
  const leaseMs = options.leaseMs ?? 300_000;
  await recoverExpiredJobs(DB, now());
  // A single conditional write claims the job, including across concurrent processors.
  const job = await DB.prepare(`UPDATE image_processing_jobs SET status='RUNNING', attempts=attempts+1,
    started_at=?,lease_expires_at=?, completed_at=NULL, error_code=NULL WHERE id=(SELECT j.id FROM image_processing_jobs j
    JOIN images i ON i.id=j.image_id WHERE j.status='PENDING' AND j.available_at<=CURRENT_TIMESTAMP
    AND i.status='PROCESSING' ORDER BY j.created_at LIMIT 1) AND status='PENDING'
    RETURNING id, image_id, attempts`).bind(new Date(now()).toISOString(), now() + leaseMs).first<{ id: string; image_id: string; attempts: number }>();
  if (!job) return null;
  const keys: string[] = [];
  const claim = `EXISTS(SELECT 1 FROM image_processing_jobs WHERE id=? AND status='RUNNING' AND attempts=?)`;
  try {
    const original = await DB.prepare(`SELECT a.*, i.photographer_id FROM image_assets a JOIN images i ON i.id=a.image_id
      WHERE a.image_id=? AND a.kind='ORIGINAL' AND a.is_private=1 AND i.status='PROCESSING'`).bind(job.image_id)
      .first<{ object_key: string; photographer_id: string; mime_type: string; bytes: number }>();
    if (!original || !original.object_key.startsWith(`originals/${original.photographer_id}/${job.image_id}/`)) throw new Error("INVALID_ORIGINAL");
    const object = await ASSETS.get(original.object_key);
    if (!object || object.size !== original.bytes) throw new Error("MISSING_ORIGINAL");
    const stored = await DB.prepare("SELECT * FROM watermark_settings WHERE image_id=?").bind(job.image_id)
      .first<{ mode: string; text: string | null; opacity_percent: number; size_percent: number; position: string }>();
    const settings = watermarkInput.parse(stored ? {
      watermarkMode: stored.mode, watermarkText: stored.text ?? "", opacityPercent: stored.opacity_percent,
      sizePercent: stored.size_percent, position: stored.position,
    } : { watermarkMode: "PLATFORM" });
    const previews = await render(new Uint8Array(await object.arrayBuffer()), settings);
    if (previews.length !== 4 || new Set(previews.map(p => p.kind)).size !== 4 ||
      !["THUMBNAIL", "SMALL", "MEDIUM", "WATERMARKED"].every(kind => previews.some(p => p.kind === kind))) throw new Error("INCOMPLETE_PREVIEWS");
    const statements: D1PreparedStatement[] = [];
    for (const preview of previews) {
      const bytes = preview.data;
      if (bytes.length < 12 || String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
        String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP" || preview.width < 1 || preview.height < 1 ||
        preview.width > 1800 || preview.height > 1800) throw new Error("INVALID_PREVIEW");
      const key = `derived/${original.photographer_id}/${job.image_id}/${job.id}-${job.attempts}/${preview.kind.toLowerCase()}.webp`;
      keys.push(key);
      await ASSETS.put(key, bytes, { httpMetadata: { contentType: "image/webp" }, customMetadata: { imageId: job.image_id, protected: "true" } });
      const written = await ASSETS.head(key);
      if (!written || written.size !== bytes.length) throw new Error("PREVIEW_WRITE_FAILED");
      statements.push(DB.prepare(`INSERT INTO image_assets (id,image_id,kind,object_key,mime_type,bytes,width,height,is_private)
        SELECT ?,?,?,?,'image/webp',?,?,?,1 WHERE ${claim}
        ON CONFLICT(image_id,kind) DO UPDATE SET object_key=excluded.object_key,mime_type=excluded.mime_type,
        bytes=excluded.bytes,width=excluded.width,height=excluded.height,is_private=1`)
        .bind(crypto.randomUUID(), job.image_id, preview.kind, key, bytes.length, preview.width, preview.height, job.id, job.attempts));
    }
    statements.push(DB.prepare(`UPDATE images SET status='READY',updated_at=? WHERE id=? AND status='PROCESSING'
      AND ${claim} AND (SELECT count(*) FROM image_assets WHERE image_id=? AND kind IN
      ('THUMBNAIL','SMALL','MEDIUM','WATERMARKED') AND mime_type='image/webp' AND is_private=1)=4`)
      .bind(new Date().toISOString(), job.image_id, job.id, job.attempts, job.image_id));
    statements.push(DB.prepare(`UPDATE image_processing_jobs SET status='SUCCEEDED',lease_expires_at=NULL,consecutive_failures=0,completed_at=?
      WHERE id=? AND status='RUNNING' AND attempts=? AND changes()=1`).bind(new Date().toISOString(), job.id, job.attempts));
    const result = await DB.batch(statements);
    if (result.at(-1)?.meta.changes !== 1) throw new Error("STALE_PROCESSING_JOB");
    return { imageId: job.image_id, status: "READY" as const };
  } catch (error) {
    // Never send decoder errors or object keys to a browser.
    console.error("image_processing_failed", { imageId: job.image_id, error });
    const failed = await DB.batch([
      DB.prepare(`UPDATE images SET status='ERROR',updated_at=? WHERE id=? AND status='PROCESSING' AND ${claim}`)
        .bind(new Date().toISOString(), job.image_id, job.id, job.attempts),
      DB.prepare("UPDATE image_processing_jobs SET status='FAILED',lease_expires_at=NULL,consecutive_failures=consecutive_failures+1,error_code='PROCESSING_FAILED',completed_at=? WHERE id=? AND status='RUNNING' AND attempts=?")
        .bind(new Date().toISOString(), job.id, job.attempts),
    ]);
    if (failed[1].meta.changes !== 1) {
      // The commit may have succeeded before its acknowledgement was lost.
      const persisted = await DB.prepare("SELECT status,attempts FROM image_processing_jobs WHERE id=?")
        .bind(job.id).first<{ status: string; attempts: number }>();
      if (persisted?.status === "SUCCEEDED" && persisted.attempts === job.attempts) {
        return { imageId: job.image_id, status: "READY" as const };
      }
      if (!persisted) throw new Error("PROCESSING_OUTCOME_UNCONFIRMED", { cause: error });
      // Recovery fenced this attempt. Its unique keys cannot be used by the successor.
      await discardUnreferencedKeys(DB, ASSETS, keys);
      return { imageId: job.image_id, status: "SUPERSEDED" as const };
    }
    await discardUnreferencedKeys(DB, ASSETS, keys);
    return { imageId: job.image_id, status: "ERROR" as const };
  }
}

async function discardUnreferencedKeys(DB: D1Database, ASSETS: R2Bucket, keys: string[]) {
  await Promise.allSettled(keys.map(async key => {
    const referenced = await DB.prepare("SELECT id FROM image_assets WHERE object_key=? LIMIT 1").bind(key).first();
    if (!referenced) await ASSETS.delete(key);
  }));
}

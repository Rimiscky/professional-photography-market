import { imageMetadataInput } from "./metadata-schema";
import type { z } from "zod";

export async function saveOwnedMetadata(DB: D1Database, id: string, userId: string, data: z.infer<typeof imageMetadataInput>) {
  const now = new Date().toISOString();
  // D1 batch is transactional. changes() propagates the authorization/lock result.
  const result = await DB.batch([
    DB.prepare(`UPDATE images SET title=?,description=?,alt_text=?,category=?,copyright_owner=?,status='PROCESSING',updated_at=?
      WHERE id=? AND photographer_id IN (SELECT id FROM photographer_profiles WHERE user_id=?)
      AND status IN ('DRAFT','PROCESSING','READY','UNPUBLISHED','REJECTED','ERROR')
      AND NOT EXISTS(SELECT 1 FROM image_processing_jobs WHERE image_id=? AND status='RUNNING')`)
      .bind(data.title, data.description, data.altText, data.category, data.copyrightOwner, now, id, userId, id),
    DB.prepare(`INSERT INTO watermark_settings (image_id,mode,text,opacity_percent,size_percent,position,updated_at)
      SELECT ?,?,?,?,?,?,? WHERE changes()=1 ON CONFLICT(image_id) DO UPDATE SET mode=excluded.mode,text=excluded.text,
      opacity_percent=excluded.opacity_percent,size_percent=excluded.size_percent,position=excluded.position,updated_at=excluded.updated_at`)
      .bind(id, data.watermarkMode, data.watermarkText, data.opacityPercent, data.sizePercent, data.position, now),
    DB.prepare(`INSERT INTO image_processing_jobs (id,image_id,status) SELECT ?,?,'PENDING' WHERE changes()=1
      ON CONFLICT(image_id) DO UPDATE SET status='PENDING',available_at=CURRENT_TIMESTAMP,error_code=NULL,started_at=NULL,completed_at=NULL,lease_expires_at=NULL,consecutive_failures=0`)
      .bind(crypto.randomUUID(), id),
    DB.prepare("DELETE FROM image_assets WHERE image_id=? AND kind!='ORIGINAL' AND changes()=1").bind(id),
  ]);
  return result[0].meta.changes === 1;
}

export async function publishOwnedImage(DB: D1Database, id: string, userId: string) {
  const now = new Date().toISOString();
  const result = await DB.batch([
    DB.prepare(`UPDATE images SET status='PUBLISHED',published_at=?,updated_at=? WHERE id=? AND status IN ('READY','UNPUBLISHED')
      AND photographer_id IN (SELECT id FROM photographer_profiles WHERE user_id=?)
      AND length(trim(description))>0 AND length(trim(alt_text))>=5 AND length(trim(category))>0
      AND length(trim(copyright_owner))>=2 AND rights_confirmed_at IS NOT NULL
      AND EXISTS(SELECT 1 FROM image_processing_jobs WHERE image_id=images.id AND status='SUCCEEDED')
      AND EXISTS(SELECT 1 FROM image_assets WHERE image_id=images.id AND kind='ORIGINAL' AND is_private=1)
      AND EXISTS(SELECT 1 FROM image_assets WHERE image_id=images.id AND kind='WATERMARKED'
      AND mime_type='image/webp' AND is_private=1 AND bytes>0 AND object_key LIKE 'derived/%')`)
      .bind(now, now, id, userId),
    DB.prepare(`INSERT INTO audit_logs (id,actor_user_id,action,target_type,target_id)
      SELECT ?,?,'image.published','image',? WHERE changes()=1`).bind(crypto.randomUUID(), userId, id),
  ]);
  return result[0].meta.changes === 1;
}

export async function retryOwnedImage(DB: D1Database, id: string, userId: string) {
  const result = await DB.batch([
    DB.prepare(`UPDATE images SET status='PROCESSING',updated_at=? WHERE id=? AND status='ERROR'
      AND photographer_id IN (SELECT id FROM photographer_profiles WHERE user_id=?)
      AND EXISTS(SELECT 1 FROM image_processing_jobs WHERE image_id=? AND status='FAILED' AND consecutive_failures<3)`)
      .bind(new Date().toISOString(), id, userId, id),
    DB.prepare(`UPDATE image_processing_jobs SET status='PENDING',available_at=CURRENT_TIMESTAMP,error_code=NULL
      WHERE image_id=? AND changes()=1`).bind(id),
  ]);
  return result[0].meta.changes === 1;
}

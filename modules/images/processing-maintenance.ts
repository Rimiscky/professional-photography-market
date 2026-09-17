import type { ImageBindings } from "./processing";

export async function recoverExpiredJobs(DB: D1Database, now = Date.now()) {
  // D1 batch prevents a stale consumer finalizing between the two state changes.
  const expired = "status='RUNNING' AND (lease_expires_at IS NULL OR lease_expires_at<=?)";
  await DB.batch([
    DB.prepare(`UPDATE images SET status='ERROR',updated_at=? WHERE status='PROCESSING'
      AND id IN (SELECT image_id FROM image_processing_jobs WHERE ${expired} AND consecutive_failures>=2)`)
      .bind(new Date(now).toISOString(), now),
    DB.prepare(`UPDATE image_processing_jobs SET status=CASE WHEN consecutive_failures>=2 THEN 'FAILED' ELSE 'PENDING' END,
      consecutive_failures=consecutive_failures+1,error_code='LEASE_EXPIRED',lease_expires_at=NULL,available_at=CURRENT_TIMESTAMP
      WHERE ${expired}`).bind(now),
  ]);
}

export async function cleanupDerivedObjects({DB,ASSETS}:ImageBindings, options:{now?:number;cursor?:string}={}) {
  const now=options.now??Date.now();
  const page=await ASSETS.list({prefix:"derived/",limit:1000,...(options.cursor?{cursor:options.cursor}:{})});
  let deleted=0;
  for(const object of page.objects){
    if(now-object.uploaded.getTime()<15*60_000)continue;
    const key=object.key.match(/^derived\/([^/]+)\/([^/]+)\/([^/]+)-(\d+)\/(thumbnail|small|medium|watermarked)\.webp$/);
    if(!key)continue;
    const protectedObject=await DB.prepare(`SELECT 1 AS protected FROM image_assets WHERE object_key=?
      UNION ALL SELECT 1 FROM image_processing_jobs WHERE image_id=? AND status='RUNNING' LIMIT 1`)
      .bind(object.key,key[2]).first();
    if(protectedObject)continue;
    // Attempts have unique monotonically increasing keys. Old unreferenced keys are never reused.
    await ASSETS.delete(object.key);deleted++;
  }
  return {deleted,cursor:page.truncated?page.cursor:undefined};
}

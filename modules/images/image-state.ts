import type { ImageStatus } from "./status-machine";

export type ImageState={status:ImageStatus;updatedAt:string;previewVersion:string|null;retryable:boolean};
export async function readOwnedImageState(DB:D1Database,id:string,userId:string):Promise<ImageState|null>{
  const row=await DB.prepare(`SELECT i.status,i.updated_at,a.id AS preview_version,j.status AS job_status,j.consecutive_failures
    FROM images i JOIN photographer_profiles p ON p.id=i.photographer_id
    LEFT JOIN image_processing_jobs j ON j.image_id=i.id
    LEFT JOIN image_assets a ON a.image_id=i.id AND a.kind='WATERMARKED'
    WHERE i.id=? AND p.user_id=?`).bind(id,userId)
    .first<{status:ImageStatus;updated_at:string;preview_version:string|null;job_status:string|null;consecutive_failures:number|null}>();
  if(!row)return null;
  return {status:row.status,updatedAt:row.updated_at,previewVersion:row.preview_version,
    retryable:row.status==="ERROR"&&row.job_status==="FAILED"&&(row.consecutive_failures??3)<3};
}

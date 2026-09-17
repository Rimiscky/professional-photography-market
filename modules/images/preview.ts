import type { ImageBindings } from "./processing";

export async function protectedPreview({ DB, ASSETS }: ImageBindings, id: string, userId: string | null) {
  // No key is accepted from the request. Originals are never selected here.
  const row = await DB.prepare(`SELECT a.object_key,a.bytes,i.photographer_id FROM image_assets a
    JOIN images i ON i.id=a.image_id JOIN photographer_profiles p ON p.id=i.photographer_id
    JOIN image_processing_jobs j ON j.image_id=i.id
    WHERE i.id=? AND a.kind='WATERMARKED' AND a.mime_type='image/webp' AND a.is_private=1
    AND j.status='SUCCEEDED' AND (i.status='PUBLISHED' OR (p.user_id=? AND i.status IN ('READY','UNPUBLISHED')))`)
    .bind(id, userId).first<{object_key:string;bytes:number;photographer_id:string}>();
  if (!row || !row.object_key.startsWith(`derived/${row.photographer_id}/${id}/`) || !row.object_key.endsWith("/watermarked.webp")) {
    return new Response(null,{status:404,headers:{"Cache-Control":"private, no-store"}});
  }
  const object = await ASSETS.get(row.object_key);
  if (!object || object.size !== row.bytes || object.httpMetadata?.contentType !== "image/webp" ||
    object.customMetadata?.protected !== "true" || object.customMetadata?.imageId !== id) {
    return new Response(null,{status:404,headers:{"Cache-Control":"private, no-store"}});
  }
  return new Response(object.body,{headers:{
    "Content-Type":"image/webp", "Content-Length":String(object.size),
    "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff",
    "Content-Disposition":'inline; filename="preview.webp"',
  }});
}

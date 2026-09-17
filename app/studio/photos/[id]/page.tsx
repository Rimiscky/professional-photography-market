import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { images, photographerProfiles, watermarkSettings } from "../../../../db/schema";
import { ImageMetadataEditor } from "../../../../components/images/image-metadata-editor";

export const dynamic="force-dynamic";
export default async function ImageEditPage({params}:{params:Promise<{id:string}>}){const user=await requireChatGPTUser("/studio/photos");const {id}=await params;const db=getDb();const rows=await db.select({image:images,watermark:watermarkSettings}).from(images).innerJoin(photographerProfiles,eq(images.photographerId,photographerProfiles.id)).leftJoin(watermarkSettings,eq(watermarkSettings.imageId,images.id)).where(and(eq(images.id,id),eq(photographerProfiles.userId,user.userId))).limit(1);if(!rows[0])notFound();return <ImageMetadataEditor image={rows[0].image} watermark={rows[0].watermark}/>}

import { businessRules } from "../../../../lib/config";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { imageAssets, imageProcessingJobs, images, photographerProfiles } from "../../../../db/schema";
import { friendlyUploadError, validateImageFile } from "../../../../modules/images/file-validation";

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Vous devez être connecté." }, { status: 401 });
  if (!env.ASSETS) return Response.json({ error: "Le stockage est momentanément indisponible." }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const rightsConfirmed = form.get("rightsConfirmed") === "true";
    if (!(file instanceof File)) return Response.json({ error: "Sélectionnez une image." }, { status: 400 });
    if (title.length < 2 || title.length > 120) return Response.json({ error: "Le titre doit contenir entre 2 et 120 caractères." }, { status: 400 });
    if (!rightsConfirmed) return Response.json({ error: "Vous devez confirmer que vous détenez les droits nécessaires." }, { status: 400 });

    if (file.size > businessRules.maximumUploadBytes) throw new Error("FILE_TOO_LARGE");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validated = validateImageFile(bytes, file.type);
    const suppliedExtension = file.name.split(".").pop()?.toLowerCase();
    const acceptedExtensions = validated.extension === "jpg" ? ["jpg", "jpeg"] : [validated.extension];
    if (!suppliedExtension || !acceptedExtensions.includes(suppliedExtension)) throw new Error("INVALID_FILE_SIGNATURE");

    const db = getDb();
    const profile = await db.select({ id: photographerProfiles.id, displayName: photographerProfiles.displayName })
      .from(photographerProfiles).where(eq(photographerProfiles.userId, identity.userId)).limit(1);
    if (!profile[0]) return Response.json({ error: "Terminez d’abord la configuration de votre profil photographe." }, { status: 409 });

    const imageId = crypto.randomUUID();
    const assetId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const objectKey = `originals/${profile[0].id}/${imageId}/original.${validated.extension}`;
    const slugBase = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "photo";

    await env.ASSETS.put(objectKey, bytes, { httpMetadata: { contentType: validated.mimeType }, customMetadata: { imageId, ownerId: profile[0].id, visibility: "private" } });
    try {
      await db.batch([
        db.insert(images).values({ id:imageId, photographerId:profile[0].id, title, slug:`${slugBase}-${imageId.slice(0,8)}`, status:"PROCESSING", orientation:orientation(validated.width,validated.height), width:validated.width, height:validated.height, copyrightOwner:profile[0].displayName, rightsConfirmedAt:new Date().toISOString() }),
        db.insert(imageAssets).values({ id:assetId, imageId, kind:"ORIGINAL", objectKey, mimeType:validated.mimeType, bytes:bytes.byteLength, width:validated.width, height:validated.height, isPrivate:true }),
        db.insert(imageProcessingJobs).values({ id:jobId, imageId, status:"PENDING" }),
      ]);
    } catch (dbError) {
      await env.ASSETS.delete(objectKey);
      throw dbError;
    }
    return Response.json({ ok:true, imageId, status:"PROCESSING", message:"Image importée. La génération des aperçus va commencer." }, { status:201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : error;
    console.error("image_upload_failed", { userId: identity.userId, code });
    return Response.json({ error: friendlyUploadError(code) }, { status: 400 });
  }
}

function orientation(width:number,height:number):"LANDSCAPE"|"PORTRAIT"|"SQUARE"|"PANORAMIC" { const ratio=width/height; if(ratio>2)return "PANORAMIC";if(ratio>1.05)return "LANDSCAPE";if(ratio<0.95)return "PORTRAIT";return "SQUARE"; }

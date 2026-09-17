import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { imageMetadataInput } from "../../../../modules/images/metadata-schema";
import { publishOwnedImage, retryOwnedImage, saveOwnedMetadata, unpublishOwnedImage } from "../../../../modules/images/manage";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Vous devez être connecté." }, { status: 401 });
  if (!env.DB) return Response.json({ error: "Service indisponible." }, { status: 503 });
  const { id } = await params;
  const parsed = imageMetadataInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Informations invalides." }, { status: 400 });
  try {
    const saved = await saveOwnedMetadata(env.DB, id, user.userId, parsed.data);
    if (!saved) return Response.json({ error: "Photographie indisponible ou traitement en cours. Réessayez après le traitement." }, { status: 409 });
    return Response.json({ ok: true, status: "PROCESSING" });
  } catch (error) {
    console.error("image_metadata_update_failed", { imageId: id, error });
    return Response.json({ error: "Impossible d’enregistrer les informations." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Vous devez être connecté." }, { status: 401 });
  if (!env.DB) return Response.json({ error: "Service indisponible." }, { status: 503 });
  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (body?.action !== "publish" && body?.action !== "retry" && body?.action !== "unpublish") return Response.json({ error: "Action inconnue." }, { status: 400 });
  const { id } = await params;
  try {
    const ok = body.action === "publish" ? await publishOwnedImage(env.DB, id, user.userId) : body.action === "unpublish" ? await unpublishOwnedImage(env.DB, id, user.userId) : await retryOwnedImage(env.DB, id, user.userId);
    if (!ok) return Response.json({ error: "Action impossible : vérifiez l’état, les métadonnées et l’aperçu protégé." }, { status: 409 });
    return Response.json({ ok: true, status: body.action === "publish" ? "PUBLISHED" : body.action === "unpublish" ? "UNPUBLISHED" : "PROCESSING" });
  } catch (error) {
    console.error("image_action_failed", { imageId: id, error });
    return Response.json({ error: "Action momentanément indisponible." }, { status: 500 });
  }
}

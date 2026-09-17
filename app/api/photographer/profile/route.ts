import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { photographerProfiles, users } from "../../../../db/schema";
import { photographerProfileInput } from "../../../../modules/photographers/profile-schema";

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Vous devez être connecté." }, { status: 401 });

  const parsed = photographerProfileInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Informations invalides." }, { status: 400 });

  try {
    const db = getDb();
    const now = new Date().toISOString();
    await db.insert(users).values({ id: identity.userId, email: identity.email, firstName: identity.fullName, updatedAt: now })
      .onConflictDoUpdate({ target: users.id, set: { email: identity.email, firstName: identity.fullName, updatedAt: now } });

    const current = await db.select({ id: photographerProfiles.id }).from(photographerProfiles).where(eq(photographerProfiles.userId, identity.userId)).limit(1);
    if (current[0]) {
      await db.update(photographerProfiles).set({ ...parsed.data, onboardingStep: 5, updatedAt: now }).where(eq(photographerProfiles.id, current[0].id));
    } else {
      await db.insert(photographerProfiles).values({ id: crypto.randomUUID(), userId: identity.userId, ...parsed.data, onboardingStep: 5 });
    }
    return Response.json({ ok: true, username: parsed.data.username });
  } catch (error) {
    console.error("photographer_profile_save_failed", { userId: identity.userId, error });
    return Response.json({ error: "Impossible d’enregistrer le profil. Vérifiez notamment que le nom d’utilisateur est disponible." }, { status: 500 });
  }
}

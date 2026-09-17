import { z } from "zod";

export const photographerProfileInput = z.object({
  displayName: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{2,29}$/, "Utilisez 3 à 30 lettres, chiffres, tirets ou underscores."),
  bio: z.string().trim().max(600).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  websiteUrl: z.union([z.literal(""), z.string().url("L’adresse du site est invalide.")]).default(""),
});

export type PhotographerProfileInput = z.infer<typeof photographerProfileInput>;

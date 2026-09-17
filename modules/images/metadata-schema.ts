import { z } from "zod";

export const imageMetadataInput = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1200).default(""),
  altText: z.string().trim().min(5, "Décrivez brièvement l’image pour l’accessibilité.").max(240),
  category: z.enum(["Portrait", "Mariage", "Événement", "Mode", "Architecture", "Voyage", "Nature", "Street Photography", "Concert", "Corporate", "Culture"]),
  copyrightOwner: z.string().trim().min(2).max(120),
  watermarkMode: z.enum(["NONE", "PLATFORM", "CUSTOM"]),
  watermarkText: z.string().trim().max(80).default(""),
  opacityPercent: z.coerce.number().int().min(5).max(80),
  position: z.enum(["CENTER", "TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT", "REPEATED"]),
});

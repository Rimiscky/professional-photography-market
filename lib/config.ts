export const branding = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Objectif",
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "Nom légal à définir",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com",
} as const;

export const businessRules = {
  currency: "EUR", commissionBasisPoints: 1500, minimumPriceMinor: 500,
  maximumUploadBytes: 15 * 1024 * 1024, signedDownloadTtlSeconds: 300,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export function calculateAllocation(grossMinor: number, commissionBasisPoints = businessRules.commissionBasisPoints) {
  if (!Number.isInteger(grossMinor) || grossMinor < 0) throw new Error("Le montant brut doit être un entier positif.");
  if (!Number.isInteger(commissionBasisPoints) || commissionBasisPoints < 0 || commissionBasisPoints > 10_000) throw new Error("Le taux de commission est invalide.");
  const platformFeeMinor = Math.round((grossMinor * commissionBasisPoints) / 10_000);
  return { grossMinor, platformFeeMinor, sellerNetMinor: grossMinor - platformFeeMinor };
}

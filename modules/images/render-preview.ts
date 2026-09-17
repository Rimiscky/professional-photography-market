// Node-only processor. Never import this module in a Cloudflare route.
import sharp from "sharp";
import { watermarkSvg, type WatermarkInput } from "./watermark";
import { businessRules, branding } from "../../lib/config";

sharp.concurrency(1);
sharp.cache({ memory: 32, files: 0, items: 32 });

export async function renderProtectedPreviews(original: Uint8Array, watermark: WatermarkInput) {
  if (!original.length || original.length > businessRules.maximumUploadBytes) throw new Error("INVALID_ORIGINAL_SIZE");
  const options = { limitInputPixels: businessRules.maximumInputPixels, failOn: "warning" as const };
  const metadata = await sharp(original, options).metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error("UNSUPPORTED_ORIGINAL");
  const results = [];
  for (const [kind, maximum] of [["THUMBNAIL", 400], ["SMALL", 800], ["MEDIUM", 1200], ["WATERMARKED", 1800]] as const) {
    // Rotation is applied before stripping EXIF. No metadata is copied to outputs.
    const resized = await sharp(original, options).rotate().resize({ width: maximum, height: maximum, fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
    const { data, info } = await sharp(resized.data).composite([{ input: Buffer.from(watermarkSvg(resized.info.width, resized.info.height, watermark, branding.name)) }]).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const check = await sharp(data).metadata();
    if (check.format !== "webp" || check.exif || check.xmp || check.iptc) throw new Error("INVALID_PREVIEW");
    results.push({ kind, data, width: info.width, height: info.height });
  }
  return results;
}

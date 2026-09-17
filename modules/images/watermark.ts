import { z } from "zod";

export const watermarkInput = z.object({
  watermarkMode: z.enum(["PLATFORM", "CUSTOM"]),
  watermarkText: z.string().trim().max(80).default(""),
  opacityPercent: z.coerce.number().int().min(15).max(80).default(28),
  sizePercent: z.coerce.number().int().min(15).max(60).default(22),
  position: z.enum(["CENTER", "TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT", "REPEATED"]).default("CENTER"),
}).superRefine((value, ctx) => {
  if (value.watermarkMode === "CUSTOM" && !value.watermarkText) {
    ctx.addIssue({ code: "custom", path: ["watermarkText"], message: "Saisissez le texte du filigrane personnalisé." });
  }
});
export type WatermarkInput = z.infer<typeof watermarkInput>;

function escapeXml(text: string) {
  return text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
}

export function watermarkSvg(width: number, height: number, input: WatermarkInput, platformName: string) {
  const settings = watermarkInput.parse(input);
  const rawText = settings.watermarkMode === "CUSTOM" ? settings.watermarkText : platformName;
  const text = escapeXml(rawText);
  const labelWidth = Math.round(width * settings.sizePercent / 100);
  const fontSize = Math.max(10, Math.min(height / 8, labelWidth / Math.max(4, [...rawText].length) * 1.5));
  const margin = Math.max(12, Math.round(width * .03));
  const x = settings.position.endsWith("LEFT") ? margin + labelWidth / 2 : settings.position.endsWith("RIGHT") ? width - margin - labelWidth / 2 : width / 2;
  const y = settings.position.startsWith("TOP") ? margin + fontSize : settings.position.startsWith("BOTTOM") ? height - margin : height / 2;
  const label = (x: number, y: number) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" textLength="${labelWidth}" lengthAdjust="spacingAndGlyphs" fill="white" stroke="black" stroke-width="${Math.max(.5, fontSize / 28)}" paint-order="stroke">${text}</text>`;
  const labels = settings.position === "REPEATED"
    ? [.2, .5, .8].flatMap(y => [.2, .5, .8].map(x => label(width * x, height * y))).join("")
    : label(x, y);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g opacity="${settings.opacityPercent / 100}">${labels}</g></svg>`;
}

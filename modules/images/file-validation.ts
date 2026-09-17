import { businessRules } from "../../lib/config";

export type ValidatedImage = { mimeType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp"; width: number; height: number };

export function validateImageFile(bytes: Uint8Array, declaredType: string): ValidatedImage {
  if (bytes.byteLength === 0) throw new Error("EMPTY_FILE");
  if (bytes.byteLength > businessRules.maximumUploadBytes) throw new Error("FILE_TOO_LARGE");

  const detected = detectFormat(bytes);
  if (!detected || detected.mimeType !== declaredType) throw new Error("INVALID_FILE_SIGNATURE");
  if (!businessRules.allowedMimeTypes.includes(detected.mimeType)) throw new Error("UNSUPPORTED_FORMAT");
  if (detected.width < 640 || detected.height < 640) throw new Error("DIMENSIONS_TOO_SMALL");
  if (detected.width > 30_000 || detected.height > 30_000 || detected.width * detected.height > 180_000_000) throw new Error("DIMENSIONS_TOO_LARGE");
  return detected;
}

function detectFormat(bytes: Uint8Array): ValidatedImage | null {
  if (isPng(bytes)) return parsePng(bytes);
  if (isJpeg(bytes)) return parseJpeg(bytes);
  if (isWebp(bytes)) return parseWebp(bytes);
  return null;
}

const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);
function isPng(b: Uint8Array) { return b.length >= 24 && [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v); }
function parsePng(b: Uint8Array): ValidatedImage { const v=view(b); return { mimeType:"image/png", extension:"png", width:v.getUint32(16), height:v.getUint32(20) }; }
function isJpeg(b: Uint8Array) { return b.length >= 4 && b[0]===0xff && b[1]===0xd8 && b[b.length-2]===0xff && b[b.length-1]===0xd9; }
function parseJpeg(b: Uint8Array): ValidatedImage | null { const v=view(b); let offset=2; while(offset+9<b.length){ if(b[offset]!==0xff){offset++;continue} const marker=b[offset+1]; if(marker===0xd8||marker===0xd9){offset+=2;continue} const length=v.getUint16(offset+2); if(length<2||offset+length+2>b.length) break; if((marker>=0xc0&&marker<=0xc3)||(marker>=0xc5&&marker<=0xc7)||(marker>=0xc9&&marker<=0xcb)||(marker>=0xcd&&marker<=0xcf)) return {mimeType:"image/jpeg",extension:"jpg",height:v.getUint16(offset+5),width:v.getUint16(offset+7)}; offset+=2+length; } return null; }
function isWebp(b: Uint8Array) { return b.length>=30 && String.fromCharCode(...b.slice(0,4))==="RIFF" && String.fromCharCode(...b.slice(8,12))==="WEBP"; }
function parseWebp(b: Uint8Array): ValidatedImage | null { const kind=String.fromCharCode(...b.slice(12,16)); if(kind==="VP8X"){const width=1+b[24]+(b[25]<<8)+(b[26]<<16);const height=1+b[27]+(b[28]<<8)+(b[29]<<16);return {mimeType:"image/webp",extension:"webp",width,height}} return null; }

export function friendlyUploadError(code: unknown) {
  const messages: Record<string,string> = { EMPTY_FILE:"Le fichier est vide.", FILE_TOO_LARGE:"L’image dépasse la taille maximale de 15 Mo.", INVALID_FILE_SIGNATURE:"Le contenu du fichier ne correspond pas à son format.", UNSUPPORTED_FORMAT:"Ce format n’est pas accepté.", DIMENSIONS_TOO_SMALL:"L’image doit mesurer au moins 640 × 640 px.", DIMENSIONS_TOO_LARGE:"Les dimensions de cette image sont trop importantes." };
  return messages[String(code)] ?? "Impossible d’importer cette image.";
}

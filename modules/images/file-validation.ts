import { businessRules } from "../../lib/config";

export type ValidatedImage = { mimeType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp"; width: number; height: number };

export function validateImageFile(bytes: Uint8Array, declaredType: string): ValidatedImage {
  if (bytes.byteLength === 0) throw new Error("EMPTY_FILE");
  if (bytes.byteLength > businessRules.maximumUploadBytes) throw new Error("FILE_TOO_LARGE");

  const detected = detectFormat(bytes);
  if (!detected || detected.mimeType !== declaredType) throw new Error("INVALID_FILE_SIGNATURE");
  if (!businessRules.allowedMimeTypes.includes(detected.mimeType)) throw new Error("UNSUPPORTED_FORMAT");
  if (detected.width < 640 || detected.height < 640) throw new Error("DIMENSIONS_TOO_SMALL");
  if (detected.width > 30_000 || detected.height > 30_000 || detected.width * detected.height > businessRules.maximumInputPixels) throw new Error("DIMENSIONS_TOO_LARGE");
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
function isWebp(b: Uint8Array) { return b.length>=12 && fourCC(b,0)==="RIFF" && fourCC(b,8)==="WEBP"; }
function fourCC(bytes:Uint8Array,offset:number){return String.fromCharCode(...bytes.slice(offset,offset+4));}

// RIFF bounds, VP8 key-frame headers and VP8L dimensions follow the WebP container specification.
// https://developers.google.com/speed/webp/docs/riff_container
function parseWebp(b: Uint8Array): ValidatedImage | null {
  const v=view(b);
  if(v.getUint32(4,true)+8!==b.length || b.length%2!==0)return null;
  let canvas:{width:number;height:number}|null=null;
  let frame:{width:number;height:number}|null=null;
  let offset=12;
  while(offset<b.length){
    if(offset+8>b.length)return null;
    const kind=fourCC(b,offset),length=v.getUint32(offset+4,true),data=offset+8;
    const end=data+length,padded=end+(length%2);
    if(padded>b.length || (length%2 && b[end]!==0))return null;
    if(offset===12 && !["VP8 ","VP8L","VP8X"].includes(kind))return null;
    if(kind==="VP8X"){
      if(offset!==12 || length!==10 || (b[data]&0xc1)!==0 || b[data+1] || b[data+2] || b[data+3])return null;
      if(b[data]&2)throw new Error("ANIMATED_IMAGE");
      canvas={width:1+b[data+4]+(b[data+5]<<8)+(b[data+6]<<16),height:1+b[data+7]+(b[data+8]<<8)+(b[data+9]<<16)};
    }else if(kind==="VP8 "){
      if(frame || length<10 || (b[data]&1)!==0 || b[data+3]!==0x9d || b[data+4]!==1 || b[data+5]!==0x2a)return null;
      frame={width:v.getUint16(data+6,true)&0x3fff,height:v.getUint16(data+8,true)&0x3fff};
    }else if(kind==="VP8L"){
      if(frame || length<5 || b[data]!==0x2f)return null;
      const bits=v.getUint32(data+1,true);
      if(bits>>>29)return null;
      frame={width:1+(bits&0x3fff),height:1+((bits>>>14)&0x3fff)};
    }else if(kind==="ANIM" || kind==="ANMF")throw new Error("ANIMATED_IMAGE");
    offset=padded;
  }
  if(!frame || (canvas && (canvas.width!==frame.width || canvas.height!==frame.height)))return null;
  return {mimeType:"image/webp",extension:"webp",...frame};
}

export function friendlyUploadError(code: unknown) {
  const messages: Record<string,string> = { ANIMATED_IMAGE:"Les images animées ne sont pas acceptées.", EMPTY_FILE:"Le fichier est vide.", FILE_TOO_LARGE:"L’image dépasse la taille maximale de 15 Mo.", INVALID_FILE_SIGNATURE:"Le contenu du fichier ne correspond pas à son format.", UNSUPPORTED_FORMAT:"Ce format n’est pas accepté.", DIMENSIONS_TOO_SMALL:"L’image doit mesurer au moins 640 × 640 px.", DIMENSIONS_TOO_LARGE:"Les dimensions de cette image sont trop importantes." };
  return messages[String(code)] ?? "Impossible d’importer cette image.";
}

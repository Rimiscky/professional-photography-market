import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { validateImageFile } from "../modules/images/file-validation";
import { renderProtectedPreviews } from "../modules/images/render-preview";
import { watermarkInput } from "../modules/images/watermark";

const source=()=>sharp({create:{width:900,height:700,channels:3,background:"#365e78"}});
test("real VP8, VP8L and VP8X imports decode and produce protected previews",async()=>{
  const fixtures=[await source().webp().toBuffer(),await source().webp({lossless:true}).toBuffer(),await source().withExif({IFD0:{Copyright:"Private"}}).webp().toBuffer()];
  assert.deepEqual(fixtures.map(b=>b.subarray(12,16).toString()),["VP8 ","VP8L","VP8X"]);
  for(const bytes of fixtures){
    assert.deepEqual(validateImageFile(bytes,"image/webp"),{mimeType:"image/webp",extension:"webp",width:900,height:700});
    assert.equal((await renderProtectedPreviews(bytes,watermarkInput.parse({watermarkMode:"PLATFORM"}))).length,4);
  }
});
test("WebP rejects truncated chunks, mismatched dimensions and animated files",async()=>{
  const valid=await source().withExif({IFD0:{Copyright:"Private"}}).webp().toBuffer();
  const wrongCanvas=Buffer.from(valid);wrongCanvas[24]^=1;
  const wrongSize=Buffer.from(valid);wrongSize.writeUInt32LE(0xffffffff,16);
  const animated=Buffer.from(valid);animated[20]|=2;
  const truncated=valid.subarray(0,valid.length-2);
  const cutChunk=Buffer.from(truncated);cutChunk.writeUInt32LE(cutChunk.length-8,4);
  for(const bytes of [wrongCanvas,wrongSize,truncated,cutChunk,animated])assert.throws(()=>validateImageFile(bytes,"image/webp"));
  assert.throws(()=>validateImageFile(valid,"image/png"),/INVALID_FILE_SIGNATURE/);
});
test("VP8 and VP8L invalid headers and small or oversized images are rejected",async()=>{
  const lossy=await source().webp().toBuffer();lossy[23]=0;
  const lossless=await source().webp({lossless:true}).toBuffer();lossless[20]=0;
  for(const bytes of [lossy,lossless])assert.throws(()=>validateImageFile(bytes,"image/webp"));
  const small=await sharp({create:{width:639,height:700,channels:3,background:"red"}}).webp().toBuffer();
  assert.throws(()=>validateImageFile(small,"image/webp"),/DIMENSIONS_TOO_SMALL/);
  const oversized=await source().png().toBuffer();oversized.writeUInt32BE(10000,16);oversized.writeUInt32BE(7000,20);
  assert.throws(()=>validateImageFile(oversized,"image/png"),/DIMENSIONS_TOO_LARGE/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { watermarkInput, watermarkSvg } from "../modules/images/watermark";
import { renderProtectedPreviews } from "../modules/images/render-preview";

const settings = watermarkInput.parse({ watermarkMode: "CUSTOM", watermarkText: 'Photo <&" artiste' });
test("reject unprotected or empty custom watermarks and invalid bounds", () => {
  for (const input of [{watermarkMode:"NONE"}, {watermarkMode:"CUSTOM",watermarkText:" "}, {...settings,opacityPercent:0}, {...settings,sizePercent:100}]) assert.equal(watermarkInput.safeParse(input).success,false);
  assert.match(watermarkSvg(800,640,settings,"Objectif"), /&lt;&amp;&quot;/);
});
test("every position renders protected WebP without EXIF and preserves original bytes", async () => {
  const original = await sharp({create:{width:900,height:700,channels:3,background:"#385a72"}}).jpeg().withExif({IFD0:{Copyright:"PRIVATE_METADATA"}}).toBuffer();
  const before = Buffer.from(original);
  for (const position of ["CENTER","TOP_LEFT","TOP_RIGHT","BOTTOM_LEFT","BOTTOM_RIGHT","REPEATED"] as const) {
    const previews = await renderProtectedPreviews(original,{...settings,position});
    assert.equal(previews.length,4);
    for (const preview of previews) {
      const meta = await sharp(preview.data).metadata();
      assert.equal(meta.format,"webp"); assert.equal(meta.exif,undefined); assert.equal(meta.xmp,undefined);
      assert.ok(preview.width <= 1800 && preview.height <= 1800);
      const stats = await sharp(preview.data).stats();
      assert.ok(stats.channels.some(channel => channel.max - channel.min > 10), "watermark changes otherwise uniform image");
    }
  }
  assert.deepEqual(original,before);
});
test("reject malformed image payload", async () => {
  await assert.rejects(renderProtectedPreviews(new Uint8Array([1,2,3]),settings));
});

test("invisible Unicode cannot create an unmarked preview", async () => {
  for (const text of ["\u200b", "\u2060\u200d", "\u3164", "\u2800", "©", " \ufe0f "]) {
    assert.equal(watermarkInput.safeParse({watermarkMode:"CUSTOM",watermarkText:text}).success,false,JSON.stringify(text));
  }
  assert.equal(watermarkInput.parse({watermarkMode:"CUSTOM",watermarkText:"Studio\u200b Paris"}).watermarkText,"Studio Paris");
  assert.throws(()=>watermarkSvg(800,700,{...settings,watermarkMode:"PLATFORM"},"\u200b"),/INVISIBLE_WATERMARK/);
});

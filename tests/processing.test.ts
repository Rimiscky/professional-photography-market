import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { getPlatformProxy } from "wrangler";
import sharp from "sharp";
import { processNextImage, type ImageBindings } from "../modules/images/processing";
import { renderProtectedPreviews } from "../modules/images/render-preview";
import { publishOwnedImage, retryOwnedImage, saveOwnedMetadata, unpublishOwnedImage } from "../modules/images/manage";
import { imageMetadataInput } from "../modules/images/metadata-schema";

import { protectedPreview } from "../modules/images/preview";

const metadata = imageMetadataInput.parse({title:"Test photo",description:"Description",altText:"Une photographie",category:"Nature",copyrightOwner:"Artiste",watermarkMode:"CUSTOM",watermarkText:"Artiste"});
test("D1/R2 pipeline: claims, privacy, metadata locks, publication, regeneration, failure and retry", async () => {
  const proxy = await getPlatformProxy<ImageBindings>({configPath:"wrangler.images.json",persist:false});
  const {DB,ASSETS} = proxy.env;
  try {
    for (const name of (await readdir("drizzle")).filter(n => n.endsWith(".sql")).sort()) {
      const sql = await readFile(`drizzle/${name}`,"utf8");
      await DB.batch(sql.split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));
    }
    await DB.batch([
      DB.prepare("INSERT INTO users (id,email) VALUES ('owner','owner@test'),('other','other@test')"),
      DB.prepare("INSERT INTO photographer_profiles (id,user_id,username,display_name) VALUES ('p','owner','artist','Artiste')"),
      DB.prepare("INSERT INTO images (id,photographer_id,title,slug,copyright_owner,status,rights_confirmed_at) VALUES ('i','p','Photo','photo','Artiste','PROCESSING',CURRENT_TIMESTAMP)"),
      DB.prepare("INSERT INTO image_processing_jobs (id,image_id) VALUES ('j','i')"),
    ]);
    const original = await sharp({create:{width:800,height:700,channels:3,background:"navy"}}).jpeg().toBuffer();
    await ASSETS.put("originals/p/i/original.jpg",original);
    await DB.prepare("INSERT INTO image_assets(id,image_id,kind,object_key,mime_type,bytes,is_private) VALUES ('a','i','ORIGINAL','originals/p/i/original.jpg','image/jpeg',?,1)").bind(original.length).run();
    assert.equal(await saveOwnedMetadata(DB,"i","other",metadata),false);
    assert.equal(await saveOwnedMetadata(DB,"i","owner",metadata),true);
    assert.equal(await publishOwnedImage(DB,"i","owner"),false);
    let release!: () => void;
    const gate = new Promise<void>(resolve => {release=resolve;});
    let entered!: () => void;
    const started = new Promise<void>(resolve => {entered=resolve;});
    const running = processNextImage(proxy.env,async (bytes,settings) => {entered();await gate;return renderProtectedPreviews(bytes,settings);});
    await started;
    assert.equal(await processNextImage(proxy.env,renderProtectedPreviews),null);
    assert.equal(await saveOwnedMetadata(DB,"i","owner",{...metadata,watermarkText:"Changed"}),false);
    assert.equal(await publishOwnedImage(DB,"i","owner"),false);
    release();
    assert.deepEqual(await running,{imageId:"i",status:"READY"});
    assert.deepEqual(Buffer.from(await (await ASSETS.get("originals/p/i/original.jpg"))!.arrayBuffer()),original);
    assert.equal((await protectedPreview(proxy.env,"i",null)).status,404);
    assert.equal((await protectedPreview(proxy.env,"i","other")).status,404);
    const preview=await protectedPreview(proxy.env,"i","owner");
    assert.equal(preview.status,200);
    assert.equal(preview.headers.get("content-type"),"image/webp");
    assert.equal(preview.headers.get("cache-control"),"private, no-store");
    assert.equal((await sharp(Buffer.from(await preview.arrayBuffer())).metadata()).format,"webp");
    assert.equal((await protectedPreview(proxy.env,"originals/p/i/original.jpg","owner")).status,404);
    assert.equal(await publishOwnedImage(DB,"i","other"),false);
    // A plain LARGE asset is not sufficient for publication.
    await DB.prepare("UPDATE image_assets SET kind='LARGE' WHERE kind='WATERMARKED'").run();
    assert.equal(await publishOwnedImage(DB,"i","owner"),false);
    await DB.prepare("UPDATE image_assets SET kind='WATERMARKED' WHERE kind='LARGE'").run();
    assert.equal(await publishOwnedImage(DB,"i","owner"),true);
    assert.equal((await protectedPreview(proxy.env,"i",null)).status,200);
    assert.equal(await publishOwnedImage(DB,"i","owner"),false);
    assert.equal((await DB.prepare("SELECT count(*) AS n FROM audit_logs").first<{n:number}>())?.n,1);
    assert.equal(await saveOwnedMetadata(DB,"i","owner",metadata),false);
    assert.equal(await unpublishOwnedImage(DB,"i","other"),false);
    assert.equal(await unpublishOwnedImage(DB,"i","owner"),true);
    assert.equal(await unpublishOwnedImage(DB,"i","owner"),false);
    assert.equal((await protectedPreview(proxy.env,"i",null)).status,404);
    assert.equal((await protectedPreview(proxy.env,"i","owner")).status,200);
    assert.equal(await saveOwnedMetadata(DB,"i","owner",{...metadata,watermarkText:"Nouveau"}),true);
    assert.equal((await DB.prepare("SELECT count(*) AS n FROM image_assets WHERE kind!='ORIGINAL'").first<{n:number}>())?.n,0);
    assert.equal(await publishOwnedImage(DB,"i","owner"),false);
    assert.equal((await protectedPreview(proxy.env,"i",null)).status,404);
    assert.equal((await protectedPreview(proxy.env,"i","owner")).status,404);
    assert.deepEqual(await processNextImage(proxy.env,async()=>{throw new Error("test decode failure");}),{imageId:"i",status:"ERROR"});
    assert.equal(await retryOwnedImage(DB,"i","other"),false);
    assert.equal(await retryOwnedImage(DB,"i","owner"),true);
    assert.deepEqual(await processNextImage(proxy.env,renderProtectedPreviews),{imageId:"i",status:"READY"});
    assert.equal(await saveOwnedMetadata(DB,"i","owner",metadata),true);
    let writes = 0;
    const failingBucket = new Proxy(ASSETS, { get(target, property) {
      if (property === "put") return async (...args: Parameters<R2Bucket["put"]>) => {
        if (++writes === 2) throw new Error("test storage failure");
        return target.put(...args);
      };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    }});
    assert.deepEqual(await processNextImage({DB,ASSETS:failingBucket},renderProtectedPreviews),{imageId:"i",status:"ERROR"});
    assert.equal(await publishOwnedImage(DB,"i","owner"),false);
    assert.equal((await DB.prepare("SELECT count(*) AS n FROM image_assets WHERE kind!='ORIGINAL'").first<{n:number}>())?.n,0);
    assert.ok(await ASSETS.get("originals/p/i/original.jpg"));
    assert.equal((await DB.prepare("SELECT count(*) AS n FROM image_assets WHERE is_private=0").first<{n:number}>())?.n,0);
  } finally { await proxy.dispose(); }
});

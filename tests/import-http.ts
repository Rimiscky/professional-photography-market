// Explicit local smoke test. Creates one synthetic photograph and keeps it for inspection.
import assert from "node:assert/strict";
import sharp from "sharp";
import { getPlatformProxy } from "wrangler";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { ImageBindings } from "../modules/images/processing";

const base = "http://localhost:5173";
const signIn = await fetch(`${base}/signin-with-chatgpt?return_to=/studio`,{redirect:"manual"});
const cookie = signIn.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie,"local sign-in must issue a cookie");
const proxy = await getPlatformProxy<ImageBindings>({configPath:"wrangler.images.json",persist:{path:".wrangler/state/v3"}});
try {
  const profile = await proxy.env.DB.prepare("SELECT id FROM photographer_profiles WHERE user_id='local_seedy'").first();
  if (!profile) {
    const response = await fetch(`${base}/api/photographer/profile`,{method:"POST",headers:{cookie,"content-type":"application/json"},body:JSON.stringify({displayName:"Photographe local",username:"photographe-local",bio:"Profil de test local"})});
    assert.equal(response.status,200,await response.text());
  }
  const original = await sharp({create:{width:1200,height:800,channels:3,background:"#365e78"}})
    .jpeg().withExif({IFD0:{Copyright:"PRIVATE ORIGINAL TEST"}}).toBuffer();
  const form = () => {
    const data = new FormData();data.set("file",new File([new Uint8Array(original)],"photo-test.jpg",{type:"image/jpeg"}));
    data.set("title","Photographie de test local");data.set("rightsConfirmed","true");return data;
  };
  assert.equal((await fetch(`${base}/api/images/upload`,{method:"POST",body:form()})).status,401);
  const uploaded = await fetch(`${base}/api/images/upload`,{method:"POST",headers:{cookie},body:form()});
  const body = await uploaded.json() as {imageId:string;status:string;error?:string};
  assert.equal(uploaded.status,201,JSON.stringify(body));assert.equal(body.status,"PROCESSING");
  assert.equal(JSON.stringify(body).includes("originals/"),false);
  const id=body.imageId;
  const send=(action:string)=>fetch(`${base}/api/images/${id}`,{method:"POST",headers:{cookie,"content-type":"application/json"},body:JSON.stringify({action})});
  assert.equal((await send("publish")).status,409);
  const metadata={title:"Photographie de test local",description:"Image synthétique pour vérifier le pipeline complet.",altText:"Fond bleu portant un filigrane personnalisé",category:"Nature",copyrightOwner:"Photographe local",watermarkMode:"CUSTOM",watermarkText:"Mon studio photo",position:"REPEATED",opacityPercent:40,sizePercent:28};
  const saved=await fetch(`${base}/api/images/${id}`,{method:"PATCH",headers:{cookie,"content-type":"application/json"},body:JSON.stringify(metadata)});
  assert.equal(saved.status,200,await saved.text());
  assert.equal((await fetch(`${base}/api/images/${id}/preview`,{headers:{cookie}})).status,404);
  execFileSync(process.execPath,["--import","tsx","scripts/process-images.ts"],{stdio:"inherit"});
  const ready=await proxy.env.DB.prepare("SELECT status FROM images WHERE id=?").bind(id).first<{status:string}>();
  assert.equal(ready?.status,"READY");
  assert.equal((await fetch(`${base}/api/images/${id}/preview`)).status,404);
  const preview=await fetch(`${base}/api/images/${id}/preview`,{headers:{cookie}});
  assert.equal(preview.status,200);assert.equal(preview.headers.get("content-type"),"image/webp");
  const previewBytes=Buffer.from(await preview.arrayBuffer());
  const previewMeta=await sharp(previewBytes).metadata();assert.equal(previewMeta.format,"webp");assert.equal(previewMeta.exif,undefined);
  const asset=await proxy.env.DB.prepare("SELECT object_key,is_private FROM image_assets WHERE image_id=? AND kind='ORIGINAL'").bind(id).first<{object_key:string;is_private:number}>();
  assert.equal(asset?.is_private,1);
  const stored=await proxy.env.ASSETS.get(asset!.object_key);
  const hash=(data:Uint8Array)=>createHash("sha256").update(data).digest("hex");
  assert.equal(hash(new Uint8Array(await stored!.arrayBuffer())),hash(original));
  assert.equal((await fetch(`${base}/${asset!.object_key}`)).status,404);
  assert.equal((await fetch(`${base}/api/images/${id}/original`)).status,404);
  const page=await fetch(`${base}/studio/photos/${id}`,{headers:{cookie}});
  assert.equal(page.status,200);assert.ok((await page.text()).includes(`/api/images/${id}/preview`));
  assert.equal((await send("publish")).status,200);
  assert.equal((await fetch(`${base}/api/images/${id}/preview`)).status,200);
  assert.equal((await send("publish")).status,409);
  console.log(`PASS: authenticated import, custom watermark, private original SHA-256, WebP without EXIF, READY and publication.\nInspect: ${base}/studio/photos/${id}`);
} finally {await proxy.dispose();}

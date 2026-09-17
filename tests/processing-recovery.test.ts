import assert from "node:assert/strict";
import { test } from "node:test";
import { readOwnedImageState } from "../modules/images/image-state";
import { imageFixture } from "./support/images";
import { processNextImage } from "../modules/images/processing";
import { renderProtectedPreviews } from "../modules/images/render-preview";
import { cleanupDerivedObjects, recoverExpiredJobs } from "../modules/images/processing-maintenance";
import { renderWithLimits } from "../modules/images/render-isolated";
import { watermarkInput } from "../modules/images/watermark";
import { protectedPreview } from "../modules/images/preview";

test("lost commit acknowledgement preserves committed previews and reconciles READY",async()=>{
  const proxy=await imageFixture();
  try {
    let loseReply=true;
    const DB=new Proxy(proxy.env.DB,{get(target,property){
      if(property==="batch")return async (statements:D1PreparedStatement[])=>{
        const result=await target.batch(statements);
        if(loseReply && statements.length > 2){loseReply=false;throw new Error("LOST_COMMIT_ACK");}
        return result;
      };
      const value=Reflect.get(target,property);return typeof value==="function"?value.bind(target):value;
    }});
    assert.deepEqual(await processNextImage({...proxy.env,DB},renderProtectedPreviews),{imageId:"i",status:"READY"});
    assert.equal((await proxy.env.ASSETS.list({prefix:"derived/"})).objects.length,4);
    assert.equal((await protectedPreview(proxy.env,"i","owner")).status,200);
  } finally {await proxy.dispose();}
});

test("expired claims are fenced from a replacement consumer",async()=>{
  const proxy=await imageFixture();
  try {
    let clock=Date.now();
    let release!:()=>void; const gate=new Promise<void>(r=>{release=r;});
    let entered!:()=>void; const start=new Promise<void>(r=>{entered=r;});
    const stale=processNextImage(proxy.env,async(bytes,settings)=>{entered();await gate;return renderProtectedPreviews(bytes,settings);},{now:()=>clock,leaseMs:100});
    await start;clock+=101;
    assert.deepEqual(await processNextImage(proxy.env,renderProtectedPreviews,{now:()=>clock}),{imageId:"i",status:"READY"});
    release();
    assert.deepEqual(await stale,{imageId:"i",status:"SUPERSEDED"});
    assert.equal((await protectedPreview(proxy.env,"i","owner")).status,200);
    assert.equal((await proxy.env.ASSETS.list({prefix:"derived/"})).objects.length,4);
    assert.equal((await proxy.env.DB.prepare("SELECT attempts FROM image_processing_jobs").first<{attempts:number}>())?.attempts,2);
  }finally{await proxy.dispose();}
});

test("three expired attempts stop automatic recovery",async()=>{
  const proxy=await imageFixture();
  try {
    for(let i=0;i<3;i++){
      await proxy.env.DB.prepare("UPDATE image_processing_jobs SET status='RUNNING',lease_expires_at=1").run();
      await recoverExpiredJobs(proxy.env.DB,2);
    }
    assert.equal((await proxy.env.DB.prepare("SELECT status FROM images").first<{status:string}>())?.status,"ERROR");
    assert.equal((await proxy.env.DB.prepare("SELECT status FROM image_processing_jobs").first<{status:string}>())?.status,"FAILED");
    assert.equal(await processNextImage(proxy.env,renderProtectedPreviews),null);
  }finally{await proxy.dispose();}
});

test("cleanup preserves originals, referenced previews, recent and active-attempt objects",async()=>{
  const proxy=await imageFixture();
  try {
    await processNextImage(proxy.env,renderProtectedPreviews);
    const orphan="derived/p/i/abandoned-1/watermarked.webp";
    await proxy.env.ASSETS.put(orphan,new Uint8Array([1,2,3]));
    assert.equal((await cleanupDerivedObjects(proxy.env)).deleted,0);
    await proxy.env.DB.prepare("UPDATE image_processing_jobs SET status='RUNNING'").run();
    assert.equal((await cleanupDerivedObjects(proxy.env,{now:Date.now()+16*60_000})).deleted,0);
    await proxy.env.DB.prepare("UPDATE image_processing_jobs SET status='SUCCEEDED'").run();
    assert.equal((await cleanupDerivedObjects(proxy.env,{now:Date.now()+16*60_000})).deleted,1);
    assert.ok(await proxy.env.ASSETS.get("originals/p/i/original.jpg"));
    assert.equal((await protectedPreview(proxy.env,"i","owner")).status,200);
    assert.equal((await cleanupDerivedObjects(proxy.env,{now:Date.now()+16*60_000})).deleted,0);
  }finally{await proxy.dispose();}
});

test("isolated renderer produces previews and terminates at its deadline",async()=>{
  const proxy=await imageFixture();
  try {
    const original=new Uint8Array(await (await proxy.env.ASSETS.get("originals/p/i/original.jpg"))!.arrayBuffer());
    const settings=watermarkInput.parse({watermarkMode:"PLATFORM"});
    assert.equal((await renderWithLimits(original,settings)).length,4);
    await assert.rejects(renderWithLimits(original,settings,1),/RENDER_TIMEOUT/);
  }finally{await proxy.dispose();}
});

test("status polling is owner-only and never returns object keys or diagnostics",async()=>{
  const proxy=await imageFixture();
  try {
    assert.equal(await readOwnedImageState(proxy.env.DB,"i","other"),null);
    const state=await readOwnedImageState(proxy.env.DB,"i","owner");
    assert.equal(state?.status,"PROCESSING");assert.equal(state?.previewVersion,null);
    assert.deepEqual(Object.keys(state!).sort(),["previewVersion","retryable","status","updatedAt"]);
    await processNextImage(proxy.env,renderProtectedPreviews);
    assert.ok((await readOwnedImageState(proxy.env.DB,"i","owner"))?.previewVersion);
  }finally{await proxy.dispose();}
});

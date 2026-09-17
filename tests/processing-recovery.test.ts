import assert from "node:assert/strict";
import { test } from "node:test";
import { imageFixture } from "./support/images";
import { processNextImage } from "../modules/images/processing";
import { renderProtectedPreviews } from "../modules/images/render-preview";
import { protectedPreview } from "../modules/images/preview";

test("lost commit acknowledgement preserves committed previews and reconciles READY",async()=>{
  const proxy=await imageFixture();
  try {
    let loseReply=true;
    const DB=new Proxy(proxy.env.DB,{get(target,property){
      if(property==="batch")return async (statements:D1PreparedStatement[])=>{
        const result=await target.batch(statements);
        if(loseReply){loseReply=false;throw new Error("LOST_COMMIT_ACK");}
        return result;
      };
      const value=Reflect.get(target,property);return typeof value==="function"?value.bind(target):value;
    }});
    assert.deepEqual(await processNextImage({...proxy.env,DB},renderProtectedPreviews),{imageId:"i",status:"READY"});
    assert.equal((await proxy.env.ASSETS.list({prefix:"derived/"})).objects.length,4);
    assert.equal((await protectedPreview(proxy.env,"i","owner")).status,200);
  } finally {await proxy.dispose();}
});

import { renderProtectedPreviews } from "./render-preview";
import type { WatermarkInput } from "./watermark";

process.once("message",async(input:{bytes:Uint8Array;settings:WatermarkInput})=>{
  try {
    const previews=await renderProtectedPreviews(input.bytes,input.settings);
    process.send?.({previews},()=>process.exit(0));
  }catch{
    process.send?.({error:"RENDER_FAILED"},()=>process.exit(1));
  }
});

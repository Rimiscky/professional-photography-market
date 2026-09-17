import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { protectedPreview } from "../../../../../modules/images/preview";

export async function GET(_request: Request, {params}: {params:Promise<{id:string}>}) {
  if (!env.DB || !env.ASSETS) return new Response(null,{status:503});
  const user = await getChatGPTUser();
  const {id} = await params;
  try { return await protectedPreview({DB:env.DB,ASSETS:env.ASSETS},id,user?.userId??null); }
  catch (error) {
    console.error("preview_unavailable",{imageId:id,error});
    return new Response(null,{status:503,headers:{"Cache-Control":"private, no-store"}});
  }
}

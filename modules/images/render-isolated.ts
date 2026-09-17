import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Preview } from "./processing";
import type { WatermarkInput } from "./watermark";

export function renderWithLimits(bytes:Uint8Array,settings:WatermarkInput,timeoutMs=120_000):Promise<Preview[]> {
  return new Promise((resolve,reject)=>{
    const child=fork(fileURLToPath(new URL("./render-child.ts",import.meta.url)),[],{
      execArgv:["--import","tsx","--max-old-space-size=256"],serialization:"advanced",stdio:["ignore","ignore","ignore","ipc"],
    });
    let settled=false;
    const finish=(error?:Error,previews?:Preview[])=>{
      if(settled)return;settled=true;clearTimeout(timer);child.kill("SIGKILL");
      if(error)reject(error);else resolve(previews!);
    };
    const timer=setTimeout(()=>finish(new Error("RENDER_TIMEOUT")),timeoutMs);
    child.once("error",error=>finish(error));
    child.once("exit",()=>finish(new Error("RENDER_PROCESS_EXIT")));
    child.once("message",(message:{previews?:Preview[];error?:string})=>{
      if(!message.previews)finish(new Error("RENDER_FAILED"));else finish(undefined,message.previews);
    });
    child.send({bytes,settings},error=>{if(error)finish(error);});
  });
}

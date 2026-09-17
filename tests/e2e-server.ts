import {spawnSync} from "node:child_process";
import path from "node:path";
const state=process.env.PHOTO_LOCAL_STATE;
if(!state?.startsWith(path.resolve(".wrangler/e2e")+path.sep))throw new Error("E2E_STATE_MUST_BE_ISOLATED");
const migration=spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js","d1","migrations","apply","DB","--local","--config","wrangler.images.json","--persist-to",state],{stdio:"inherit"});
if(migration.status!==0)process.exit(migration.status??1);
process.argv=[process.execPath,"scripts/run-framework.mjs","dev","--port","5183"];
await import("../scripts/run-framework.mjs");

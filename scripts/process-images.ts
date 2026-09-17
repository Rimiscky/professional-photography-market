import { getPlatformProxy } from "wrangler";
import { processNextImage, type ImageBindings } from "../modules/images/processing";
import { renderWithLimits } from "../modules/images/render-isolated";
import { cleanupDerivedObjects, recoverExpiredJobs } from "../modules/images/processing-maintenance";

// Intentionally local. Production adapters and scheduling require deployment configuration.
const proxy = await getPlatformProxy<ImageBindings>({ configPath: "wrangler.images.json", persist: { path: `${process.env.PHOTO_LOCAL_STATE ?? ".wrangler/state"}/v3` } });
try {
  await recoverExpiredJobs(proxy.env.DB);
  let cursor: string | undefined;
  do { const page=await cleanupDerivedObjects(proxy.env,{cursor});cursor=page.cursor; } while(cursor);
  for (let count = 0; count < 50; count++) {
    const result = await processNextImage(proxy.env, renderWithLimits);
    if (!result) break;
    console.log(JSON.stringify(result));
    if (result.status === "ERROR") process.exitCode = 1;
  }
} finally {
  await proxy.dispose();
}

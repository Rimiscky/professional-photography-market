import { getPlatformProxy } from "wrangler";
import { processNextImage, type ImageBindings } from "../modules/images/processing";
import { renderProtectedPreviews } from "../modules/images/render-preview";

// Intentionally local. Production adapters and scheduling require deployment configuration.
const proxy = await getPlatformProxy<ImageBindings>({ configPath: "wrangler.images.json", persist: { path: ".wrangler/state/v3" } });
try {
  for (let count = 0; count < 50; count++) {
    const result = await processNextImage(proxy.env, renderProtectedPreviews);
    if (!result) break;
    console.log(JSON.stringify(result));
    if (result.status === "ERROR") process.exitCode = 1;
  }
} finally {
  await proxy.dispose();
}

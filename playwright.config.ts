import {defineConfig,devices} from "@playwright/test";
import {existsSync} from "node:fs";
import path from "node:path";

// Every run owns a fresh database and bucket. Never migrate or reset the normal local state.
process.env.PHOTO_E2E_STATE ??= path.resolve(".wrangler/e2e",crypto.randomUUID());
if(!process.env.PHOTO_E2E_STATE.startsWith(path.resolve(".wrangler/e2e")+path.sep))throw new Error("E2E_STATE_MUST_BE_ISOLATED");
const chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_PATH??(existsSync(chrome)?chrome:undefined);
export default defineConfig({
  testDir:"./tests/e2e",workers:1,timeout:90_000,expect:{timeout:15_000},
  use:{actionTimeout:15_000,baseURL:"http://localhost:5183",launchOptions:{executablePath},trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[{name:"desktop",use:{...devices["Desktop Chrome"],viewport:{width:1365,height:900}}},{name:"mobile",use:{...devices["Pixel 7"],defaultBrowserType:"chromium"}}],
  webServer:{command:"pnpm test:e2e:server",url:"http://localhost:5183",reuseExistingServer:false,timeout:120_000,
    env:{PHOTO_LOCAL_STATE:process.env.PHOTO_E2E_STATE}},
});

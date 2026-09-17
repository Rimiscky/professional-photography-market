import { readFile, readdir } from "node:fs/promises";
import { getPlatformProxy } from "wrangler";
import sharp from "sharp";
import type { ImageBindings } from "../../modules/images/processing";

export async function imageFixture() {
  const proxy = await getPlatformProxy<ImageBindings>({configPath:"wrangler.images.json",persist:false});
  try {
    const {DB,ASSETS}=proxy.env;
    for (const name of (await readdir("drizzle")).filter(n=>n.endsWith(".sql")).sort()) {
      const sql=await readFile(`drizzle/${name}`,"utf8");
      await DB.batch(sql.split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));
    }
    const original=await sharp({create:{width:800,height:700,channels:3,background:"navy"}}).jpeg().toBuffer();
    await DB.batch([
      DB.prepare("INSERT INTO users(id,email) VALUES('owner','owner@test'),('other','other@test')"),
      DB.prepare("INSERT INTO photographer_profiles(id,user_id,username,display_name) VALUES('p','owner','artist','Artiste')"),
      DB.prepare("INSERT INTO images(id,photographer_id,title,slug,copyright_owner,status,rights_confirmed_at) VALUES('i','p','Photo','photo','Artiste','PROCESSING',CURRENT_TIMESTAMP)"),
      DB.prepare("INSERT INTO image_processing_jobs(id,image_id) VALUES('j','i')"),
      DB.prepare("INSERT INTO image_assets(id,image_id,kind,object_key,mime_type,bytes,is_private) VALUES('a','i','ORIGINAL','originals/p/i/original.jpg','image/jpeg',?,1)").bind(original.length),
    ]);
    await ASSETS.put("originals/p/i/original.jpg",original);
    return proxy;
  } catch(error) {await proxy.dispose();throw error;}
}

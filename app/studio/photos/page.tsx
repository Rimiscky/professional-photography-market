/* eslint-disable @next/next/no-html-link-for-pages */
import { ProcessingRefresh } from "../../../components/images/processing-refresh";
import { desc, eq } from "drizzle-orm";
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, Clock3, Image as ImageIcon, Plus } from "lucide-react";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { images, photographerProfiles } from "../../../db/schema";

export const dynamic = "force-dynamic";
const labels: Record<string,{text:string;style:string}> = {
  DRAFT:{text:"Brouillon",style:"bg-black/5 text-black/55"}, PROCESSING:{text:"Traitement",style:"bg-amber-50 text-amber-700"},
  UNPUBLISHED:{text:"Dépubliée",style:"bg-black/5 text-black/55"},
  READY:{text:"Prête",style:"bg-blue-50 text-blue-700"}, PUBLISHED:{text:"Publiée",style:"bg-emerald-50 text-emerald-700"}, ERROR:{text:"Erreur",style:"bg-red-50 text-red-700"},
};

export default async function StudioPhotos(){
  const user=await requireChatGPTUser("/studio/photos"); let rows:typeof images.$inferSelect[]=[]; let unavailable=false;
  try { const db=getDb(); const profile=await db.select({id:photographerProfiles.id}).from(photographerProfiles).where(eq(photographerProfiles.userId,user.userId)).limit(1); if(profile[0]) rows=await db.select().from(images).where(eq(images.photographerId,profile[0].id)).orderBy(desc(images.createdAt)).limit(50); }
  catch(error){ console.error("studio_photos_load_failed",{userId:user.userId,error}); unavailable=true; }
  return <main className="min-h-screen bg-[#f3f2ed] text-[#151515]">
    <header className="flex h-20 items-center justify-between border-b border-black/10 bg-white px-5 lg:px-10"><a href="/studio" className="flex items-center gap-2 text-sm text-black/55"><ArrowLeft size={17}/>Studio</a><a href="/" className="flex items-center gap-2 font-serif text-xl"><Camera size={18}/>Objectif</a><a href="/studio/photos/nouvelle" className="flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white"><Plus size={17}/>Ajouter</a></header>
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-10"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-black/40">Catalogue studio</p><h1 className="mt-3 font-serif text-5xl">Mes photographies</h1></div><p className="text-sm text-black/40">{rows.length} image{rows.length!==1?"s":""}</p></div>
      <ProcessingRefresh active={rows.some(image=>image.status==="PROCESSING")}/>
      {unavailable ? <State icon={AlertCircle} title="Catalogue indisponible" text="Impossible de charger vos photographies pour le moment."/> : rows.length===0 ? <State icon={ImageIcon} title="Votre catalogue est vide" text="Importez une première photographie pour commencer à préparer votre vitrine." action/> :
      <div className="mt-10 overflow-hidden rounded-2xl border border-black/8 bg-white"><div className="grid grid-cols-[minmax(0,1fr)_100px] sm:grid-cols-[minmax(0,1fr)_140px_120px] gap-4 border-b border-black/8 px-5 py-4 text-xs font-bold uppercase tracking-wider text-black/35"><span>Photographie</span><span className="hidden sm:block">Dimensions</span><span>État</span></div>{rows.map((image)=>{const status=labels[image.status]??{text:image.status,style:"bg-black/5"};return <a href={`/studio/photos/${image.id}`} key={image.id} className="grid grid-cols-[minmax(0,1fr)_100px] sm:grid-cols-[minmax(0,1fr)_140px_120px] items-center gap-4 border-b border-black/[.06] px-5 py-5 transition hover:bg-black/[.025] last:border-0"><div className="flex min-w-0 items-center gap-3"><span className="hidden h-14 w-14 shrink-0 sm:grid place-items-center rounded-xl bg-black/[.04]"><ImageIcon size={20} className="text-black/30"/></span><div className="min-w-0"><p className="truncate font-semibold">{image.title}</p><p className="mt-1 truncate text-xs text-black/40">Original privé · {image.createdAt}</p></div></div><span className="hidden text-sm text-black/55 sm:block">{image.width} × {image.height}</span><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${status.style}`}>{image.status==="PROCESSING"&&<Clock3 className="mr-1 inline" size={13}/>} {image.status==="READY"&&<CheckCircle2 className="mr-1 inline" size={13}/>} {status.text}</span></a>})}</div>}
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Pipeline actuel :</strong> les originaux restent privés. Les aperçus protégés sont disponibles après exécution du moteur de traitement. Leur état se met à jour automatiquement.</div>
    </section>
  </main>;
}

function State({icon:Icon,title,text,action=false}:{icon:typeof AlertCircle;title:string;text:string;action?:boolean}){return <div className="mt-10 grid min-h-80 place-items-center rounded-3xl border border-dashed border-black/15 bg-white/50 p-8 text-center"><div><span className="mx-auto hidden h-14 w-14 shrink-0 sm:grid place-items-center rounded-full bg-black/[.06]"><Icon/></span><h2 className="mt-5 font-serif text-3xl">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-black/45">{text}</p>{action&&<a href="/studio/photos/nouvelle" className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"><Plus size={16}/>Importer une photographie</a>}</div></div>}

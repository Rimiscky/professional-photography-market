/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */
"use client";
import { AlertTriangle, ArrowLeft, Camera, LoaderCircle, LockKeyhole, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ImageState } from "../../modules/images/image-state";
import type { WatermarkInput } from "../../modules/images/watermark";
import { useHydrated } from "./use-hydrated";
import { useImageState } from "./use-image-state";

type ImageRecord={id:string;title:string;description:string|null;altText:string|null;category:string|null;copyrightOwner:string;status:string;width:number|null;height:number|null};
type Watermark={mode:"NONE"|"PLATFORM"|"CUSTOM";text:string|null;opacityPercent:number;sizePercent:number;position:WatermarkInput["position"]}|null;
const categories=["Portrait","Mariage","Événement","Mode","Architecture","Voyage","Nature","Street Photography","Concert","Corporate","Culture"];
const inputClass="mt-2 min-h-12 w-full rounded-xl border border-black/15 bg-[#fafafa] px-4 py-3 font-normal disabled:opacity-60";
const buttonClass="rounded-full border border-black/15 px-6 py-3.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40";

export function ImageMetadataEditor({image,watermark,state:initialState}:{image:ImageRecord;watermark:Watermark;state:ImageState}){
  const hydrated=useHydrated();
  const [values,setValues]=useState({title:image.title,description:image.description??"",altText:image.altText??"",category:image.category??"",copyrightOwner:image.copyrightOwner,
    watermarkMode:watermark?.mode==="CUSTOM"?"CUSTOM":"PLATFORM",watermarkText:watermark?.text??image.copyrightOwner,
    opacityPercent:watermark?.opacityPercent??28,sizePercent:watermark?.sizePercent??22,position:watermark?.position??"CENTER"});
  const [savedValues,setSavedValues]=useState(values);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState(false);
  const [failedPreview,setFailedPreview]=useState<string|null>(null);
  const [loadedPreview,setLoadedPreview]=useState<string|null>(null);
  const {state,pollError,refresh,applyStatus,invalidate}=useImageState(image.id,initialState,saving);
  const dirty=JSON.stringify(values)!==JSON.stringify(savedValues);
  const editable=!["PUBLISHED","ARCHIVED","PENDING_REVIEW"].includes(state.status);
  const previewUrl=state.previewVersion?`/api/images/${image.id}/preview?v=${encodeURIComponent(state.previewVersion)}`:null;
  const hasPreview=["READY","PUBLISHED","UNPUBLISHED"].includes(state.status)&&!!previewUrl&&failedPreview!==previewUrl;
  const previewLoaded=hasPreview&&loadedPreview===previewUrl;
  function change(name:keyof typeof values,value:string|number){setValues(previous=>({...previous,[name]:value}));}
  async function send(method:string,data:unknown,success:string){
    invalidate();setSaving(true);setMessage("");setError(false);
    try{
      const response=await fetch(`/api/images/${image.id}`,{method,headers:{"content-type":"application/json"},body:JSON.stringify(data)});
      const body=await response.json() as {error?:string;status?:ImageState["status"]};
      if(!response.ok)throw new Error(body.error??"Action impossible.");
      if(body.status)applyStatus(body.status);
      if(method==="PATCH")setSavedValues(values);
      setMessage(success);
      await refresh();
    }catch(error){setError(true);setMessage(error instanceof Error?error.message:"Connexion interrompue. Réessayez.");}
    finally{setSaving(false);}
  }
  function save(event:FormEvent<HTMLFormElement>){event.preventDefault();void send("PATCH",values,"Informations enregistrées. Vos aperçus sont en préparation.");}
  return <main className="min-h-screen bg-[#f3f2ed] text-[#161616]">
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-5 py-4 lg:px-10">
      <a href="/studio/photos" className="flex items-center gap-2 text-sm text-black/60"><ArrowLeft size={17}/>Mes photographies</a>
      <a href="/" className="hidden items-center gap-2 font-serif text-xl sm:flex"><Camera size={18}/>Objectif</a>
      <span data-testid="image-status" aria-live="polite" className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">{state.status}</span>
    </header>
    <form onSubmit={save} className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[.7fr_1.3fr] lg:px-10 lg:py-12">
      <aside className="min-w-0">
        <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-3xl bg-[#151515] text-center text-white">
          {hasPreview?<img src={previewUrl!} alt={values.altText||"Aperçu protégé"} onLoad={()=>setLoadedPreview(previewUrl)} onError={()=>setFailedPreview(previewUrl)} className="max-h-96 w-full object-contain"/>:
            <div><LockKeyhole className="mx-auto text-[#d6ff4b]"/><p className="mt-4 font-serif text-2xl">Original privé</p><p className="mt-2 text-sm text-white/60">{image.width} × {image.height} px</p></div>}
        </div>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertTriangle className="mb-2" size={18}/>
          <strong>{previewLoaded?"Aperçu protégé disponible.":state.status==="ERROR"?"Le traitement a échoué.":state.status==="PROCESSING"?"Préparation de l’aperçu…":"Aperçu indisponible."}</strong>
          <p className="mt-2">L’original reste privé. L’état et l’aperçu se mettent à jour automatiquement pendant que cette page est ouverte.</p>
          {pollError&&<p role="alert" className="mt-2">Le suivi est interrompu. Une nouvelle tentative aura lieu automatiquement.</p>}
          <button type="button" disabled={saving} onClick={()=>{setFailedPreview(null);void refresh();}} className="mt-3 underline">Actualiser l’état</button>
          {state.retryable&&<button type="button" disabled={saving} onClick={()=>send("POST",{action:"retry"},"Traitement remis en file.")} className="ml-4 underline">Réessayer le traitement</button>}
        </div>
      </aside>
      <section className="min-w-0 rounded-3xl bg-white p-5 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-black/50">Informations de vente</p>
        <h1 className="mt-3 font-serif text-3xl sm:text-4xl">Préparer la photographie</h1>
        {state.status==="PUBLISHED"&&<p className="mt-4 text-sm text-black/60">Dépubliez cette photographie pour modifier ses informations ou son filigrane.</p>}
        <fieldset disabled={!hydrated||saving||!editable} className="mt-8 grid min-w-0 gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Titre<input name="title" required minLength={2} maxLength={120} value={values.title} onChange={e=>change("title",e.target.value)} className={inputClass}/></label>
          <label className="text-sm font-semibold">Catégorie<select name="category" required value={values.category} onChange={e=>change("category",e.target.value)} className={inputClass}><option value="" disabled>Choisir</option>{categories.map(category=><option key={category}>{category}</option>)}</select></label>
          <label className="text-sm font-semibold sm:col-span-2">Description<textarea name="description" required maxLength={1200} rows={5} value={values.description} onChange={e=>change("description",e.target.value)} className={inputClass}/></label>
          <label className="text-sm font-semibold sm:col-span-2">Texte alternatif<input name="altText" required minLength={5} maxLength={240} value={values.altText} onChange={e=>change("altText",e.target.value)} className={inputClass}/></label>
          <label className="text-sm font-semibold">Titulaire des droits<input name="copyrightOwner" required minLength={2} maxLength={120} value={values.copyrightOwner} onChange={e=>change("copyrightOwner",e.target.value)} className={inputClass}/></label>
          <label className="text-sm font-semibold">Protection de l’aperçu<select name="watermarkMode" value={values.watermarkMode} onChange={e=>change("watermarkMode",e.target.value)} className={inputClass}><option value="PLATFORM">Filigrane plateforme</option><option value="CUSTOM">Texte personnalisé</option></select></label>
          <label className="text-sm font-semibold">Texte du filigrane<input name="watermarkText" required={values.watermarkMode==="CUSTOM"} maxLength={80} value={values.watermarkText} onChange={e=>change("watermarkText",e.target.value)} className={inputClass}/></label>
          <label className="text-sm font-semibold">Position<select name="position" value={values.position} onChange={e=>change("position",e.target.value)} className={inputClass}><option value="CENTER">Centre</option><option value="TOP_LEFT">Haut gauche</option><option value="TOP_RIGHT">Haut droite</option><option value="BOTTOM_RIGHT">Bas droite</option><option value="BOTTOM_LEFT">Bas gauche</option><option value="REPEATED">Répété</option></select></label>
          <label className="text-sm font-semibold sm:col-span-2">Taille : {values.sizePercent}%<input name="sizePercent" type="range" min="15" max="60" value={values.sizePercent} onChange={e=>change("sizePercent",Number(e.target.value))} className="mt-3 w-full accent-black"/></label>
          <label className="text-sm font-semibold sm:col-span-2">Opacité : {values.opacityPercent}%<input name="opacityPercent" type="range" min="15" max="80" value={values.opacityPercent} onChange={e=>change("opacityPercent",Number(e.target.value))} className="mt-3 w-full accent-black"/></label>
        </fieldset>
        {dirty&&<p className="mt-4 text-sm text-amber-800">Modifications non enregistrées. Enregistrez avant de publier.</p>}
        {message&&<p role={error?"alert":"status"} className={`mt-6 rounded-xl p-4 text-sm ${error?"bg-red-50 text-red-700":"bg-emerald-50 text-emerald-800"}`}>{message}</p>}
        <div className="mt-7 flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
          {state.status==="PUBLISHED"?<button type="button" disabled={saving} onClick={()=>send("POST",{action:"unpublish"},"Photographie dépubliée. Vous pouvez maintenant la modifier.")} className={buttonClass}>Dépublier pour modifier</button>:
            <button type="button" disabled={!hydrated||saving||dirty||!["READY","UNPUBLISHED"].includes(state.status)||!previewLoaded} onClick={()=>send("POST",{action:"publish"},"Photographie publiée.")} className={buttonClass}>Publier</button>}
          <button disabled={!hydrated||saving||!editable} className={`${buttonClass} flex items-center justify-center gap-2 bg-black text-white`}>{saving?<LoaderCircle className="animate-spin" size={18}/>:<Save size={18}/>}Enregistrer</button>
        </div>
      </section>
    </form>
  </main>;
}

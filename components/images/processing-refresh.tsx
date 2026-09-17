"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ProcessingRefresh({active}:{active:boolean}){
  const router=useRouter();
  useEffect(()=>{
    if(!active)return;
    const timer=setInterval(()=>{if(document.visibilityState==="visible")router.refresh();},3000);
    return ()=>clearInterval(timer);
  },[active,router]);
  return active?<p className="mt-3 text-sm text-black/60" role="status">Suivi automatique des traitements en cours.</p>:null;
}

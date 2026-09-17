"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {ImageState} from "../../modules/images/image-state";

export function useImageState(id:string,initial:ImageState,paused:boolean){
  const [state,setState]=useState(initial);
  const [pollError,setPollError]=useState(false);
  const generation=useRef(0);
  const invalidate=useCallback(()=>{generation.current++;},[]);
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    const current=++generation.current;
    try{
      const response=await fetch(`/api/images/${id}`,{cache:"no-store",signal});
      if(!response.ok)throw new Error("STATUS_UNAVAILABLE");
      const next=await response.json() as ImageState;
      if(current===generation.current&&!signal?.aborted){setState(next);setPollError(false);}
    }catch{if(current===generation.current&&!signal?.aborted)setPollError(true);}
  },[id]);
  const applyStatus=useCallback((status:ImageState["status"])=>{
    generation.current++;
    setState(previous=>({...previous,status,previewVersion:status==="PROCESSING"?null:previous.previewVersion}));
  },[]);
  useEffect(()=>{
    if(paused)return;
    const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      if(document.visibilityState==="visible")await refresh(controller.signal);
      if(!controller.signal.aborted)timer=setTimeout(poll,3000);
    };
    timer=setTimeout(poll,3000);
    return ()=>{controller.abort();clearTimeout(timer);invalidate();};
  },[paused,refresh,invalidate]);
  return {state,pollError,refresh,applyStatus,invalidate};
}

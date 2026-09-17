"use client";

import { ArrowRight, Camera, Heart, Menu, Search, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";

const photos = [
  { id: 1, title: "Rouge manifeste", author: "Aïcha M.", place: "Paris, France", price: "48 €", license: "Commerciale", src: "https://images.unsplash.com/photo-1744616450607-1bc6cf82b87f?auto=format&fit=crop&w=1400&q=88", span: "md:col-span-2 md:row-span-2" },
  { id: 2, title: "Lignes silencieuses", author: "Lina Ko", place: "Berlin, Allemagne", price: "29 €", license: "Éditoriale", src: "https://images.unsplash.com/photo-1666932520939-d0b0e852c3e8?auto=format&fit=crop&w=900&q=88", span: "" },
  { id: 3, title: "Le mouvement", author: "Atsadawut C.", place: "Melbourne, Australie", price: "39 €", license: "Commerciale", src: "https://images.unsplash.com/photo-1602212477893-409e6c2d7cad?auto=format&fit=crop&w=900&q=88", span: "" },
];

const categories = ["Tout", "Portrait", "Mode", "Architecture", "Street", "Événement"];

export default function Home() {
  const [active, setActive] = useState("Tout");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const visible = useMemo(() => photos.filter((p) => !query || `${p.title} ${p.author} ${p.place}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return <main className="min-h-screen bg-[#0b0b0b] text-[#f4f1ea]">
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b0b0b]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-8 px-5 lg:px-10">
        <a href="/" className="flex items-center gap-2.5" aria-label="Accueil Objectif"><span className="grid h-9 w-9 place-items-center rounded-full border border-[#d6ff4b]/60"><Camera size={17}/></span><span className="font-serif text-xl tracking-tight">Objectif</span><span className="rounded-full bg-[#d6ff4b] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">bêta</span></a>
        <nav className="hidden items-center gap-7 text-sm text-white/65 lg:flex"><a className="text-white" href="#explorer">Explorer</a><a href="#photographes">Photographes</a><a href="#collections">Collections</a><a href="#licences">Licences</a></nav>
        <div className="ml-auto hidden w-full max-w-sm items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 lg:flex"><Search size={17} className="text-white/45"/><input value={query} onChange={(e)=>setQuery(e.target.value)} className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-white/35" placeholder="Image, lieu, style…" aria-label="Rechercher"/></div>
        <button className="ml-auto lg:ml-0" aria-label="Favoris"><Heart size={19}/></button><button aria-label="Panier"><ShoppingBag size={19}/></button>
        <a href="/studio" className="hidden rounded-full bg-[#f4f1ea] px-5 py-2.5 text-sm font-semibold text-black sm:block">Vendre mes photos</a><button className="lg:hidden" aria-label="Menu"><Menu/></button>
      </div>
    </header>

    <section className="relative mx-auto min-h-[780px] max-w-[1500px] overflow-hidden px-5 pb-16 pt-36 lg:px-10">
      <div className="pointer-events-none absolute left-[42%] top-32 h-[430px] w-[430px] rounded-full bg-[#d6ff4b]/[.08] blur-[100px]"/>
      <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.22em] text-[#d6ff4b]"><span className="h-px w-8 bg-[#d6ff4b]"/>Marketplace photographique indépendante</p>
      <h1 className="relative z-10 max-w-5xl font-serif text-[clamp(4rem,9vw,9.6rem)] leading-[.83] tracking-[-.065em]">Des images<br/><span className="italic text-white/45">qui ont un auteur.</span></h1>
      <div className="relative z-20 mt-12 grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-end">
        <div className="max-w-md"><p className="text-lg leading-relaxed text-white/58">Découvrez et achetez des photographies professionnelles proposées directement par leurs créateurs.</p><a href="#explorer" className="mt-8 inline-flex items-center gap-4 rounded-full bg-[#d6ff4b] px-6 py-3.5 font-semibold text-black transition hover:gap-6">Explorer les images <ArrowRight size={18}/></a></div>
        <div className="relative h-[330px] overflow-hidden rounded-sm"><img src={photos[0].src} alt="Portrait éditorial urbain" className="h-full w-full object-cover object-[center_38%] grayscale-[18%]"/><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/><div className="absolute bottom-5 left-5 right-5 flex items-end justify-between"><div><p className="font-serif text-2xl">{photos[0].title}</p><p className="text-sm text-white/60">par {photos[0].author}</p></div><span className="rounded-full border border-white/30 bg-black/20 px-3 py-1.5 text-xs backdrop-blur">À partir de {photos[0].price}</span></div></div>
      </div>
    </section>

    <section id="explorer" className="bg-[#f1efe9] px-5 py-24 text-[#111] lg:px-10"><div className="mx-auto max-w-[1500px]">
      <div className="mb-10 flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-black/45">Sélection du moment</p><h2 className="font-serif text-5xl tracking-tight md:text-7xl">À découvrir</h2></div><div className="flex max-w-full gap-2 overflow-x-auto pb-2">{categories.map((c)=><button key={c} onClick={()=>setActive(c)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${active===c?"border-black bg-black text-white":"border-black/20 hover:border-black"}`}>{c}</button>)}</div></div>
      <div className="grid auto-rows-[260px] gap-3 md:grid-cols-3">{visible.map((photo)=><article key={photo.id} className={`group relative overflow-hidden bg-neutral-300 ${photo.span}`}><img src={photo.src} alt={photo.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"/><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-75"/><button onClick={()=>setFavorites((f)=>f.includes(photo.id)?f.filter((id)=>id!==photo.id):[...f,photo.id])} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white backdrop-blur" aria-label="Ajouter aux favoris"><Heart size={18} fill={favorites.includes(photo.id)?"currentColor":"none"}/></button><a href="/photo/rouge-manifeste" className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white"><div><p className="font-serif text-2xl">{photo.title}</p><p className="mt-1 text-sm text-white/65">{photo.author} · {photo.place}</p></div><div className="text-right"><p className="font-semibold">{photo.price}</p><p className="text-xs text-white/55">{photo.license}</p></div></a></article>)}</div>
      {visible.length===0&&<div className="py-24 text-center"><p className="font-serif text-3xl">Aucune image trouvée</p><p className="mt-2 text-black/50">Essayez un autre mot-clé.</p></div>}
      <div className="mt-10 flex justify-center"><button className="flex items-center gap-3 border-b border-black pb-1 text-sm font-semibold">Voir toute la sélection <ArrowRight size={16}/></button></div>
    </div></section>

    <section id="licences" className="border-b border-white/10 px-5 py-24 lg:px-10"><div className="mx-auto grid max-w-[1500px] gap-16 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d6ff4b]">Acheter en confiance</p><h2 className="mt-5 max-w-xl font-serif text-5xl leading-[.95] tracking-tight md:text-7xl">Une licence claire. Aucun doute.</h2></div><div className="divide-y divide-white/12 border-t border-white/12">{[["01","Personnel","Pour vos projets et réseaux personnels."],["02","Éditorial","Pour un article, média ou publication informative."],["03","Commercial","Pour votre marque, site ou campagne digitale."]].map(([n,t,d])=><button key={n} className="group flex w-full items-center gap-6 py-7 text-left"><span className="text-xs text-white/35">{n}</span><span className="font-serif text-2xl">{t}</span><span className="ml-auto hidden text-sm text-white/45 sm:block">{d}</span><ArrowRight className="ml-2 transition group-hover:translate-x-1" size={18}/></button>)}</div></div></section>
    <section id="photographes" className="bg-[#d6ff4b] px-5 py-24 text-black lg:px-10"><div className="mx-auto flex max-w-[1500px] flex-col items-start justify-between gap-10 lg:flex-row lg:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[.2em]">Vous êtes photographe ?</p><h2 className="max-w-4xl font-serif text-6xl leading-[.9] tracking-tight md:text-8xl">Votre regard mérite sa propre vitrine.</h2></div><a href="/studio" className="flex shrink-0 items-center gap-4 rounded-full bg-black px-7 py-4 font-semibold text-white">Ouvrir mon studio <ArrowRight size={18}/></a></div></section>
    <footer className="px-5 py-12 text-sm text-white/45 lg:px-10"><div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-6 sm:flex-row"><p>© 2026 Objectif — nom de marque provisoire</p><div className="flex flex-wrap gap-6"><a href="#">Conditions</a><a href="#">Confidentialité</a><a href="#">Propriété intellectuelle</a></div></div></footer>
  </main>;
}

import React,{useState}from'react';
import{ClassKey,CLASS_DEFS}from'../../game/classes';
import{TINY_CLASS_SPRITES}from'../../game/premiumPixelArt';
import{useLanguage}from'../../i18n/LanguageContext';

interface Props{onConfirm:(name:string,cls:ClassKey)=>void;onBack:()=>void}
const order:ClassKey[]=['warrior','mage','archer'];
const cols:Record<ClassKey,number>={warrior:8,mage:6,archer:6};
const notes:Record<ClassKey,string>={
 warrior:'Robust, direkt und einsteigerfreundlich.',
 mage:'Starke Magie mit hoher Reichweite.',
 archer:'Schnell, beweglich und praezise.'
};

export function CharacterCreationModern({onConfirm,onBack}:Props){
 const{t,language}=useLanguage();
 const[name,setName]=useState('');
 const[selected,setSelected]=useState<ClassKey>('warrior');
 const valid=name.trim().length>=2;
 const def=CLASS_DEFS[selected];
 return <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#090807] text-amber-50" style={{touchAction:'auto'}}>
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(179,116,36,.20),transparent_34%),linear-gradient(180deg,rgba(31,22,13,.96),rgba(5,5,6,1))]"/>
  <header className="relative z-10 flex items-center gap-3 px-5 pb-4 pt-6 pt-safe-top"><button onClick={onBack} className="h-11 w-11 rounded border border-amber-100/20 bg-black/35 text-2xl">‹</button><div><p className="text-[10px] tracking-[.35em] text-amber-200/45">DUNGEON VEIL</p><h1 className="font-serif text-2xl tracking-widest">{t.characterCreation}</h1></div></header>
  <main className="relative z-10 flex-1 overflow-y-auto px-5 pb-5">
   <section className="mb-5 rounded border border-amber-100/15 bg-black/30 p-4"><label className="mb-2 block text-[10px] tracking-[.28em] text-amber-100/45">{t.heroName}</label><input value={name} onChange={e=>setName(e.target.value.slice(0,18))} placeholder={t.heroNamePlaceholder} maxLength={18} className="w-full border-b border-amber-100/25 bg-transparent px-1 py-3 font-serif text-2xl outline-none placeholder:text-amber-100/20"/></section>
   <div className="mb-4 grid grid-cols-3 gap-2">{order.map(cls=><button key={cls} onClick={()=>setSelected(cls)} className="rounded border bg-black/25 p-2" style={{borderColor:selected===cls?CLASS_DEFS[cls].color:'rgba(253,230,138,.16)'}}><div className="relative h-36 overflow-hidden"><img src={TINY_CLASS_SPRITES[cls]} alt="" className="absolute left-0 top-0 h-full max-w-none [image-rendering:pixelated]" style={{width:`${cols[cls]*100}%`}}/></div><span className="mt-2 block truncate text-xs font-bold" style={{color:selected===cls?CLASS_DEFS[cls].color:'rgba(254,243,199,.62)'}}>{t.className[cls]}</span></button>)}</div>
   <section className="rounded border border-amber-100/15 bg-black/38 p-4"><h2 className="font-serif text-3xl font-bold tracking-wider" style={{color:def.color}}>{t.className[selected]}</h2><p className="mt-1 text-xs uppercase tracking-[.22em] text-amber-100/45">{t.classRole[selected]}</p><p className="mt-4 text-sm leading-relaxed text-amber-50/68">{t.classDesc[selected]}</p><p className="mt-3 text-xs text-amber-200/75">{language==='de'?notes[selected]:t.classDesc[selected]}</p></section>
  </main>
  <footer className="relative z-10 border-t border-amber-100/12 bg-black/55 px-5 py-4"><button onClick={()=>valid&&onConfirm(name.trim(),selected)} disabled={!valid} className="w-full rounded border-2 py-4 text-base font-bold tracking-[.22em] disabled:border-white/10 disabled:bg-white/5 disabled:text-white/25" style={valid?{background:def.color,borderColor:def.color,color:'#080604'}:{}}>{t.startGame}</button></footer>
 </div>
}

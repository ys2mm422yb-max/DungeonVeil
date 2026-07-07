import React,{useState}from'react';
import{ClassKey}from'../../game/classes';
import{useLanguage}from'../../i18n/LanguageContext';

interface Props{onConfirm:(name:string,cls:ClassKey)=>void;onBack:()=>void}

export function CharacterCreationModern({onConfirm,onBack}:Props){
 const{t,language}=useLanguage();
 const[name,setName]=useState('');
 const valid=name.trim().length>=2;
 return <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#090807] text-amber-50" style={{touchAction:'auto'}}>
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(179,116,36,.22),transparent_35%),linear-gradient(180deg,rgba(31,22,13,.97),rgba(5,5,6,1))]"/>
  <header className="relative z-10 flex items-center gap-3 px-5 pb-4 pt-6 pt-safe-top"><button onClick={onBack} className="h-11 w-11 rounded border border-amber-100/20 bg-black/35 text-2xl">‹</button><div><p className="text-[10px] tracking-[.35em] text-amber-200/45">DUNGEON VEIL</p><h1 className="font-serif text-2xl tracking-widest">{language==='de'?'DEIN SCHÜTZE':'YOUR ARCHER'}</h1></div></header>
  <main className="relative z-10 flex flex-1 flex-col px-5 pb-5">
   <section className="mb-5 rounded border border-amber-100/15 bg-black/30 p-4"><label className="mb-2 block text-[10px] tracking-[.28em] text-amber-100/45">{t.heroName}</label><input value={name} onChange={e=>setName(e.target.value.slice(0,18))} placeholder={t.heroNamePlaceholder} maxLength={18} className="w-full border-b border-amber-100/25 bg-transparent px-1 py-3 font-serif text-2xl outline-none placeholder:text-amber-100/20"/></section>
   <section className="flex flex-1 flex-col items-center justify-center rounded border border-amber-100/15 bg-black/40 px-6 py-8 text-center">
    <div className="grid h-28 w-28 place-items-center rounded-full border border-amber-300/25 bg-[radial-gradient(circle,rgba(212,157,66,.24),rgba(0,0,0,.2)_62%)] text-6xl shadow-[0_0_45px_rgba(212,157,66,.12)]">🏹</div>
    <h2 className="mt-6 font-serif text-4xl font-bold tracking-wider text-[#d7a441]">{t.className.archer}</h2>
    <p className="mt-2 text-xs uppercase tracking-[.22em] text-amber-100/45">{t.classRole.archer}</p>
    <p className="mt-6 max-w-sm text-sm leading-relaxed text-amber-50/70">{t.classDesc.archer}</p>
    <div className="mt-6 rounded border border-amber-300/20 bg-black/30 px-4 py-3 text-xs font-bold tracking-wider text-amber-100/80">{language==='de'?'BEWEGEN = AUSWEICHEN · STEHEN = AUTO-SCHUSS':'MOVE = DODGE · STOP = AUTO-SHOOT'}</div>
   </section>
  </main>
  <footer className="relative z-10 border-t border-amber-100/12 bg-black/55 px-5 py-4"><button onClick={()=>valid&&onConfirm(name.trim(),'archer')} disabled={!valid} className="w-full rounded border-2 py-4 text-base font-bold tracking-[.22em] disabled:border-white/10 disabled:bg-white/5 disabled:text-white/25" style={valid?{background:'#d7a441',borderColor:'#e8bd62',color:'#080604'}:{}}>{t.startGame}</button></footer>
 </div>
}

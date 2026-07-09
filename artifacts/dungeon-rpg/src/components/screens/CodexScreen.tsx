import React, { useMemo, useState } from 'react';
import { EQUIPMENT, loadMetaProgression } from '../../game/metaProgression';
import { loadRetentionProfile } from '../../game/runRetention';
import { loadVeilRelicProfile, VEIL_RELICS } from '../../game/veilRelics';

const BEASTS = [
  ['slime', 'Schleim'], ['goblin', 'Goblin'], ['skeleton', 'Skelett'], ['orc', 'Ork'],
  ['spider', 'Schleierspinne'], ['vampire', 'Vampir'], ['demon', 'Dämon'], ['golem', 'Golem'],
] as const;
const HUNTS = ['Aschenjäger', 'Der Runenlose', 'Nachtklaue', 'Knochenrufer', 'Veyra die Verlorene', 'Schleierhetzer'];
const WARDENS = Array.from({ length: 5 }, (_, index) => ({ key: `1:${(index + 1) * 20}`, name: index === 0 ? 'Der erste Wächter' : `Wächter ${index + 1}` }));
type Tab = 'beasts' | 'hunts' | 'wardens' | 'relics' | 'equipment';

function Entry({ known, title, meta, accent = '#bca276' }: { known: boolean; title: string; meta: string; accent?: string }) {
  return <div className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${known ? 'border-white/10 bg-white/[.045]' : 'border-white/6 bg-black/25 opacity-45'}`}>
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/40 text-lg" style={{ color: known ? accent : '#777' }}>{known ? '◆' : '?'}</div>
    <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-black text-white/82">{known ? title : '???'}</div><div className="mt-1 text-[7px] font-black uppercase tracking-[.15em] text-white/30">{known ? meta : 'NICHT ENTDECKT'}</div></div>
  </div>;
}

export function CodexScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('beasts');
  const retention = useMemo(() => loadRetentionProfile(), []);
  const relics = useMemo(() => loadVeilRelicProfile(), []);
  const meta = useMemo(() => loadMetaProgression(), []);

  const counts = {
    beasts: BEASTS.filter(([id]) => retention.codex.enemies.includes(id)).length,
    hunts: HUNTS.filter(name => retention.codex.hunts.includes(name)).length,
    wardens: WARDENS.filter(warden => retention.codex.bosses.includes(warden.key)).length,
    relics: relics.owned.length,
    equipment: Object.keys(meta.owned).filter(id => (meta.owned as Record<string, number | undefined>)[id]).length,
  };
  const totals = { beasts: BEASTS.length, hunts: HUNTS.length, wardens: WARDENS.length, relics: Object.keys(VEIL_RELICS).length, equipment: Object.keys(EQUIPMENT).length };
  const labels: Record<Tab, string> = { beasts: 'BESTIEN', hunts: 'JAGD', wardens: 'WÄCHTER', relics: 'RELIKTE', equipment: 'AUSRÜSTUNG' };

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(104,74,168,.2),transparent_45%),linear-gradient(180deg,#0e0b0a,#080706_70%)]" />
    <div className="relative mx-auto min-h-full max-w-md px-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+18px))] pt-[max(24px,calc(env(safe-area-inset-top)+10px))]">
      <header className="flex items-start gap-3"><button type="button" onPointerDown={event => { event.preventDefault(); onBack(); }} className="grid h-12 w-12 place-items-center rounded-xl border border-white/12 bg-black/45 text-2xl text-white/70 active:scale-95">‹</button><div><div className="text-[8px] font-black uppercase tracking-[.42em] text-violet-200/45">DUNGEON VEIL</div><h1 className="mt-1 font-serif text-[2.2rem] leading-none tracking-[.08em] text-[#e7c37a]">KODEX</h1><p className="mt-2 text-[8px] uppercase tracking-[.18em] text-white/35">WAS DU HINTER DEM SCHLEIER ENTDECKT HAST</p></div></header>
      <div className="mt-5 grid grid-cols-5 gap-1.5">{(Object.keys(labels) as Tab[]).map(key => <button key={key} type="button" onPointerDown={event => { event.preventDefault(); setTab(key); }} className={`rounded-xl border px-1 py-2.5 text-[6px] font-black tracking-[.08em] ${tab === key ? 'border-amber-300/40 bg-amber-400/12 text-amber-100' : 'border-white/8 bg-black/38 text-white/35'}`}><div>{labels[key]}</div><div className="mt-1 text-[7px]">{counts[key]}/{totals[key]}</div></button>)}</div>
      <section className="mt-4 rounded-3xl border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between"><div className="text-[8px] font-black tracking-[.24em] text-white/42">{labels[tab]}</div><div className="text-[9px] font-black text-amber-200">{counts[tab]} / {totals[tab]}</div></div>
        <div className="grid gap-2">
          {tab === 'beasts' && BEASTS.map(([id, name]) => <Entry key={id} known={retention.codex.enemies.includes(id)} title={name} meta="BESTIENEINTRAG" />)}
          {tab === 'hunts' && HUNTS.map(name => <Entry key={name} known={retention.codex.hunts.includes(name)} title={name} meta="JAGDZIEL BESIEGT" accent="#e6a94a" />)}
          {tab === 'wardens' && WARDENS.map(warden => <Entry key={warden.key} known={retention.codex.bosses.includes(warden.key)} title={warden.name} meta="WÄCHTER BESIEGT" accent="#d36b65" />)}
          {tab === 'relics' && Object.values(VEIL_RELICS).map(relic => <Entry key={relic.id} known={relics.owned.includes(relic.id)} title={relic.nameDe} meta={relic.descriptionDe} accent={relic.accent} />)}
          {tab === 'equipment' && Object.values(EQUIPMENT).map(item => <Entry key={item.id} known={Boolean(meta.owned[item.id])} title={item.nameDe} meta={item.descriptionDe} accent={item.accent} />)}
        </div>
      </section>
    </div>
  </div>;
}

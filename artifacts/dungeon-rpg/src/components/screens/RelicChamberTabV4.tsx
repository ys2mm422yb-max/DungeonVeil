import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { equipVeilRelic, loadVeilRelicProfile, VEIL_RELICS, type VeilRelicId } from '../../game/veilRelics';
import { markRelicSeen } from '../../game/newContentMarkers';

export function RelicChamberTabV4() {
  const { language } = useLanguage();
  const de = language === 'de';
  const [revision, setRevision] = useState(0);
  const profile = loadVeilRelicProfile();
  const [selected, setSelected] = useState<VeilRelicId | null>(profile.equipped ?? profile.owned[0] ?? null);
  const relic = selected ? VEIL_RELICS[selected] : null;
  const refresh = () => setRevision(value => value + 1);

  return <div data-revision={revision} className="mt-4 grid gap-3">
    <section className="rounded-3xl border border-violet-300/25 bg-black/52 p-5">
      <div className="text-[8px] font-black tracking-[.22em] text-violet-200/55">{de ? 'SCHLEIER-RELIKT' : 'VEIL RELIC'}</div>
      {relic ? <>
        <h2 className="mt-3 text-xl font-black" style={{ color: relic.accent }}>{de ? relic.nameDe : relic.nameEn}</h2>
        <p className="mt-3 text-[12px] leading-relaxed text-white/65">{de ? relic.descriptionDe : relic.descriptionEn}</p>
        <button type="button" disabled={profile.equipped === relic.id} onClick={() => { equipVeilRelic(relic.id); refresh(); }} className="mt-5 w-full rounded-xl border border-violet-300/25 bg-violet-500/14 p-3 text-[9px] font-black disabled:opacity-40">
          {profile.equipped === relic.id ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}
        </button>
      </> : <div className="py-8 text-center text-[10px] text-white/35">{de ? 'Noch kein Schleier-Relikt gefunden.' : 'No Veil relic found yet.'}</div>}
    </section>
    <section className="grid gap-2">
      {Object.values(VEIL_RELICS).map(item => {
        const owned = profile.owned.includes(item.id);
        const equipped = profile.equipped === item.id;
        return <button key={item.id} type="button" disabled={!owned} onClick={() => { if (!owned) return; setSelected(item.id); markRelicSeen(item.id); refresh(); }} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/38 p-3 text-left disabled:opacity-30">
          <span className="h-3 w-3 rounded-full" style={{ background: item.accent }} />
          <span className="min-w-0 flex-1 truncate text-[12px] font-black">{de ? item.nameDe : item.nameEn}</span>
          {equipped && <span className="text-[7px] font-black text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}
        </button>;
      })}
    </section>
  </div>;
}

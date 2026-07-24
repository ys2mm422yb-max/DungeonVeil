import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { EQUIPMENT } from '../../game/metaProgression';
import {
  exchangeForgeMarks,
  FORGE_MARK_EVENT,
  FORGE_MARK_EXCHANGE_COST,
  loadForgeMarks,
  type ForgeMarkExchangeReceipt,
} from '../../game/forgeMarks';
import { EquipmentArtwork } from '../CodexArtwork';
import { VeilChamberScreen as LegacyVeilChamberScreen } from './VeilChamberScreenV4';

const CATEGORY_LABELS = {
  bow: { de: 'BOGEN', en: 'BOW' },
  quiver: { de: 'KÖCHER', en: 'QUIVER' },
  armor: { de: 'RÜSTUNG', en: 'ARMOR' },
} as const;
const RARITY_LABELS = {
  common: { de: 'GEWÖHNLICH', en: 'COMMON' },
  rare: { de: 'SELTEN', en: 'RARE' },
  epic: { de: 'EPISCH', en: 'EPIC' },
} as const;

export function VeilChamberScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [profile, setProfile] = useState(loadForgeMarks);
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<ForgeMarkExchangeReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const exchangeIdRef = useRef('');

  useEffect(() => {
    const refresh = () => setProfile({ ...loadForgeMarks() });
    window.addEventListener(FORGE_MARK_EVENT, refresh);
    window.addEventListener('dungeon-veil-cloud-save-restored', refresh);
    return () => {
      window.removeEventListener(FORGE_MARK_EVENT, refresh);
      window.removeEventListener('dungeon-veil-cloud-save-restored', refresh);
    };
  }, []);

  const exchange = () => {
    if (busy || profile.marks < FORGE_MARK_EXCHANGE_COST) return;
    setBusy(true);
    if (!exchangeIdRef.current) {
      exchangeIdRef.current = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `forge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    const result = exchangeForgeMarks(exchangeIdRef.current);
    setProfile({ ...result.profile });
    if (result.exchanged && result.receipt) {
      setReceipt(result.receipt);
      exchangeIdRef.current = '';
    }
    window.setTimeout(() => setBusy(false), 240);
  };

  const reward = receipt ? EQUIPMENT[receipt.item] : null;
  const enough = profile.marks >= FORGE_MARK_EXCHANGE_COST;

  return <div data-testid="forge-mark-chamber-wrapper">
    <style>{`section:has(> [data-testid="equipment-source-marks"]) { display: none !important; }`}</style>
    <LegacyVeilChamberScreen onBack={onBack} />

    <button
      data-testid="forge-mark-open"
      type="button"
      onPointerDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}
      className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] right-4 z-[82] min-h-12 rounded-2xl border border-amber-200/35 bg-[#171006]/95 px-4 py-3 text-left shadow-[0_12px_45px_rgba(0,0,0,.7)] backdrop-blur"
    >
      <span className="block text-[7px] font-black tracking-[.18em] text-amber-100/50">{de ? 'SCHMIEDEMARKEN' : 'FORGE MARKS'}</span>
      <span data-testid="forge-mark-balance" className="mt-1 block text-lg font-black text-amber-100">⚒ {profile.marks}</span>
    </button>

    {open && <div
      data-testid="forge-mark-overlay"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/78 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
      onPointerDown={event => { if (event.target === event.currentTarget) { event.preventDefault(); setOpen(false); } }}
    >
      <section className="w-full max-w-md rounded-[28px] border border-amber-200/25 bg-[#110d08] p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,.82)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[8px] font-black tracking-[.24em] text-amber-100/45">{de ? 'SELTENE BELOHNUNG' : 'RARE REWARD'}</div>
            <h2 className="mt-1 font-serif text-3xl text-[#e7c37a]">{de ? 'SCHMIEDEMARKEN' : 'FORGE MARKS'}</h2>
          </div>
          <button data-testid="forge-mark-close" type="button" aria-label={de ? 'Schließen' : 'Close'} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); setOpen(false); }} className="h-12 w-12 rounded-xl border border-white/12 bg-black/35 text-xl">×</button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-200/[.05] p-4 text-center">
          <div className="text-[8px] font-black tracking-[.2em] text-amber-100/45">{de ? 'DEIN BESTAND' : 'YOUR BALANCE'}</div>
          <div className="mt-2 text-4xl font-black text-amber-100">⚒ <span data-testid="forge-mark-modal-balance">{profile.marks}</span></div>
          <p className="mx-auto mt-3 max-w-xs text-[10px] leading-relaxed text-white/48">{de ? '10 Schmiedemarken ergeben genau einen zufälligen Bogen, Köcher oder eine Rüstung. Duplikate sind möglich und dienen als Upgrade-Kopien.' : '10 Forge Marks grant exactly one random bow, quiver or armor. Duplicates are possible and become upgrade copies.'}</p>
        </div>

        <button
          data-testid="forge-mark-exchange"
          type="button"
          disabled={!enough || busy}
          onPointerDown={event => { event.preventDefault(); event.stopPropagation(); exchange(); }}
          className="mt-4 min-h-14 w-full rounded-2xl border border-emerald-200/30 bg-emerald-400/12 px-4 py-4 text-[10px] font-black tracking-[.12em] text-emerald-100 disabled:border-white/8 disabled:bg-white/[.03] disabled:text-white/25"
        >
          {busy ? '…' : enough ? (de ? '10 MARKEN EINTAUSCHEN' : 'EXCHANGE 10 MARKS') : (de ? `${FORGE_MARK_EXCHANGE_COST - profile.marks} MARKEN FEHLEN` : `${FORGE_MARK_EXCHANGE_COST - profile.marks} MARKS MISSING`)}
        </button>
      </section>
    </div>}

    {receipt && reward && <div data-testid="forge-mark-reward-overlay" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88 p-4 backdrop-blur-md">
      <section className="w-full max-w-sm overflow-hidden rounded-[30px] border border-amber-200/30 bg-[#100c08] p-6 text-center text-white shadow-[0_26px_110px_rgba(0,0,0,.9)]">
        <div className="text-[8px] font-black tracking-[.26em] text-amber-100/45">{de ? 'AUSRÜSTUNG ERHALTEN' : 'EQUIPMENT RECEIVED'}</div>
        <EquipmentArtwork itemId={receipt.item} accent={reward.accent} className="mx-auto mt-6 h-36 w-36" />
        <div data-testid="forge-mark-reward-rarity" className="mt-5 text-[8px] font-black tracking-[.2em]" style={{ color: reward.accent }}>{RARITY_LABELS[receipt.rarity][de ? 'de' : 'en']}</div>
        <h2 data-testid="forge-mark-reward-name" className="mt-2 text-2xl font-black">{de ? reward.nameDe : reward.nameEn}</h2>
        <div data-testid="forge-mark-reward-category" className="mt-2 text-[9px] font-black tracking-[.15em] text-white/42">{CATEGORY_LABELS[receipt.category][de ? 'de' : 'en']}</div>
        <p className="mt-4 text-[10px] leading-relaxed text-white/48">{receipt.convertedDust > 0
          ? (de ? `Max-Level-Duplikat · +${receipt.convertedDust} Schleierstaub` : `Maximum-level duplicate · +${receipt.convertedDust} Veil Dust`)
          : receipt.duplicate ? (de ? 'Duplikat · als Upgrade-Kopie gespeichert' : 'Duplicate · saved as an upgrade copy')
            : (de ? 'Neu im Inventar gespeichert' : 'Saved as new inventory equipment')}</p>
        <button data-testid="forge-mark-reward-confirm" type="button" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); setReceipt(null); setOpen(false); }} className="mt-6 min-h-14 w-full rounded-2xl border border-amber-200/30 bg-amber-300/10 text-[10px] font-black tracking-[.16em] text-amber-100">{de ? 'BESTÄTIGEN' : 'CONFIRM'}</button>
      </section>
    </div>}
  </div>;
}

import React, { useEffect, useState } from 'react';
import { ClassKey } from '../../game/classes';
import { useLanguage } from '../../i18n/LanguageContext';
import { LoadingScreen } from '../LoadingScreen';
import { RangerPreview } from '../RangerPreview';
import { preloadKayKitDungeonRoom } from '../kaykitRoom3D';
import { preloadKayKitEnemyVisuals } from '../kaykitEnemy3D';
import { preloadKayKitHealingPotion } from '../kaykitLoot3D';
import { preloadKayKitOuterWorld } from '../kaykitOuterWorld3D';

interface Props { onConfirm: (name: string, cls: ClassKey) => void | Promise<void>; onBack: () => void }

const RUN_PRELOAD_MAX_MS = 4_500;
let runPreloadPromise: Promise<void> | null = null;

function delay(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
}

function preloadRun() {
  if (!runPreloadPromise) {
    runPreloadPromise = Promise.all([
      preloadKayKitDungeonRoom(1),
      preloadKayKitEnemyVisuals(),
      preloadKayKitHealingPotion(),
      preloadKayKitOuterWorld(),
    ]).then(() => undefined).catch(error => {
      console.warn('Optional run preload failed; continuing with runtime loading', error);
    });
  }
  return runPreloadPromise;
}

function waitForRunPreload() {
  return Promise.race([preloadRun(), delay(RUN_PRELOAD_MAX_MS)]);
}

export function CharacterCreationModern({ onConfirm, onBack }: Props) {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');
  const [starting, setStarting] = useState(false);
  const valid = name.trim().length >= 2 && !starting;

  useEffect(() => { void preloadRun(); }, []);
  const start = async () => {
    if (!valid) return;
    setStarting(true);
    try {
      await waitForRunPreload();
      await onConfirm(name.trim(), 'archer');
    } finally {
      setStarting(false);
    }
  };

  return <div className="fixed left-0 top-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#090807] text-amber-50" style={{ touchAction: 'auto' }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(179,116,36,.25),transparent_38%),linear-gradient(180deg,rgba(31,22,13,.97),rgba(5,5,6,1))]" />
    <header className="relative z-10 flex shrink-0 items-center gap-3 px-5 pb-2 pt-5 pt-safe-top"><button onClick={onBack} className="h-11 w-11 rounded border border-amber-100/20 bg-black/35 text-2xl">‹</button><div><p className="text-[10px] tracking-[.35em] text-amber-200/45">DUNGEON VEIL</p><h1 className="font-serif text-2xl tracking-widest">{language === 'de' ? 'DEIN SCHÜTZE' : 'YOUR ARCHER'}</h1></div></header>
    <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-3">
      <section className="mb-3 shrink-0 rounded border border-amber-100/15 bg-black/30 p-3"><label className="mb-1 block text-[10px] tracking-[.28em] text-amber-100/45">{t.heroName}</label><input value={name} onChange={event => setName(event.target.value.slice(0, 18))} placeholder={t.heroNamePlaceholder} maxLength={18} className="w-full border-b border-amber-100/25 bg-transparent px-1 py-2.5 font-serif text-2xl outline-none placeholder:text-amber-100/20" /></section>
      <section className="flex min-h-[500px] flex-1 flex-col overflow-hidden rounded border border-amber-100/15 bg-black/40 text-center shadow-[0_18px_70px_rgba(0,0,0,.35)]">
        <div className="relative h-[280px] shrink-0 overflow-hidden border-b border-amber-100/10 bg-[radial-gradient(circle_at_50%_42%,rgba(212,157,66,.2),rgba(0,0,0,.12)_56%,rgba(0,0,0,.66)_100%)] sm:h-[320px]">
          <RangerPreview />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-300/20 bg-black/45 px-3 py-1 text-[9px] font-bold tracking-[.25em] text-amber-100/55">{language === 'de' ? 'DER WALDLÄUFER' : 'THE RANGER'}</div>
        </div>
        <div className="shrink-0 px-5 py-4">
          <h2 className="font-serif text-[28px] font-bold tracking-wider text-[#d7a441]">{t.className.archer}</h2>
          <p className="mt-1 text-[10px] uppercase tracking-[.2em] text-amber-100/45">{t.classRole.archer}</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-amber-50/70">{t.classDesc.archer}</p>
          <div className="mx-auto mt-3 max-w-md rounded border border-amber-300/20 bg-black/30 px-4 py-2 text-[9px] font-bold tracking-wider text-amber-100/80">{language === 'de' ? 'BEWEGEN = AUSWEICHEN · STEHEN = AUTO-SCHUSS' : 'MOVE = DODGE · STOP = AUTO-SHOOT'}</div>
        </div>
      </section>
    </main>
    <footer className="relative z-10 shrink-0 border-t border-amber-100/12 bg-black/55 px-5 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))]"><button onClick={start} disabled={!valid} className="w-full rounded border-2 py-3.5 text-base font-bold tracking-[.22em] disabled:border-white/10 disabled:bg-white/5 disabled:text-white/25" style={valid ? { background: '#d7a441', borderColor: '#e8bd62', color: '#080604' } : {}}>{starting ? (language === 'de' ? 'DUNGEON WIRD GELADEN…' : 'LOADING DUNGEON…') : t.startGame}</button></footer>
    {starting && <LoadingScreen
      variant="run"
      language={language}
      testId="new-run-loading-screen"
      title={language === 'de' ? 'DEIN RUN WIRD VORBEREITET' : 'PREPARING YOUR RUN'}
    />}
  </div>;
}

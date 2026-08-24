import React, { useEffect, useState } from 'react';
import { GameState } from '../../game/engine';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  gameState: GameState;
  onRetry: () => void;
  onMainMenu: () => void;
}

const DEATH_BEAT_MS = 1_100;

type DeathSequence = 'settling' | 'settled';

export function GameOverScreen({ gameState, onRetry, onMainMenu }: Props) {
  const { t } = useLanguage();
  const { player } = gameState;
  const [deathSequence, setDeathSequence] = useState<DeathSequence>('settling');

  useEffect(() => {
    const timer = window.setTimeout(() => setDeathSequence('settled'), DEATH_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const settled = deathSequence === 'settled';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-foreground touch-none select-none transition-[background-color,backdrop-filter] duration-500 ${settled ? 'bg-black/92 backdrop-blur-sm' : 'bg-black/35 backdrop-blur-[1px]'}`}
      data-testid="game-over-screen"
      data-death-sequence={deathSequence}
    >
      <div className={`flex w-full flex-col items-center justify-center transition-opacity duration-500 ${settled ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <h1 className="font-serif text-6xl md:text-8xl text-destructive font-black tracking-widest drop-shadow-[0_0_32px_rgba(192,57,43,0.6)] text-center mb-2">
          {t.youDied}
        </h1>
        <p className="text-white/30 tracking-[0.3em] uppercase text-xs mb-10 font-mono">
          {player.playerName} · {t.className[player.playerClass]}
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10 w-full max-w-xs text-center">
          <h2 className="text-primary font-bold tracking-widest mb-4 text-xs font-mono">{t.finalStats}</h2>
          <div className="space-y-3 text-base">
            <StatRow label={t.floorReached} value={gameState.floor} />
            <StatRow label={t.levelReached} value={player.level} />
            <StatRow label={t.enemiesSlain} value={gameState.killCount} />
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs px-6">
          <button
            onClick={onRetry}
            onTouchStart={e => { e.preventDefault(); onRetry(); }}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-sm tracking-widest uppercase active:scale-95 transition-all border-2 border-primary shadow-[0_0_20px_rgba(232,160,32,0.25)]"
            data-testid="button-retry"
          >
            {t.retry}
          </button>
          <button
            onClick={onMainMenu}
            onTouchStart={e => { e.preventDefault(); onMainMenu(); }}
            className="w-full bg-transparent text-white/40 font-bold py-3 rounded-xl text-xs tracking-widest uppercase active:scale-95 transition-all border border-white/15 hover:border-white/30"
            data-testid="button-main-menu"
          >
            {t.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/40 text-sm">{label}</span>
      <span className="text-white font-bold text-lg">{value}</span>
    </div>
  );
}

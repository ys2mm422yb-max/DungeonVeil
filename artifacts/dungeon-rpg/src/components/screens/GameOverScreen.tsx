import React from 'react';
import { GameState } from '../../game/engine';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  gameState: GameState;
  onRetry: () => void;
}

export function GameOverScreen({ gameState, onRetry }: Props) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm text-foreground touch-none select-none animate-in fade-in duration-500">
      <h1 className="font-serif text-6xl md:text-8xl text-destructive font-black tracking-widest drop-shadow-[0_0_30px_rgba(192,57,43,0.6)] text-center mb-8">
        {t.youDied}
      </h1>

      <div className="bg-card/50 border border-card-border rounded-lg p-6 mb-12 min-w-[300px] text-center">
        <h2 className="text-primary font-bold tracking-widest mb-4">{t.finalStats}</h2>
        <div className="space-y-2 text-lg">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.floorReached}</span>
            <span className="font-bold">{gameState.floor}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.levelReached}</span>
            <span className="font-bold">{gameState.player.level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.enemiesSlain}</span>
            <span className="font-bold">{gameState.killCount}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onRetry}
        onTouchStart={(e) => { e.preventDefault(); onRetry(); }}
        className="bg-transparent text-primary font-bold px-12 py-4 rounded-md text-xl tracking-widest uppercase active:scale-95 transition-all border-2 border-primary hover:bg-primary/10"
        data-testid="button-retry"
      >
        {t.retry}
      </button>
    </div>
  );
}

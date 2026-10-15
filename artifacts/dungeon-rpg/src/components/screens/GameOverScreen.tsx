import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { GameState } from '../../game/engine';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  gameState: GameState;
  onRetry: () => void;
  onMainMenu: () => void;
}

export interface GameOverScreenHandle {
  beginDeathPresentation: (transitionStartedAt?: number, onSettled?: () => void) => void;
  resetDeathPresentation: () => void;
}

const DEATH_BEAT_MS = 1_100;

type DeathSequence = 'settling' | 'settled';

export const GameOverScreen = forwardRef<GameOverScreenHandle, Props>(function GameOverScreen(
  { gameState, onRetry, onMainMenu },
  presentationRef,
) {
  const { t } = useLanguage();
  const { player } = gameState;
  const [presented, setPresented] = useState(false);
  const [deathSequence, setDeathSequence] = useState<DeathSequence>('settling');
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const settledAtRef = useRef<number | null>(null);
  const deathBeatStartedAtRef = useRef<number | null>(null);
  const cancelDeadlineRef = useRef<(() => void) | null>(null);

  const resetDeathPresentation = () => {
    cancelDeadlineRef.current?.();
    cancelDeadlineRef.current = null;
    settledAtRef.current = null;
    deathBeatStartedAtRef.current = null;
    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (overlay) {
      delete overlay.dataset.deathSettledAt;
      delete overlay.dataset.deathVisualStartedAt;
      delete overlay.dataset.deathVisualDeadline;
      delete overlay.dataset.deathVisualDuration;
      delete overlay.dataset.deathVisualDriver;
      overlay.dataset.deathSequence = 'inactive';
      overlay.classList.add('hidden', 'pointer-events-none');
      overlay.classList.remove('bg-black/92', 'backdrop-blur-sm');
      overlay.classList.add('bg-black/35');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (content) {
      content.classList.remove('opacity-100');
      content.classList.add('pointer-events-none', 'opacity-0');
    }
    setPresented(false);
    setDeathSequence('settling');
  };

  const beginDeathPresentation = (transitionStartedAt?: number, onSettled?: () => void) => {
    cancelDeadlineRef.current?.();
    let settledOnce = false;
    let frame = 0;
    let timer: number | null = null;
    const visualAnimations: Animation[] = [];
    const now = performance.now();
    const deathBeatStartedAt = deathBeatStartedAtRef.current
      ?? (Number.isFinite(transitionStartedAt) && Number(transitionStartedAt) > 0 && Number(transitionStartedAt) <= now
        ? Number(transitionStartedAt)
        : now);
    deathBeatStartedAtRef.current = deathBeatStartedAt;
    const deadline = deathBeatStartedAt + DEATH_BEAT_MS;
    const overlay = overlayRef.current;
    const content = contentRef.current;

    // This subtree is mounted while the run is alive. Publish the real settling boundary
    // synchronously in the authoritative death event instead of waiting for React to mount
    // a conditional tree on a loaded WebKit main thread.
    settledAtRef.current = null;
    if (overlay) {
      delete overlay.dataset.deathSettledAt;
      overlay.dataset.deathSequence = 'settling';
      overlay.classList.remove('hidden', 'pointer-events-none', 'bg-black/92', 'backdrop-blur-sm');
      overlay.classList.add('bg-black/35');
      overlay.setAttribute('aria-hidden', 'false');
    }
    if (content) {
      content.classList.remove('opacity-100');
      content.classList.add('pointer-events-none', 'opacity-0');
    }
    // Do not enqueue React work inside the fixed visual priority window. The mounted DOM
    // boundary above is already the player-visible source of truth; reconciling the terminal
    // snapshot here can compete with WebKit's deadline callback after a long Product run.

    const settle = () => {
      if (settledOnce) return;
      settledOnce = true;

      const committedAt = performance.now();
      settledAtRef.current = committedAt;
      const overlay = overlayRef.current;
      const content = contentRef.current;
      if (overlay) {
        // Stamp the actual DOM commit clock before publishing `settled`. A loaded mobile
        // browser may delay MutationObserver delivery after this visible commit; evidence
        // must measure the product transition itself rather than observer scheduling lag.
        overlay.dataset.deathSettledAt = String(committedAt);
        overlay.dataset.deathSequence = 'settled';
        overlay.classList.remove('bg-black/35');
        overlay.classList.add('bg-black/92', 'backdrop-blur-sm');
      }
      if (content) {
        content.classList.remove('pointer-events-none', 'opacity-0');
        content.classList.add('opacity-100');
      }

      setPresented(true);
      setDeathSequence('settled');
      onSettled?.();
    };
    const watchDeadline = () => {
      if (settledOnce) return;
      if (performance.now() >= deadline) {
        settle();
        return;
      }
      frame = window.requestAnimationFrame(watchDeadline);
    };

    const remaining = Math.max(0, deadline - performance.now());

    // Start the player-visible transition synchronously at the authoritative boundary.
    // Opacity and backdrop effects continue on the browser animation timeline even when a
    // loaded WebKit main thread cannot deliver timers, rAF, or Promise callbacks on time.
    // React still reconciles semantics after the beat, but it is no longer responsible for
    // making the final card visible within the acceptance window.
    if (overlay && content && remaining > 0 && overlay.animate && content.animate) {
      const visualStartedAt = performance.now();
      overlay.dataset.deathVisualStartedAt = String(visualStartedAt);
      overlay.dataset.deathVisualDeadline = String(deadline);
      overlay.dataset.deathVisualDuration = String(remaining);
      overlay.dataset.deathVisualDriver = 'web-animations';

      const overlayAnimation = overlay.animate(
        [
          { backgroundColor: 'rgba(0, 0, 0, 0.35)', backdropFilter: 'blur(0px)' },
          { backgroundColor: 'rgba(0, 0, 0, 0.92)', backdropFilter: 'blur(4px)' },
        ],
        { duration: remaining, easing: 'ease-out', fill: 'both', iterations: 1 },
      );
      overlayAnimation.id = 'dungeon-veil-death-overlay';
      const contentAnimation = content.animate(
        [
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: 0.55 },
          { opacity: 1, offset: 1 },
        ],
        { duration: remaining, easing: 'ease-out', fill: 'both', iterations: 1 },
      );
      contentAnimation.id = 'dungeon-veil-death-content';
      visualAnimations.push(overlayAnimation, contentAnimation);
    }

    if (remaining === 0) {
      settle();
    } else {
      timer = window.setTimeout(settle, remaining);
      frame = window.requestAnimationFrame(watchDeadline);
      const visualDeadline = visualAnimations[0];
      if (visualDeadline) void visualDeadline.finished.then(settle).catch(() => {
        // Cancellation during unmount/retry is expected and must not create a late settle.
      });
    }

    cancelDeadlineRef.current = () => {
      settledOnce = true;
      if (timer !== null) window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      visualAnimations.forEach(animation => animation.cancel());
    };
  };

  useImperativeHandle(presentationRef, () => ({ beginDeathPresentation, resetDeathPresentation }));
  useLayoutEffect(() => () => cancelDeadlineRef.current?.(), []);

  const settled = deathSequence === 'settled';

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-foreground touch-none select-none transition-[background-color,backdrop-filter] duration-500 ${presented ? '' : 'hidden pointer-events-none'} ${settled ? 'bg-black/92 backdrop-blur-sm' : 'bg-black/35'}`}
      data-testid="game-over-screen"
      data-death-sequence={presented ? deathSequence : 'inactive'}
      data-death-settled-at={settled ? settledAtRef.current ?? undefined : undefined}
      aria-hidden={presented ? 'false' : 'true'}
    >
      <div
        ref={contentRef}
        className={`flex w-full flex-col items-center justify-center transition-opacity duration-500 ${settled ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
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
});

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/40 text-sm">{label}</span>
      <span className="text-white font-bold text-lg">{value}</span>
    </div>
  );
}

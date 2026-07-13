import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameEngine } from '../game/runEngine';
import { completeTutorial, shouldShowTutorial } from '../game/tutorialState';

type Props = {
  getEngine: () => GameEngine | null;
  language: 'de' | 'en';
};

type TutorialStep = {
  eyebrowDe: string;
  eyebrowEn: string;
  titleDe: string;
  titleEn: string;
  bodyDe: string;
  bodyEn: string;
  icon: string;
};

const STEPS: TutorialStep[] = [
  {
    eyebrowDe: 'SCHRITT 1 VON 5', eyebrowEn: 'STEP 1 OF 5', icon: '◎',
    titleDe: 'Bewege deinen Waldläufer', titleEn: 'Move your ranger',
    bodyDe: 'Ziehe den linken Steuerkreis. Sobald du ein Stück gelaufen bist, geht es automatisch weiter.',
    bodyEn: 'Drag the left movement stick. The tutorial advances automatically after you move a short distance.',
  },
  {
    eyebrowDe: 'SCHRITT 2 VON 5', eyebrowEn: 'STEP 2 OF 5', icon: '➜',
    titleDe: 'Weiche mit Dash aus', titleEn: 'Dodge with Dash',
    bodyDe: 'Tippe rechts auf Dash. Während des kurzen Ausweichschritts kannst du Angriffen entkommen.',
    bodyEn: 'Tap Dash on the right. The short dodge lets you escape enemy attacks.',
  },
  {
    eyebrowDe: 'SCHRITT 3 VON 5', eyebrowEn: 'STEP 3 OF 5', icon: '➶',
    titleDe: 'Angriffe laufen automatisch', titleEn: 'Attacks are automatic',
    bodyDe: 'Bleib kurz stehen: Dein Waldläufer schießt automatisch auf Gegner in Reichweite. Neue Gaben verstärken Pfeile, Elemente und Abklingzeiten.',
    bodyEn: 'Stand still briefly: your ranger automatically shoots enemies in range. New gifts improve arrows, elements and cooldowns.',
  },
  {
    eyebrowDe: 'SCHRITT 4 VON 5', eyebrowEn: 'STEP 4 OF 5', icon: '✦',
    titleDe: 'Überlebe und öffne den Ausgang', titleEn: 'Survive and open the exit',
    bodyDe: 'Oben siehst du Leben, Raum und Fortschritt. Besiege alle Gegner, sammle Beute und betrete danach das leuchtende Portal.',
    bodyEn: 'Your health, room and progress are shown above. Defeat every enemy, collect loot, then enter the glowing portal.',
  },
  {
    eyebrowDe: 'SCHRITT 5 VON 5', eyebrowEn: 'STEP 5 OF 5', icon: '♛',
    titleDe: 'Der Schleier geht im Hauptmenü weiter', titleEn: 'The Veil continues in the main menu',
    bodyDe: 'Dort warten Aufgaben, Postfach, Freunde, Gilde, Schleierkammer und der gemeinsame Wochenboss. Online-Funktionen sind optional – dein Run funktioniert auch offline.',
    bodyEn: 'Quests, mailbox, friends, guild, Veil Chamber and the shared weekly boss wait there. Online features are optional—your run also works offline.',
  },
];

export function TutorialOverlay({ getEngine, language }: Props) {
  const de = language === 'de';
  const [open, setOpen] = useState(() => shouldShowTutorial());
  const [step, setStep] = useState(0);
  const [movementProgress, setMovementProgress] = useState(0);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dodgeBaselineRef = useRef(0);

  useEffect(() => {
    const reopen = () => {
      startPositionRef.current = null;
      dodgeBaselineRef.current = 0;
      setMovementProgress(0);
      setStep(0);
      setOpen(true);
    };
    window.addEventListener('dungeon-veil-tutorial-requested', reopen);
    return () => window.removeEventListener('dungeon-veil-tutorial-requested', reopen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      const engine = getEngine();
      const player = engine?.state.player;
      if (!engine || !player) return;

      if (step <= 1) player.invincibleUntil = Math.max(player.invincibleUntil, performance.now() + 650);

      if (step === 0) {
        startPositionRef.current ??= { x: player.x, y: player.y };
        const start = startPositionRef.current;
        const distance = Math.hypot(player.x - start.x, player.y - start.y);
        const progress = Math.min(1, distance / 48);
        setMovementProgress(progress);
        if (progress >= 1) {
          dodgeBaselineRef.current = player.lastDodgeTime;
          setStep(1);
        }
      } else if (step === 1) {
        if (!dodgeBaselineRef.current) dodgeBaselineRef.current = player.lastDodgeTime;
        if (player.lastDodgeTime > dodgeBaselineRef.current) setStep(2);
      }
    }, 90);
    return () => window.clearInterval(timer);
  }, [getEngine, open, step]);

  const copy = useMemo(() => STEPS[step] ?? STEPS[0], [step]);
  if (!open) return null;

  const finish = () => {
    completeTutorial();
    setOpen(false);
  };

  const canAdvance = step >= 2;
  return <div data-testid="tutorial-overlay" className="pointer-events-none fixed inset-0 z-[96]">
    <div className="pointer-events-auto absolute left-1/2 top-[max(5.7rem,calc(env(safe-area-inset-top)+4.6rem))] w-[92vw] max-w-sm -translate-x-1/2 rounded-3xl border border-amber-300/24 bg-[linear-gradient(150deg,rgba(23,17,10,.96),rgba(8,8,9,.96))] p-4 text-white shadow-[0_22px_60px_rgba(0,0,0,.58)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-300/22 bg-amber-400/10 text-lg text-amber-200">{copy.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[7px] font-black uppercase tracking-[.26em] text-amber-200/45">{de ? copy.eyebrowDe : copy.eyebrowEn}</div>
          <div className="mt-1 text-[15px] font-black text-amber-50">{de ? copy.titleDe : copy.titleEn}</div>
          <div className="mt-1.5 text-[10px] leading-relaxed text-white/52">{de ? copy.bodyDe : copy.bodyEn}</div>
        </div>
      </div>

      {step === 0 && <div className="mt-3">
        <div className="mb-1 flex justify-between text-[7px] font-black uppercase tracking-[.16em] text-white/30"><span>{de ? 'Bewegung' : 'Movement'}</span><span>{Math.round(movementProgress * 100)}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-gradient-to-r from-amber-600 to-amber-200 transition-[width]" style={{ width: `${movementProgress * 100}%` }} /></div>
      </div>}
      {step === 1 && <div className="mt-3 rounded-xl border border-cyan-300/12 bg-cyan-400/[.04] px-3 py-2 text-center text-[8px] font-black uppercase tracking-[.18em] text-cyan-100/62">{de ? 'Tippe jetzt auf DASH' : 'Tap DASH now'}</div>}

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={finish} className="min-h-10 flex-1 rounded-xl border border-white/8 bg-white/[.025] px-3 text-[8px] font-black uppercase tracking-[.14em] text-white/34 active:scale-[.98]">{de ? 'Überspringen' : 'Skip'}</button>
        {canAdvance && <button type="button" onClick={() => step >= STEPS.length - 1 ? finish() : setStep(value => value + 1)} className="min-h-10 flex-[1.35] rounded-xl border border-amber-300/28 bg-amber-500/12 px-3 text-[8px] font-black uppercase tracking-[.14em] text-amber-100 active:scale-[.98]">{step >= STEPS.length - 1 ? (de ? 'Fertig' : 'Finish') : (de ? 'Weiter' : 'Next')}</button>}
      </div>
    </div>
  </div>;
}

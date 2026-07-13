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
    eyebrowDe: 'KAPITEL 1 · ERWACHEN', eyebrowEn: 'CHAPTER 1 · AWAKENING', icon: '◎',
    titleDe: 'Der Waldläufer erwacht', titleEn: 'The ranger awakens',
    bodyDe: 'Der Schleier hat dich ausgespuckt. Ziehe den linken Steuerkreis und finde wieder festen Boden unter deinen Füßen.',
    bodyEn: 'The Veil has cast you out. Drag the left movement stick and find solid ground beneath your feet again.',
  },
  {
    eyebrowDe: 'KAPITEL 2 · ERSTER KONTAKT', eyebrowEn: 'CHAPTER 2 · FIRST CONTACT', icon: '➶',
    titleDe: 'Dein Bogen kennt den Feind', titleEn: 'Your bow knows the enemy',
    bodyDe: 'Bleib kurz stehen. Gegner in Reichweite werden automatisch beschossen. Du lenkst Bewegung und Position – dein Waldläufer übernimmt den Schuss.',
    bodyEn: 'Stand still briefly. Enemies in range are attacked automatically. You control movement and positioning—the ranger handles the shot.',
  },
  {
    eyebrowDe: 'KAPITEL 3 · AUSWEICHEN', eyebrowEn: 'CHAPTER 3 · DODGE', icon: '➜',
    titleDe: 'Durch die Lücke', titleEn: 'Through the opening',
    bodyDe: 'Tippe rechts auf Dash. Während des kurzen Ausweichschritts kannst du gefährlichen Treffern entkommen.',
    bodyEn: 'Tap Dash on the right. The short dodge lets you escape dangerous hits.',
  },
  {
    eyebrowDe: 'KAPITEL 4 · GABEN', eyebrowEn: 'CHAPTER 4 · GIFTS', icon: '✦',
    titleDe: 'Der Schleier verändert deine Pfeile', titleEn: 'The Veil changes your arrows',
    bodyDe: 'Gaben verstärken Feuer, Frost, Mehrfachschuss und Abklingzeiten. Baue nicht alles gleich – entscheide dich für eine Richtung und kombiniere passende Effekte.',
    bodyEn: 'Gifts improve fire, frost, multishot and cooldowns. Do not build everything equally—choose a direction and combine matching effects.',
  },
  {
    eyebrowDe: 'KAPITEL 5 · BEUTE', eyebrowEn: 'CHAPTER 5 · LOOT', icon: '◆',
    titleDe: 'Nichts im Dungeon ist umsonst', titleEn: 'Nothing in the dungeon is free',
    bodyDe: 'Besiege alle Gegner, sammle Gold und Beute und betrete danach das leuchtende Portal. Oben siehst du Leben, Raum und Fortschritt.',
    bodyEn: 'Defeat every enemy, collect gold and loot, then enter the glowing portal. Your health, room and progress are shown above.',
  },
  {
    eyebrowDe: 'KAPITEL 6 · DORFPLATZ', eyebrowEn: 'CHAPTER 6 · VILLAGE SQUARE', icon: '⌂',
    titleDe: 'Im Dorf warten echte Verbündete', titleEn: 'Real allies wait in the village',
    bodyDe: 'Im Hauptmenü sprichst du mit Questmeisterin, Postmeister, Späherin und Gildenmeister. Dort findest du Aufgaben, Postfach, Freunde, Profile und Gilden.',
    bodyEn: 'In the main menu, speak with the Quest Keeper, Postmaster, Scout and Guildmaster. They lead to quests, mailbox, friends, profiles and guilds.',
  },
  {
    eyebrowDe: 'KAPITEL 7 · WELTENHÜTER', eyebrowEn: 'CHAPTER 7 · WORLD KEEPER', icon: '♛',
    titleDe: 'Jede Woche öffnet sich der große Riss', titleEn: 'The great rift opens each week',
    bodyDe: 'Der Weltenhüter führt dich zum gemeinsamen Wochenboss. Dein Schaden zählt für dich, deine Freunde und deine Gilde. Belohnungen landen im Postfach. Online ist optional – normale Runs funktionieren auch offline.',
    bodyEn: 'The World Keeper leads to the shared weekly boss. Your damage counts for you, your friends and your guild. Rewards arrive in the mailbox. Online play is optional—normal runs also work offline.',
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

      if (step <= 2) player.invincibleUntil = Math.max(player.invincibleUntil, performance.now() + 650);

      if (step === 0) {
        startPositionRef.current ??= { x: player.x, y: player.y };
        const start = startPositionRef.current;
        const distance = Math.hypot(player.x - start.x, player.y - start.y);
        const progress = Math.min(1, distance / 48);
        setMovementProgress(progress);
        if (progress >= 1) setStep(1);
      } else if (step === 2) {
        if (!dodgeBaselineRef.current) dodgeBaselineRef.current = player.lastDodgeTime;
        if (player.lastDodgeTime > dodgeBaselineRef.current) setStep(3);
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

  const advance = () => {
    if (step >= STEPS.length - 1) {
      finish();
      return;
    }
    if (step === 1) {
      dodgeBaselineRef.current = getEngine()?.state.player.lastDodgeTime ?? 0;
    }
    setStep(value => value + 1);
  };

  const canAdvance = step !== 0 && step !== 2;
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
      {step === 2 && <div className="mt-3 rounded-xl border border-cyan-300/12 bg-cyan-400/[.04] px-3 py-2 text-center text-[8px] font-black uppercase tracking-[.18em] text-cyan-100/62">{de ? 'Tippe jetzt auf DASH' : 'Tap DASH now'}</div>}

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={finish} className="min-h-10 flex-1 rounded-xl border border-white/8 bg-white/[.025] px-3 text-[8px] font-black uppercase tracking-[.14em] text-white/34 active:scale-[.98]">{de ? 'Überspringen' : 'Skip'}</button>
        {canAdvance && <button type="button" onClick={advance} className="min-h-10 flex-[1.35] rounded-xl border border-amber-300/28 bg-amber-500/12 px-3 text-[8px] font-black uppercase tracking-[.14em] text-amber-100 active:scale-[.98]">{step >= STEPS.length - 1 ? (de ? 'Fertig' : 'Finish') : (de ? 'Weiter' : 'Next')}</button>}
      </div>
    </div>
  </div>;
}

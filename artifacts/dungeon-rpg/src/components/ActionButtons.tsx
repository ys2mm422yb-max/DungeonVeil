import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../game/engine';
import { useLanguage } from '../i18n/LanguageContext';
import { CLASS_DEFS, CLASS_SKILL_NAMES } from '../game/classes';

interface Props {
  gameState: GameState;
  onAttack: () => void;
  onDodge: () => void;
  onSkill: () => void;
  onInteract: () => void;
}

type ActionName = 'attack' | 'dodge' | 'skill' | 'interact';

export function ActionButtons({ gameState, onAttack, onDodge, onSkill, onInteract }: Props) {
  const { t, language } = useLanguage();
  const { player } = gameState;
  const classDef = CLASS_DEFS[player.playerClass];
  const skillName = CLASS_SKILL_NAMES[player.playerClass][language === 'de' ? 'de' : 'en'];
  const activePointers = useRef(new Map<number, ActionName>());

  const [cooldowns, setCooldowns] = useState({ attack: 0, dodge: 0, skill: 0 });

  useEffect(() => {
    let frameId: number;
    const update = () => {
      setCooldowns({
        attack: Math.max(0, player.attackCooldown / classDef.attackCooldownMs),
        dodge:  Math.max(0, player.dodgeCooldown  / classDef.dodgeCooldownMs),
        skill:  Math.max(0, player.skillCooldown  / classDef.skillCooldownMs),
      });
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [player, classDef]);

  const press = useCallback(
    (name: ActionName, action: () => void) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      activePointers.current.set(e.pointerId, name);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      action();
    },
    [],
  );

  const release = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    activePointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const CooldownOverlay = ({ progress }: { progress: number }) =>
    progress > 0 ? (
      <div
        className="absolute bottom-0 left-0 right-0 rounded-2xl bg-black/55 pointer-events-none"
        style={{ height: `${progress * 100}%` }}
      />
    ) : null;

  return (
    <div className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] w-[clamp(10.5rem,42vw,12rem)] aspect-square pointer-events-auto z-50 touch-none select-none">
      <div className="relative w-full h-full">
        {/* ATTACK — large, bottom-left */}
        <button
          type="button"
          onPointerDown={press('attack', onAttack)}
          onPointerUp={release}
          onPointerCancel={release}
          className="absolute bottom-0 left-0 w-[46%] aspect-square rounded-2xl border-2 border-destructive/60 bg-destructive/70 shadow-[0_0_18px_rgba(192,57,43,0.45)] active:scale-90 transition-transform flex flex-col items-center justify-center overflow-hidden touch-none gap-0.5 select-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          data-testid="button-attack"
        >
          <CooldownOverlay progress={cooldowns.attack} />
          <span className="text-white font-black text-xl z-10 pointer-events-none">⚔</span>
          <span className="text-white/80 font-bold text-xs tracking-widest z-10 pointer-events-none">ATK</span>
        </button>

        {/* DODGE — top-left */}
        <button
          type="button"
          onPointerDown={press('dodge', onDodge)}
          onPointerUp={release}
          onPointerCancel={release}
          className="absolute top-0 left-[12%] w-[34%] aspect-square rounded-2xl border-2 border-blue-400/60 bg-blue-600/70 shadow-[0_0_14px_rgba(41,128,185,0.4)] active:scale-90 transition-transform flex flex-col items-center justify-center overflow-hidden touch-none gap-0.5 select-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          data-testid="button-dodge"
        >
          <CooldownOverlay progress={cooldowns.dodge} />
          <span className="text-white/80 font-bold text-xs tracking-widest z-10 pointer-events-none">{t.dodge}</span>
        </button>

        {/* SKILL — top-right */}
        <button
          type="button"
          onPointerDown={press('skill', onSkill)}
          onPointerUp={release}
          onPointerCancel={release}
          className="absolute top-0 right-0 w-[40%] aspect-square rounded-2xl border-2 active:scale-90 transition-transform flex flex-col items-center justify-center overflow-hidden touch-none gap-0.5 select-none"
          style={{
            background: `${classDef.color}b3`,
            borderColor: `${classDef.color}99`,
            boxShadow: `0 0 16px ${classDef.glowColor}`,
            WebkitTapHighlightColor: 'transparent',
          }}
          data-testid="button-skill"
        >
          <CooldownOverlay progress={cooldowns.skill} />
          <span className="font-black text-xs tracking-widest z-10 text-white pointer-events-none">{skillName}</span>
        </button>

        {/* INTERACT — bottom-right */}
        <button
          type="button"
          onPointerDown={press('interact', onInteract)}
          onPointerUp={release}
          onPointerCancel={release}
          className="absolute bottom-0 right-0 w-[32%] aspect-square rounded-2xl border-2 border-primary/50 bg-primary/60 shadow-[0_0_12px_rgba(232,160,32,0.35)] active:scale-90 transition-transform flex items-center justify-center touch-none select-none"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          data-testid="button-interact"
        >
          <span className="text-white font-bold text-xs tracking-widest pointer-events-none">{t.interact}</span>
        </button>
      </div>
    </div>
  );
}

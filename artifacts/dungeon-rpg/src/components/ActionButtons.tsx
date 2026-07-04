import React, { useCallback, useEffect, useState } from 'react';
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

export function ActionButtons({ gameState, onAttack, onDodge, onSkill, onInteract }: Props) {
  const { t, language } = useLanguage();
  const { player } = gameState;
  const classDef = CLASS_DEFS[player.playerClass];
  const skillName = CLASS_SKILL_NAMES[player.playerClass][language === 'de' ? 'de' : 'en'];

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

  const touch = useCallback((action: () => void) => (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  }, []);

  const CooldownOverlay = ({ progress }: { progress: number }) =>
    progress > 0 ? <div className="absolute inset-0 rounded-2xl bg-black/55" style={{ height: `${progress * 100}%` }} /> : null;

  return (
    <div className="fixed bottom-8 right-6 w-48 h-48 pointer-events-auto z-50">
      <div className="relative w-full h-full">
        {/* ATTACK — large, bottom-left */}
        <button
          onTouchStart={touch(onAttack)}
          className="absolute bottom-0 left-0 w-[88px] h-[88px] rounded-2xl border-2 border-destructive/60 bg-destructive/70 shadow-[0_0_18px_rgba(192,57,43,0.45)] active:scale-90 transition-transform flex flex-col items-center justify-center overflow-hidden touch-none gap-0.5"
          data-testid="button-attack"
        >
          <CooldownOverlay progress={cooldowns.attack} />
          <span className="text-white font-black text-xl z-10">⚔</span>
          <span className="text-white/80 font-bold text-xs tracking-widest z-10">TEST</span>
        </button>

        {/* DODGE — top-left */}
        <button
          onTouchStart={touch(onDodge)}
          className="absolute top-0 left-6 w-[64px] h-[64px] rounded-2xl border-2 border-blue-400/60 bg-blue-600/70 shadow-[0_0_14px_rgba(41,128,185,0.4)] active:scale-90 transition-transform flex flex-col items-center justify-center overflow-hidden touch-none gap-0.5"
          data-testid="button-dodge"
        >
          <CooldownOverlay progress={cooldowns.dodge} />
          <span className="text-white/80 font-bold text-xs tracking-widest z-10">{t.dodge}</span>
        </button>

        {/* SKILL — top-right */}
        <button
          onTouchStart={touch(onSkill)}
          className="absolute top-0 right-0 w-[76px] h-[76px] rounded-2xl border-2 active:scale-90 transition-transform flex flex-col items-center justify-center overflow-hidden touch-none gap-0.5"
          style={{
            background: `${classDef.color}b3`,
            borderColor: `${classDef.color}99`,
            boxShadow: `0 0 16px ${classDef.glowColor}`,
          }}
          data-testid="button-skill"
        >
          <CooldownOverlay progress={cooldowns.skill} />
          <span className="font-black text-xs tracking-widest z-10 text-white">{skillName}</span>
        </button>

        {/* INTERACT — bottom-right */}
        <button
          onTouchStart={touch(onInteract)}
          className="absolute bottom-0 right-0 w-[60px] h-[60px] rounded-2xl border-2 border-primary/50 bg-primary/60 shadow-[0_0_12px_rgba(232,160,32,0.35)] active:scale-90 transition-transform flex items-center justify-center touch-none"
          data-testid="button-interact"
        >
          <span className="text-white font-bold text-xs tracking-widest">{t.interact}</span>
        </button>
      </div>
    </div>
  );
}

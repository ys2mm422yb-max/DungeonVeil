import React, { useCallback, useEffect, useState } from 'react';
import { GameState } from '../game/engine';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  gameState: GameState;
  onAttack: () => void;
  onDodge: () => void;
  onSkill: () => void;
  onInteract: () => void;
}

export function ActionButtons({ gameState, onAttack, onDodge, onSkill, onInteract }: Props) {
  const { t } = useLanguage();
  const { player } = gameState;

  const [cooldowns, setCooldowns] = useState({ attack: 0, dodge: 0, skill: 0 });

  useEffect(() => {
    let frameId: number;
    const updateCooldowns = () => {
      setCooldowns({
        attack: Math.max(0, player.attackCooldown / 400),
        dodge: Math.max(0, player.dodgeCooldown / 1500),
        skill: Math.max(0, player.skillCooldown / 3000)
      });
      frameId = requestAnimationFrame(updateCooldowns);
    };
    frameId = requestAnimationFrame(updateCooldowns);
    return () => cancelAnimationFrame(frameId);
  }, [player]);

  const { attack: attackProgress, dodge: dodgeProgress, skill: skillProgress } = cooldowns;

  const createTouchHandler = useCallback((action: () => void) => {
    return (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      action();
    };
  }, []);

  return (
    <div className="fixed bottom-8 right-8 w-48 h-48 pointer-events-auto z-50">
      <div className="relative w-full h-full">
        {/* ATTACK - Top Left */}
        <button
          onTouchStart={createTouchHandler(onAttack)}
          className="absolute top-0 left-0 w-[84px] h-[84px] rounded-2xl bg-destructive/80 border-2 border-destructive shadow-[0_0_15px_rgba(192,57,43,0.5)] active:scale-90 transition-transform flex items-center justify-center overflow-hidden touch-none"
          data-testid="button-attack"
        >
          <span className="text-white font-bold text-lg drop-shadow-md z-10">{t.attack}</span>
          {attackProgress > 0 && (
            <div className="absolute inset-0 bg-black/50" style={{ height: `${attackProgress * 100}%` }} />
          )}
        </button>

        {/* DODGE - Top Right */}
        <button
          onTouchStart={createTouchHandler(onDodge)}
          className="absolute top-2 right-2 w-[64px] h-[64px] rounded-2xl bg-blue-600/80 border-2 border-blue-400 shadow-[0_0_15px_rgba(41,128,185,0.5)] active:scale-90 transition-transform flex items-center justify-center overflow-hidden touch-none"
          data-testid="button-dodge"
        >
          <span className="text-white font-bold text-sm drop-shadow-md z-10">{t.dodge}</span>
          {dodgeProgress > 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="16" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="32" strokeDasharray={`${dodgeProgress * 100} 100`} />
              </svg>
            </div>
          )}
        </button>

        {/* SKILL - Bottom Left */}
        <button
          onTouchStart={createTouchHandler(onSkill)}
          className="absolute bottom-2 left-2 w-[64px] h-[64px] rounded-2xl bg-purple-600/80 border-2 border-purple-400 shadow-[0_0_15px_rgba(142,68,173,0.5)] active:scale-90 transition-transform flex items-center justify-center overflow-hidden touch-none"
          data-testid="button-skill"
        >
          <span className="text-white font-bold text-sm drop-shadow-md z-10">{t.skill}</span>
          {skillProgress > 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="16" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="32" strokeDasharray={`${skillProgress * 100} 100`} />
              </svg>
            </div>
          )}
        </button>

        {/* INTERACT - Bottom Right */}
        <button
          onTouchStart={createTouchHandler(onInteract)}
          className="absolute bottom-0 right-0 w-[72px] h-[72px] rounded-2xl bg-primary/80 border-2 border-primary shadow-[0_0_15px_rgba(232,160,32,0.5)] active:scale-90 transition-transform flex items-center justify-center touch-none"
          data-testid="button-interact"
        >
          <span className="text-primary-foreground font-bold text-sm drop-shadow-md">{t.interact}</span>
        </button>
      </div>
    </div>
  );
}

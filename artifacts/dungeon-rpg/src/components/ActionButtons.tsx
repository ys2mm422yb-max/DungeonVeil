import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../game/engine';
import { useLanguage } from '../i18n/LanguageContext';
import { CLASS_DEFS, CLASS_SKILL_NAMES } from '../game/classes';
import { TINY_UI } from '../game/premiumPixelArt';

interface Props {
  gameState: GameState;
  onAttack: () => void;
  onDodge: () => void;
  onSkill: () => void;
  onInteract: () => void;
}

type ActionName = 'attack' | 'dodge' | 'skill' | 'interact';

const baseButtonClass = 'rounded-full border-[3px] border-[#8b6a35] bg-black/85 shadow-[inset_0_0_14px_rgba(255,210,120,0.18),0_6px_18px_rgba(0,0,0,0.75)] active:scale-90 transition-transform overflow-hidden touch-none select-none flex items-center justify-center';
const pixelButtonStyle: React.CSSProperties = {
  backgroundImage: `url("${TINY_UI.roundButtonBlue}")`,
  backgroundSize: '100% 100%',
  imageRendering: 'pixelated',
  WebkitTapHighlightColor: 'transparent',
};

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
        className="absolute bottom-0 left-0 right-0 bg-black/55 pointer-events-none"
        style={{ height: `${progress * 100}%` }}
      />
    ) : null;

  return (
    <div
      className="fixed w-[clamp(10.5rem,42vw,12rem)] aspect-square pointer-events-auto z-50 touch-none select-none"
      style={{
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
      }}
    >
      <div className="relative w-full h-full">
        <button
          type="button"
          onPointerDown={press('attack', onAttack)}
          onPointerUp={release}
          onPointerCancel={release}
          className={`absolute bottom-0 right-0 w-[48%] aspect-square ${baseButtonClass}`}
          style={{ ...pixelButtonStyle, backgroundImage: `url("${TINY_UI.roundButtonRed}")` }}
          data-testid="button-attack"
          aria-label="Attack"
        >
          <CooldownOverlay progress={cooldowns.attack} />
          <div className="absolute inset-[9%] rounded-full border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
          <span className="text-white text-[13px] font-black tracking-widest z-10 pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]">ATK</span>
        </button>

        <button
          type="button"
          onPointerDown={press('dodge', onDodge)}
          onPointerUp={release}
          onPointerCancel={release}
          className={`absolute bottom-[12%] left-[2%] w-[34%] aspect-square ${baseButtonClass}`}
          style={pixelButtonStyle}
          data-testid="button-dodge"
          aria-label="Dash"
        >
          <CooldownOverlay progress={cooldowns.dodge} />
          <div className="absolute inset-[10%] rounded-full bg-gradient-to-br from-purple-800 via-purple-950 to-black" />
          <span className="font-black text-[10px] tracking-widest z-10 text-white pointer-events-none">DASH</span>
        </button>

        <button
          type="button"
          onPointerDown={press('skill', onSkill)}
          onPointerUp={release}
          onPointerCancel={release}
          className={`absolute top-[8%] left-[20%] w-[38%] aspect-square ${baseButtonClass}`}
          style={{
            boxShadow: `inset 0 0 14px ${classDef.glowColor}, 0 6px 18px rgba(0,0,0,0.75)`,
            ...pixelButtonStyle,
          }}
          data-testid="button-skill"
          aria-label={skillName}
        >
          <CooldownOverlay progress={cooldowns.skill} />
          <div
            className="absolute inset-[10%] rounded-full"
            style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), ${classDef.color}cc 35%, rgba(0,0,0,0.9) 100%)` }}
          />
          <span className="font-black text-[11px] tracking-widest z-10 text-white pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">{skillName}</span>
        </button>

        <button
          type="button"
          onPointerDown={press('interact', onInteract)}
          onPointerUp={release}
          onPointerCancel={release}
          className={`absolute right-0 top-[34%] w-[30%] aspect-square ${baseButtonClass}`}
          style={{ ...pixelButtonStyle, backgroundImage: `url("${TINY_UI.roundButtonRed}")` }}
          data-testid="button-interact"
          aria-label={t.interact}
        >
          <div className="absolute inset-[11%] rounded-full bg-gradient-to-br from-red-800 via-red-950 to-black" />
          <span className="text-white font-black text-xs tracking-widest pointer-events-none z-10">{t.interact}</span>
        </button>
      </div>
    </div>
  );
}

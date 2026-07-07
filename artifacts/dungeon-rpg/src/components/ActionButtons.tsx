import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../game/engine';
import { useLanguage } from '../i18n/LanguageContext';
import { CLASS_DEFS, CLASS_SKILL_NAMES } from '../game/classes';
import { getTinyIcon, TINY_UI } from '../game/premiumPixelArt';

interface Props {
  gameState: GameState;
  onAttack: () => void;
  onDodge: () => void;
  onSkill: () => void;
  onInteract: () => void;
}

type ActionName = 'attack' | 'dodge' | 'skill' | 'interact';

const BUTTON_BASE = 'absolute grid place-items-center overflow-hidden rounded-full border border-[#d2a957]/65 bg-black/72 shadow-[0_7px_18px_rgba(0,0,0,.62)] active:scale-90 transition-transform touch-none select-none';

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
        dodge: Math.max(0, player.dodgeCooldown / classDef.dodgeCooldownMs),
        skill: Math.max(0, player.skillCooldown / classDef.skillCooldownMs),
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

  const actionStyle = (image: string): React.CSSProperties => ({
    backgroundImage: `url("${image}")`,
    backgroundSize: '100% 100%',
    imageRendering: 'pixelated',
    WebkitTapHighlightColor: 'transparent',
  });

  const Cooldown = ({ value }: { value: number }) => value > 0 ? (
    <div
      className="absolute inset-[9%] rounded-full pointer-events-none"
      style={{ background: `conic-gradient(rgba(0,0,0,.72) ${value * 360}deg, transparent 0deg)`, transform: 'rotate(-90deg)' }}
    />
  ) : null;

  const Icon = ({ index, label }: { index: number; label: string }) => (
    <>
      <img src={getTinyIcon(index)} alt="" draggable={false} className="relative z-10 h-[46%] w-[46%] object-contain [image-rendering:pixelated] drop-shadow-[0_2px_3px_rgba(0,0,0,.95)]" />
      <span className="absolute inset-x-1 bottom-[8%] z-10 truncate text-center text-[7px] font-black tracking-[.12em] text-white/90 drop-shadow-[0_1px_2px_#000]">{label}</span>
    </>
  );

  return (
    <div
      className="fixed z-50 h-[154px] w-[164px] pointer-events-auto touch-none select-none"
      style={{ right: 'max(.55rem, env(safe-area-inset-right))', bottom: 'max(.7rem, calc(env(safe-area-inset-bottom) + .3rem))' }}
    >
      <button type="button" onPointerDown={press('attack', onAttack)} onPointerUp={release} onPointerCancel={release} className={`${BUTTON_BASE} bottom-0 right-0 h-[78px] w-[78px]`} style={actionStyle(TINY_UI.roundButtonRed)} aria-label="Attack" data-testid="button-attack">
        <Cooldown value={cooldowns.attack} />
        <Icon index={1} label="ATK" />
      </button>
      <button type="button" onPointerDown={press('skill', onSkill)} onPointerUp={release} onPointerCancel={release} className={`${BUTTON_BASE} right-[60px] top-0 h-[64px] w-[64px]`} style={{ ...actionStyle(TINY_UI.roundButtonBlue), boxShadow: `0 0 18px ${classDef.glowColor}, 0 7px 18px rgba(0,0,0,.62)` }} aria-label={skillName} data-testid="button-skill">
        <Cooldown value={cooldowns.skill} />
        <Icon index={player.playerClass === 'warrior' ? 4 : player.playerClass === 'mage' ? 7 : 2} label={skillName} />
      </button>
      <button type="button" onPointerDown={press('dodge', onDodge)} onPointerUp={release} onPointerCancel={release} className={`${BUTTON_BASE} bottom-[8px] left-[3px] h-[56px] w-[56px]`} style={actionStyle(TINY_UI.roundButtonBlue)} aria-label="Dash" data-testid="button-dodge">
        <Cooldown value={cooldowns.dodge} />
        <Icon index={8} label="DASH" />
      </button>
      <button type="button" onPointerDown={press('interact', onInteract)} onPointerUp={release} onPointerCancel={release} className={`${BUTTON_BASE} right-[3px] top-[21px] h-[48px] w-[48px]`} style={actionStyle(TINY_UI.roundButtonRed)} aria-label={t.interact} data-testid="button-interact">
        <Icon index={0} label={language === 'de' ? 'AKTION' : 'USE'} />
      </button>
    </div>
  );
}

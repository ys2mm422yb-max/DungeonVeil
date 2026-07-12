import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SaveData } from '../game/saveManager';
import { GameEngine, type GameState } from '../game/runEngine';
import { submitWorldBossHit, type WorldBossEvent } from '../game/supabaseOnline';
import { CombatStage } from './CombatStage';
import { VirtualJoystick } from './VirtualJoystick';
import { ActionButtons } from './ActionButtons';

const ATTEMPT_DURATION_MS = 30_000;
const TIMER_PAINT_MS = 250;
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const SIMULATION_STEP_MS = IS_MOBILE ? 33 : 0;
const RAID_PARTICLE_LIMIT = IS_MOBILE ? 24 : 48;
const RAID_EFFECT_LIMIT = IS_MOBILE ? 12 : 24;
const RAID_DAMAGE_LIMIT = IS_MOBILE ? 8 : 12;

type BattlePhase = 'fighting' | 'submitting' | 'result';
type FinishReason = 'victory' | 'defeat' | 'time';

type Props = {
  event: WorldBossEvent;
  saveData: SaveData | null;
  language: 'de' | 'en';
  onClose: () => void;
  onBossUpdated: (remainingHp: number, defeated: boolean) => void;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value);
}

function makeRaidSave(engine: GameEngine, saveData: SaveData | null): SaveData {
  const fallback: SaveData = {
    playerName: 'Abenteurer',
    playerClass: 'archer',
    floor: 50,
    chapter: 1,
    runSkills: { fireArrow: 1, multishot: 1 },
    level: 1,
    xp: 0,
    hp: 102,
    maxHp: 102,
    attack: 12,
    defense: 2,
    speed: 170,
    attackRange: 520,
    skillRange: 160,
    killCount: 0,
    worldX: 0,
    worldY: 0,
    dungeonEntranceX: 0,
    dungeonEntranceY: 0,
    playerX: 0,
    playerY: 0,
    inDungeon: false,
    overworldMap: engine.state.map,
    savedAt: Date.now(),
  };

  const source = saveData ?? fallback;
  return {
    ...fallback,
    ...source,
    floor: 50,
    chapter: 1,
    hp: source.maxHp,
    inDungeon: false,
    overworldMap: source.overworldMap ?? engine.state.map,
    savedAt: Date.now(),
  };
}

export function WorldBossBattleScreen({ event, saveData, language, onClose, onBossUpdated }: Props) {
  const de = language === 'de';
  const engineRef = useRef<GameEngine | null>(null);
  const finishedRef = useRef(false);
  const initialBossHpRef = useRef(1);
  const startTimeRef = useRef(0);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [remainingMs, setRemainingMs] = useState(ATTEMPT_DURATION_MS);
  const [phase, setPhase] = useState<BattlePhase>('fighting');
  const [finishReason, setFinishReason] = useState<FinishReason>('time');
  const [submittedDamage, setSubmittedDamage] = useState(0);
  const [remainingGlobalHp, setRemainingGlobalHp] = useState(event.current_hp);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let disposed = false;
    let animationFrame = 0;
    let lastTimerPaint = 0;
    let lastSimulationStep = 0;
    const engine = new GameEngine();
    engineRef.current = engine;
    engine.onStateChange = next => {
      if (!disposed) setGameState(next);
    };

    const raidSave = makeRaidSave(engine, saveData);
    engine.continueGame(raidSave);
    engine.state.player.hp = engine.state.player.maxHp;
    engine.state.player.attackRange = 520;

    const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
    if (boss) {
      const targetHp = Math.max(1_900, Math.round(1_650 + engine.state.player.attack * 42 + raidSave.level * 24));
      boss.maxHp = targetHp;
      boss.hp = targetHp;
      boss.attack = Math.max(8, Math.min(18, Math.round(engine.state.player.maxHp * 0.11)));
      boss.defense = Math.max(2, Math.min(6, Math.round(engine.state.player.attack * 0.16)));
      boss.speed = 44;
      initialBossHpRef.current = targetHp;
    }
    setGameState({ ...engine.state });

    const finish = async (reason: FinishReason) => {
      if (finishedRef.current || disposed) return;
      finishedRef.current = true;
      engine.state.status = 'paused';
      engine.input.joyX = 0;
      engine.input.joyY = 0;
      setFinishReason(reason);
      if (reason === 'time') setRemainingMs(0);

      const liveBoss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      const localDamage = Math.max(0, initialBossHpRef.current - Math.max(0, liveBoss?.hp ?? 0));
      const victoryBonus = reason === 'victory' ? 3_000 : 0;
      const raidDamage = Math.max(1, Math.min(50_000, Math.round(localDamage * 6 + victoryBonus)));
      setSubmittedDamage(raidDamage);
      setPhase('submitting');

      try {
        const result = await submitWorldBossHit(event.id, raidDamage);
        if (disposed) return;
        const nextHp = Math.max(0, Number(result.remainingHp ?? event.current_hp));
        setRemainingGlobalHp(nextHp);
        setPhase('result');
        onBossUpdated(nextHp, result.defeated);
      } catch (reasonCaught) {
        if (disposed) return;
        const message = reasonCaught instanceof Error ? reasonCaught.message : String(reasonCaught);
        setSubmitError(message);
        setPhase('result');
      }
    };

    const tick = (time: number) => {
      if (disposed || finishedRef.current) return;
      if (!startTimeRef.current) startTimeRef.current = time;
      if (SIMULATION_STEP_MS === 0 || !lastSimulationStep || time - lastSimulationStep >= SIMULATION_STEP_MS) {
        lastSimulationStep = time;
        engine.update(time);
        if (engine.state.particles.length > RAID_PARTICLE_LIMIT) engine.state.particles.splice(0, engine.state.particles.length - RAID_PARTICLE_LIMIT);
        if (engine.state.effects.length > RAID_EFFECT_LIMIT) engine.state.effects.splice(0, engine.state.effects.length - RAID_EFFECT_LIMIT);
        if (engine.state.damageNumbers.length > RAID_DAMAGE_LIMIT) engine.state.damageNumbers.splice(0, engine.state.damageNumbers.length - RAID_DAMAGE_LIMIT);
      }
      const elapsed = time - startTimeRef.current;
      const nextRemaining = Math.max(0, ATTEMPT_DURATION_MS - elapsed);
      if (time - lastTimerPaint >= TIMER_PAINT_MS) {
        lastTimerPaint = time;
        setRemainingMs(nextRemaining);
      }

      const liveBoss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      if (engine.state.player.hp <= 0) {
        void finish('defeat');
        return;
      }
      if (!liveBoss || liveBoss.hp <= 0) {
        void finish('victory');
        return;
      }
      if (nextRemaining <= 0) {
        void finish('time');
        return;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      engine.input.joyX = 0;
      engine.input.joyY = 0;
      engine.state.status = 'paused';
      engine.onStateChange = () => {};
      engine.state.effects.length = 0;
      engine.state.particles.length = 0;
      engine.state.damageNumbers.length = 0;
      engineRef.current = null;
    };
  }, [event.current_hp, event.id, onBossUpdated, saveData]);

  const localBoss = gameState?.enemies.find(enemy => enemy.enemyType === 'boss');
  const localBossPercent = localBoss && localBoss.maxHp > 0 ? Math.max(0, Math.min(100, localBoss.hp / localBoss.maxHp * 100)) : 0;
  const playerPercent = gameState && gameState.player.maxHp > 0 ? Math.max(0, Math.min(100, gameState.player.hp / gameState.player.maxHp * 100)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const resultTitle = useMemo(() => {
    if (submitError) return de ? 'Übertragung fehlgeschlagen' : 'Submission failed';
    if (finishReason === 'victory') return de ? 'Aschenkönig zurückgedrängt' : 'Ash King repelled';
    if (finishReason === 'defeat') return de ? 'Du wurdest bezwungen' : 'You were defeated';
    return de ? 'Angriff beendet' : 'Attack finished';
  }, [de, finishReason, submitError]);

  const handleMove = (x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine || phase !== 'fighting') return;
    engine.input.joyX = x;
    engine.input.joyY = y;
  };

  const handleDodge = () => {
    const engine = engineRef.current;
    if (!engine || phase !== 'fighting') return;
    engine.input.dodge = true;
  };

  const closeAndReset = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.input.joyX = 0;
      engine.input.joyY = 0;
      engine.state.status = 'paused';
      engine.onStateChange = () => {};
      engine.state.effects.length = 0;
      engine.state.particles.length = 0;
      engine.state.damageNumbers.length = 0;
    }
    onClose();
  };

  return <div className="fixed inset-0 z-[120] overflow-hidden bg-black text-white">
    {gameState && <>
      <CombatStage gameState={gameState} />
      <div className="pointer-events-none absolute inset-x-3 top-[max(12px,calc(env(safe-area-inset-top)+6px))] z-50">
        <div className="mx-auto max-w-md rounded-2xl border border-orange-300/25 bg-black/72 p-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div><div className="text-[7px] font-black uppercase tracking-[.28em] text-orange-200/55">{de ? 'WELTBOSS-ANGRIFF' : 'WORLD BOSS ATTACK'}</div><div className="mt-1 text-sm font-black text-orange-50">{event.name}</div></div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[11px] font-black text-amber-100">{seconds}s</div>
              <button type="button" onPointerDown={pointerEvent => { pointerEvent.preventDefault(); closeAndReset(); }} className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-black/65 text-[12px] font-black text-white/55 active:scale-90">×</button>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/80"><div className="h-full bg-gradient-to-r from-red-700 via-orange-500 to-amber-300 transition-[width] duration-100" style={{ width: `${localBossPercent}%` }} /></div>
          <div className="mt-1 flex justify-between text-[8px] text-white/42"><span>{de ? 'VERSUCHS-HP' : 'ATTEMPT HP'}</span><span>{Math.max(0, Math.ceil(localBoss?.hp ?? 0))}/{Math.ceil(localBoss?.maxHp ?? 0)}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/80"><div className="h-full bg-emerald-400 transition-[width] duration-100" style={{ width: `${playerPercent}%` }} /></div>
          <div className="mt-1 flex justify-between text-[7px] text-white/32"><span>{de ? 'DEINE LEBEN' : 'YOUR HEALTH'}</span><span>{Math.max(0, Math.ceil(gameState.player.hp))}/{Math.ceil(gameState.player.maxHp)}</span></div>
        </div>
      </div>

      {phase === 'fighting' && <>
        <VirtualJoystick onMove={handleMove} />
        <ActionButtons gameState={gameState} onDodge={handleDodge} />
        <div className="pointer-events-none absolute bottom-[max(18px,calc(env(safe-area-inset-bottom)+8px))] left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-black/58 px-4 py-2 text-[7px] font-black uppercase tracking-[.18em] text-white/45 backdrop-blur-md">{de ? 'AUTO-SCHUSS · BEWEGEN & AUSWEICHEN' : 'AUTO FIRE · MOVE & DODGE'}</div>
      </>}
    </>}

    {phase !== 'fighting' && <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/78 px-5 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-orange-300/22 bg-[#100a07]/96 p-5 text-center shadow-2xl">
        <div className="text-[8px] font-black uppercase tracking-[.28em] text-orange-200/48">{phase === 'submitting' ? (de ? 'SCHADEN WIRD ÜBERTRAGEN' : 'SUBMITTING DAMAGE') : (de ? 'ERGEBNIS' : 'RESULT')}</div>
        <div className="mt-2 text-xl font-black text-orange-50">{phase === 'submitting' ? (de ? 'Bitte kurz warten …' : 'Please wait …') : resultTitle}</div>
        {phase === 'result' && <>
          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.035] p-4">
            <div className="text-[8px] uppercase tracking-[.18em] text-white/35">{de ? 'ANGERICHTETER WELTBOSS-SCHADEN' : 'WORLD BOSS DAMAGE'}</div>
            <div className="mt-1 text-3xl font-black text-amber-300">{formatNumber(submittedDamage)}</div>
            {!submitError && <div className="mt-3 text-[9px] text-white/45">{de ? 'Verbleibende Weltboss-HP' : 'Remaining world boss HP'}: {formatNumber(remainingGlobalHp)}</div>}
            {submitError && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[9px] text-red-200">{submitError}</div>}
          </div>
          <button type="button" onPointerDown={eventPointer => { eventPointer.preventDefault(); closeAndReset(); }} className="mt-4 w-full rounded-2xl border border-orange-300/28 bg-orange-500/12 py-3 text-[10px] font-black uppercase tracking-[.18em] text-orange-100 active:scale-[.98]">{de ? 'ZURÜCK ZUM WELTBOSS' : 'BACK TO WORLD BOSS'}</button>
        </>}
      </div>
    </div>}
  </div>;
}

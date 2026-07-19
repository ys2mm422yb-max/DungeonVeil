import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SaveData } from '../game/saveManager';
import { GameEngine, type GameState } from '../game/runEngine';
import { TILE_SIZE, TileType } from '../game/dungeon';
import { submitWorldBossHit, type WorldBossEvent } from '../game/supabaseOnline';
import { WORLD_BOSS_BALANCE_V4 } from '../game/buildBalanceV4';
import { createEquipmentRuntimeBalanceState, updateEquipmentRuntimeBalance } from '../game/equipmentRuntimeBalance';
import { VirtualJoystick } from './VirtualJoystick';
import { ActionButtons } from './ActionButtons';
import { WorldBossLiteStage } from './WorldBossLiteStage';

const ATTEMPT_DURATION_MS = WORLD_BOSS_BALANCE_V4.timeLimitSeconds * 1000;
const TIMER_PAINT_MS = 250;
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const SIMULATION_STEP_MS = IS_MOBILE ? 33 : 0;
const RAID_PARTICLE_LIMIT = IS_MOBILE ? 12 : 36;
const RAID_EFFECT_LIMIT = IS_MOBILE ? 8 : 20;
const RAID_DAMAGE_LIMIT = IS_MOBILE ? 6 : 12;
const BOSS_START_DELAY_MS = 700;

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

function raidSave(engine: GameEngine, source: SaveData | null): SaveData {
  const fallback: SaveData = {
    playerName: 'Abenteurer', playerClass: 'archer', floor: 50, chapter: 1, runSkills: {},
    level: 1, xp: 0, hp: 102, maxHp: 102, attack: 12, defense: 2, speed: 170,
    attackRange: 520, skillRange: 160, killCount: 0, worldX: 0, worldY: 0,
    dungeonEntranceX: 0, dungeonEntranceY: 0, playerX: 0, playerY: 0,
    inDungeon: false, overworldMap: engine.state.map, savedAt: Date.now(),
  };
  const live = source ?? fallback;
  return {
    ...fallback,
    ...live,
    floor: 50,
    chapter: Math.max(1, Number(live.chapter) || 1),
    hp: Math.max(1, Number(live.maxHp) || fallback.maxHp),
    inDungeon: false,
    overworldMap: live.overworldMap ?? engine.state.map,
    savedAt: Date.now(),
  };
}

function prepareArena(state: GameState) {
  const map = state.map;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const edge = x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1;
      map.tiles[y][x] = edge ? TileType.WALL : TileType.FLOOR;
    }
  }
  map.chests = [];
  map.decorations = [];
  map.torches = [];

  const player = state.player;
  player.x = map.width * TILE_SIZE * 0.5 - player.width / 2;
  player.y = map.height * TILE_SIZE * 0.76 - player.height / 2;
  player.vx = 0;
  player.vy = 0;
  player.facing = { x: 0, y: -1 };
  player.state = 'idle';

  const boss = state.enemies.find(enemy => enemy.enemyType === 'boss');
  if (!boss) return;
  boss.x = map.width * TILE_SIZE * 0.5 - boss.width / 2;
  boss.y = map.height * TILE_SIZE * 0.24 - boss.height / 2;
  boss.targetX = boss.x;
  boss.targetY = boss.y;
  boss.lastProgressX = boss.x;
  boss.lastProgressY = boss.y;
  boss.vx = 0;
  boss.vy = 0;
  boss.maxHp = WORLD_BOSS_BALANCE_V4.health;
  boss.hp = WORLD_BOSS_BALANCE_V4.health;
  boss.attack = WORLD_BOSS_BALANCE_V4.clawDamage;
  boss.defense = 6;
  boss.speed = 0;
  boss.nextAttackTime = performance.now() + 1200;
  Object.assign(boss, {
    balanceSeason: WORLD_BOSS_BALANCE_V4.balanceSeason,
    fireBreathDamage: WORLD_BOSS_BALANCE_V4.fireBreathDamage,
    clawDamage: WORLD_BOSS_BALANCE_V4.clawDamage,
    slamDamage: WORLD_BOSS_BALANCE_V4.slamDamage,
    armorMitigationCap: WORLD_BOSS_BALANCE_V4.armorMitigationCap,
  });
}

function snapshot(state: GameState): GameState {
  return {
    ...state,
    player: { ...state.player, facing: { ...state.player.facing } },
    enemies: state.enemies.map(enemy => ({ ...enemy })),
    effects: [...state.effects],
    particles: [],
    damageNumbers: [...state.damageNumbers],
    items: [...state.items],
    chests: [...state.chests],
    runSkills: { ...state.runSkills },
  };
}

export function WorldBossBattleScreen({ event, saveData, language, onClose, onBossUpdated }: Props) {
  const de = language === 'de';
  const engineRef = useRef<GameEngine | null>(null);
  const finishedRef = useRef(false);
  const readyRef = useRef(false);
  const startRef = useRef(0);
  const releaseRef = useRef(0);
  const initialBossHpRef = useRef(WORLD_BOSS_BALANCE_V4.health);
  const [state, setState] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number>(ATTEMPT_DURATION_MS);
  const [phase, setPhase] = useState<BattlePhase>('fighting');
  const [finishReason, setFinishReason] = useState<FinishReason>('time');
  const [submittedDamage, setSubmittedDamage] = useState(0);
  const [remainingGlobalHp, setRemainingGlobalHp] = useState(event.current_hp);
  const [submitError, setSubmitError] = useState('');

  const handleReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    startRef.current = 0;
    const engine = engineRef.current;
    if (engine) {
      const now = performance.now();
      const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      if (boss) {
        releaseRef.current = now + BOSS_START_DELAY_MS;
        boss.nextAttackTime = Math.max(boss.nextAttackTime, now + 1200);
        boss.spawnTime = now;
      }
      engine.lastTime = now;
      engine.state.status = 'playing';
      setState(snapshot(engine.state));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let lastPaint = 0;
    let lastStep = 0;
    const engine = new GameEngine();
    const equipmentRuntime = createEquipmentRuntimeBalanceState();
    engine.ignoreRoomPropCollisions = true;
    engineRef.current = engine;
    finishedRef.current = false;
    readyRef.current = false;
    startRef.current = 0;
    releaseRef.current = 0;
    engine.onStateChange = () => {};

    engine.continueGame(raidSave(engine, saveData));
    prepareArena(engine.state);
    updateEquipmentRuntimeBalance(engine, equipmentRuntime);
    engine.state.player.hp = engine.state.player.maxHp;
    engine.state.status = 'paused';
    const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
    initialBossHpRef.current = boss?.maxHp ?? WORLD_BOSS_BALANCE_V4.health;
    setState(snapshot(engine.state));

    const finish = async (reason: FinishReason) => {
      if (finishedRef.current || disposed) return;
      finishedRef.current = true;
      engine.state.status = 'paused';
      engine.input.joyX = 0;
      engine.input.joyY = 0;
      setState(snapshot(engine.state));
      setFinishReason(reason);
      if (reason === 'time') setRemainingMs(0);
      const liveBoss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      const localDamage = Math.max(0, initialBossHpRef.current - Math.max(0, liveBoss?.hp ?? 0));
      const raidDamage = Math.max(1, Math.min(WORLD_BOSS_BALANCE_V4.health, Math.round(localDamage)));
      setSubmittedDamage(raidDamage);
      setPhase('submitting');
      try {
        const result = await submitWorldBossHit(event.id, raidDamage);
        if (disposed) return;
        const nextHp = Math.max(0, Number(result.remainingHp ?? event.current_hp));
        setRemainingGlobalHp(nextHp);
        setPhase('result');
        onBossUpdated(nextHp, result.defeated);
      } catch (caught) {
        if (disposed) return;
        setSubmitError(caught instanceof Error ? caught.message : String(caught));
        setPhase('result');
      }
    };

    const tick = (time: number) => {
      if (disposed || finishedRef.current) return;
      if (!readyRef.current) {
        engine.lastTime = time;
        frame = requestAnimationFrame(tick);
        return;
      }
      if (!startRef.current) startRef.current = time;
      const stagedBoss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      if (stagedBoss && releaseRef.current > 0 && time >= releaseRef.current) {
        stagedBoss.speed = 44;
        releaseRef.current = 0;
      }
      if (SIMULATION_STEP_MS === 0 || !lastStep || time - lastStep >= SIMULATION_STEP_MS) {
        lastStep = time;
        updateEquipmentRuntimeBalance(engine, equipmentRuntime);
        engine.update(time);
        if (engine.state.particles.length > RAID_PARTICLE_LIMIT) engine.state.particles.splice(0, engine.state.particles.length - RAID_PARTICLE_LIMIT);
        if (engine.state.effects.length > RAID_EFFECT_LIMIT) engine.state.effects.splice(0, engine.state.effects.length - RAID_EFFECT_LIMIT);
        if (engine.state.damageNumbers.length > RAID_DAMAGE_LIMIT) engine.state.damageNumbers.splice(0, engine.state.damageNumbers.length - RAID_DAMAGE_LIMIT);
      }
      const remaining = Math.max(0, ATTEMPT_DURATION_MS - (time - startRef.current));
      if (time - lastPaint >= TIMER_PAINT_MS) {
        lastPaint = time;
        setRemainingMs(remaining);
        setState(snapshot(engine.state));
      }
      const liveBoss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      if (engine.state.player.hp <= 0) void finish('defeat');
      else if (!liveBoss || liveBoss.hp <= 0) void finish('victory');
      else if (remaining <= 0) void finish('time');
      else frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      equipmentRuntime.criticalDisposer?.();
      engine.input.joyX = 0;
      engine.input.joyY = 0;
      engine.state.status = 'paused';
      engine.state.effects.length = 0;
      engine.state.particles.length = 0;
      engine.state.damageNumbers.length = 0;
      engineRef.current = null;
    };
  }, [event.current_hp, event.id, onBossUpdated, saveData]);

  const boss = state?.enemies.find(enemy => enemy.enemyType === 'boss');
  const bossPercent = boss && boss.maxHp > 0 ? Math.max(0, Math.min(100, boss.hp / boss.maxHp * 100)) : 0;
  const playerPercent = state && state.player.maxHp > 0 ? Math.max(0, Math.min(100, state.player.hp / state.player.maxHp * 100)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const resultTitle = useMemo(() => submitError ? (de ? 'Übertragung fehlgeschlagen' : 'Submission failed')
    : finishReason === 'victory' ? (de ? 'Aschenkönig zurückgedrängt' : 'Ash King repelled')
      : finishReason === 'defeat' ? (de ? 'Du wurdest bezwungen' : 'You were defeated')
        : (de ? 'Angriff beendet' : 'Attack finished'), [de, finishReason, submitError]);

  const move = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine || !ready || phase !== 'fighting') return;
    engine.input.joyX = x;
    engine.input.joyY = y;
  }, [phase, ready]);
  const dodge = useCallback(() => {
    const engine = engineRef.current;
    if (engine && ready && phase === 'fighting') engine.input.dodge = true;
  }, [phase, ready]);
  const close = useCallback(() => {
    readyRef.current = false;
    const engine = engineRef.current;
    if (engine) {
      engine.input.joyX = 0;
      engine.input.joyY = 0;
      engine.state.status = 'paused';
    }
    onClose();
  }, [onClose]);

  return <div className="fixed inset-0 z-[120] overflow-hidden bg-[#080401] text-white">
    {state && <>
      <WorldBossLiteStage engineRef={engineRef} onReady={handleReady} />
      <div data-testid="worldboss-compact-status" className="pointer-events-none absolute inset-x-3 top-[max(10px,calc(env(safe-area-inset-top)+4px))] z-50">
        <div className="mx-auto max-w-md rounded-xl border border-orange-300/22 bg-black/84 px-3 py-2 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2"><div><div className="text-[6px] font-black tracking-[.25em] text-orange-200/48">{de ? 'WELTBOSS-ANGRIFF' : 'WORLD BOSS ATTACK'} · {WORLD_BOSS_BALANCE_V4.balanceSeason}</div><div className="text-[13px] font-black text-orange-50">{event.name}</div></div><div className="flex items-center gap-1.5"><div className="rounded-full border border-amber-300/22 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black text-amber-100">{ready ? `${seconds}s` : (de ? 'LÄDT' : 'LOAD')}</div><button type="button" onPointerDown={e => { e.preventDefault(); close(); }} className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/70 text-white/55">×</button></div></div>
          <div className="mt-1.5 flex items-center gap-2"><span className="w-8 text-[6px] font-black text-white/38">BOSS</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-black/70"><div className="h-full bg-gradient-to-r from-red-700 via-orange-500 to-amber-300" style={{ width: `${bossPercent}%` }} /></div><span className="w-[70px] text-right text-[7px] text-white/42">{Math.max(0, Math.ceil(boss?.hp ?? 0))}</span></div>
          <div className="mt-1 flex items-center gap-2"><span className="w-8 text-[6px] font-black text-white/28">{de ? 'DU' : 'YOU'}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/70"><div className="h-full bg-emerald-400" style={{ width: `${playerPercent}%` }} /></div><span className="w-[70px] text-right text-[7px] text-white/32">{Math.max(0, Math.ceil(state.player.hp))}/{Math.ceil(state.player.maxHp)}</span></div>
        </div>
      </div>
      {ready && phase === 'fighting' && <><VirtualJoystick onMove={move} variant="worldBoss" /><ActionButtons gameState={state} onDodge={dodge} variant="worldBoss" /></>}
    </>}
    {phase !== 'fighting' && <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/88 px-5"><div className="w-full max-w-sm rounded-3xl border border-orange-300/22 bg-[#100a07]/96 p-5 text-center"><div className="text-[8px] font-black tracking-[.28em] text-orange-200/48">{phase === 'submitting' ? (de ? 'SCHADEN WIRD ÜBERTRAGEN' : 'SUBMITTING DAMAGE') : (de ? 'ERGEBNIS' : 'RESULT')}</div><div className="mt-2 text-xl font-black text-orange-50">{phase === 'submitting' ? (de ? 'Bitte kurz warten …' : 'Please wait …') : resultTitle}</div>{phase === 'result' && <><div className="mt-4 rounded-2xl border border-white/8 bg-white/[.035] p-4"><div className="text-[8px] text-white/35">{de ? 'ANGERICHTETER WELTBOSS-SCHADEN' : 'WORLD BOSS DAMAGE'}</div><div className="mt-1 text-3xl font-black text-amber-300">{formatNumber(submittedDamage)}</div>{!submitError && <div className="mt-3 text-[9px] text-white/45">{de ? 'Verbleibende Weltboss-HP' : 'Remaining world boss HP'}: {formatNumber(remainingGlobalHp)}</div>}{submitError && <div className="mt-3 text-[9px] text-red-200">{submitError}</div>}</div><button type="button" onPointerDown={e => { e.preventDefault(); close(); }} className="mt-4 w-full rounded-2xl border border-orange-300/28 bg-orange-500/12 py-3 text-[10px] font-black text-orange-100">{de ? 'ZURÜCK ZUM WELTBOSS' : 'BACK TO WORLD BOSS'}</button></>}</div></div>}
  </div>;
}

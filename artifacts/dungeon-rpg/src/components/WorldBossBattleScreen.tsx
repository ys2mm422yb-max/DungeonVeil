import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SaveData } from '../game/saveManager';
import { GameEngine, type GameState } from '../game/runEngine';
import { TILE_SIZE, TileType, isWalkable } from '../game/dungeon';
import { collidesWithRoomProp } from '../game/roomCollision3D';
import { submitWorldBossHit, type WorldBossEvent } from '../game/supabaseOnline';
import { VirtualJoystick } from './VirtualJoystick';
import { ActionButtons } from './ActionButtons';
import { WorldBossLiteStage } from './WorldBossLiteStage';

const ATTEMPT_DURATION_MS = 30_000;
const TIMER_PAINT_MS = 250;
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const SIMULATION_STEP_MS = IS_MOBILE ? 33 : 0;
const RAID_PARTICLE_LIMIT = IS_MOBILE ? 12 : 36;
const RAID_EFFECT_LIMIT = IS_MOBILE ? 8 : 20;
const RAID_DAMAGE_LIMIT = IS_MOBILE ? 5 : 10;
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

type RaidSpawn = {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
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

function snapshotRaidState(state: GameState): GameState {
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

function prepareRaidArenaMap(map: GameState['map']) {
  for (let tileY = 0; tileY < map.height; tileY++) {
    for (let tileX = 0; tileX < map.width; tileX++) {
      const boundary = tileX === 0 || tileY === 0 || tileX === map.width - 1 || tileY === map.height - 1;
      map.tiles[tileY][tileX] = boundary ? TileType.WALL : TileType.FLOOR;
    }
  }
  map.chests = [];
  map.decorations = [];
  map.torches = [];
}

function findRaidSpawn(options: {
  map: GameState['map'];
  floor: number;
  width: number;
  height: number;
  desiredXRatio: number;
  desiredYRatio: number;
  fallbackX: number;
  fallbackY: number;
  avoid?: { x: number; y: number };
  minimumDistance?: number;
  ignoreRoomProps?: boolean;
}): RaidSpawn {
  const { map, floor, width, height, desiredXRatio, desiredYRatio, fallbackX, fallbackY, avoid, minimumDistance = 0, ignoreRoomProps = false } = options;
  const desiredTileX = Math.max(1, Math.min(map.width - 2, Math.round((map.width - 1) * desiredXRatio)));
  const desiredTileY = Math.max(1, Math.min(map.height - 2, Math.round((map.height - 1) * desiredYRatio)));
  const candidates: Array<{ tileX: number; tileY: number; score: number }> = [];

  for (let tileY = 1; tileY < map.height - 1; tileY++) {
    for (let tileX = 1; tileX < map.width - 1; tileX++) {
      candidates.push({
        tileX,
        tileY,
        score: (tileX - desiredTileX) ** 2 + (tileY - desiredTileY) ** 2,
      });
    }
  }
  candidates.sort((a, b) => a.score - b.score);

  let farthestValid: RaidSpawn | null = null;
  let farthestDistance = -1;
  for (const candidate of candidates) {
    const centerX = candidate.tileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = candidate.tileY * TILE_SIZE + TILE_SIZE / 2;
    const x = centerX - width / 2;
    const y = centerY - height / 2;
    const corners = [
      [x + 2, y + 2],
      [x + width - 2, y + 2],
      [x + 2, y + height - 2],
      [x + width - 2, y + height - 2],
      [centerX, centerY],
    ];
    if (!corners.every(([checkX, checkY]) => isWalkable(map, checkX, checkY))) continue;
    if (!ignoreRoomProps && collidesWithRoomProp(floor, map.width, map.height, x, y, width, height, 0.18)) continue;

    const spawn = { x, y, centerX, centerY };
    if (!avoid) return spawn;
    const distance = Math.hypot(centerX - avoid.x, centerY - avoid.y);
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestValid = spawn;
    }
    if (distance >= minimumDistance) return spawn;
  }

  if (farthestValid) return farthestValid;
  return {
    x: fallbackX,
    y: fallbackY,
    centerX: fallbackX + width / 2,
    centerY: fallbackY + height / 2,
  };
}

export function WorldBossBattleScreen({ event, saveData, language, onClose, onBossUpdated }: Props) {
  const de = language === 'de';
  const engineRef = useRef<GameEngine | null>(null);
  const finishedRef = useRef(false);
  const initialBossHpRef = useRef(1);
  const startTimeRef = useRef(0);
  const arenaReadyRef = useRef(false);
  const bossReleaseAtRef = useRef(0);
  const bossSpeedRef = useRef(44);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [arenaReady, setArenaReady] = useState(false);
  const [remainingMs, setRemainingMs] = useState(ATTEMPT_DURATION_MS);
  const [phase, setPhase] = useState<BattlePhase>('fighting');
  const [finishReason, setFinishReason] = useState<FinishReason>('time');
  const [submittedDamage, setSubmittedDamage] = useState(0);
  const [remainingGlobalHp, setRemainingGlobalHp] = useState(event.current_hp);
  const [submitError, setSubmitError] = useState('');

  const handleArenaReady = useCallback(() => {
    if (arenaReadyRef.current) return;
    arenaReadyRef.current = true;
    startTimeRef.current = 0;
    const engine = engineRef.current;
    if (engine) {
      const now = performance.now();
      const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      if (boss) {
        bossReleaseAtRef.current = now + BOSS_START_DELAY_MS;
        boss.nextAttackTime = Math.max(boss.nextAttackTime, now + 1_200);
        boss.spawnTime = now;
      }
      engine.lastTime = now;
      engine.state.status = 'playing';
      setGameState(snapshotRaidState(engine.state));
    }
    setArenaReady(true);
  }, []);

  useEffect(() => {
    let disposed = false;
    let animationFrame = 0;
    let lastTimerPaint = 0;
    let lastSimulationStep = 0;
    const engine = new GameEngine();
    engine.ignoreRoomPropCollisions = true;
    engineRef.current = engine;
    finishedRef.current = false;
    arenaReadyRef.current = false;
    bossReleaseAtRef.current = 0;
    startTimeRef.current = 0;
    engine.onStateChange = () => {};

    const raidSave = makeRaidSave(engine, saveData);
    engine.continueGame(raidSave);
    prepareRaidArenaMap(engine.state.map);
    engine.state.player.hp = engine.state.player.maxHp;
    engine.state.player.attackRange = 520;
    engine.state.status = 'paused';

    const map = engine.state.map;
    const player = engine.state.player;
    const playerSpawn = findRaidSpawn({
      map,
      floor: engine.state.floor,
      width: player.width,
      height: player.height,
      desiredXRatio: 0.5,
      desiredYRatio: 0.76,
      fallbackX: player.x,
      fallbackY: player.y,
      ignoreRoomProps: true,
    });
    player.x = playerSpawn.x;
    player.y = playerSpawn.y;
    player.vx = 0;
    player.vy = 0;
    player.state = 'idle';
    player.facing = { x: 0, y: -1 };

    const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
    if (boss) {
      const minimumStartDistance = Math.max(220, Math.min(map.width, map.height) * TILE_SIZE * 0.34);
      const bossSpawn = findRaidSpawn({
        map,
        floor: engine.state.floor,
        width: boss.width,
        height: boss.height,
        desiredXRatio: 0.5,
        desiredYRatio: 0.24,
        fallbackX: boss.x,
        fallbackY: boss.y,
        ignoreRoomProps: true,
        avoid: { x: playerSpawn.centerX, y: playerSpawn.centerY },
        minimumDistance: minimumStartDistance,
      });
      boss.x = bossSpawn.x;
      boss.y = bossSpawn.y;
      boss.targetX = bossSpawn.x;
      boss.targetY = bossSpawn.y;
      boss.lastProgressX = bossSpawn.x;
      boss.lastProgressY = bossSpawn.y;
      boss.vx = 0;
      boss.vy = 0;
      const targetHp = Math.max(1_900, Math.round(1_650 + engine.state.player.attack * 42 + raidSave.level * 24));
      boss.maxHp = targetHp;
      boss.hp = targetHp;
      boss.attack = Math.max(8, Math.min(18, Math.round(engine.state.player.maxHp * 0.11)));
      boss.defense = Math.max(2, Math.min(6, Math.round(engine.state.player.attack * 0.16)));
      bossSpeedRef.current = 44;
      boss.speed = 0;
      boss.nextAttackTime = performance.now() + 1_200;
      initialBossHpRef.current = targetHp;
    }
    setGameState(snapshotRaidState(engine.state));

    const finish = async (reason: FinishReason) => {
      if (finishedRef.current || disposed) return;
      finishedRef.current = true;
      engine.state.status = 'paused';
      engine.input.joyX = 0;
      engine.input.joyY = 0;
      setGameState(snapshotRaidState(engine.state));
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
        setSubmitError(reasonCaught instanceof Error ? reasonCaught.message : String(reasonCaught));
        setPhase('result');
      }
    };

    const tick = (time: number) => {
      if (disposed || finishedRef.current) return;
      if (!arenaReadyRef.current) {
        engine.lastTime = time;
        animationFrame = requestAnimationFrame(tick);
        return;
      }
      if (!startTimeRef.current) startTimeRef.current = time;
      const stagedBoss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      if (stagedBoss && bossReleaseAtRef.current > 0 && time >= bossReleaseAtRef.current) {
        stagedBoss.speed = bossSpeedRef.current;
        bossReleaseAtRef.current = 0;
      }
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
        setGameState(snapshotRaidState(engine.state));
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
      bossReleaseAtRef.current = 0;
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

  const handleMove = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine || !arenaReady || phase !== 'fighting') return;
    engine.input.joyX = x;
    engine.input.joyY = y;
  }, [arenaReady, phase]);

  const handleDodge = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !arenaReady || phase !== 'fighting') return;
    engine.input.dodge = true;
  }, [arenaReady, phase]);

  const closeAndReset = useCallback(() => {
    arenaReadyRef.current = false;
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
  }, [onClose]);

  return <div className="fixed inset-0 z-[120] overflow-hidden bg-[#080401] text-white">
    {gameState && <>
      <WorldBossLiteStage engineRef={engineRef} onReady={handleArenaReady} />
      <div data-testid="worldboss-compact-status" className="pointer-events-none absolute inset-x-3 top-[max(10px,calc(env(safe-area-inset-top)+4px))] z-50">
      <div className="mx-auto max-w-md rounded-xl border border-orange-300/22 bg-black/84 px-3 py-2 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[6px] font-black uppercase tracking-[.25em] text-orange-200/48">{de ? 'WELTBOSS-ANGRIFF' : 'WORLD BOSS ATTACK'}</div>
            <div className="truncate text-[13px] font-black text-orange-50">{event.name}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="rounded-full border border-amber-300/22 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black text-amber-100">{arenaReady ? `${seconds}s` : (de ? 'LÄDT' : 'LOAD')}</div>
            <button type="button" onPointerDown={pointerEvent => { pointerEvent.preventDefault(); closeAndReset(); }} className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/70 text-[11px] font-black text-white/55 active:scale-90">×</button>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-8 text-[6px] font-black uppercase tracking-[.12em] text-white/38">BOSS</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/70"><div className="h-full bg-gradient-to-r from-red-700 via-orange-500 to-amber-300 transition-[width] duration-100" style={{ width: `${localBossPercent}%` }} /></div>
          <span className="w-[54px] text-right text-[7px] text-white/42">{Math.max(0, Math.ceil(localBoss?.hp ?? 0))}/{Math.ceil(localBoss?.maxHp ?? 0)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="w-8 text-[6px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'DU' : 'YOU'}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/70"><div className="h-full bg-emerald-400 transition-[width] duration-100" style={{ width: `${playerPercent}%` }} /></div>
          <span className="w-[54px] text-right text-[7px] text-white/32">{Math.max(0, Math.ceil(gameState.player.hp))}/{Math.ceil(gameState.player.maxHp)}</span>
        </div>
      </div>
    </div>

      {!arenaReady && phase === 'fighting' && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle_at_50%_54%,rgba(163,61,16,.28),rgba(8,4,1,.97)_34%,#080401_72%)] px-6 pt-28">
        <div className="w-full max-w-xs rounded-3xl border border-orange-300/20 bg-black/78 p-6 text-center shadow-[0_0_70px_rgba(180,66,12,.18)]">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-full border border-orange-200/30 bg-orange-500/12 shadow-[0_0_34px_rgba(255,107,31,.45)]" />
          <div className="mt-5 text-[9px] font-black uppercase tracking-[.28em] text-orange-100/72">{de ? 'BOSSARENA WIRD GELADEN' : 'LOADING BOSS ARENA'}</div>
          <div className="mt-2 text-[10px] leading-relaxed text-white/38">{de ? 'Der Angriff startet erst, wenn die Bossarena vollständig sichtbar ist.' : 'The attack starts only after the boss arena is fully visible.'}</div>
        </div>
      </div>}

      {arenaReady && phase === 'fighting' && <>
        <VirtualJoystick onMove={handleMove} variant="worldBoss" />
        <ActionButtons gameState={gameState} onDodge={handleDodge} variant="worldBoss" />
      </>}
    </>}

    {phase !== 'fighting' && <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/88 px-5">
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

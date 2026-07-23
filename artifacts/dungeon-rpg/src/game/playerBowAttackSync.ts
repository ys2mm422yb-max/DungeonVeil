import { CLASS_DEFS } from './classes';
import type { Enemy } from './entities';
import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';

export const PLAYER_BOW_EVENT = 'dungeon-veil-player-bow';

export type PlayerBowEventDetail = {
  phase: 'draw' | 'release' | 'cancel';
  at: number;
  drawMs?: number;
  releaseMs?: number;
  reason?: 'dash' | 'death' | 'room-clear' | 'room-change' | 'no-target' | 'dispose';
};

type PendingBowShot = {
  roomKey: string;
  startedAt: number;
  remainingMs: number;
  drawMs: number;
  releaseMs: number;
};

type PatchedEngine = {
  autoShoot: (time: number) => void;
  updatePlayer: (dt: number, time: number) => void;
  visibleEnemiesFrom: (x: number, y: number, excluded?: Set<string>) => Enemy[];
  emit: () => void;
};

const ATTACK_SPEED_MULTIPLIERS = [1, 1.16, 1.3, 1.42] as const;
const ATTACK_COOLDOWN_FACTORS = [1, 0.84, 0.7, 0.58] as const;

function roomKey(engine: GameEngine): string {
  return `${engine.state.chapter}:${engine.state.floor}`;
}

function dispatchBowEvent(detail: PlayerBowEventDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PlayerBowEventDetail>(PLAYER_BOW_EVENT, { detail }));
}

export function playerBowAttackTiming(engine: GameEngine) {
  const rank = skillRank(engine.state.runSkills, 'attackSpeed');
  const multiplier = ATTACK_SPEED_MULTIPLIERS[rank] ?? 1;
  const cooldownFactor = ATTACK_COOLDOWN_FACTORS[rank] ?? 1;
  const cooldownMs = Math.max(120, CLASS_DEFS.archer.attackCooldownMs * cooldownFactor);
  const drawMs = Math.max(88, Math.min(cooldownMs * 0.7, Math.round(145 / multiplier)));
  const recoveryBudget = Math.max(36, cooldownMs - drawMs - 8);
  const releaseMs = Math.max(36, Math.min(recoveryBudget, Math.round(86 / multiplier)));
  return { cooldownMs, drawMs, releaseMs };
}

function hasVisibleTarget(engine: GameEngine, runtime: PatchedEngine): boolean {
  const player = engine.state.player;
  const x = player.x + player.width / 2;
  const y = player.y + player.height / 2;
  return runtime.visibleEnemiesFrom(x, y)
    .some(enemy => Math.hypot(x - (enemy.x + enemy.width / 2), y - (enemy.y + enemy.height / 2)) <= player.attackRange);
}

export function installPlayerBowAttackSync(engine: GameEngine): () => void {
  const runtime = engine as unknown as PatchedEngine;
  const originalAutoShoot = runtime.autoShoot.bind(engine);
  const originalUpdatePlayer = runtime.updatePlayer.bind(engine);
  let pending: PendingBowShot | null = null;

  const cancelPending = (reason: PlayerBowEventDetail['reason']) => {
    if (!pending) return;
    pending = null;
    dispatchBowEvent({ phase: 'cancel', at: performance.now(), reason });
  };

  runtime.autoShoot = (time: number) => {
    if (pending || engine.state.status !== 'playing' || engine.state.roomClearReady) return;
    if (!hasVisibleTarget(engine, runtime)) return;

    const timing = playerBowAttackTiming(engine);
    engine.state.player.attackCooldown = timing.cooldownMs;
    engine.state.player.state = 'attacking';
    pending = {
      roomKey: roomKey(engine),
      startedAt: time,
      remainingMs: timing.drawMs,
      drawMs: timing.drawMs,
      releaseMs: timing.releaseMs,
    };
    dispatchBowEvent({ phase: 'draw', at: time, drawMs: timing.drawMs, releaseMs: timing.releaseMs });
  };

  runtime.updatePlayer = (dt: number, time: number) => {
    const dodgeBefore = engine.state.player.lastDodgeTime;
    originalUpdatePlayer(dt, time);
    if (!pending) return;

    if (pending.roomKey !== roomKey(engine)) {
      cancelPending('room-change');
      return;
    }
    if (engine.state.player.hp <= 0 || engine.state.player.state === 'dead') {
      cancelPending('death');
      return;
    }
    if (engine.state.roomClearReady || !engine.state.enemies.some(enemy => !enemy.isDead && enemy.hp > 0)) {
      cancelPending('room-clear');
      return;
    }
    if (engine.state.player.lastDodgeTime > dodgeBefore && engine.state.player.lastDodgeTime >= pending.startedAt) {
      cancelPending('dash');
      return;
    }

    pending.remainingMs = Math.max(0, pending.remainingMs - dt);
    if (pending.remainingMs > 0) return;
    if (!hasVisibleTarget(engine, runtime)) {
      cancelPending('no-target');
      return;
    }

    const shot = pending;
    pending = null;
    const remainingCooldown = engine.state.player.attackCooldown;
    const previousAttackTime = engine.state.player.lastAttackTime;
    dispatchBowEvent({ phase: 'release', at: time, drawMs: shot.drawMs, releaseMs: shot.releaseMs });
    originalAutoShoot(time);
    engine.state.player.attackCooldown = remainingCooldown;

    if (engine.state.player.lastAttackTime === previousAttackTime) {
      dispatchBowEvent({ phase: 'cancel', at: time, reason: 'no-target' });
      return;
    }
    runtime.emit();
  };

  return () => {
    cancelPending('dispose');
    runtime.autoShoot = originalAutoShoot;
    runtime.updatePlayer = originalUpdatePlayer;
  };
}

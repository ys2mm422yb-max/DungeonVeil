import React, { useCallback, useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { WORLD_BOSS_BALANCE_V4 } from '../game/buildBalanceV4';
import { mitigatedIncomingDamage } from '../game/equipmentCombatV4';
import { markIncomingDamageResolvedV4 } from '../game/equipmentPlayerRuntimeV4';
import { WorldBossPerspectiveStage } from './WorldBossPerspectiveStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

type AttackKind = 'breath' | 'claw' | 'slam';
type PendingAttack = {
  kind: AttackKind;
  serial: number;
  releaseAt: number;
  angle: number;
  targetX: number;
  targetY: number;
};
type ActiveBreath = {
  id: string;
  originX: number;
  originY: number;
  angle: number;
  maxRadius: number;
};

const RELEASE_DELAY_MS = 320;
const PURSUIT_SPEED = 82;
const ATTACK_READY_WINDOW_MS = 720;
const ATTACK_GAP_MS = 980;
const BREATH_WINDUP_MS = 760;
const BREATH_TRAVEL_MS = 820;
const BREATH_COOLDOWN_MS = 3100;
const BREATH_MIN_DISTANCE = 210;
const BREATH_MAX_DISTANCE = 840;
const BREATH_HIT_RADIUS = 76;
const CLAW_WINDUP_MS = 420;
const CLAW_RANGE = 158;
const CLAW_ARC_DOT = 0.12;
const SLAM_WINDUP_MS = 620;
const SLAM_RANGE = 205;

function configuredAttackDamage(kind: AttackKind): number {
  if (kind === 'breath') return WORLD_BOSS_BALANCE_V4.fireBreathDamage;
  if (kind === 'slam') return WORLD_BOSS_BALANCE_V4.slamDamage;
  return WORLD_BOSS_BALANCE_V4.clawDamage;
}

export function WorldBossAggressiveStage({ engineRef, onReady }: Props) {
  const releasedAtRef = useRef(0);
  const frameRef = useRef(0);
  const nextAttackAtRef = useRef(0);
  const serialRef = useRef(0);
  const pendingRef = useRef<PendingAttack | null>(null);
  const activeBreathRef = useRef<ActiveBreath | null>(null);
  const lastAttackRef = useRef<AttackKind>('slam');

  const handleReady = useCallback(() => {
    const now = performance.now();
    releasedAtRef.current = now + RELEASE_DELAY_MS;
    nextAttackAtRef.current = now + 1350;
    onReady();
  }, [onReady]);

  useEffect(() => {
    let disposed = false;

    const applyHit = (engine: GameEngine, now: number, kind: AttackKind, color: string, scale: number) => {
      const player = engine.state.player;
      if (now < player.invincibleUntil) return;
      const rawDamage = configuredAttackDamage(kind);
      const damage = mitigatedIncomingDamage(rawDamage, player.defense, WORLD_BOSS_BALANCE_V4.armorMitigationCap);
      player.hp = Math.max(0, player.hp - damage);
      markIncomingDamageResolvedV4(engine);
      player.invincibleUntil = now + 720;
      player.lastHitTime = now;
      engine.state.damageNumbers.push({
        id: `worldboss-hit-${kind}-${Math.round(now)}`,
        x: player.x,
        y: player.y - 10,
        value: `-${damage}`,
        color,
        lifeTime: 0,
        maxLifeTime: 820,
        scale,
      });
    };

    const startAttack = (engine: GameEngine, boss: any, now: number, distance: number, angle: number, playerX: number, playerY: number) => {
      if (pendingRef.current || activeBreathRef.current || now < nextAttackAtRef.current) return;
      let kind: AttackKind;
      if (distance >= BREATH_MIN_DISTANCE && distance <= BREATH_MAX_DISTANCE && lastAttackRef.current !== 'breath') kind = 'breath';
      else kind = lastAttackRef.current === 'claw' ? 'slam' : 'claw';

      const serial = ++serialRef.current;
      const windup = kind === 'breath' ? BREATH_WINDUP_MS : kind === 'claw' ? CLAW_WINDUP_MS : SLAM_WINDUP_MS;
      pendingRef.current = { kind, serial, releaseAt: now + windup, angle, targetX: playerX, targetY: playerY };
      boss.state = 'attack';
      boss.vx = 0;
      boss.vy = 0;
      const radius = kind === 'breath' ? 118 : kind === 'claw' ? CLAW_RANGE : SLAM_RANGE;
      const color = kind === 'breath' ? '#ff7a24' : kind === 'claw' ? '#ffb04a' : '#e44825';
      engine.state.effects.push({
        id: `boss-${kind}-telegraph-${serial}`,
        x: kind === 'breath' ? playerX : boss.x + boss.width / 2,
        y: kind === 'breath' ? playerY : boss.y + boss.height / 2,
        radius: 10,
        maxRadius: radius,
        color,
        lifeTime: 0,
        maxLifeTime: windup,
        type: 'circle',
        element: 'fire',
        fromEnemyId: boss.id,
      });
    };

    const releaseAttack = (engine: GameEngine, boss: any, now: number, pending: PendingAttack, bossX: number, bossY: number, playerX: number, playerY: number) => {
      const dx = playerX - bossX;
      const dy = playerY - bossY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      if (pending.kind === 'breath') {
        const maxRadius = Math.max(320, Math.min(940, Math.hypot(pending.targetX - bossX, pending.targetY - bossY) + 220));
        const id = `boss-shot-breath-${pending.serial}`;
        engine.state.effects.push({
          id,
          x: bossX,
          y: bossY,
          radius: 46,
          maxRadius,
          color: '#ff6a1f',
          lifeTime: 0,
          maxLifeTime: BREATH_TRAVEL_MS,
          type: 'beam',
          angle: pending.angle,
          width: 122,
          element: 'fire',
          fromEnemyId: boss.id,
        });
        activeBreathRef.current = { id, originX: bossX, originY: bossY, angle: pending.angle, maxRadius };
        nextAttackAtRef.current = now + BREATH_COOLDOWN_MS;
      } else if (pending.kind === 'claw') {
        const facingX = Math.cos(pending.angle);
        const facingY = Math.sin(pending.angle);
        const dot = (dx / distance) * facingX + (dy / distance) * facingY;
        engine.state.effects.push({
          id: `boss-claw-impact-${pending.serial}`,
          x: bossX + facingX * 76,
          y: bossY + facingY * 76,
          radius: 24,
          maxRadius: 148,
          color: '#ffb04a',
          lifeTime: 0,
          maxLifeTime: 280,
          type: 'circle',
          element: 'fire',
          fromEnemyId: boss.id,
        });
        if (distance <= CLAW_RANGE && dot >= CLAW_ARC_DOT) applyHit(engine, now, 'claw', '#ffb04a', 1.34);
        nextAttackAtRef.current = now + ATTACK_GAP_MS;
      } else {
        engine.state.effects.push({
          id: `boss-slam-impact-${pending.serial}`,
          x: bossX,
          y: bossY,
          radius: 35,
          maxRadius: SLAM_RANGE,
          color: '#e44825',
          lifeTime: 0,
          maxLifeTime: 360,
          type: 'circle',
          element: 'fire',
          fromEnemyId: boss.id,
        });
        if (distance <= SLAM_RANGE) applyHit(engine, now, 'slam', '#e44825', 1.42);
        nextAttackAtRef.current = now + 1420;
      }
      lastAttackRef.current = pending.kind;
      boss.lastAttackTime = now;
      boss.state = 'chase';
      pendingRef.current = null;
    };

    const enforceBossPressure = (now: number) => {
      if (disposed) return;
      const engine = engineRef.current;
      const boss = engine?.state.enemies.find(enemy => enemy.enemyType === 'boss' && enemy.hp > 0);

      if (engine && boss && releasedAtRef.current > 0 && now >= releasedAtRef.current) {
        boss.speed = Math.max(boss.speed, PURSUIT_SPEED);
        const player = engine.state.player;
        const bossCenterX = boss.x + boss.width / 2;
        const bossCenterY = boss.y + boss.height / 2;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const dx = playerCenterX - bossCenterX;
        const dy = playerCenterY - bossCenterY;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        if (distance > 112 && boss.state !== 'attack') boss.state = 'chase';
        if (boss.nextAttackTime > now + ATTACK_READY_WINDOW_MS) boss.nextAttackTime = now + ATTACK_READY_WINDOW_MS;
        startAttack(engine, boss, now, distance, angle, playerCenterX, playerCenterY);

        const pending = pendingRef.current;
        if (pending && now >= pending.releaseAt) releaseAttack(engine, boss, now, pending, bossCenterX, bossCenterY, playerCenterX, playerCenterY);

        const active = activeBreathRef.current;
        if (active) {
          const effect = engine.state.effects.find(item => item.id === active.id);
          if (!effect) activeBreathRef.current = null;
          else {
            const progress = Math.max(0, Math.min(1, effect.lifeTime / Math.max(1, effect.maxLifeTime)));
            const projectileX = active.originX + Math.cos(active.angle) * active.maxRadius * progress;
            const projectileY = active.originY + Math.sin(active.angle) * active.maxRadius * progress;
            if (now >= player.invincibleUntil && Math.hypot(projectileX - playerCenterX, projectileY - playerCenterY) <= BREATH_HIT_RADIUS) {
              applyHit(engine, now, 'breath', '#ff6a2b', 1.38);
              effect.lifeTime = effect.maxLifeTime;
              activeBreathRef.current = null;
            }
          }
        }
      }

      frameRef.current = requestAnimationFrame(enforceBossPressure);
    };

    frameRef.current = requestAnimationFrame(enforceBossPressure);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      pendingRef.current = null;
      activeBreathRef.current = null;
    };
  }, [engineRef]);

  return <WorldBossPerspectiveStage engineRef={engineRef} onReady={handleReady} />;
}

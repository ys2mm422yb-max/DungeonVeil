import React, { useCallback, useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { WorldBossCohesiveStage } from './WorldBossCohesiveStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

type AttackKind = 'breath' | 'claw' | 'wing';
type PendingAttack = { kind: AttackKind; releaseAt: number; serial: number };
type ActiveBreath = { ids: string[]; originX: number; originY: number; angles: number[]; maxRadius: number };

const RELEASE_DELAY_MS = 320;
const PURSUIT_SPEED = 82;
const ATTACK_READY_WINDOW_MS = 720;
const BREATH_WINDUP_MS = 760;
const BREATH_TRAVEL_MS = 760;
const BREATH_COOLDOWN_MS = 4300;
const BREATH_MIN_DISTANCE = 180;
const BREATH_MAX_DISTANCE = 840;
const BREATH_HIT_RADIUS = 54;
const CLAW_WINDUP_MS = 390;
const CLAW_RANGE = 150;
const CLAW_COOLDOWN_MS = 1900;
const WING_WINDUP_MS = 650;
const WING_RANGE = 245;
const WING_COOLDOWN_MS = 3200;

export function WorldBossThreeAttackStage({ engineRef, onReady }: Props) {
  const releasedAtRef = useRef(0);
  const frameRef = useRef(0);
  const nextAttackAtRef = useRef(0);
  const serialRef = useRef(0);
  const pendingRef = useRef<PendingAttack | null>(null);
  const activeBreathRef = useRef<ActiveBreath | null>(null);
  const lastAttackKindRef = useRef<AttackKind>('wing');

  const handleReady = useCallback(() => {
    const now = performance.now();
    releasedAtRef.current = now + RELEASE_DELAY_MS;
    nextAttackAtRef.current = now + 1350;
    onReady();
  }, [onReady]);

  useEffect(() => {
    let disposed = false;

    const damagePlayer = (engine: GameEngine, boss: any, now: number, multiplier: number, source: AttackKind, scale: number) => {
      const player = engine.state.player;
      if (now < player.invincibleUntil) return false;
      const damage = Math.max(8, Math.round(boss.attack * multiplier - player.defense * 0.4));
      player.hp = Math.max(0, player.hp - damage);
      player.invincibleUntil = now + 760;
      player.lastHitTime = now;
      engine.state.damageNumbers.push({
        id: `hit-${source}-${Math.round(now)}`,
        x: player.x,
        y: player.y - 10,
        value: `-${damage}`,
        color: source === 'breath' ? '#ff742b' : source === 'wing' ? '#f6c56d' : '#ff9b54',
        lifeTime: 0,
        maxLifeTime: 820,
        scale,
      });
      return true;
    };

    const chooseAttack = (distance: number): AttackKind => {
      if (distance <= CLAW_RANGE && lastAttackKindRef.current !== 'claw') return 'claw';
      if (distance <= WING_RANGE && lastAttackKindRef.current !== 'wing') return 'wing';
      return 'breath';
    };

    const frame = (now: number) => {
      if (disposed) return;
      const engine = engineRef.current;
      const boss = engine?.state.enemies.find(enemy => enemy.enemyType === 'boss' && enemy.hp > 0);

      if (engine && boss && releasedAtRef.current > 0 && now >= releasedAtRef.current) {
        const player = engine.state.player;
        const bossX = boss.x + boss.width / 2;
        const bossY = boss.y + boss.height / 2;
        const playerX = player.x + player.width / 2;
        const playerY = player.y + player.height / 2;
        const dx = playerX - bossX;
        const dy = playerY - bossY;
        const distance = Math.hypot(dx, dy);

        boss.speed = Math.max(boss.speed, PURSUIT_SPEED);
        if (distance > 118 && boss.state !== 'attack') boss.state = 'chase';
        if (boss.nextAttackTime > now + ATTACK_READY_WINDOW_MS) boss.nextAttackTime = now + ATTACK_READY_WINDOW_MS;

        if (!pendingRef.current && !activeBreathRef.current && now >= nextAttackAtRef.current) {
          const kind = chooseAttack(distance);
          if (kind !== 'breath' || (distance >= BREATH_MIN_DISTANCE && distance <= BREATH_MAX_DISTANCE)) {
            const serial = ++serialRef.current;
            const windup = kind === 'breath' ? BREATH_WINDUP_MS : kind === 'claw' ? CLAW_WINDUP_MS : WING_WINDUP_MS;
            pendingRef.current = { kind, releaseAt: now + windup, serial };
            boss.state = 'attack';
            boss.vx = 0;
            boss.vy = 0;
            engine.state.effects.push({
              id: `boss-${kind}-telegraph-${serial}`,
              x: kind === 'breath' ? playerX : bossX,
              y: kind === 'breath' ? playerY : bossY,
              radius: 8,
              maxRadius: kind === 'claw' ? CLAW_RANGE : kind === 'wing' ? WING_RANGE : 92,
              color: kind === 'breath' ? '#ff6d24' : kind === 'wing' ? '#f4bd68' : '#ff9a4d',
              lifeTime: 0,
              maxLifeTime: windup,
              type: 'circle',
              element: 'fire',
              fromEnemyId: boss.id,
            });
          }
        }

        const pending = pendingRef.current;
        if (pending && now >= pending.releaseAt) {
          const releaseDx = playerX - bossX;
          const releaseDy = playerY - bossY;
          const releaseDistance = Math.max(1, Math.hypot(releaseDx, releaseDy));
          const baseAngle = Math.atan2(releaseDy, releaseDx);
          boss.lastAttackTime = now;
          lastAttackKindRef.current = pending.kind;

          if (pending.kind === 'breath') {
            const angles = [-0.13, 0, 0.13].map(offset => baseAngle + offset);
            const maxRadius = Math.max(320, Math.min(900, releaseDistance + 180));
            const ids = angles.map((angle, index) => {
              const id = `boss-shot-breath-${pending.serial}-${index}`;
              engine.state.effects.push({
                id,
                x: bossX,
                y: bossY,
                radius: 44,
                maxRadius,
                color: index === 1 ? '#ffbd55' : '#ff5c24',
                lifeTime: 0,
                maxLifeTime: BREATH_TRAVEL_MS,
                type: 'beam',
                angle,
                width: index === 1 ? 96 : 76,
                element: 'fire',
                fromEnemyId: boss.id,
              });
              return id;
            });
            activeBreathRef.current = { ids, originX: bossX, originY: bossY, angles, maxRadius };
            nextAttackAtRef.current = now + BREATH_COOLDOWN_MS;
          } else if (pending.kind === 'claw') {
            if (distance <= CLAW_RANGE) damagePlayer(engine, boss, now, 1.05, 'claw', 1.36);
            engine.state.effects.push({
              id: `boss-claw-impact-${pending.serial}`,
              x: playerX,
              y: playerY,
              radius: 24,
              maxRadius: 92,
              color: '#ff9a4d',
              lifeTime: 0,
              maxLifeTime: 360,
              type: 'circle',
              element: 'fire',
              fromEnemyId: boss.id,
            });
            nextAttackAtRef.current = now + CLAW_COOLDOWN_MS;
          } else {
            if (distance <= WING_RANGE) damagePlayer(engine, boss, now, 0.82, 'wing', 1.5);
            engine.state.effects.push({
              id: `boss-wing-impact-${pending.serial}`,
              x: bossX,
              y: bossY,
              radius: 32,
              maxRadius: WING_RANGE,
              color: '#f4bd68',
              lifeTime: 0,
              maxLifeTime: 560,
              type: 'circle',
              element: 'fire',
              fromEnemyId: boss.id,
            });
            nextAttackAtRef.current = now + WING_COOLDOWN_MS;
          }

          pendingRef.current = null;
          boss.state = 'chase';
        }

        const active = activeBreathRef.current;
        if (active) {
          let stillActive = false;
          for (let index = 0; index < active.ids.length; index++) {
            const effect = engine.state.effects.find(item => item.id === active.ids[index]);
            if (!effect) continue;
            stillActive = true;
            const progress = Math.max(0, Math.min(1, effect.lifeTime / Math.max(1, effect.maxLifeTime)));
            const flameX = active.originX + Math.cos(active.angles[index]) * active.maxRadius * progress;
            const flameY = active.originY + Math.sin(active.angles[index]) * active.maxRadius * progress;
            if (Math.hypot(flameX - playerX, flameY - playerY) <= BREATH_HIT_RADIUS && damagePlayer(engine, boss, now, 0.88, 'breath', 1.4)) {
              active.ids.forEach(id => {
                const sibling = engine.state.effects.find(item => item.id === id);
                if (sibling) sibling.lifeTime = sibling.maxLifeTime;
              });
              stillActive = false;
              break;
            }
          }
          if (!stillActive) activeBreathRef.current = null;
        }
      }

      frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      pendingRef.current = null;
      activeBreathRef.current = null;
    };
  }, [engineRef]);

  return <WorldBossCohesiveStage engineRef={engineRef} onReady={handleReady} />;
}

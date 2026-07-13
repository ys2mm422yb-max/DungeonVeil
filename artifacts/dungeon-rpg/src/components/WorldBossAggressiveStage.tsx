import React, { useCallback, useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import { WorldBossPerspectiveStage } from './WorldBossPerspectiveStage';

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
  onReady: () => void;
};

type ActiveFireball = {
  id: string;
  originX: number;
  originY: number;
  angle: number;
  maxRadius: number;
};

const RELEASE_DELAY_MS = 320;
const PURSUIT_SPEED = 82;
const ATTACK_READY_WINDOW_MS = 720;
const FIREBALL_WINDUP_MS = 620;
const FIREBALL_TRAVEL_MS = 950;
const FIREBALL_COOLDOWN_MS = 3800;
const FIREBALL_MIN_DISTANCE = 150;
const FIREBALL_MAX_DISTANCE = 820;
const FIREBALL_HIT_RADIUS = 58;

export function WorldBossAggressiveStage({ engineRef, onReady }: Props) {
  const releasedAtRef = useRef(0);
  const frameRef = useRef(0);
  const nextFireballAtRef = useRef(0);
  const pendingFireballAtRef = useRef(0);
  const fireballSerialRef = useRef(0);
  const activeFireballRef = useRef<ActiveFireball | null>(null);

  const handleReady = useCallback(() => {
    const now = performance.now();
    releasedAtRef.current = now + RELEASE_DELAY_MS;
    nextFireballAtRef.current = now + 1600;
    onReady();
  }, [onReady]);

  useEffect(() => {
    let disposed = false;

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

        if (distance > 112 && boss.state !== 'attack') boss.state = 'chase';
        if (boss.nextAttackTime > now + ATTACK_READY_WINDOW_MS) boss.nextAttackTime = now + ATTACK_READY_WINDOW_MS;

        if (!pendingFireballAtRef.current && !activeFireballRef.current && now >= nextFireballAtRef.current && distance >= FIREBALL_MIN_DISTANCE && distance <= FIREBALL_MAX_DISTANCE) {
          const serial = ++fireballSerialRef.current;
          pendingFireballAtRef.current = now + FIREBALL_WINDUP_MS;
          boss.state = 'attack';
          boss.vx = 0;
          boss.vy = 0;
          engine.state.effects.push({
            id: `boss-fireball-charge-${serial}`,
            x: bossCenterX,
            y: bossCenterY,
            radius: 8,
            maxRadius: 88,
            color: '#ff6a1f',
            lifeTime: 0,
            maxLifeTime: FIREBALL_WINDUP_MS,
            type: 'circle',
            element: 'fire',
            fromEnemyId: boss.id,
          });
        }

        if (pendingFireballAtRef.current && now >= pendingFireballAtRef.current) {
          const serial = fireballSerialRef.current;
          const releaseDx = playerCenterX - bossCenterX;
          const releaseDy = playerCenterY - bossCenterY;
          const releaseDistance = Math.max(1, Math.hypot(releaseDx, releaseDy));
          const angle = Math.atan2(releaseDy, releaseDx);
          const maxRadius = Math.max(300, Math.min(920, releaseDistance + 190));
          const id = `boss-shot-fireball-${serial}`;
          engine.state.effects.push({
            id,
            x: bossCenterX,
            y: bossCenterY,
            radius: 34,
            maxRadius,
            color: '#ff5a1f',
            lifeTime: 0,
            maxLifeTime: FIREBALL_TRAVEL_MS,
            type: 'beam',
            angle,
            width: 64,
            element: 'fire',
            fromEnemyId: boss.id,
          });
          activeFireballRef.current = { id, originX: bossCenterX, originY: bossCenterY, angle, maxRadius };
          pendingFireballAtRef.current = 0;
          nextFireballAtRef.current = now + FIREBALL_COOLDOWN_MS;
          boss.lastAttackTime = now;
          boss.state = 'chase';
        }

        const active = activeFireballRef.current;
        if (active) {
          const effect = engine.state.effects.find(item => item.id === active.id);
          if (!effect) {
            activeFireballRef.current = null;
          } else {
            const progress = Math.max(0, Math.min(1, effect.lifeTime / Math.max(1, effect.maxLifeTime)));
            const projectileX = active.originX + Math.cos(active.angle) * active.maxRadius * progress;
            const projectileY = active.originY + Math.sin(active.angle) * active.maxRadius * progress;
            if (now >= player.invincibleUntil && Math.hypot(projectileX - playerCenterX, projectileY - playerCenterY) <= FIREBALL_HIT_RADIUS) {
              const damage = Math.max(8, Math.round(boss.attack * 0.9 - player.defense * 0.4));
              player.hp = Math.max(0, player.hp - damage);
              player.invincibleUntil = now + 720;
              player.lastHitTime = now;
              engine.state.damageNumbers.push({
                id: `hit-fireball-${fireballSerialRef.current}-${Math.round(now)}`,
                x: player.x,
                y: player.y - 10,
                value: `-${damage}`,
                color: '#ff6a2b',
                lifeTime: 0,
                maxLifeTime: 820,
                scale: 1.28,
              });
              effect.lifeTime = effect.maxLifeTime;
              activeFireballRef.current = null;
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
      pendingFireballAtRef.current = 0;
      activeFireballRef.current = null;
    };
  }, [engineRef]);

  return <WorldBossPerspectiveStage engineRef={engineRef} onReady={handleReady} />;
}

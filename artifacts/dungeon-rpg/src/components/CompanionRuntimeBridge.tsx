import { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { getMyCoopLobby } from '../game/coopLobbyOnline';
import {
  companionDamageAttributionV4,
  createCompanionReservationV4,
  type CompanionRoleV4,
} from '../game/companionReserveV4';
import {
  COMPANION_DEFINITIONS_V5,
  companionAttackIntervalV5,
  companionEffectivePowerV5,
} from '../game/companionCollectionV5';

export const COMPANION_ACTION_EVENT_V4 = 'dungeon-veil-companion-action-v4';

const TILE = 40;
type CompanionAuthority = 'solo' | 'host' | 'guest' | 'unknown';

type Props = {
  gameState: GameState;
  role: CompanionRoleV4;
  level: number;
  mode: 'solo' | 'duo';
};

function livingEnemies(state: GameState) {
  return state.enemies.filter(enemy => !enemy.isDead && enemy.hp > 0);
}

function nearestEnemy(state: GameState) {
  const px = state.player.x + state.player.width / 2;
  const py = state.player.y + state.player.height / 2;
  return livingEnemies(state).sort((a, b) => (
    Math.hypot(a.x + a.width / 2 - px, a.y + a.height / 2 - py)
    - Math.hypot(b.x + b.width / 2 - px, b.y + b.height / 2 - py)
  ))[0] ?? null;
}

function localCompanionOrigin(state: GameState) {
  const ownerX = state.player.x + state.player.width / 2;
  const ownerY = state.player.y + state.player.height / 2;
  const mapCenterX = state.map.width * TILE / 2;
  const mapCenterY = state.map.height * TILE / 2;
  const centerDeltaX = mapCenterX - ownerX;
  const centerDeltaY = mapCenterY - ownerY;
  const centerDistance = Math.hypot(centerDeltaX, centerDeltaY);
  const inwardX = centerDistance > 80 ? centerDeltaX / centerDistance : state.player.facing.x;
  const inwardY = centerDistance > 80 ? centerDeltaY / centerDistance : state.player.facing.y;
  return {
    x: ownerX + inwardX * 64 - inwardY * 40,
    y: ownerY + inwardY * 64 + inwardX * 40,
  };
}

function emitCompanionAction(role: CompanionRoleV4, level: number, kind: 'attack' | 'guard' | 'collect' | 'distract', targetId?: string) {
  window.dispatchEvent(new CustomEvent(COMPANION_ACTION_EVENT_V4, {
    detail: { ownerPlayerId: 'player', role, level, kind, targetId, at: performance.now() },
  }));
}

function pushBoundedCompanionEffect(state: GameState, budget: number, effect: GameState['effects'][number]) {
  const prefix = 'companion-v5-';
  const existing = state.effects.filter(entry => entry.id.startsWith(prefix));
  while (existing.length >= budget) {
    const oldest = existing.shift();
    if (!oldest) break;
    const liveIndex = state.effects.findIndex(entry => entry.id === oldest.id);
    if (liveIndex >= 0) state.effects.splice(liveIndex, 1);
  }
  state.effects.push(effect);
}

export function CompanionRuntimeBridge({ gameState, role, level, mode }: Props) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef(gameState);
  const roleRef = useRef(role);
  const levelRef = useRef(level);
  const modeRef = useRef(mode);
  const authorityRef = useRef<CompanionAuthority>(mode === 'solo' ? 'solo' : 'unknown');
  const previousHpRef = useRef(gameState.player.hp);
  const lastBasicAttackRef = useRef(0);
  const lastSpecialActionRef = useRef(0);
  const lastPlayerAttackRef = useRef(gameState.player.lastAttackTime);
  stateRef.current = gameState;
  roleRef.current = role;
  levelRef.current = level;
  modeRef.current = mode;

  useEffect(() => {
    previousHpRef.current = gameState.player.hp;
    lastBasicAttackRef.current = 0;
    lastSpecialActionRef.current = 0;
    lastPlayerAttackRef.current = gameState.player.lastAttackTime;
  }, [role, level]);

  useEffect(() => {
    let cancelled = false;
    authorityRef.current = mode === 'solo' ? 'solo' : 'unknown';
    if (markerRef.current) markerRef.current.dataset.authority = authorityRef.current;
    if (mode === 'duo') {
      void getMyCoopLobby().then(lobby => {
        if (cancelled) return;
        authorityRef.current = lobby?.role ?? 'unknown';
        if (markerRef.current) markerRef.current.dataset.authority = authorityRef.current;
      }).catch(() => {
        if (cancelled) return;
        authorityRef.current = 'unknown';
        if (markerRef.current) markerRef.current.dataset.authority = 'unknown';
      });
    }
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    const tick = () => {
      const state = stateRef.current;
      const activeRole = roleRef.current;
      const activeLevel = levelRef.current;
      const definition = COMPANION_DEFINITIONS_V5[activeRole];
      const now = performance.now();
      const power = companionEffectivePowerV5(activeRole, activeLevel);
      const reservation = createCompanionReservationV4({
        id: `companion-v5-local-${activeRole}`,
        ownerPlayerId: 'player',
        role: activeRole,
        requestedEffectivePower: power,
      });
      const canWriteEnemies = modeRef.current === 'solo' || authorityRef.current === 'host';
      const target = nearestEnemy(state);

      if (state.status !== 'playing' || state.player.hp <= 0) {
        previousHpRef.current = state.player.hp;
        lastPlayerAttackRef.current = state.player.lastAttackTime;
        return;
      }

      if (target && now - lastBasicAttackRef.current >= companionAttackIntervalV5(activeLevel)) {
        const origin = localCompanionOrigin(state);
        const toX = target.x + target.width / 2;
        const toY = target.y + target.height / 2;
        const roleMultiplier = activeRole === 'single-target' ? 1.25 : activeRole === 'critical-support' ? 0.78 : 0.62;
        const damage = companionDamageAttributionV4(reservation, state.player.attack * power * roleMultiplier);
        if (canWriteEnemies && damage.damage > 0) {
          target.hp -= damage.damage;
          target.flashUntil = now + 130;
          target.lastHitTime = now;
          target.hitFromX = origin.x;
          target.hitFromY = origin.y;
          if (activeRole === 'distraction') {
            target.frostSlow = Math.max(target.frostSlow ?? 0, Math.min(0.16, power + 0.03));
            target.frostUntil = Math.max(target.frostUntil ?? 0, now + 920);
          }
          state.damageNumbers.push({
            id: `${damage.source}-basic-${now}-${target.id}`,
            x: toX,
            y: target.y - 9,
            value: `-${damage.damage}`,
            color: definition.accent,
            lifeTime: 0,
            maxLifeTime: 720,
            scale: activeRole === 'single-target' ? 1.0 : 0.84,
          });
        }
        pushBoundedCompanionEffect(state, Math.max(2, reservation.projectileBudget), {
          id: `companion-v5-attack-${activeRole}-${now}`,
          x: origin.x,
          y: origin.y,
          radius: 0,
          maxRadius: Math.hypot(toX - origin.x, toY - origin.y),
          color: definition.accent,
          lifeTime: 0,
          maxLifeTime: activeRole === 'shield' ? 340 : 280,
          type: activeRole === 'shield' ? 'circle' : 'beam',
          angle: Math.atan2(toY - origin.y, toX - origin.x),
          width: activeRole === 'distraction' ? 7 : activeRole === 'single-target' ? 6 : 4,
          element: 'arcane',
          toEnemyId: target.id,
        });
        emitCompanionAction(activeRole, activeLevel, 'attack', target.id);
        lastBasicAttackRef.current = now;
      }

      if (activeRole === 'critical-support') {
        const playerAttack = state.player.lastAttackTime;
        if (target && playerAttack > lastPlayerAttackRef.current && now - lastSpecialActionRef.current >= 2_600) {
          const damage = companionDamageAttributionV4(reservation, state.player.attack * power * 0.72);
          if (canWriteEnemies && damage.damage > 0) {
            target.hp -= damage.damage;
            target.flashUntil = now + 110;
            target.lastHitTime = now;
            state.damageNumbers.push({
              id: `${damage.source}-critical-${now}-${target.id}`,
              x: target.x + target.width / 2,
              y: target.y - 12,
              value: `✦${damage.damage}`,
              color: definition.accent,
              lifeTime: 0,
              maxLifeTime: 760,
              scale: 0.94,
            });
          }
          pushBoundedCompanionEffect(state, 2, {
            id: `companion-v5-critical-${now}`,
            x: target.x + target.width / 2,
            y: target.y + target.height / 2,
            radius: 0,
            maxRadius: 50,
            color: definition.accent,
            lifeTime: 0,
            maxLifeTime: 320,
            type: 'circle',
            element: 'arcane',
          });
          emitCompanionAction(activeRole, activeLevel, 'attack', target.id);
          lastSpecialActionRef.current = now;
        }
        lastPlayerAttackRef.current = playerAttack;
      }

      if (activeRole === 'shield' && state.player.hp < previousHpRef.current && now - lastSpecialActionRef.current >= 7_500) {
        const loss = previousHpRef.current - state.player.hp;
        const restored = Math.max(1, Math.min(loss, Math.round(state.player.maxHp * power * 0.55)));
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + restored);
        state.player.lastGuardTime = now;
        state.damageNumbers.push({
          id: `companion-v5-shield-${now}`,
          x: state.player.x + state.player.width / 2,
          y: state.player.y - 12,
          value: `+${restored}`,
          color: definition.accent,
          lifeTime: 0,
          maxLifeTime: 740,
          scale: 0.9,
        });
        pushBoundedCompanionEffect(state, 2, {
          id: `companion-v5-guard-${now}`,
          x: state.player.x + state.player.width / 2,
          y: state.player.y + state.player.height / 2,
          radius: 0,
          maxRadius: 64,
          color: definition.accent,
          lifeTime: 0,
          maxLifeTime: 430,
          type: 'circle',
          element: 'normal',
        });
        emitCompanionAction(activeRole, activeLevel, 'guard');
        lastSpecialActionRef.current = now;
      }

      if (activeRole === 'loot-comfort' && state.items.length > 0) {
        const px = state.player.x + state.player.width / 2;
        const py = state.player.y + state.player.height / 2;
        let moved = false;
        for (const item of state.items) {
          const dx = px - (item.x + item.width / 2);
          const dy = py - (item.y + item.height / 2);
          const distance = Math.hypot(dx, dy);
          if (distance <= 24 || distance > 190 + activeLevel * 12) continue;
          const step = Math.min(distance - 20, 2.4 + activeLevel * 0.65);
          item.x += dx / distance * step;
          item.y += dy / distance * step;
          moved = true;
        }
        if (moved && now - lastSpecialActionRef.current >= 1_700) {
          emitCompanionAction(activeRole, activeLevel, 'collect');
          lastSpecialActionRef.current = now;
        }
      }

      previousHpRef.current = state.player.hp;
      if (markerRef.current) {
        markerRef.current.dataset.role = activeRole;
        markerRef.current.dataset.level = String(activeLevel);
        markerRef.current.dataset.species = definition.species;
        markerRef.current.dataset.mode = modeRef.current;
        markerRef.current.dataset.enemyAuthority = String(canWriteEnemies);
      }
    };

    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, []);

  const definition = COMPANION_DEFINITIONS_V5[role];
  return (
    <span
      ref={markerRef}
      className="hidden"
      aria-hidden="true"
      data-testid="companion-runtime-bridge"
      data-role={role}
      data-level={level}
      data-species={definition.species}
      data-mode={mode}
      data-authority={mode === 'solo' ? 'solo' : 'unknown'}
      data-ai-hz="10"
      data-basic-attacks="true"
      data-selection="pre-run-frozen"
      data-revive-target="false"
      data-blocks-players="false"
      data-blocks-enemies="false"
    />
  );
}

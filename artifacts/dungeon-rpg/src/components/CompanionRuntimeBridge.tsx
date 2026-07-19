import { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { getMyCoopLobby } from '../game/coopLobbyOnline';
import {
  companionDamageAttributionV4,
  createCompanionReservationV4,
  type CompanionRoleV4,
} from '../game/companionReserveV4';

export const COMPANION_ACTION_EVENT_V4 = 'dungeon-veil-companion-action-v4';

type CompanionAuthority = 'solo' | 'host' | 'guest' | 'unknown';

type Props = {
  gameState: GameState;
  role: CompanionRoleV4;
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

function emitCompanionAction(role: CompanionRoleV4, kind: 'attack' | 'guard' | 'collect' | 'distract') {
  window.dispatchEvent(new CustomEvent(COMPANION_ACTION_EVENT_V4, {
    detail: { ownerPlayerId: 'player', role, kind, at: performance.now() },
  }));
}

function pushBoundedCompanionEffect(state: GameState, budget: number, effect: GameState['effects'][number]) {
  const prefix = 'companion-v4-';
  const existing = state.effects
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.id.startsWith(prefix));
  while (existing.length >= budget) {
    const oldest = existing.shift();
    if (!oldest) break;
    const liveIndex = state.effects.findIndex(entry => entry.id === oldest.entry.id);
    if (liveIndex >= 0) state.effects.splice(liveIndex, 1);
  }
  state.effects.push(effect);
}

export function CompanionRuntimeBridge({ gameState, role, mode }: Props) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef(gameState);
  const roleRef = useRef(role);
  const modeRef = useRef(mode);
  const authorityRef = useRef<CompanionAuthority>(mode === 'solo' ? 'solo' : 'unknown');
  const previousHpRef = useRef(gameState.player.hp);
  const lastActionRef = useRef(0);
  const lastPlayerAttackRef = useRef(gameState.player.lastAttackTime);
  stateRef.current = gameState;
  roleRef.current = role;
  modeRef.current = mode;

  useEffect(() => {
    previousHpRef.current = gameState.player.hp;
    lastActionRef.current = 0;
    lastPlayerAttackRef.current = gameState.player.lastAttackTime;
  }, [role]);

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
      const now = performance.now();
      const reservation = createCompanionReservationV4({
        id: `companion-v4-local-${activeRole}`,
        ownerPlayerId: 'player',
        role: activeRole,
      });
      const canWriteEnemies = modeRef.current === 'solo' || authorityRef.current === 'host';
      const target = nearestEnemy(state);
      let actionApplied = false;

      if (state.status !== 'playing') {
        previousHpRef.current = state.player.hp;
        lastPlayerAttackRef.current = state.player.lastAttackTime;
        return;
      }

      if (activeRole === 'single-target' && target && now - lastActionRef.current >= 1_400) {
        const damage = companionDamageAttributionV4(reservation, state.player.attack * reservation.effectivePower);
        if (canWriteEnemies && damage.damage > 0) {
          target.hp -= damage.damage;
          target.flashUntil = now + 90;
          target.lastHitTime = now;
          target.hitFromX = state.player.x + state.player.width / 2;
          target.hitFromY = state.player.y + state.player.height / 2;
          state.damageNumbers.push({
            id: `${damage.source}-${now}-${target.id}`,
            x: target.x + target.width / 2,
            y: target.y - 7,
            value: `-${damage.damage}`,
            color: '#8ce7ff',
            lifeTime: 0,
            maxLifeTime: 620,
            scale: 0.82,
          });
        }
        const fromX = state.player.x + state.player.width / 2;
        const fromY = state.player.y + state.player.height / 2;
        const toX = target.x + target.width / 2;
        const toY = target.y + target.height / 2;
        pushBoundedCompanionEffect(state, reservation.projectileBudget, {
          id: `companion-v4-shot-${now}`,
          x: fromX,
          y: fromY,
          radius: 0,
          maxRadius: Math.hypot(toX - fromX, toY - fromY),
          color: '#8ce7ff',
          lifeTime: 0,
          maxLifeTime: 220,
          type: 'beam',
          angle: Math.atan2(toY - fromY, toX - fromX),
          width: 3,
          element: 'arcane',
          toEnemyId: target.id,
        });
        emitCompanionAction(activeRole, 'attack');
        actionApplied = true;
      }

      if (activeRole === 'critical-support') {
        const playerAttack = state.player.lastAttackTime;
        if (target && playerAttack > lastPlayerAttackRef.current && now - lastActionRef.current >= 1_100) {
          const damage = companionDamageAttributionV4(reservation, state.player.attack * reservation.effectivePower);
          if (canWriteEnemies && damage.damage > 0) {
            target.hp -= damage.damage;
            target.flashUntil = now + 95;
            target.lastHitTime = now;
            state.damageNumbers.push({
              id: `${damage.source}-critical-${now}-${target.id}`,
              x: target.x + target.width / 2,
              y: target.y - 10,
              value: `✦${damage.damage}`,
              color: '#ffd76a',
              lifeTime: 0,
              maxLifeTime: 700,
              scale: 0.9,
            });
          }
          pushBoundedCompanionEffect(state, reservation.projectileBudget, {
            id: `companion-v4-critical-${now}`,
            x: target.x + target.width / 2,
            y: target.y + target.height / 2,
            radius: 0,
            maxRadius: 44,
            color: '#ffd76a',
            lifeTime: 0,
            maxLifeTime: 260,
            type: 'circle',
            element: 'arcane',
          });
          emitCompanionAction(activeRole, 'attack');
          actionApplied = true;
        }
        lastPlayerAttackRef.current = playerAttack;
      }

      if (activeRole === 'shield' && state.player.hp < previousHpRef.current && now - lastActionRef.current >= 7_500) {
        const loss = previousHpRef.current - state.player.hp;
        const restored = Math.max(1, Math.min(loss, Math.round(state.player.maxHp * reservation.effectivePower * 0.55)));
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + restored);
        state.player.lastGuardTime = now;
        state.damageNumbers.push({
          id: `companion-v4-shield-${now}`,
          x: state.player.x + state.player.width / 2,
          y: state.player.y - 12,
          value: `+${restored}`,
          color: '#79e6a4',
          lifeTime: 0,
          maxLifeTime: 700,
          scale: 0.82,
        });
        pushBoundedCompanionEffect(state, reservation.projectileBudget, {
          id: `companion-v4-guard-${now}`,
          x: state.player.x + state.player.width / 2,
          y: state.player.y + state.player.height / 2,
          radius: 0,
          maxRadius: 58,
          color: '#79e6a4',
          lifeTime: 0,
          maxLifeTime: 360,
          type: 'circle',
          element: 'normal',
        });
        emitCompanionAction(activeRole, 'guard');
        actionApplied = true;
      }

      if (activeRole === 'loot-comfort' && state.items.length > 0) {
        const px = state.player.x + state.player.width / 2;
        const py = state.player.y + state.player.height / 2;
        let moved = false;
        for (const item of state.items) {
          const dx = px - (item.x + item.width / 2);
          const dy = py - (item.y + item.height / 2);
          const distance = Math.hypot(dx, dy);
          if (distance <= 24 || distance > 190) continue;
          const step = Math.min(distance - 20, 3.2 * reservation.effectivePower / 0.08);
          item.x += dx / distance * step;
          item.y += dy / distance * step;
          moved = true;
        }
        if (moved && now - lastActionRef.current >= 1_600) {
          emitCompanionAction(activeRole, 'collect');
          actionApplied = true;
        }
      }

      if (activeRole === 'distraction' && target && now - lastActionRef.current >= 2_200) {
        if (canWriteEnemies) {
          target.frostSlow = Math.max(target.frostSlow ?? 0, reservation.effectivePower);
          target.frostUntil = Math.max(target.frostUntil ?? 0, now + 760);
        }
        pushBoundedCompanionEffect(state, reservation.projectileBudget, {
          id: `companion-v4-distraction-${now}`,
          x: target.x + target.width / 2,
          y: target.y + target.height / 2,
          radius: 0,
          maxRadius: 46,
          color: '#b693ff',
          lifeTime: 0,
          maxLifeTime: 320,
          type: 'circle',
          element: 'arcane',
        });
        emitCompanionAction(activeRole, 'distract');
        actionApplied = true;
      }

      if (actionApplied) lastActionRef.current = now;
      previousHpRef.current = state.player.hp;
      if (markerRef.current) {
        markerRef.current.dataset.role = activeRole;
        markerRef.current.dataset.mode = modeRef.current;
        markerRef.current.dataset.enemyAuthority = String(canWriteEnemies);
      }
    };

    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      ref={markerRef}
      className="hidden"
      aria-hidden="true"
      data-testid="companion-runtime-bridge"
      data-role={role}
      data-mode={mode}
      data-authority={mode === 'solo' ? 'solo' : 'unknown'}
      data-ai-hz="10"
      data-revive-target="false"
      data-blocks-players="false"
      data-blocks-enemies="false"
    />
  );
}

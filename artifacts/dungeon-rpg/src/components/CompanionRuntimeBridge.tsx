import { useEffect, useRef, useState } from 'react';
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
import { RUN_CAMERA } from './RunCameraRig';

export const COMPANION_ACTION_EVENT_V4 = 'dungeon-veil-companion-action-v4';

const TILE = 40;
const COMPANION_DAMAGE_FEEDBACK_MS = 1_050;
const RECENT_COMBAT_TARGET_MS = 1_200;
const CRITICAL_SUPPORT_SPECIAL_COOLDOWN_MS = 2_600;
type CompanionAuthority = 'solo' | 'host' | 'guest' | 'unknown';

type Props = {
  gameState: GameState;
  role: CompanionRoleV4;
  level: number;
  mode: 'solo' | 'duo';
};

type CompanionDamageFeedback = {
  id: string;
  role: CompanionRoleV4;
  targetId: string;
  value: number;
  color: string;
  x: number;
  y: number;
  worldY: number;
  critical: boolean;
};

type ProjectedPoint = { left: number; top: number; clamped: boolean };

type RecentCombatTarget = {
  target: GameState['enemies'][number];
  observedAt: number;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

function normalize(vector: [number, number, number]): [number, number, number] {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cameraFocus(state: GameState): { x: number; z: number } {
  const playerX = state.player.x / TILE - state.map.width / 2 + 0.5;
  const playerZ = state.player.y / TILE - state.map.height / 2 + 0.5;
  const centeredPlayerX = playerX + RUN_CAMERA.playerCenterOffset;
  const centeredPlayerZ = playerZ + RUN_CAMERA.playerCenterOffset;
  const minZ = state.roomClearReady ? RUN_CAMERA.clearMinFollowZ : RUN_CAMERA.minFollowZ;
  const maxZ = state.roomClearReady ? RUN_CAMERA.clearMaxFollowZ : RUN_CAMERA.maxFollowZ;

  let focusX = clamp(centeredPlayerX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  let focusZ = clamp(centeredPlayerZ - 0.7, minZ, maxZ);
  const offsetX = centeredPlayerX - focusX;
  if (offsetX > RUN_CAMERA.safeHalfX) focusX += offsetX - RUN_CAMERA.safeHalfX;
  else if (offsetX < -RUN_CAMERA.safeHalfX) focusX += offsetX + RUN_CAMERA.safeHalfX;
  const offsetZ = centeredPlayerZ - focusZ;
  if (offsetZ > RUN_CAMERA.safeForwardZ) focusZ += offsetZ - RUN_CAMERA.safeForwardZ;
  else if (offsetZ < -RUN_CAMERA.safeRearZ) focusZ += offsetZ + RUN_CAMERA.safeRearZ;
  return {
    x: clamp(focusX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX),
    z: clamp(focusZ, minZ, maxZ),
  };
}

function projectCompanionDamage(state: GameState, feedback: CompanionDamageFeedback): ProjectedPoint | null {
  if (typeof window === 'undefined') return null;
  const focus = cameraFocus(state);
  const camera: [number, number, number] = [focus.x, RUN_CAMERA.height, focus.z + RUN_CAMERA.distance];
  const target: [number, number, number] = [focus.x, RUN_CAMERA.lookHeight, focus.z - 2.85];
  const forward = normalize([target[0] - camera[0], target[1] - camera[1], target[2] - camera[2]]);
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = normalize(cross(right, forward));
  const worldX = feedback.x / TILE - state.map.width / 2 + 0.5;
  const worldZ = feedback.y / TILE - state.map.height / 2 + 0.5;
  const relative: [number, number, number] = [worldX - camera[0], feedback.worldY - camera[1], worldZ - camera[2]];
  const depth = dot(relative, forward);
  if (depth <= 0.1) return null;
  const aspect = Math.max(0.45, window.innerWidth / Math.max(1, window.innerHeight));
  const focal = 1 / Math.tan(RUN_CAMERA.fov * Math.PI / 360);
  const ndcX = dot(relative, right) / depth * focal / aspect;
  const ndcY = dot(relative, up) / depth * focal;
  const rawLeft = (ndcX * 0.5 + 0.5) * 100;
  const rawTop = (-ndcY * 0.5 + 0.5) * 100;
  return {
    left: clamp(rawLeft, 8, 92),
    top: clamp(rawTop, 13, 86),
    clamped: rawLeft < 8 || rawLeft > 92 || rawTop < 13 || rawTop > 86,
  };
}

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
  const basicAttackCountRef = useRef(0);
  const lastSpecialActionRef = useRef(0);
  const lastPlayerAttackRef = useRef(gameState.player.lastAttackTime);
  const recentCombatTargetRef = useRef<RecentCombatTarget | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const feedbackPaintTokenRef = useRef(0);
  const activeDamageFeedbackRef = useRef<CompanionDamageFeedback | null>(null);
  const feedbackVisibleUntilRef = useRef(0);
  const runtimeFrozenRef = useRef(false);
  const [damageFeedback, setDamageFeedback] = useState<CompanionDamageFeedback | null>(null);
  stateRef.current = gameState;
  roleRef.current = role;
  levelRef.current = level;
  modeRef.current = mode;

  useEffect(() => {
    previousHpRef.current = gameState.player.hp;
    lastBasicAttackRef.current = 0;
    basicAttackCountRef.current = 0;
    lastSpecialActionRef.current = 0;
    lastPlayerAttackRef.current = gameState.player.lastAttackTime;
    recentCombatTargetRef.current = null;
    feedbackPaintTokenRef.current += 1;
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
    activeDamageFeedbackRef.current = null;
    feedbackVisibleUntilRef.current = 0;
    setDamageFeedback(null);
    if (markerRef.current) {
      markerRef.current.dataset.lastCriticalSpecialAt = '';
      markerRef.current.dataset.lastCriticalSpecialTarget = '';
      markerRef.current.dataset.lastCriticalSpecialPlayerAttackAt = '';
      markerRef.current.dataset.lastCriticalFeedbackPublishedAt = '';
      markerRef.current.dataset.lastCriticalFeedbackTarget = '';
      markerRef.current.dataset.lastCriticalFeedbackValue = '';
      markerRef.current.dataset.lastCriticalFeedbackVisibleUntil = '';
      markerRef.current.dataset.lastCriticalFeedbackPaintToken = '';
    }
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
    const syncFrozenBaseline = () => {
      const state = stateRef.current;
      previousHpRef.current = state.player.hp;
      lastPlayerAttackRef.current = state.player.lastAttackTime;
      recentCombatTargetRef.current = null;
    };
    const freezeRuntime = () => {
      runtimeFrozenRef.current = true;
      syncFrozenBaseline();
      if (markerRef.current) markerRef.current.dataset.runtimeFrozen = 'true';
    };
    const resumeRuntime = () => {
      syncFrozenBaseline();
      runtimeFrozenRef.current = false;
      if (markerRef.current) markerRef.current.dataset.runtimeFrozen = 'false';
    };
    if (markerRef.current) markerRef.current.dataset.runtimeFrozen = 'false';
    window.addEventListener('dungeon-veil-room-preparing', freezeRuntime);
    window.addEventListener('dungeon-veil-renderer-lost', freezeRuntime);
    window.addEventListener('dungeon-veil-room-ready', resumeRuntime);
    return () => {
      window.removeEventListener('dungeon-veil-room-preparing', freezeRuntime);
      window.removeEventListener('dungeon-veil-renderer-lost', freezeRuntime);
      window.removeEventListener('dungeon-veil-room-ready', resumeRuntime);
    };
  }, []);

  useEffect(() => {
    const publishDamageFeedback = (
      activeRole: CompanionRoleV4,
      target: GameState['enemies'][number],
      value: number,
      color: string,
      critical: boolean,
      now: number,
    ) => {
      if (!critical && activeDamageFeedbackRef.current?.critical && now < feedbackVisibleUntilRef.current) return;
      const feedback: CompanionDamageFeedback = {
        id: `companion-damage-${activeRole}-${now}-${target.id}`,
        role: activeRole,
        targetId: target.id,
        value,
        color,
        x: target.x + target.width / 2,
        y: target.y + target.height / 2,
        worldY: target.enemyType === 'boss' ? 1.35 : 0.82,
        critical,
      };
      const paintToken = ++feedbackPaintTokenRef.current;
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
      activeDamageFeedbackRef.current = feedback;
      feedbackVisibleUntilRef.current = now + COMPANION_DAMAGE_FEEDBACK_MS;
      if (critical && markerRef.current) {
        markerRef.current.dataset.lastCriticalFeedbackPublishedAt = String(now);
        markerRef.current.dataset.lastCriticalFeedbackTarget = target.id;
        markerRef.current.dataset.lastCriticalFeedbackValue = String(value);
        markerRef.current.dataset.lastCriticalFeedbackVisibleUntil = String(feedbackVisibleUntilRef.current);
        markerRef.current.dataset.lastCriticalFeedbackPaintToken = String(paintToken);
      }
      setDamageFeedback(feedback);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (feedbackPaintTokenRef.current !== paintToken) return;
          feedbackTimerRef.current = window.setTimeout(() => {
            if (feedbackPaintTokenRef.current !== paintToken) return;
            setDamageFeedback(current => current?.id === feedback.id ? null : current);
            if (activeDamageFeedbackRef.current?.id === feedback.id) {
              activeDamageFeedbackRef.current = null;
              feedbackVisibleUntilRef.current = 0;
            }
            feedbackTimerRef.current = null;
          }, COMPANION_DAMAGE_FEEDBACK_MS);
        });
      });
    };

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
      const previousCombatTarget = recentCombatTargetRef.current;

      if (markerRef.current) {
        markerRef.current.dataset.criticalSpecialReady = String(
          activeRole === 'critical-support'
          && !runtimeFrozenRef.current
          && state.status === 'playing'
          && state.player.hp > 0
          && now - lastSpecialActionRef.current >= CRITICAL_SUPPORT_SPECIAL_COOLDOWN_MS
        );
      }

      if (runtimeFrozenRef.current) {
        previousHpRef.current = state.player.hp;
        lastPlayerAttackRef.current = state.player.lastAttackTime;
        recentCombatTargetRef.current = null;
        return;
      }

      if (state.status !== 'playing' || state.player.hp <= 0) {
        previousHpRef.current = state.player.hp;
        lastPlayerAttackRef.current = state.player.lastAttackTime;
        recentCombatTargetRef.current = null;
        return;
      }

      if (target) recentCombatTargetRef.current = { target, observedAt: now };
      else if (previousCombatTarget && now - previousCombatTarget.observedAt > RECENT_COMBAT_TARGET_MS) recentCombatTargetRef.current = null;

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
          publishDamageFeedback(activeRole, target, damage.damage, definition.accent, false, now);
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
        basicAttackCountRef.current += 1;
        lastBasicAttackRef.current = now;
      }

      if (activeRole === 'critical-support') {
        const playerAttack = state.player.lastAttackTime;
        const recentTarget = previousCombatTarget && now - previousCombatTarget.observedAt <= RECENT_COMBAT_TARGET_MS
          ? previousCombatTarget.target
          : null;
        const criticalTarget = recentTarget ?? target;
        if (criticalTarget && playerAttack > lastPlayerAttackRef.current && now - lastSpecialActionRef.current >= CRITICAL_SUPPORT_SPECIAL_COOLDOWN_MS) {
          const damage = companionDamageAttributionV4(reservation, state.player.attack * power * 0.72);
          if (canWriteEnemies && damage.damage > 0) {
            if (!criticalTarget.isDead && criticalTarget.hp > 0) {
              criticalTarget.hp -= damage.damage;
              criticalTarget.flashUntil = now + 110;
              criticalTarget.lastHitTime = now;
            }
            publishDamageFeedback(activeRole, criticalTarget, damage.damage, definition.accent, true, now);
          }
          pushBoundedCompanionEffect(state, 2, {
            id: `companion-v5-critical-${now}`,
            x: criticalTarget.x + criticalTarget.width / 2,
            y: criticalTarget.y + criticalTarget.height / 2,
            radius: 0,
            maxRadius: 50,
            color: definition.accent,
            lifeTime: 0,
            maxLifeTime: 320,
            type: 'circle',
            element: 'arcane',
          });
          emitCompanionAction(activeRole, activeLevel, 'attack', criticalTarget.id);
          if (markerRef.current) {
            markerRef.current.dataset.lastCriticalSpecialAt = String(now);
            markerRef.current.dataset.lastCriticalSpecialTarget = criticalTarget.id;
            markerRef.current.dataset.lastCriticalSpecialPlayerAttackAt = String(playerAttack);
          }
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
        markerRef.current.dataset.basicAttackCount = String(basicAttackCountRef.current);
      }
    };

    const interval = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(interval);
      recentCombatTargetRef.current = null;
      feedbackPaintTokenRef.current += 1;
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
      activeDamageFeedbackRef.current = null;
      feedbackVisibleUntilRef.current = 0;
    };
  }, []);

  const definition = COMPANION_DEFINITIONS_V5[role];
  const projectedFeedback = damageFeedback ? projectCompanionDamage(gameState, damageFeedback) : null;
  return (
    <>
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
        data-basic-attack-count="0"
        data-selection="pre-run-frozen"
        data-revive-target="false"
        data-blocks-players="false"
        data-blocks-enemies="false"
        data-runtime-frozen="false"
        data-critical-special-ready="false"
        data-last-critical-special-at=""
        data-last-critical-special-target=""
        data-last-critical-special-player-attack-at=""
        data-last-critical-feedback-published-at=""
        data-last-critical-feedback-target=""
        data-last-critical-feedback-value=""
        data-last-critical-feedback-visible-until=""
        data-last-critical-feedback-paint-token=""
        data-feedback-active={damageFeedback ? 'true' : 'false'}
        data-feedback-projected={projectedFeedback ? 'true' : 'false'}
        data-feedback-target={damageFeedback?.targetId ?? ''}
        data-feedback-critical={damageFeedback ? String(damageFeedback.critical) : ''}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[34] overflow-hidden"
        data-testid="companion-damage-feedback-layer"
        data-visible-count={damageFeedback && projectedFeedback ? '1' : '0'}
        data-feedback-active={damageFeedback ? 'true' : 'false'}
        data-feedback-projected={projectedFeedback ? 'true' : 'false'}
        aria-hidden="true"
      >
        {damageFeedback && projectedFeedback && <div
          key={damageFeedback.id}
          data-testid={`companion-damage-number-${damageFeedback.id}`}
          data-companion-role={damageFeedback.role}
          data-target-id={damageFeedback.targetId}
          data-critical={damageFeedback.critical ? 'true' : 'false'}
          data-projection-clamped={projectedFeedback.clamped ? 'true' : 'false'}
          className="absolute flex items-center justify-center font-black tracking-wide"
          style={{
            left: `${projectedFeedback.left}%`,
            top: `${projectedFeedback.top}%`,
            transform: 'translate(-50%, -50%)',
            color: damageFeedback.critical ? '#fff4c4' : '#ffffff',
            lineHeight: 1,
            animation: 'dvCompanionDamageReadable 1.05s cubic-bezier(.16,.84,.28,1) both',
          }}
        >
          <span aria-hidden="true">{damageFeedback.critical ? '✦' : '◆'}</span>
          <span className="ml-1">-{damageFeedback.value}</span>
        </div>}
        <style>{`
          @keyframes dvCompanionDamageReadable {
            0% { opacity: 1; transform: translate(-50%, -24%) scale(.72); }
            15% { opacity: 1; transform: translate(-50%, -50%) scale(1.14); }
            34% { transform: translate(-50%, -58%) scale(1); }
            74% { opacity: 1; transform: translate(-50%, -74%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -112%) scale(.94); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-testid^="companion-damage-number-"] {
              animation-name: dvCompanionDamageReadableReduced !important;
            }
          }
          @keyframes dvCompanionDamageReadableReduced {
            0% { opacity: 1; }
            14%, 78% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    </>
  );
}
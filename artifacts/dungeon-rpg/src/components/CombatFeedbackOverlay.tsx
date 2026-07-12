import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '../game/runEngine';
import { RUN_CAMERA } from './RunCameraRig';

const TILE = 40;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

type StatusMarker = {
  id: string;
  left: number;
  top: number;
  size: number;
  kind: 'fire' | 'ice';
};

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

function projectEnemy(state: GameState, enemy: GameState['enemies'][number]): Omit<StatusMarker, 'id' | 'kind'> | null {
  if (typeof window === 'undefined') return null;
  const focus = cameraFocus(state);
  const camera: [number, number, number] = [focus.x, RUN_CAMERA.height, focus.z + RUN_CAMERA.distance];
  const target: [number, number, number] = [focus.x, RUN_CAMERA.lookHeight, focus.z - 2.85];
  const forward = normalize([target[0] - camera[0], target[1] - camera[1], target[2] - camera[2]]);
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = normalize(cross(right, forward));

  const worldX = (enemy.x + enemy.width / 2) / TILE - state.map.width / 2 + 0.5;
  const worldZ = (enemy.y + enemy.height / 2) / TILE - state.map.height / 2 + 0.5;
  const worldY = enemy.enemyType === 'boss' ? 1.35 : 0.82;
  const relative: [number, number, number] = [worldX - camera[0], worldY - camera[1], worldZ - camera[2]];
  const cameraX = dot(relative, right);
  const cameraY = dot(relative, up);
  const cameraDepth = dot(relative, forward);
  if (cameraDepth <= 0.1) return null;

  const aspect = Math.max(0.45, window.innerWidth / Math.max(1, window.innerHeight));
  const focal = 1 / Math.tan(RUN_CAMERA.fov * Math.PI / 360);
  const ndcX = cameraX / cameraDepth * focal / aspect;
  const ndcY = cameraY / cameraDepth * focal;
  if (ndcX < -1.22 || ndcX > 1.22 || ndcY < -1.28 || ndcY > 1.28) return null;

  return {
    left: (ndcX * 0.5 + 0.5) * 100,
    top: (-ndcY * 0.5 + 0.5) * 100,
    size: clamp(56 * (28 / cameraDepth), 38, enemy.enemyType === 'boss' ? 82 : 66),
  };
}

export function CombatFeedbackOverlay({ gameState }: { gameState: GameState }) {
  const lastHp = useRef(gameState.player.hp);
  const [playerHit, setPlayerHit] = useState(0);

  useEffect(() => {
    if (gameState.player.hp < lastHp.current) {
      setPlayerHit(value => value + 1);
      try { navigator.vibrate?.([24, 18, 36]); } catch {}
    }
    lastHp.current = gameState.player.hp;
  }, [gameState.player.hp]);

  const statusMarkers = useMemo(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    return gameState.enemies.flatMap<StatusMarker>(enemy => {
      if (enemy.isDead) return [];
      const burning = Boolean(enemy.burnUntil && enemy.burnUntil > now);
      const frozen = Boolean(enemy.frostUntil && enemy.frostUntil > now);
      if (!burning && !frozen) return [];
      const projected = projectEnemy(gameState, enemy);
      if (!projected) return [];
      return [{
        id: enemy.id,
        kind: burning ? 'fire' : 'ice',
        ...projected,
      }];
    });
  }, [gameState]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      {playerHit > 0 && (
        <div
          key={`player-hit-${playerHit}`}
          className="absolute inset-0"
          style={{ animation: 'dvPlayerHit .34s ease-out both' }}
        />
      )}

      {statusMarkers.map(marker => <div
        key={`${marker.id}-${marker.kind}`}
        className={`dv-enemy-status dv-enemy-status-${marker.kind}`}
        style={{
          left: `${marker.left}%`,
          top: `${marker.top}%`,
          width: `${marker.size}px`,
          height: `${marker.size}px`,
        }}
      >
        <span className="dv-enemy-status-icon">{marker.kind === 'fire' ? '♨' : '❄'}</span>
      </div>)}

      <style>{`
        @keyframes dvPlayerHit {
          0% { opacity: 0; box-shadow: inset 0 0 0 rgba(255,45,45,0); transform: translateX(0); }
          20% { opacity: 1; box-shadow: inset 0 0 95px rgba(255,45,45,.5); transform: translateX(-5px); }
          38% { transform: translateX(5px); }
          55% { transform: translateX(-3px); }
          100% { opacity: 0; box-shadow: inset 0 0 20px rgba(255,45,45,0); transform: translateX(0); }
        }
        @keyframes dvStatusPulse {
          0%,100% { transform: translate(-50%,-50%) scale(.92); filter: brightness(.95); }
          50% { transform: translate(-50%,-50%) scale(1.1); filter: brightness(1.35); }
        }
        @keyframes dvStatusSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes dvStatusRise {
          0% { transform: translateY(6px) scale(.75); opacity: .35; }
          55% { opacity: 1; }
          100% { transform: translateY(-10px) scale(1.12); opacity: 0; }
        }
        .dv-enemy-status {
          position: absolute;
          transform: translate(-50%,-50%);
          border-radius: 999px;
          transition: left 55ms linear, top 55ms linear;
          animation: dvStatusPulse .72s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        .dv-enemy-status::before {
          content: '';
          position: absolute;
          inset: 4%;
          border-radius: inherit;
          border: 3px solid currentColor;
          box-shadow: 0 0 10px currentColor, inset 0 0 12px currentColor;
          opacity: .9;
        }
        .dv-enemy-status::after {
          content: '';
          position: absolute;
          inset: -10%;
          border-radius: inherit;
          border: 2px dashed currentColor;
          opacity: .58;
          animation: dvStatusSpin 1.5s linear infinite;
        }
        .dv-enemy-status-fire {
          color: #ff5b24;
          background: radial-gradient(circle, rgba(255,194,66,.34) 0%, rgba(255,78,25,.2) 42%, transparent 72%);
          box-shadow: 0 0 24px rgba(255,74,24,.72);
        }
        .dv-enemy-status-fire .dv-enemy-status-icon {
          animation: dvStatusRise .62s ease-out infinite;
          text-shadow: 0 0 8px #ffd56a, 0 0 16px #ff4e1d;
        }
        .dv-enemy-status-ice {
          color: #69e9ff;
          border-radius: 18%;
          background: radial-gradient(circle, rgba(206,251,255,.34) 0%, rgba(67,205,255,.18) 46%, transparent 72%);
          box-shadow: 0 0 24px rgba(72,215,255,.72);
        }
        .dv-enemy-status-ice::before,
        .dv-enemy-status-ice::after {
          border-radius: 18%;
        }
        .dv-enemy-status-icon {
          position: absolute;
          left: 50%;
          top: -28%;
          transform: translateX(-50%);
          font-size: clamp(15px, 4vw, 22px);
          font-weight: 900;
          color: currentColor;
          text-shadow: 0 0 8px currentColor, 0 0 16px currentColor;
        }
      `}</style>
    </div>
  );
}

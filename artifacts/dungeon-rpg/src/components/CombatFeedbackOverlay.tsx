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
    size: clamp(48 * (28 / cameraDepth), 34, enemy.enemyType === 'boss' ? 78 : 60),
  };
}

function FireStatus({ marker }: { marker: StatusMarker }) {
  return <div className="dv-natural-status dv-natural-fire" style={{ left: `${marker.left}%`, top: `${marker.top}%`, width: marker.size, height: marker.size }}>
    <span className="dv-flame dv-flame-a" />
    <span className="dv-flame dv-flame-b" />
    <span className="dv-flame dv-flame-c" />
    <span className="dv-ember dv-ember-a" />
    <span className="dv-ember dv-ember-b" />
    <span className="dv-ember dv-ember-c" />
  </div>;
}

function IceStatus({ marker }: { marker: StatusMarker }) {
  return <div className="dv-natural-status dv-natural-ice" style={{ left: `${marker.left}%`, top: `${marker.top}%`, width: marker.size, height: marker.size }}>
    <span className="dv-cold-haze" />
    <span className="dv-ice-shard dv-ice-a" />
    <span className="dv-ice-shard dv-ice-b" />
    <span className="dv-ice-shard dv-ice-c" />
    <span className="dv-ice-shard dv-ice-d" />
    <span className="dv-snow dv-snow-a">✦</span>
    <span className="dv-snow dv-snow-b">✦</span>
  </div>;
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
      const markers: StatusMarker[] = [];
      if (burning) markers.push({ id: `${enemy.id}-fire`, kind: 'fire', ...projected });
      if (frozen) markers.push({ id: `${enemy.id}-ice`, kind: 'ice', ...projected });
      return markers;
    });
  }, [gameState]);

  return <div className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
    {playerHit > 0 && <div key={`player-hit-${playerHit}`} className="absolute inset-0" style={{ animation: 'dvPlayerHit .34s ease-out both' }} />}
    {statusMarkers.map(marker => marker.kind === 'fire' ? <FireStatus key={marker.id} marker={marker} /> : <IceStatus key={marker.id} marker={marker} />)}
    <style>{`
      @keyframes dvPlayerHit {
        0% { opacity: 0; box-shadow: inset 0 0 0 rgba(255,45,45,0); transform: translateX(0); }
        20% { opacity: 1; box-shadow: inset 0 0 95px rgba(255,45,45,.5); transform: translateX(-5px); }
        38% { transform: translateX(5px); }
        55% { transform: translateX(-3px); }
        100% { opacity: 0; box-shadow: inset 0 0 20px rgba(255,45,45,0); transform: translateX(0); }
      }
      @keyframes dvFlameRise {
        0%,100% { transform: translate(-50%, 8%) scale(.72,.84) rotate(-3deg); opacity: .66; }
        45% { transform: translate(-50%, -13%) scale(1.02,1.18) rotate(4deg); opacity: 1; }
      }
      @keyframes dvEmberRise {
        0% { transform: translateY(9px) scale(.55); opacity: 0; }
        24% { opacity: .95; }
        100% { transform: translateY(-27px) translateX(5px) scale(.18); opacity: 0; }
      }
      @keyframes dvColdPulse {
        0%,100% { transform: translate(-50%,-50%) scale(.88); opacity: .24; }
        50% { transform: translate(-50%,-50%) scale(1.05); opacity: .48; }
      }
      @keyframes dvIceGlint {
        0%,100% { opacity: .42; filter: brightness(.9); }
        50% { opacity: .92; filter: brightness(1.45); }
      }
      @keyframes dvSnowDrift {
        0% { transform: translateY(4px) rotate(0deg) scale(.65); opacity: 0; }
        25% { opacity: .85; }
        100% { transform: translateY(-22px) translateX(7px) rotate(90deg) scale(.25); opacity: 0; }
      }
      .dv-natural-status { position:absolute; transform:translate(-50%,-50%); transition:left 55ms linear,top 55ms linear; }
      .dv-natural-fire { filter:drop-shadow(0 0 7px rgba(255,82,22,.92)); }
      .dv-natural-fire::after { content:''; position:absolute; left:18%; right:18%; bottom:8%; height:28%; border-radius:50%; background:radial-gradient(ellipse,rgba(255,122,30,.5),rgba(255,43,10,.16) 48%,transparent 72%); }
      .dv-flame { position:absolute; bottom:10%; left:50%; width:28%; height:58%; border-radius:62% 38% 60% 42%/72% 54% 46% 28%; transform-origin:50% 100%; background:linear-gradient(to top,#ff3b0c 0%,#ff8b1e 42%,#ffe077 76%,rgba(255,246,184,.2) 100%); clip-path:polygon(50% 0,82% 34%,100% 72%,72% 100%,28% 100%,0 72%,18% 36%); animation:dvFlameRise .58s ease-in-out infinite; }
      .dv-flame-a { left:37%; height:48%; animation-delay:-.16s; }
      .dv-flame-b { left:53%; height:65%; width:31%; animation-delay:-.34s; }
      .dv-flame-c { left:64%; height:43%; width:22%; animation-delay:-.05s; }
      .dv-ember { position:absolute; bottom:28%; width:5px; height:5px; border-radius:50%; background:#ffd36a; box-shadow:0 0 7px #ff5317; animation:dvEmberRise .9s linear infinite; }
      .dv-ember-a { left:29%; animation-delay:-.3s; }
      .dv-ember-b { left:54%; animation-delay:-.68s; }
      .dv-ember-c { left:72%; animation-delay:-.12s; }
      .dv-natural-ice { filter:drop-shadow(0 0 6px rgba(91,222,255,.72)); }
      .dv-cold-haze { position:absolute; left:50%; top:55%; width:72%; height:76%; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(ellipse,rgba(210,250,255,.19),rgba(80,207,255,.11) 45%,transparent 72%); animation:dvColdPulse 1.2s ease-in-out infinite; }
      .dv-ice-shard { position:absolute; width:15%; height:35%; background:linear-gradient(135deg,rgba(238,255,255,.95),rgba(87,219,255,.82) 48%,rgba(31,128,225,.35)); clip-path:polygon(50% 0,100% 70%,58% 100%,0 72%); animation:dvIceGlint 1.1s ease-in-out infinite; }
      .dv-ice-a { left:14%; bottom:12%; transform:rotate(-20deg); }
      .dv-ice-b { right:13%; bottom:14%; transform:rotate(24deg); animation-delay:-.45s; }
      .dv-ice-c { left:29%; top:16%; height:25%; transform:rotate(-8deg); animation-delay:-.72s; }
      .dv-ice-d { right:28%; top:20%; height:23%; transform:rotate(12deg); animation-delay:-.2s; }
      .dv-snow { position:absolute; color:#dffcff; font-size:12px; text-shadow:0 0 6px #71dcff; animation:dvSnowDrift 1.15s linear infinite; }
      .dv-snow-a { left:25%; top:48%; }
      .dv-snow-b { right:20%; top:57%; animation-delay:-.62s; }
    `}</style>
  </div>;
}

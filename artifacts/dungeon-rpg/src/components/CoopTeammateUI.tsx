import { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { COOP_MAX_REVIVES_PER_ROOM, COOP_REVIVE_RANGE } from '../game/coopLifeCycle';
import { interpolateCoopPresence, remotePresenceIsFresh, type CoopPlayerPresence } from '../game/coopRealtimePresence';
import { RUN_CAMERA } from './RunCameraRig';

const TILE = 40;

type Props = {
  gameState: GameState;
  remotePlayer: CoopPlayerPresence;
};

type CameraFrame = { height: number; distance: number; lookAhead: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function responsiveFrame(width: number, height: number): CameraFrame {
  const aspect = width / Math.max(1, height);
  const coarse = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 1 || Boolean(window.matchMedia?.('(pointer: coarse)')?.matches));
  if (coarse && aspect >= 1.15 && width > height && Math.min(width, height) >= 650) return { height: 15.9, distance: 19, lookAhead: 2.15 };
  if (aspect < 0.55) return { height: 20.2, distance: 21.7, lookAhead: 2.35 };
  if (aspect < 0.68) return { height: 19.6, distance: 22.4, lookAhead: 2.55 };
  return { height: 19, distance: 22.8, lookAhead: 2.75 };
}

function cameraFocus(state: GameState) {
  const playerX = state.player.x / TILE - state.map.width / 2 + 0.5;
  const playerZ = state.player.y / TILE - state.map.height / 2 + 0.5;
  const centeredX = playerX + RUN_CAMERA.playerCenterOffset;
  const centeredZ = playerZ + RUN_CAMERA.playerCenterOffset;
  const minZ = state.roomClearReady ? RUN_CAMERA.clearMinFollowZ : RUN_CAMERA.minFollowZ;
  const maxZ = state.roomClearReady ? RUN_CAMERA.clearMaxFollowZ : RUN_CAMERA.maxFollowZ;
  let focusX = clamp(centeredX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  let focusZ = clamp(centeredZ - 0.18, minZ, maxZ);
  const offsetX = centeredX - focusX;
  if (offsetX > RUN_CAMERA.safeHalfX) focusX += offsetX - RUN_CAMERA.safeHalfX;
  else if (offsetX < -RUN_CAMERA.safeHalfX) focusX += offsetX + RUN_CAMERA.safeHalfX;
  const offsetZ = centeredZ - focusZ;
  if (offsetZ > RUN_CAMERA.safeForwardZ) focusZ += offsetZ - RUN_CAMERA.safeForwardZ;
  else if (offsetZ < -RUN_CAMERA.safeRearZ) focusZ += offsetZ + RUN_CAMERA.safeRearZ;
  return {
    x: clamp(focusX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX),
    z: clamp(focusZ, minZ, maxZ),
  };
}

function normalize3(x: number, y: number, z: number) {
  const length = Math.max(0.0001, Math.hypot(x, y, z));
  return { x: x / length, y: y / length, z: z / length };
}

function lifeLabel(remote: CoopPlayerPresence, remainingSeconds: number) {
  if (remote.lifeState === 'downed') return `NIEDERGESCHLAGEN · ${remainingSeconds}s`;
  if (remote.lifeState === 'fallen') return 'GEFALLEN · NÄCHSTER RAUM';
  return `${Math.ceil(remote.hp)}/${Math.ceil(remote.maxHp)} LP`;
}

export function CoopTeammateUI({ gameState, remotePlayer }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  const remoteRef = useRef(remotePlayer);
  const smoothedRef = useRef<CoopPlayerPresence>(remotePlayer);
  const cameraRef = useRef({ initialized: false, x: 0, y: 0, z: 0 });
  stateRef.current = gameState;
  remoteRef.current = remotePlayer;

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const host = hostRef.current;
      const plate = plateRef.current;
      const panel = panelRef.current;
      const state = stateRef.current;
      const target = remoteRef.current;
      if (!host || !plate || !panel) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const hostRect = host.getBoundingClientRect();
      const healthPanel = document.querySelector<HTMLElement>('[data-testid="run-health-panel"]');
      if (healthPanel) {
        const healthRect = healthPanel.getBoundingClientRect();
        panel.style.left = `${Math.max(8, healthRect.left - hostRect.left)}px`;
        panel.style.top = `${Math.max(8, healthRect.bottom - hostRect.top + 8)}px`;
        panel.style.width = `${healthRect.width}px`;
      }

      if (!remotePresenceIsFresh(target) || target.chapter !== state.chapter || target.room !== state.floor) {
        plate.style.opacity = '0';
        panel.style.opacity = '0';
        frame = requestAnimationFrame(tick);
        return;
      }
      panel.style.opacity = '1';

      const deltaSeconds = Math.min(0.1, Math.max(0, now - previous) / 1000);
      previous = now;
      const smoothing = 1 - Math.exp(-deltaSeconds * 11);
      const current = smoothedRef.current;
      const interpolated = interpolateCoopPresence(current, target, smoothing);
      const smoothed: CoopPlayerPresence = { ...target, ...interpolated };
      smoothedRef.current = smoothed;

      const width = Math.max(1, hostRect.width);
      const height = Math.max(1, hostRect.height);
      const aspect = width / height;
      const focus = cameraFocus(state);
      const cameraFrame = responsiveFrame(width, height);
      const camera = cameraRef.current;
      const goalX = focus.x;
      const goalY = cameraFrame.height;
      const goalZ = focus.z + cameraFrame.distance;
      if (!camera.initialized) {
        camera.initialized = true;
        camera.x = goalX;
        camera.y = goalY;
        camera.z = goalZ;
      } else {
        camera.x += (goalX - camera.x) * RUN_CAMERA.followLerp;
        camera.y += (goalY - camera.y) * RUN_CAMERA.followLerp;
        camera.z += (goalZ - camera.z) * RUN_CAMERA.followLerp;
      }

      const worldX = (smoothed.x + 16) / TILE - state.map.width / 2 + 0.5;
      const worldY = smoothed.lifeState === 'alive' ? 2.28 : 1.25;
      const worldZ = (smoothed.y + 16) / TILE - state.map.height / 2 + 0.5;
      const targetX = focus.x;
      const targetY = 0.9;
      const targetZ = focus.z - cameraFrame.lookAhead;
      const forward = normalize3(targetX - camera.x, targetY - camera.y, targetZ - camera.z);
      const right = normalize3(-forward.z, 0, forward.x);
      const cameraUp = normalize3(
        right.y * forward.z - right.z * forward.y,
        right.z * forward.x - right.x * forward.z,
        right.x * forward.y - right.y * forward.x,
      );
      const relX = worldX - camera.x;
      const relY = worldY - camera.y;
      const relZ = worldZ - camera.z;
      const cameraX = relX * right.x + relY * right.y + relZ * right.z;
      const cameraY = relX * cameraUp.x + relY * cameraUp.y + relZ * cameraUp.z;
      const cameraDepth = relX * forward.x + relY * forward.y + relZ * forward.z;
      if (cameraDepth <= 0.1) {
        plate.style.opacity = '0';
        frame = requestAnimationFrame(tick);
        return;
      }
      const focal = 1 / Math.tan(RUN_CAMERA.fov * Math.PI / 360);
      const ndcX = cameraX / cameraDepth * focal / aspect;
      const ndcY = cameraY / cameraDepth * focal;
      const screenX = (ndcX + 1) * 0.5 * width;
      const screenY = (1 - ndcY) * 0.5 * height;
      const onScreen = screenX > -100 && screenX < width + 100 && screenY > -80 && screenY < height + 80;
      plate.style.opacity = onScreen ? '1' : '0';
      plate.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -100%)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const hpPercent = remotePlayer.lifeState === 'alive'
    ? clamp(remotePlayer.hp / Math.max(1, remotePlayer.maxHp) * 100, 0, 100)
    : 0;
  const remainingSeconds = remotePlayer.lifeState === 'downed'
    ? Math.max(0, Math.ceil((remotePlayer.downedUntil - Date.now()) / 1000))
    : 0;
  const sameRoom = remotePlayer.chapter === gameState.chapter && remotePlayer.room === gameState.floor;
  const distance = Math.hypot(
    gameState.player.x + 16 - (remotePlayer.x + 16),
    gameState.player.y + 16 - (remotePlayer.y + 16),
  );
  const reviveSpent = remotePlayer.revivesUsed >= COOP_MAX_REVIVES_PER_ROOM;
  const canApproachRevive = sameRoom && gameState.player.hp > 0 && remotePlayer.lifeState === 'downed' && !reviveSpent;
  const inRange = canApproachRevive && distance <= COOP_REVIVE_RANGE;
  const distanceTiles = Math.max(1, Math.ceil(Math.max(0, distance - COOP_REVIVE_RANGE) / TILE));

  return <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[35] overflow-hidden" aria-live="polite">
    <div
      ref={panelRef}
      data-testid="coop-team-health-panel"
      data-life-state={remotePlayer.lifeState}
      className="absolute left-3 top-32 rounded-xl border border-cyan-100/18 bg-black/72 px-3 py-2.5 shadow-xl backdrop-blur-md transition-opacity duration-150"
    >
      <div className="flex items-center justify-between gap-2 text-[7px] font-black uppercase tracking-[.14em] text-cyan-50/80">
        <span className="truncate">MITSTREITER · {remotePlayer.displayName || 'Mitspieler'}</span>
        <span className={remotePlayer.lifeState === 'alive' ? 'text-cyan-100/70' : remotePlayer.lifeState === 'downed' ? 'text-red-200' : 'text-slate-300'}>{lifeLabel(remotePlayer, remainingSeconds)}</span>
      </div>
      <div className="relative mt-1.5 h-[11px] overflow-hidden rounded-full border border-white/10 bg-black/75">
        <div className={`absolute inset-y-[2px] left-[2px] rounded-full transition-[width] duration-150 ${remotePlayer.lifeState === 'alive' ? 'bg-cyan-400' : remotePlayer.lifeState === 'downed' ? 'bg-red-500' : 'bg-slate-500'}`} style={{ width: `calc(${hpPercent}% - 4px)` }} />
      </div>
    </div>

    <div
      ref={plateRef}
      data-testid="coop-remote-player"
      data-life-state={remotePlayer.lifeState}
      className="absolute left-0 top-0 min-w-[96px] max-w-[150px] opacity-0 will-change-transform"
    >
      <div className={`truncate rounded-full border px-2 py-1 text-center text-[6px] font-black uppercase tracking-[.12em] shadow-lg backdrop-blur-sm ${remotePlayer.lifeState === 'alive' ? 'border-cyan-100/25 bg-cyan-950/78 text-cyan-50' : remotePlayer.lifeState === 'downed' ? 'border-red-200/35 bg-red-950/82 text-red-50' : 'border-slate-200/20 bg-slate-950/82 text-slate-200'}`}>
        {remotePlayer.displayName || 'Mitspieler'}
      </div>
      <div className="mx-auto mt-1 h-[5px] w-[82px] overflow-hidden rounded-full border border-black/55 bg-black/75">
        <div className={`h-full ${remotePlayer.lifeState === 'alive' ? 'bg-cyan-400' : remotePlayer.lifeState === 'downed' ? 'bg-red-500' : 'bg-slate-500'}`} style={{ width: `${hpPercent}%` }} />
      </div>
    </div>

    {canApproachRevive && <div
      data-testid="coop-revive-proximity"
      data-in-range={inRange ? 'true' : 'false'}
      className={`absolute bottom-[max(176px,calc(env(safe-area-inset-bottom)+164px))] left-1/2 w-[min(84vw,330px)] -translate-x-1/2 rounded-xl border px-4 py-2.5 text-center text-[8px] font-black uppercase tracking-[.14em] shadow-xl backdrop-blur-md ${inRange ? 'border-cyan-200/35 bg-cyan-950/88 text-cyan-50' : 'border-amber-200/30 bg-black/82 text-amber-100'}`}
    >
      {inRange
        ? `${remotePlayer.displayName || 'MITSTREITER'} IN REICHWEITE · 3 SEKUNDEN HALTEN`
        : `${distanceTiles} FELD${distanceTiles === 1 ? '' : 'ER'} NÄHER ZU ${remotePlayer.displayName || 'MITSTREITER'} GEHEN`}
    </div>}

    {sameRoom && remotePlayer.lifeState === 'downed' && reviveSpent && <div className="absolute bottom-[max(176px,calc(env(safe-area-inset-bottom)+164px))] left-1/2 w-[min(84vw,330px)] -translate-x-1/2 rounded-xl border border-slate-200/18 bg-black/82 px-4 py-2.5 text-center text-[8px] font-black uppercase tracking-[.14em] text-slate-200/70 shadow-xl backdrop-blur-md">
      WIEDERBELEBUNG FÜR DIESEN RAUM VERBRAUCHT
    </div>}
  </div>;
}

import React, { useEffect, useRef } from 'react';
import type { GameState } from '../game/runEngine';
import { interpolateCoopPresence, type CoopPlayerPresence } from '../game/coopRealtimePresence';
import { RUN_CAMERA } from './RunCameraRig';

const TILE = 40;

type Props = {
  gameState: GameState;
  remotePlayer: CoopPlayerPresence | null;
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

export function CoopTeammateOverlay({ gameState, remotePlayer }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(gameState);
  const remoteRef = useRef(remotePlayer);
  const smoothedRef = useRef<CoopPlayerPresence | null>(remotePlayer);
  const cameraRef = useRef<{ initialized: boolean; x: number; y: number; z: number }>({ initialized: false, x: 0, y: 0, z: 0 });
  const actionRef = useRef({ attack: 0, dodge: 0, attackUntil: 0, dodgeUntil: 0 });
  stateRef.current = gameState;
  remoteRef.current = remotePlayer;

  useEffect(() => {
    const remote = remotePlayer;
    if (!remote) return;
    const actions = actionRef.current;
    if (remote.lastAttackTime > actions.attack) {
      actions.attack = remote.lastAttackTime;
      actions.attackUntil = performance.now() + 320;
    }
    if (remote.lastDodgeTime > actions.dodge) {
      actions.dodge = remote.lastDodgeTime;
      actions.dodgeUntil = performance.now() + 360;
    }
  }, [remotePlayer?.lastAttackTime, remotePlayer?.lastDodgeTime]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const host = hostRef.current;
      const avatar = avatarRef.current;
      const arrow = arrowRef.current;
      const label = labelRef.current;
      const state = stateRef.current;
      const target = remoteRef.current;
      if (!host || !avatar || !arrow || !label || !target || target.chapter !== state.chapter || target.room !== state.floor) {
        if (avatar) avatar.style.opacity = '0';
        frame = requestAnimationFrame(tick);
        return;
      }

      const deltaSeconds = Math.min(0.1, Math.max(0, now - previous) / 1000);
      previous = now;
      const smoothing = 1 - Math.exp(-deltaSeconds * 11);
      const current = smoothedRef.current ?? target;
      const interpolated = interpolateCoopPresence(current, target, smoothing);
      const smoothed: CoopPlayerPresence = { ...target, ...interpolated };
      smoothedRef.current = smoothed;

      const rect = host.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
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
      const worldY = 0.95;
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
        avatar.style.opacity = '0';
        frame = requestAnimationFrame(tick);
        return;
      }
      const focal = 1 / Math.tan(RUN_CAMERA.fov * Math.PI / 360);
      const ndcX = cameraX / cameraDepth * focal / aspect;
      const ndcY = cameraY / cameraDepth * focal;
      const screenX = (ndcX + 1) * 0.5 * width;
      const screenY = (1 - ndcY) * 0.5 * height;
      const onScreen = screenX > -70 && screenX < width + 70 && screenY > -100 && screenY < height + 80;
      avatar.style.opacity = onScreen ? '1' : '0';
      avatar.style.transform = `translate3d(${screenX - 24}px, ${screenY - 52}px, 0)`;
      avatar.dataset.lifeState = smoothed.lifeState;
      avatar.dataset.moving = smoothed.lifeState === 'alive' && smoothed.state === 'moving' ? '1' : '0';
      avatar.dataset.attacking = smoothed.lifeState === 'alive' && now < actionRef.current.attackUntil ? '1' : '0';
      avatar.dataset.dodging = smoothed.lifeState === 'alive' && now < actionRef.current.dodgeUntil ? '1' : '0';
      const facingAngle = Math.atan2(smoothed.facingY, smoothed.facingX) * 180 / Math.PI;
      arrow.style.transform = `rotate(${facingAngle}deg)`;
      arrow.style.opacity = smoothed.lifeState === 'alive' ? '1' : '0';
      label.textContent = smoothed.lifeState === 'downed'
        ? 'NIEDERGESCHLAGEN'
        : smoothed.lifeState === 'fallen'
          ? 'GEFALLEN'
          : smoothed.displayName || 'Mitspieler';
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[12] overflow-hidden" aria-hidden={!remotePlayer}>
    <div ref={avatarRef} data-testid="coop-remote-player" className="dv-coop-avatar absolute left-0 top-0 h-[68px] w-[48px] opacity-0 will-change-transform">
      <div className="dv-coop-shadow absolute bottom-[3px] left-1/2 h-[10px] w-[36px] -translate-x-1/2 rounded-[50%] bg-cyan-200/20 blur-[1px]" />
      <div className="dv-coop-ring absolute bottom-0 left-1/2 h-[20px] w-[42px] -translate-x-1/2 rounded-[50%] border border-cyan-200/70 bg-cyan-300/10 shadow-[0_0_14px_rgba(103,232,249,.38)]" />
      <div className="dv-coop-body absolute bottom-[8px] left-1/2 h-[42px] w-[25px] -translate-x-1/2 rounded-[45%_45%_36%_36%] border border-cyan-100/60 bg-[linear-gradient(145deg,#31475c,#18212e)] shadow-[0_5px_12px_rgba(0,0,0,.42)]">
        <div className="absolute -top-[13px] left-1/2 h-[24px] w-[27px] -translate-x-1/2 rounded-[52%_52%_44%_44%] border border-cyan-100/65 bg-[linear-gradient(145deg,#536b80,#202b38)]" />
        <div className="absolute left-1/2 top-[5px] h-[2px] w-[9px] -translate-x-1/2 rounded-full bg-cyan-100/80 shadow-[0_0_7px_rgba(165,243,252,.9)]" />
      </div>
      <div ref={arrowRef} className="absolute bottom-[29px] left-1/2 h-[2px] w-[25px] origin-left bg-gradient-to-r from-cyan-100/85 to-transparent" />
      <div ref={labelRef} className="absolute -top-[12px] left-1/2 max-w-[130px] -translate-x-1/2 truncate rounded-full border border-cyan-100/20 bg-black/65 px-2 py-1 text-[6px] font-black uppercase tracking-[.12em] text-cyan-50/90 backdrop-blur-sm">MITSTREITER</div>
    </div>
    <style>{`
      .dv-coop-avatar[data-moving="1"] .dv-coop-body { animation: dvCoopRun .34s ease-in-out infinite alternate; }
      .dv-coop-avatar[data-moving="1"] .dv-coop-shadow { animation: dvCoopShadow .34s ease-in-out infinite alternate; }
      .dv-coop-avatar[data-attacking="1"] .dv-coop-body { filter: brightness(1.55); transform: translateX(-50%) scale(1.08); }
      .dv-coop-avatar[data-attacking="1"] .dv-coop-ring { box-shadow: 0 0 24px rgba(165,243,252,.82); }
      .dv-coop-avatar[data-dodging="1"] { filter: drop-shadow(-13px 0 7px rgba(103,232,249,.38)); }
      .dv-coop-avatar[data-dodging="1"] .dv-coop-body { opacity: .72; transform: translateX(-50%) skewX(-8deg); }
      .dv-coop-avatar[data-life-state="downed"] .dv-coop-body { transform: translate(-50%,14px) rotate(74deg); filter: grayscale(.3) brightness(.82); }
      .dv-coop-avatar[data-life-state="downed"] .dv-coop-ring { border-color: rgba(252,165,165,.82); background: rgba(127,29,29,.24); box-shadow: 0 0 20px rgba(248,113,113,.46); animation: dvCoopDowned 1s ease-in-out infinite alternate; }
      .dv-coop-avatar[data-life-state="downed"] > div:last-of-type { color: rgb(254 202 202 / .95); border-color: rgb(254 202 202 / .3); }
      .dv-coop-avatar[data-life-state="fallen"] .dv-coop-body { transform: translate(-50%,16px) rotate(88deg); filter: grayscale(1) brightness(.5); opacity:.72; }
      .dv-coop-avatar[data-life-state="fallen"] .dv-coop-ring { border-color: rgba(148,163,184,.42); background: rgba(15,23,42,.42); box-shadow: none; }
      .dv-coop-avatar[data-life-state="fallen"] > div:last-of-type { color: rgb(203 213 225 / .72); border-color: rgb(203 213 225 / .18); }
      @keyframes dvCoopRun { from { transform: translate(-50%,0) rotate(-2deg); } to { transform: translate(-50%,-4px) rotate(2deg); } }
      @keyframes dvCoopShadow { from { transform: translateX(-50%) scaleX(1); opacity:.72; } to { transform: translateX(-50%) scaleX(.78); opacity:.42; } }
      @keyframes dvCoopDowned { from { opacity:.45; transform:translateX(-50%) scale(.9); } to { opacity:1; transform:translateX(-50%) scale(1.08); } }
    `}</style>
  </div>;
}

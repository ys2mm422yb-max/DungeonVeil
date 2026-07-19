import { useEffect, useRef, useState } from 'react';
import { GameEngine, type RunGameState } from '../game/runEngine';
import { SpectatorSnapshotBuffer } from '../game/spectatorInterpolation';
import { SPECTATOR_RENDERER_EVENT } from './MainMenuDungeonScene';
import { SpectatorPlaybackStage } from './SpectatorPlaybackStage';

const PACKET_MS = 125;
const JITTER_MS = [0, 22, -8, 54, 8, 88, 0, 34, -4, 118, 12, 0];

function cloneState(state: RunGameState): RunGameState {
  return structuredClone(state);
}

function createQaState(): RunGameState {
  const engine = new GameEngine();
  const state = cloneState(engine.state);
  const centerX = state.map.startX * 40 + 4;
  const centerY = state.map.startY * 40 + 4;
  state.status = 'playing';
  state.player.playerName = '';
  state.player.x = centerX;
  state.player.y = centerY;
  state.player.state = 'moving';
  state.runSkills = { multishot: 2, speed: 1, fireArrow: 1 };
  state.enemies = [{
    id: 'spectator-qa-goblin', type: 'enemy', enemyType: 'goblin',
    x: centerX + 180, y: centerY - 120, width: 30, height: 30, vx: 0, vy: 0,
    hp: 34, maxHp: 34, attack: 6, defense: 1, speed: 68, color: '#89a94b',
    state: 'chase', isDead: false, targetX: centerX, targetY: centerY,
    nextAttackTime: 0, flashUntil: 0, spawnTime: performance.now(), lastAttackTime: 0, deathTime: 0,
  }];
  return state;
}

export function SpectatorPerformanceQa() {
  const sourceRef = useRef<RunGameState>(createQaState());
  const bufferRef = useRef(new SpectatorSnapshotBuffer());
  const diagnosticsRef = useRef<HTMLSpanElement>(null);
  const initialAt = useRef(Date.now());
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  if (bufferRef.current.getMetrics().receivedSnapshots === 0) {
    const first = cloneState(sourceRef.current);
    const second = cloneState(sourceRef.current);
    second.player.x += 18;
    second.enemies[0].x -= 9;
    bufferRef.current.push(initialAt.current - 250, first, initialAt.current - 170);
    bufferRef.current.push(initialAt.current - 125, second, initialAt.current - 35);
  }
  const [stableState] = useState<RunGameState>(() => bufferRef.current.sample(initialAt.current) ?? cloneState(sourceRef.current));

  useEffect(() => {
    document.documentElement.dataset.dungeonVeilSpectating = '1';
    window.dispatchEvent(new CustomEvent(SPECTATOR_RENDERER_EVENT, { detail: { active: true } }));
    const startedAt = Date.now();
    let packetIndex = 0;
    let frame = 0;
    let lastX = stableState.player.x;
    let maxFrameStep = 0;
    let stagnantSince = performance.now();
    let maxStagnantMs = 0;
    let frameCount = 0;
    const pendingTimers = new Set<number>();

    const emitPacket = () => {
      packetIndex += 1;
      if (packetIndex % 11 === 0 || packetIndex % 17 === 0) return;
      const emittedAt = Date.now();
      const elapsed = emittedAt - startedAt;
      const source = sourceRef.current;
      source.player.x = source.map.startX * 40 + 4 + elapsed * 0.13;
      source.player.y = source.map.startY * 40 + 4 + Math.sin(elapsed * 0.0022) * 55;
      source.player.facing = { x: 1, y: Math.cos(elapsed * 0.0022) * 0.25 };
      source.player.state = 'moving';
      source.camera.x = source.player.x;
      source.camera.y = source.player.y;
      const enemy = source.enemies[0];
      enemy.x = source.player.x + 150 + Math.sin(elapsed * 0.0017) * 42;
      enemy.y = source.player.y - 110 + Math.cos(elapsed * 0.0014) * 36;
      enemy.targetX = source.player.x;
      enemy.targetY = source.player.y;
      source.effects = packetIndex % 3 === 0 ? [{
        id: `shot-qa-${packetIndex}`, x: source.player.x, y: source.player.y, radius: 0, maxRadius: 210,
        color: '#f7d48a', lifeTime: 0.3, maxLifeTime: 1, type: 'beam', angle: 0, element: 'fire',
      }] : [];
      source.damageNumbers = packetIndex % 5 === 0 ? [{
        id: `dmg-qa-${packetIndex}`, x: enemy.x, y: enemy.y, value: '12', color: '#ffd37c', lifeTime: 0.2, maxLifeTime: 1,
      }] : [];
      source.particles = [];
      const snapshot = cloneState(source);
      const jitter = JITTER_MS[packetIndex % JITTER_MS.length];
      const timer = window.setTimeout(() => {
        pendingTimers.delete(timer);
        bufferRef.current.push(emittedAt, snapshot, Date.now());
      }, Math.max(0, 72 + jitter));
      pendingTimers.add(timer);
    };

    const packetTimer = window.setInterval(emitPacket, PACKET_MS);
    const animate = (time: number) => {
      const current = bufferRef.current.sample(Date.now());
      if (current) {
        const step = Math.abs(current.player.x - lastX);
        maxFrameStep = Math.max(maxFrameStep, step);
        if (step > 0.015) stagnantSince = time;
        maxStagnantMs = Math.max(maxStagnantMs, time - stagnantSince);
        lastX = current.player.x;
      }
      frameCount += 1;
      const metrics = bufferRef.current.getMetrics();
      const host = diagnosticsRef.current;
      if (host) {
        host.dataset.playerX = stableState.player.x.toFixed(3);
        host.dataset.playerY = stableState.player.y.toFixed(3);
        host.dataset.frames = String(frameCount);
        host.dataset.maxFrameStep = maxFrameStep.toFixed(3);
        host.dataset.maxStagnantMs = maxStagnantMs.toFixed(1);
        host.dataset.bufferDepth = String(metrics.bufferDepth);
        host.dataset.interpolationFrames = String(metrics.interpolationFrames);
        host.dataset.extrapolationFrames = String(metrics.extrapolationFrames);
        host.dataset.heldFrames = String(metrics.heldFrames);
        host.dataset.mode = metrics.mode;
        host.dataset.reactRenders = String(renderCountRef.current);
        host.dataset.elapsedMs = String(Date.now() - startedAt);
        host.dataset.canvasCount = String(document.querySelectorAll('canvas').length);
        host.dataset.menuCanvasCount = String(document.querySelectorAll('[data-testid="main-menu-dungeon-scene"] canvas').length);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      window.clearInterval(packetTimer);
      pendingTimers.forEach(timer => window.clearTimeout(timer));
      cancelAnimationFrame(frame);
      window.dispatchEvent(new CustomEvent(SPECTATOR_RENDERER_EVENT, { detail: { active: false } }));
      delete document.documentElement.dataset.dungeonVeilSpectating;
    };
  }, [stableState]);

  return <div data-testid="spectator-performance-qa" className="fixed inset-0 overflow-hidden bg-black">
    <SpectatorPlaybackStage stableState={stableState} />
    <span ref={diagnosticsRef} data-testid="spectator-performance-diagnostics" data-contract="jitter-loss-long-run-v1" className="sr-only" />
    <span data-testid="visual-qa-ready" className="pointer-events-none fixed bottom-1 right-1 z-[999] h-1 w-1 opacity-0" />
  </div>;
}

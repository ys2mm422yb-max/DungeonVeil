import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, type RunGameState } from '../game/runEngine';
import { buildSpectatorSnapshot, SPECTATOR_PAYLOAD_LIMITS, SPECTATOR_REFRESH_MS } from '../game/socialSpectatorOnline';
import {
  SPECTATOR_BUFFER_CAPACITY,
  SPECTATOR_MAX_EXTRAPOLATION_MS,
  SPECTATOR_UI_PAINT_MS,
  SpectatorInterpolationBuffer,
} from '../game/spectatorInterpolation';
import { CombatStage } from './CombatStage';
import { SPECTATOR_RENDERER_EVENT } from './MainMenuDungeonScene';

const QA_DURATION_WINDOW_MS = 12_000;

function addSyntheticEffects(state: RunGameState, sequence: number): void {
  const shotSerial = Math.floor(sequence / 7);
  const shotLife = (sequence % 7) * SPECTATOR_REFRESH_MS;
  state.effects = [{
    id: `qa-shot-${shotSerial}`,
    x: state.player.x + 16,
    y: state.player.y + 16,
    radius: 0,
    maxRadius: 270,
    color: '#d8b77a',
    lifeTime: shotLife,
    maxLifeTime: 700,
    type: 'beam',
    angle: sequence * 0.09,
    element: 'normal',
  }];
  state.damageNumbers = sequence % 5 === 0 ? [{
    id: `qa-damage-${Math.floor(sequence / 5)}`,
    x: state.player.x + 48,
    y: state.player.y - 32,
    value: String(20 + sequence % 11),
    color: '#f5d18a',
    lifeTime: 0,
    maxLifeTime: 700,
    scale: 1,
  }] : [];
  state.particles = Array.from({ length: SPECTATOR_PAYLOAD_LIMITS.particles }, (_, index) => ({
    id: `qa-particle-${index}`,
    x: state.player.x + Math.sin(sequence * 0.21 + index) * 28,
    y: state.player.y + Math.cos(sequence * 0.18 + index) * 28,
    vx: 0,
    vy: 0,
    color: index % 2 ? '#8d66ff' : '#d3c2ff',
    lifeTime: (sequence * 31 + index * 17) % 600,
    maxLifeTime: 700,
    size: 3,
  }));
}

export function SpectatorPerformanceQa() {
  const bufferRef = useRef<SpectatorInterpolationBuffer | null>(null);
  if (!bufferRef.current) bufferRef.current = new SpectatorInterpolationBuffer();
  const displayRef = useRef<RunGameState | null>(null);
  const diagnosticsRef = useRef<HTMLSpanElement>(null);
  const reactPaintsRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastMetricsRef = useRef({ at: performance.now(), frames: 0, paints: 0 });
  reactPaintsRef.current += 1;
  const [displayState, setDisplayState] = useState<RunGameState | null>(null);
  const [, setUiVersion] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.dungeonVeilSpectating = '1';
    window.dispatchEvent(new CustomEvent(SPECTATOR_RENDERER_EVENT, { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent(SPECTATOR_RENDERER_EVENT, { detail: { active: false } }));
      delete document.documentElement.dataset.dungeonVeilSpectating;
    };
  }, []);

  useEffect(() => {
    const engine = new GameEngine();
    engine.startNewGame('Spectator QA');
    const originX = engine.state.player.x;
    const originY = engine.state.player.y;
    let sequence = 0;
    const publish = () => {
      sequence += 1;
      const phase = sequence * 0.19;
      engine.state.player.x = originX + Math.sin(phase) * 180;
      engine.state.player.y = originY + Math.cos(phase * 0.77) * 130;
      engine.state.player.vx = Math.cos(phase) * 34;
      engine.state.player.vy = -Math.sin(phase * 0.77) * 24;
      engine.state.player.state = 'moving';
      engine.state.player.facing = { x: Math.cos(phase), y: Math.sin(phase) };
      engine.state.camera.x = engine.state.player.x;
      engine.state.camera.y = engine.state.player.y;
      engine.state.enemies.forEach((enemy, index) => {
        enemy.x += Math.sin(phase * 0.83 + index) * 7;
        enemy.y += Math.cos(phase * 0.71 + index) * 6;
        enemy.state = 'chase';
      });
      addSyntheticEffects(engine.state, sequence);

      // Four deliberately missing ten-hertz packets force bounded extrapolation
      // followed by a hold, without changing the network cadence itself.
      const gapPhase = sequence % 34;
      if (gapPhase >= 16 && gapPhase <= 19) return;
      const display = bufferRef.current?.push(buildSpectatorSnapshot(engine.state), Date.now()) ?? null;
      if (display && display !== displayRef.current) {
        displayRef.current = display;
        setDisplayState(display);
      }
    };
    publish();
    const interval = window.setInterval(publish, SPECTATOR_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setUiVersion(version => version + 1), SPECTATOR_UI_PAINT_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let frame = 0;
    const render = (time: number) => {
      const buffer = bufferRef.current;
      const display = buffer?.sample(Date.now()) ?? null;
      if (display) displayRef.current = display;
      frameCountRef.current += 1;
      const last = lastMetricsRef.current;
      const elapsed = time - last.at;
      if (elapsed >= 1_000 && buffer) {
        const metrics = buffer.metrics(Date.now());
        const renderFps = (frameCountRef.current - last.frames) * 1_000 / elapsed;
        const reactPaintHz = (reactPaintsRef.current - last.paints) * 1_000 / elapsed;
        const state = buffer.state();
        const host = diagnosticsRef.current;
        if (host) {
          host.dataset.bufferDepth = String(metrics.bufferDepth);
          host.dataset.networkHz = metrics.networkHz.toFixed(2);
          host.dataset.packetAgeMs = String(Math.round(metrics.packetAgeMs));
          host.dataset.maxPacketGapMs = String(Math.round(metrics.maxPacketGapMs));
          host.dataset.interpolatedFrames = String(metrics.interpolatedFrames);
          host.dataset.extrapolatedFrames = String(metrics.extrapolatedFrames);
          host.dataset.heldFrames = String(metrics.heldFrames);
          host.dataset.maxExtrapolatedDistancePx = metrics.maxExtrapolatedDistancePx.toFixed(2);
          host.dataset.reactPaintHz = reactPaintHz.toFixed(2);
          host.dataset.renderFps = renderFps.toFixed(2);
          host.dataset.effects = String(state?.effects.length ?? 0);
          host.dataset.particles = String(state?.particles.length ?? 0);
          host.dataset.damageNumbers = String(state?.damageNumbers.length ?? 0);
          host.dataset.canvases = String(document.querySelectorAll('[data-testid="spectator-performance-qa"] canvas').length);
          host.dataset.menuRendererSuspended = document.documentElement.dataset.dungeonVeilSpectating === '1' ? 'true' : 'false';
          host.dataset.elapsedMs = String(Math.round(performance.now()));
        }
        lastMetricsRef.current = { at: time, frames: frameCountRef.current, paints: reactPaintsRef.current };
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <div data-testid="spectator-performance-qa" className="fixed inset-0 overflow-hidden bg-black text-white">
    {displayState ? <CombatStage gameState={displayState} /> : <div className="absolute inset-0 bg-[#050507]" />}
    <span
      ref={diagnosticsRef}
      data-testid="spectator-performance-diagnostics"
      data-contract="timestamp-buffer-direct-render-v1"
      data-buffer-capacity={SPECTATOR_BUFFER_CAPACITY}
      data-max-extrapolation-ms={SPECTATOR_MAX_EXTRAPOLATION_MS}
      data-long-run-window-ms={QA_DURATION_WINDOW_MS}
      className="sr-only"
    />
    <div className="pointer-events-none absolute left-3 top-3 z-[300] rounded-xl border border-violet-300/20 bg-black/70 px-3 py-2 text-[8px] font-black tracking-[.18em] text-violet-100">SPECTATOR PERFORMANCE QA</div>
  </div>;
}

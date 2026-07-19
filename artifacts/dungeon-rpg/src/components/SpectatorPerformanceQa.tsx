import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/runEngine';
import { cloneSpectatorPlaybackState, SpectatorPlaybackBuffer } from '../game/spectatorPlayback';
import { CombatStage } from './CombatStage';
import { SPECTATOR_RENDERER_EVENT } from './MainMenuDungeonScene';

const SNAPSHOT_MS = 200;

function createQaPlayback() {
  const engine = new GameEngine();
  engine.saveNow = () => false;
  engine.startNewGame('Spectator QA', 'archer');
  const state = cloneSpectatorPlaybackState(engine.state);
  const emittedAt = Date.now();
  return {
    source: state,
    emittedAt,
    playback: new SpectatorPlaybackBuffer(state, emittedAt, 14_000),
  };
}

export function SpectatorPerformanceQa() {
  const setupRef = useRef<ReturnType<typeof createQaPlayback> | null>(null);
  if (!setupRef.current) setupRef.current = createQaPlayback();
  const diagnosticsRef = useRef<HTMLSpanElement>(null);
  const playback = setupRef.current.playback;
  const sceneState = playback.sceneState;
  const startXRef = useRef(sceneState.player.x);
  const snapshotCountRef = useRef(1);
  const reactCommitsRef = useRef(0);

  useEffect(() => {
    reactCommitsRef.current += 1;
  });

  useEffect(() => {
    document.documentElement.dataset.dungeonVeilSpectating = '1';
    window.dispatchEvent(new CustomEvent(SPECTATOR_RENDERER_EVENT, { detail: { active: true } }));
    let frame = 0;
    let sequence = 0;
    let lastPaint = 0;
    const snapshotTimer = window.setInterval(() => {
      sequence += 1;
      const next = cloneSpectatorPlaybackState(setupRef.current!.source);
      next.player.x += sequence * 22;
      next.player.y += Math.sin(sequence * 0.6) * 18;
      next.player.state = 'moving';
      next.player.facing = { x: 1, y: 0 };
      next.enemies.forEach((enemy, index) => {
        enemy.x += Math.sin(sequence * 0.35 + index) * 28;
        enemy.y += Math.cos(sequence * 0.31 + index) * 22;
      });
      playback.push(next, setupRef.current!.emittedAt + sequence * SNAPSHOT_MS, 14_000 + sequence * 7);
      snapshotCountRef.current += 1;
    }, SNAPSHOT_MS);

    const render = (now: number) => {
      playback.render(now);
      if (diagnosticsRef.current && now - lastPaint >= 100) {
        lastPaint = now;
        const diagnostics = playback.diagnostics(now);
        diagnosticsRef.current.dataset.bufferDepth = String(diagnostics.bufferDepth);
        diagnosticsRef.current.dataset.renderedFrames = String(diagnostics.renderedFrames);
        diagnosticsRef.current.dataset.receivedSnapshots = String(diagnostics.receivedSnapshots);
        diagnosticsRef.current.dataset.playerDistance = String(Math.abs(sceneState.player.x - startXRef.current).toFixed(2));
        diagnosticsRef.current.dataset.extrapolationMs = String(diagnostics.extrapolationMs);
        diagnosticsRef.current.dataset.packetIntervalMs = String(diagnostics.packetIntervalMs);
        diagnosticsRef.current.dataset.arrivalJitterMs = String(diagnostics.arrivalJitterMs);
        diagnosticsRef.current.dataset.hardCorrections = String(diagnostics.hardCorrections);
        diagnosticsRef.current.dataset.reactCommits = String(reactCommitsRef.current);
        diagnosticsRef.current.dataset.canvasCount = String(document.querySelectorAll('canvas').length);
        diagnosticsRef.current.dataset.playbackMode = diagnostics.mode;
        diagnosticsRef.current.dataset.rendererHandoff = document.documentElement.dataset.dungeonVeilSpectating === '1' ? 'true' : 'false';
        diagnosticsRef.current.dataset.snapshotCount = String(snapshotCountRef.current);
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      window.clearInterval(snapshotTimer);
      cancelAnimationFrame(frame);
      window.dispatchEvent(new CustomEvent(SPECTATOR_RENDERER_EVENT, { detail: { active: false } }));
      delete document.documentElement.dataset.dungeonVeilSpectating;
    };
  }, [playback, sceneState]);

  return <div data-testid="spectator-performance-qa" className="fixed inset-0 overflow-hidden bg-black">
    <CombatStage gameState={sceneState} />
    <span
      ref={diagnosticsRef}
      data-testid="spectator-performance-qa-diagnostics"
      data-contract="buffered-five-hertz-stable-scene-v2"
      data-buffer-depth="0"
      data-rendered-frames="0"
      data-received-snapshots="0"
      data-player-distance="0"
      data-react-commits="0"
      data-canvas-count="0"
      className="sr-only"
    />
    <div data-testid="visual-qa-ready" className="pointer-events-none fixed bottom-1 right-1 z-[999] h-1 w-1 opacity-0" />
  </div>;
}

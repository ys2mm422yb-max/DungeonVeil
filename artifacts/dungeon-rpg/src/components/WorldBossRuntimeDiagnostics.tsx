import { useEffect, useRef } from 'react';
import type React from 'react';
import { TILE_SIZE } from '../game/dungeon';
import type { GameEngine } from '../game/runEngine';
import { getWorldBossLoadedVisual, getWorldBossLoadFailure } from './worldBossMobileVisual3D';
import { WORLD_BOSS_ARENA_BOUNDARY_CONTRACT } from './WorldBossMobileArenaGuard';

type MovementSnapshot = { x: number; y: number; hp: number; status: string };
type MovementProbe = {
  reset(): MovementSnapshot;
  setInput(x: number, y: number): MovementSnapshot;
  stop(): MovementSnapshot;
  snapshot(): MovementSnapshot;
};
type ProbeWindow = Window & { __dungeonVeilWorldBossMovementProbe?: MovementProbe };

function movementSnapshot(engine: GameEngine): MovementSnapshot {
  const player = engine.state.player;
  return { x: player.x, y: player.y, hp: player.hp, status: engine.state.status };
}

export function WorldBossRuntimeDiagnostics({ engineRef }: { engineRef: React.RefObject<GameEngine | null> }) {
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    let lastPaint = 0;
    let movementProbeActive = false;
    const probeWindow = window as ProbeWindow;
    const movementProbeEnabled = new URLSearchParams(window.location.search).get('qa') === 'worldboss';

    const protectMovementProbe = (engine: GameEngine) => {
      if (!movementProbeActive) return;
      const player = engine.state.player;
      const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
      player.hp = player.maxHp;
      player.invincibleUntil = Number.MAX_SAFE_INTEGER;
      engine.state.status = 'playing';
      if (boss) {
        boss.speed = 0;
        boss.nextAttackTime = Number.MAX_SAFE_INTEGER;
        boss.vx = 0;
        boss.vy = 0;
      }
    };

    if (movementProbeEnabled) {
      probeWindow.__dungeonVeilWorldBossMovementProbe = {
        reset() {
          const engine = engineRef.current;
          if (!engine) return { x: 0, y: 0, hp: 0, status: 'missing' };
          movementProbeActive = true;
          const { map, player } = engine.state;
          player.x = map.width * TILE_SIZE * 0.5 - player.width / 2;
          player.y = map.height * TILE_SIZE * 0.5 - player.height / 2;
          player.vx = 0;
          player.vy = 0;
          player.state = 'idle';
          player.hp = player.maxHp;
          player.invincibleUntil = Number.MAX_SAFE_INTEGER;
          engine.input.joyX = 0;
          engine.input.joyY = 0;
          engine.input.dodge = false;
          engine.state.effects = [];
          engine.state.damageNumbers = [];
          engine.state.particles = [];
          engine.state.status = 'playing';
          protectMovementProbe(engine);
          return movementSnapshot(engine);
        },
        setInput(x, y) {
          const engine = engineRef.current;
          if (!engine) return { x: 0, y: 0, hp: 0, status: 'missing' };
          movementProbeActive = true;
          protectMovementProbe(engine);
          engine.input.joyX = Math.max(-1, Math.min(1, x));
          engine.input.joyY = Math.max(-1, Math.min(1, y));
          return movementSnapshot(engine);
        },
        stop() {
          const engine = engineRef.current;
          if (!engine) return { x: 0, y: 0, hp: 0, status: 'missing' };
          engine.input.joyX = 0;
          engine.input.joyY = 0;
          engine.state.player.vx = 0;
          engine.state.player.vy = 0;
          protectMovementProbe(engine);
          return movementSnapshot(engine);
        },
        snapshot() {
          const engine = engineRef.current;
          return engine ? movementSnapshot(engine) : { x: 0, y: 0, hp: 0, status: 'missing' };
        },
      };
    }

    const paint = (time: number) => {
      const host = hostRef.current;
      const engine = engineRef.current;
      if (engine) protectMovementProbe(engine);
      if (host && engine && time - lastPaint >= 50) {
        lastPaint = time;
        const player = engine.state.player;
        const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
        const visual = getWorldBossLoadedVisual();
        const failure = getWorldBossLoadFailure();
        host.dataset.playerX = player.x.toFixed(3);
        host.dataset.playerY = player.y.toFixed(3);
        host.dataset.playerState = player.state;
        host.dataset.playerLastDodge = String(player.lastDodgeTime || 0);
        host.dataset.joyX = engine.input.joyX.toFixed(3);
        host.dataset.joyY = engine.input.joyY.toFixed(3);
        host.dataset.engineStatus = engine.state.status;
        host.dataset.mapWidth = String(engine.state.map.width);
        host.dataset.mapHeight = String(engine.state.map.height);
        host.dataset.arenaBoundaryContract = WORLD_BOSS_ARENA_BOUNDARY_CONTRACT;
        host.dataset.movementProbe = movementProbeEnabled ? 'available' : 'disabled';
        host.dataset.bossHp = String(Math.max(0, boss?.hp ?? 0));
        host.dataset.dragonLoadState = failure ? 'error' : visual ? 'ready' : 'loading';
        host.dataset.bossVisual = visual?.identity ?? (failure ? 'load-error-no-fallback' : 'loading');
        host.dataset.bossWidth = Number(visual?.width ?? 0).toFixed(4);
        host.dataset.bossHeight = Number(visual?.height ?? 0).toFixed(4);
        host.dataset.bossDepth = Number(visual?.depth ?? 0).toFixed(4);
        host.dataset.bossGroundY = Number(visual?.minY ?? 0).toFixed(4);
        host.dataset.bossTopY = Number(visual?.maxY ?? 0).toFixed(4);
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      if (probeWindow.__dungeonVeilWorldBossMovementProbe) delete probeWindow.__dungeonVeilWorldBossMovementProbe;
    };
  }, [engineRef]);

  return <span
    ref={hostRef}
    data-testid="worldboss-runtime-diagnostics"
    data-contract="movement-dash-open-arena-v3"
    className="sr-only"
  />;
}

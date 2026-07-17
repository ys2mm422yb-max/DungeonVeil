import React, { useEffect } from 'react';
import type { GameEngine } from '../game/runEngine';
import { TILE_SIZE } from '../game/dungeon';

export const PHONE_ARENA_HALF_WIDTH_TILES = 5.25;
export const PHONE_ARENA_HALF_HEIGHT_TILES = 7.65;

type Props = {
  engineRef: React.RefObject<GameEngine | null>;
};

type MovableEntity = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
};

function isNarrowPhonePortrait(): boolean {
  const viewport = window.visualViewport;
  const width = Math.max(1, viewport?.width ?? window.innerWidth);
  const height = Math.max(1, viewport?.height ?? window.innerHeight);
  return width <= 700 && height / width >= 1.28;
}

function worldCenterForMappedAxis(mapped: number, mapTiles: number): number {
  return (mapped + mapTiles / 2 - 0.5) * TILE_SIZE;
}

function clampEntity(entity: MovableEntity, minimumCenterX: number, maximumCenterX: number, minimumCenterY: number, maximumCenterY: number): void {
  const centerX = entity.x + entity.width / 2;
  const centerY = entity.y + entity.height / 2;
  const nextCenterX = Math.max(minimumCenterX, Math.min(maximumCenterX, centerX));
  const nextCenterY = Math.max(minimumCenterY, Math.min(maximumCenterY, centerY));
  if (nextCenterX !== centerX) {
    entity.x = nextCenterX - entity.width / 2;
    entity.vx = 0;
  }
  if (nextCenterY !== centerY) {
    entity.y = nextCenterY - entity.height / 2;
    entity.vy = 0;
  }
}

export function enforceWorldBossVisibleArena(engine: GameEngine): void {
  if (!isNarrowPhonePortrait()) return;
  const { map, player, enemies } = engine.state;
  const mapHalfWidth = Math.max(1, (map.width - 3) / 2);
  const mapHalfHeight = Math.max(1, (map.height - 3) / 2);
  const halfWidth = Math.min(PHONE_ARENA_HALF_WIDTH_TILES, mapHalfWidth);
  const halfHeight = Math.min(PHONE_ARENA_HALF_HEIGHT_TILES, mapHalfHeight);
  const minimumCenterX = worldCenterForMappedAxis(-halfWidth, map.width);
  const maximumCenterX = worldCenterForMappedAxis(halfWidth, map.width);
  const minimumCenterY = worldCenterForMappedAxis(-halfHeight, map.height);
  const maximumCenterY = worldCenterForMappedAxis(halfHeight, map.height);

  clampEntity(player, minimumCenterX, maximumCenterX, minimumCenterY, maximumCenterY);
  const boss = enemies.find(enemy => enemy.enemyType === 'boss' && enemy.hp > 0);
  if (boss) clampEntity(boss, minimumCenterX, maximumCenterX, minimumCenterY, maximumCenterY);
}

export function WorldBossMobileArenaGuard({ engineRef }: Props) {
  useEffect(() => {
    let frame = 0;
    const guard = () => {
      const engine = engineRef.current;
      if (engine) enforceWorldBossVisibleArena(engine);
      frame = requestAnimationFrame(guard);
    };
    frame = requestAnimationFrame(guard);
    return () => cancelAnimationFrame(frame);
  }, [engineRef]);

  return <span data-testid="worldboss-visible-arena-guard" className="sr-only">Narrow phones keep both fighters inside the camera-safe arena.</span>;
}

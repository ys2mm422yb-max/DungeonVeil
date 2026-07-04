---
name: Dungeon RPG pixel-art overhaul
description: Key decisions from the pixel-art / room-type overhaul session.
---

## Sprite system
- All sprites live in `src/game/sprites.ts` as `SpriteData { frames: number[][][], palette: string[] }`.
- Drawn with `drawSprite(ctx, x, y, w, h, sprite, frame)` — scales 8×8 grid to any target size.
- Animation frame: `animFrame(sprite, timeMs, fps)` — index derived from elapsed time since spawn, not a mutable counter.
- `spawnTime` added to `Player` and `Enemy` to give each entity a phase offset for animation.

## Lighting
- Off-screen canvas allocated once via `useRef` in `GameCanvas.tsx`; resized only when viewport dimensions change.
- **Why:** creating `document.createElement('canvas')` inside the 60-FPS render loop caused constant GC pressure.

## Room type system
- 22 room types defined in `roomTypes.ts` as `RoomTypeDef` records; each drives enemy pool, chest chance, floor variant, decoration kind.
- `pickRoomType(index, total, floor, isBossFloor)` assigns types: index 0 → entrance, last → exit/boss_arena, index 1 → treasure_room, midpoint → shrine/chapel.

## Dungeon generation decisions
- Chest and decoration placement share an `occupied: Set<string>` of `"tx,ty"` keys to prevent overlap (includes startX/startY and stairX/stairY).
- Locked chests cost the player 6% max HP to pry open rather than being permanently inaccessible (no key-item mechanic).
- `wallVariant[ty][tx]` = 1 when the tile directly south is walkable → front-face wall sprite; otherwise back-wall sprite.

## Enemy system
- 8 enemy types + boss: slime, goblin, skeleton, orc, spider, vampire, demon, golem, boss.
- Stats in `ENEMY_BASE_STATS` in engine.ts; scale with floor multiplier `1 + (floor-1) * 0.18`.
- Room type `enemyTypes` pool overrides the floor-based default pool.

## What's missing / future
- Keys for locked chests (currently pried open at HP cost).
- Boss-only rooms (boss_arena) need a dedicated boss spawn path.

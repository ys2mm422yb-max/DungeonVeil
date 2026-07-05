---
name: Dungeon RPG pixel-art overhaul
description: Key decisions from the pixel-art / room-type overhaul session.
---

## Sprite system
- All sprites live in `src/game/sprites.ts` as `SpriteData { frames: number[][][], palette: string[] }`.
- Drawn with `drawSprite(ctx, x, y, w, h, sprite, frame, flipX)` — scales 8×8 grid to any target size; supports horizontal flip for player facing.
- Animation frame: `animFrame(sprite, timeMs, fps)` — index derived from elapsed time since spawn, not a mutable counter.
- `spawnTime` added to `Player` and `Enemy` to give each entity a phase offset for animation.

## Lighting
- Off-screen canvas allocated once via `useRef` in `GameCanvas.tsx`; resized only when viewport dimensions change.
- **Why:** creating `document.createElement('canvas')` inside the 60-FPS render loop caused constant GC pressure.
- Multiple light sources (player torch + wall torches) composited via `destination-out` on a darkness layer, then blit in screen space.

## Room type system
- 22 room types defined in `roomTypes.ts` as `RoomTypeDef` records; each drives enemy pool, chest chance, floor variant, decoration kind, wall tint.
- `pickRoomType(index, total, floor, isBossFloor)` assigns types: index 0 → entrance, last → exit/boss_arena, index 1 → treasure_room, midpoint → shrine/chapel.

## Dungeon generation decisions
- Chest and decoration placement share an `occupied: Set<string>` of `"tx,ty"` keys to prevent overlap (includes startX/startY and stairX/stairY).
- Locked chests cost the player 6% max HP to pry open rather than being permanently inaccessible (no key-item mechanic).
- `wallVariant[ty][tx]` = 1 when the tile directly south is walkable → front-face wall sprite; otherwise back-wall sprite.
- `wallTint[ty][tx]` stores per-room style (mossy, blood, broken) and is used by `GameCanvas` to pick a wall sprite variant.

## Enemy system
- 8 enemy types + boss: slime, goblin, skeleton, orc, spider, vampire, demon, golem, boss.
- Stats in `ENEMY_BASE_STATS` in engine.ts; scale with floor multiplier `1 + (floor-1) * 0.18`.
- Room type `enemyTypes` pool overrides the floor-based default pool.

## Animation & effects guidelines
- Entity visual states (attack lunge, hit flash, death fade) must not mutate gameplay state. Example: `enemy.lastAttackTime` is set only by the enemy's own attack logic in `engine.ts`, not by the player hitting the enemy.
- Corpse visuals can be delayed, but rewards (XP, drops, kill count) must be granted immediately when `hp <= 0` is detected to preserve mechanics.
- Always guard combat target loops against `hp <= 0` / `state === 'dead'` to avoid corpse hits and particle spam.

## Movement regression
- `moveEntity` in `engine.ts` must check the **full leading edge** of the entity (top, middle, and bottom corners) against `isWalkable`. The original code used `entity.y` and `entity.y + entity.height`; a graphics-overhaul refactor changed these to `entity.y + 2` and `entity.y + entity.height - 2`. This caused the player to snag on walls and appear unable to move.
- **Why:** Checking only 2 px in from the corners let the outer 2 px of the entity overlap a wall tile, at which point the post-move revert could fail to extract the player, especially in tight corridors or near corners.
- **How to apply:** When moving an entity, sample the leading edge at the entity's actual corners (top, middle, bottom for horizontal; left, middle, right for vertical), not inset points. This keeps the whole entity out of non-walkable tiles without widening the collision volume artificially.

## What's missing / future
- Keys for locked chests (currently pried open at HP cost).
- Boss-only rooms (boss_arena) need a dedicated boss spawn path.

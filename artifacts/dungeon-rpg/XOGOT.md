# Dungeon Veil in Xogot

This folder is both the existing web game package and the native Godot/Xogot port root.

## Open through GitHub on iPhone/iPad

Xogot supports projects from GitHub through Working Copy. Clone `ys2mm422yb-max/DungeonVeil` in Working Copy, then open the folder `artifacts/dungeon-rpg` in Xogot. Xogot should detect `project.godot`.

Main native scene: `res://godot/main.tscn`

## Current native smoke test

The Xogot scene uses the existing KayKit assets already committed with Dungeon Veil:

- Ranger: `public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb`
- Dungeon floor: `public/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/floor_tile_large.gltf`
- Dungeon wall: `public/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/barrier.gltf`

The native test provides:

- portrait project configuration
- mobile/GL compatibility renderer
- KayKit Ranger loading
- KayKit dungeon room loading
- left-side touch drag movement
- right-side touch dash
- FPS display

## Port boundary

The web game in `src/` remains the current primary Dungeon Veil implementation. Xogot/Godot cannot directly execute the React/TypeScript/Three.js runtime. The native port therefore lives under `godot/` and will be brought to feature parity progressively while reusing the same eight KayKit asset packs.

Do not replace or modify the KayKit source asset files. Native Godot scenes and scripts may instance, combine, scale, light, animate, and apply runtime materials to those assets.

## Next native milestones

1. Match current room 1 camera and composition.
2. Import Ranger animation libraries and attach bow/quiver to the correct skeleton slot.
3. Port auto-shoot, arrows, damage and dash.
4. Port room 1-10 encounter definitions and gifts.
5. Port room 11-20 and both bosses.
6. Port save/meta progression and Veil Chamber.
7. Validate native iPhone/iPad performance in Xogot.

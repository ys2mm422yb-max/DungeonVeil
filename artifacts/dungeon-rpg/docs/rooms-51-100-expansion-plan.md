# Rooms 51–100 expansion plan

Status: preliminary planning document. This does not expand the current run beyond room 50 and does not change combat balance.

## Why room 50 changes meaning if the campaign grows

Room 50 should remain a major climax, but become the end of the first campaign arc rather than the ultimate ending.

- Keep the current dedicated heavy `Ember Warden` / First Warden identity.
- Present room 50 as a large, readable boss arena with a central gateway into the deeper Veil.
- Do not reuse the room-50 character as the room-100 boss.
- The post-fight portal should visually communicate that a second campaign begins.
- Existing room-50 HP, damage, cooldowns, telegraphs, loot and solo/duo scaling stay unchanged unless a later dedicated balance pass proves a need.

## Verified current asset capacity

The currently shipped KayKit manifest contains approximately:

| Pack | Runtime models |
| --- | ---: |
| Dungeon | 211 |
| Forest | 105 |
| Halloween | 63 |
| Furniture | 53 |
| Resources | 76 |
| Tools | 49 |
| Fantasy weapons | 31 |
| Adventurer characters | 6 |

The existing legacy library also contains 48 dungeon models and 94 prop models. These are useful as a reference and fallback, but the expansion must prefer the existing GLTF/GLB runtime packs. No new OBJ, FBX, Blender, Unity or Unreal source files should be added.

Current and candidate enemy silhouettes provide enough variety for five additional chapters:

- five imported creature families: slime, rat/goblin, spider, bat/vampire and snake/demon;
- six adventurer bodies: Barbarian, Knight, Mage, Ranger, Rogue and Hooded Rogue;
- six selected Skeletons Extra bodies: Necromancer, Golem, Mage, Minion, Rogue and Warrior;
- seven candidate Mystery Monthly bodies from PR #315: Lorekeeper, Orc Brute, Cleric, Monstrosity, Plant Warrior, Hoarder and Avian Swordsman.

The Mystery Monthly candidates are not yet runtime-approved. Their rigs, materials, animation compatibility, mobile rendering and file dependencies must be checked before use.

## Capacity verdict

The current packs are sufficient to prototype and visually differentiate rooms 51–100 without buying another general environment pack.

Two gaps remain before a production commitment:

1. The complete purchased Dungeon Extra inventory still needs a final GLTF/GLB-only audit. Its portal, ritual, crystal, ruin and boss-setpiece coverage will determine how unique rooms 91–100 can become.
2. Room 100 needs one unmistakably unique final-boss body. `Monstrosity` can be a temporary fallback, but should not be accepted as the true final boss until its silhouette, rig and mobile performance are proven. A dedicated final-boss asset may still be necessary.

## Proposed chapter identities

### Rooms 51–60 — Ashen Foundry

Visual language:

- dungeon stone combined with resource stacks, tools, anvils, fuel barrels, chains and restrained fire;
- stronger vertical silhouettes through stairs, wall sections, columns and raised edge platforms;
- clear dark floor against orange fire telegraphs;
- large props remain at the perimeter.

Enemy pool candidates:

- Skeleton Warrior, Skeleton Golem, Barbarian, Knight, Orc Brute;
- existing demon/snake and slime variants only where the composition remains readable.

Boss room 60 candidate:

- Orc Brute or Monstrosity as a heavy foundry guardian, subject to rig verification.

### Rooms 61–70 — Sunken Archive

Visual language:

- dungeon halls mixed with shelves, books, tables, candles, furniture and arcane focal objects;
- broken study chambers, sealed stacks and a central ritual archive;
- cool arcane color contrast rather than another purple recolor of rooms 1–9.

Enemy pool candidates:

- Lorekeeper, Mage, Necromancer, Skeleton Mage, Cleric, Hooded Rogue;
- bat/vampire creatures as secondary silhouettes.

Boss room 70 candidate:

- Lorekeeper as an archive caster, with Necromancer as the tested fallback.

### Rooms 71–80 — Blighted Wilds

Visual language:

- forest rocks, trees, bushes and grass combined with Halloween graves, broken fences, dead trees, coffins and bones;
- outdoor/ruin composition with strong foreground framing but a clear central combat lane;
- fog and particles remain light enough for small iPhones.

Enemy pool candidates:

- Plant Warrior, spider, bat/vampire, snake/demon, Rogue and Skeleton Minion;
- no bright green telegraphs against dense green vegetation without a contrast test.

Boss room 80 candidate:

- Plant Warrior or Monstrosity as a corrupted grove guardian.

### Rooms 81–90 — Hoarder's Bastion

Visual language:

- fortified dungeon, resource vaults, weapon displays, crates, barrels, chests, banners and controlled gold highlights;
- alternating guard halls, storage chambers and treasury setpieces;
- loot-like decoration must remain visually distinct from actual loot.

Enemy pool candidates:

- Hoarder, Avian Swordsman, Ranger, Rogue, Barbarian and Knight;
- Skeleton Rogue and Skeleton Warrior as supporting units.

Boss room 90 candidate:

- Hoarder in a large but uncluttered treasury arena.

### Rooms 91–100 — Veil Citadel

Visual language:

- strongest Dungeon Extra architecture, tall columns, gates, stairs, ritual structures, banners and selective Halloween/arcane accents;
- escalating room silhouettes without increasing combat obstruction;
- rooms 97–99 act as a clear approach sequence to the final chamber;
- room 100 uses one central setpiece, broad free combat space and no foreground obstruction.

Enemy pool candidates:

- curated elite remixes of the proven roles rather than random mixed packs;
- Cleric, Avian Swordsman, Necromancer, Golem, Knight, Ranger and Rogue;
- no new stats or attack patterns merely because a model looks stronger.

Boss room 100:

- reserve a dedicated `Veil Sovereign` identity;
- do not reuse Ember Warden, room-20 Necromancer, room-30 Ranger or room-40 Rogue;
- require a unique body, entrance, readable phase silhouettes and a dedicated final-room setpiece;
- `Monstrosity` is only a provisional fallback pending rig and visual review.

## Room-production structure

Each ten-room chapter should use a controlled progression:

- rooms x1–x3: establish the visual language with low prop density;
- rooms x4–x6: introduce one new setpiece family and stronger enemy composition;
- rooms x7–x8: increase threat and visual depth without narrowing movement;
- room x9: pre-boss approach with a distinct portal/gate composition;
- room x0: unique boss arena with the largest clear combat footprint.

No chapter should be produced as ten recolors of one arena. Reuse should happen through modular architectural families, not identical layouts.

## Runtime and mobile budgets

- Lazy-load assets by chapter. Rooms 51–100 must not enlarge the initial room-1 download materially.
- Preload only the next room or next chapter boundary.
- Cache shared geometries, textures and animation clips.
- Reuse materials and avoid duplicate GLB files or role aliases.
- Dispose room-only mixers and effects on transition.
- Keep large props outside primary paths and telegraph zones.
- Validate on iphone-webkit, android-chromium, ipad-portrait-webkit and android-tablet-chromium only.
- Landscape remains a pause/blocker test, not a gameplay layout.

## Required approval gates before implementation

1. Complete the purchased Dungeon Extra GLTF/GLB inventory.
2. Verify all seven Mystery Monthly character dependencies and licenses.
3. Test each candidate body with the existing Rig_Medium animation packs.
4. Approve one unique room-100 boss body or acquire a dedicated replacement.
5. Freeze chapter themes and asset budgets before changing run length, saves, rewards or balance.
6. Build rooms in chapter blocks with baseline screenshots, comparable after screenshots and short movement videos.
7. Run the full rooms-1–100 solo/duo mobile matrix only on the final frozen expansion head.

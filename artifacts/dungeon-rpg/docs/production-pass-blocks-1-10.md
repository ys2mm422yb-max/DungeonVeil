# Dungeon Veil – Production Pass Blocks 1–10

This document tracks the final production pass on PR #40. It separates code-audited findings from real-device visual confirmation.

## Status

- [x] Block 1 – room, enemy and asset audit
- [ ] Block 2 – scale, hitboxes and collider calibration
- [ ] Block 3 – rooms 1–20 rebuild and polish
- [ ] Block 4 – rooms 21–50 biome differentiation
- [ ] Block 5 – regional enemy library and five distinct bosses
- [ ] Block 6 – enemy movement, animation and bug fixes
- [ ] Block 7 – combat status effects and hit feedback
- [ ] Block 8 – general bug and regression pass
- [ ] Block 9 – Supabase profile, cloud save, guild and world-boss foundation
- [ ] Block 10 – full technical validation and real-device acceptance

## Audit method

- Rooms 1–9: code audit plus current iPhone screenshots supplied by the user.
- Rooms 10–50: current authored code, asset palette, collider definitions and encounter configuration.
- Asset inventory: 693 GLB/GLTF models, with only 197 directly referenced in the current production pass.
- Visual approval is not inferred from static code. Rooms 10–50 remain pending real-device review after their rebuild.

## Room classification

### Rooms 1–10 – inhabited mine and abandoned quarters

| Room | Current verdict | Required work |
|---|---|---|
| 1 Supply Post | targeted rebuild | strengthen the marked delivery zone, enlarge small props, reduce scattered filler |
| 2 Guardroom | targeted rebuild | clearer command table and weapon wall, improve scale hierarchy |
| 3 Column Hall | retain and polish | keep the strong readable lanes; align columns and collider footprints |
| 4 Miners Camp | targeted rebuild | larger mining tools/resources and a stronger rail/ore axis |
| 5 Workshop | targeted rebuild | enlarge workbench/tools, improve focal platform and combat lane |
| 6 Forge | partial rebuild | remove the four inner wall blocks, keep an open forge ring, recalibrate forge props |
| 7 Sleeping Quarters | full relayout | move beds and storage to the perimeter, widen chase routes and camera sightline |
| 8 Material Vault | full relayout | remove random clutter, build one readable storage system and clear movement lanes |
| 9 Ritual Chamber | retain and polish | preserve the central ritual composition, verify scale/collider alignment |
| 10 Tomb Guardian Hall | boss rebuild | open arena, unique tomb-guardian boss, edge-only graves/coffins |

### Rooms 11–20 – ancient ruins and warden veil

The room concepts are distinct on paper, but current implementation must use the Halloween, dungeon and resource packs more deeply instead of repeating generic ruins.

| Rooms | Classification | Production direction |
|---|---|---|
| 11–14 | targeted/full mixed rebuild | shrine cloister, monumental gallery, prison ring and bone yard must receive unique architecture and traversal |
| 15 | retain concept, rebuild arena | ritual arena with a clean central altar and unobstructed attack lanes |
| 16–19 | full visual pass | stronger veil language through gates, crystals, runes, statues and restrained floating effects |
| 20 | boss rebuild | unique chapter boss arena with four readable phase anchors and no generic boss reuse |

### Rooms 21–30 – meadow and light forest

**Classification: full regional relayout.**

Current implementation reuses `meadowBoundary()` for every room and changes only a small focal cluster. That produces repeated four-tree framing and underuses the 105-model forest pack.

Required room identities:

21 forest gate; 22 sunlit clearing; 23 stone path; 24 woodcutters camp; 25 brook crossing; 26 mushroom garden; 27 hunters camp; 28 ancient grove; 29 ruined meadow; 30 forest-warden arena.

Use varied tree families, bare/green mixes, rock families, grass/bush groups, furniture, tools and ruin fragments. Do not repeat one four-corner boundary.

### Rooms 31–40 – darkwood and ruined village

**Classification: full regional relayout.**

Current implementation calls the same meadow boundary used by rooms 21–30, then adds only a few graves, benches, lanterns or shrines. The region therefore lacks its own silhouette.

Required room identities:

31 mist path; 32 abandoned yard; 33 blackroot grove; 34 grave road; 35 ruined chapel; 36 rotten crossing; 37 night market; 38 witch square; 39 village square; 40 shadow-warden arena.

Use bare trees, broken fences, graves, crypts, lantern paths, abandoned furniture and ruined village structures. Bright forest framing is forbidden.

### Rooms 41–50 – ember fortress

**Classification: full regional relayout.**

Current implementation gives all ten rooms the same four barrier columns and two floor torches, then changes only a central focal set. This is the strongest repetition problem in the current 50-room run.

Required room identities:

41 fortress gate; 42 weapon gallery; 43 chain yard; 44 ember forge; 45 ember archive; 46 barricade court; 47 command hall; 48 ash chamber; 49 throne approach; 50 ember-warden arena.

Use gates, wall variants, grates, open grates, spike floors, weapon displays, shields, tools, metal resources, forge equipment and distinct lighting layouts. Remove the shared perimeter template.

## Scale and collider findings for Block 2

- Floor torches, standing lanterns, candles and several hand tools are too small from the mobile camera.
- Visual scale and collider scale are authored separately and must be calibrated together.
- Tiny decorative props should normally be non-blocking.
- Tables, beds, shelves, pillars, gates, shrines, anvils and large resource stacks need visible-footprint colliders.
- Rotated rectangular props require rotation-aware collider bounds for both movement and projectile checks.
- Outdoor tree and rock colliders must match trunk/solid mass rather than the full foliage silhouette.
- Spawn safety alone is insufficient; chase routes around every blocking prop must be validated.

## Enemy audit for Blocks 5–7

Available bodies and creatures:

- imported: slime, rat, spider, bat, angry snake
- skeleton pack: mage, minion, rogue, warrior
- adventurers pack: barbarian, knight, mage, ranger, rogue, hooded rogue

Current shortcomings:

- rooms 21–50 mostly remix the same enemy types;
- all boss rooms use one internal boss type;
- skeleton visual roles are not yet consistently tied to regional identity;
- adventurer bodies are not yet used as bandits, cultists or fortress guards;
- some skeletons visibly moonwalk because movement direction, root rotation and animation playback do not always agree;
- obstacle avoidance exists but is not reliable enough around dense furniture;
- burn and frost status visuals are too weak on mobile.

Target regional pools:

- 1–10: rats, spiders, skeleton minions/rogues/warriors, mine guards
- 11–20: skeleton mages, grave guards, bats, snakes and veil slimes
- 21–30: rats, spiders, slimes, snakes, rangers, rogues and barbarians as bandits
- 31–40: bats, spiders, hooded rogues, mages, skeleton rogues/mages and cult guards
- 41–50: knights, barbarians, skeleton warriors, fire mages, ember snakes/slimes and heavy guards

Boss targets:

- room 10: tomb guardian warrior
- room 20: veil necromancer
- room 30: forest bandit/warden captain
- room 40: hooded cult leader
- room 50: ember knight or barbarian warden

Each boss requires a distinct model, equipment set, scale, arena behavior and attack pattern.

## Validation gates

Every implementation block must pass the relevant automated checks before the next block is marked complete. Final approval additionally requires current iPhone and Android testing. PR #40 stays open and unmerged until explicit user approval.

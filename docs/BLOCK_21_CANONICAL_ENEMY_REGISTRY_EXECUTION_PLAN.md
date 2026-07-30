# Block 21 – Canonical Enemy Registry and Rooms 1–100 Variety

## Fixed scope

Target branch: `fix/mobile-telegraphs-room-21-50-balance`

Exact starting head: `391c0656cb6d3e33a9b87504907c11debe4e8b0d`

Implementation branch: `feat/block-21-canonical-enemy-registry-v1`

`main` is excluded. PR #315 remains untouched. Auto-merge and automatic branch deletion remain disabled. Playwright retries remain `0`.

## Confirmed starting problem

The runtime still derives `EnemyType` from the sprite module and keeps core enemy statistics in a separate hard-coded `ENEMY_STATS` table. Encounter planning, AI roles, models, spawn tables and the Bestiary/Codex therefore do not share one authoritative enemy definition. The current fundamental set remains the historical eight normal families plus the generic boss type, which is insufficient for authored rooms 1–100.

## Canonical registry contract

Create one typed registry that owns, for every genuine enemy family:

- stable runtime ID
- German and English name, description and mechanic summary
- family and regional identity
- first and last authored room
- base HP, attack, defense, speed, size, XP and colour/fallback presentation
- silhouette/model/sprite identity
- movement and combat role
- attack profile and readable telegraph contract
- spawn weight and room-band eligibility
- elite eligibility and allowed elite affixes
- Codex discovery metadata
- asset and licence provenance where external models are used

Runtime spawning, encounter planning, enemy AI, model selection, fallback presentation and Codex rendering must import from this registry rather than duplicating independent lists.

## Required family coverage

Implement at least 24 genuine base families across rooms 1–100. Renames, palette-only changes and elite affixes do not count as separate families.

Planned authored distribution:

- Rooms 1–10: slime, goblin skirmisher, cave bat, thorn crawler
- Rooms 11–20: skeleton guard, bone archer, crypt acolyte, grave hound
- Rooms 21–30: orc raider, marsh spider, briar shaman, boar brute
- Rooms 31–40: vampire stalker, shadow rogue, dusk mage, carrion swarm
- Rooms 41–50: demon reaver, veil cultist, obsidian golem, flame imp
- Rooms 51–60: gilded sentinel, fracture wisp, crystal lancer
- Rooms 61–70: star seer, astral mote, void knight
- Rooms 71–80: drowned revenant, tidecaller, chain crab
- Rooms 81–90: cinder knight, furnace hound, ember witch
- Rooms 91–100: veil aberration, nexus herald, rift beast

The final implementation may refine names and exact counts, but every listed room band must introduce mechanically and visually distinct families, with a new genuine family at least every 5–10 rooms.

## Migration sequence

1. Add typed registry and validation helpers while preserving current IDs.
2. Move current base stats and presentation metadata into the registry.
3. Route `EnemyType`, runtime creation and encounter planning through registry-derived types.
4. Add the new families in regional batches with distinct AI/attack profiles.
5. Replace the hard-coded Bestiary list with registry-derived bilingual entries.
6. Add deterministic room-band spawn tables and repetition limits.
7. Preserve save compatibility and existing discovery counters for legacy IDs.
8. Add cloud/reload persistence checks for new discoveries and counters.

## Variety constraints

- each 10-room band has at least three eligible base families
- no non-boss room may repeat an identical family composition for more than two consecutive authored rooms
- every 5-room window contains at least one family not present in the previous 5-room window
- ranged, melee, pressure/control and support roles are distributed throughout the run
- elite variants remain variants and never inflate the base-family count
- boss IDs remain separate from normal-family variety accounting

## Validation and evidence

Required static validation:

- registry IDs are unique and exhaustive
- every runtime family has stats, presentation, AI, attacks, DE/EN copy and Codex metadata
- every Codex family can spawn in at least one authored room
- every encounter-plan family exists in the registry
- rooms 1–100 satisfy the deterministic variety constraints
- no direct replacement hard-coded Bestiary or stats table is reintroduced

Required runtime evidence:

- representative early, middle and late rooms on iPhone, Android phone, iPad portrait and Android tablet
- Codex locked/discovered states and bilingual details on all four devices
- discovery counters before and after combat, reload and cloud restoration
- readable telegraphs and distinct silhouettes for every added combat role
- no horizontal overflow; touch targets remain at least 44 px
- Complete Runtime Evidence, Full Game Regression and Product Autopilot on one unchanged exact head before merge

## Merge and publication gate

The PR remains Draft until the full registry migration, all genuine families, rooms 1–100 variety validation, four-device evidence and manual media inspection are complete. Merge only into `fix/mobile-telegraphs-room-21-50-balance` with an unchanged mergeable head and all mandatory Exact-Head checks completed successfully. After merge, verify only the fixed public test link.

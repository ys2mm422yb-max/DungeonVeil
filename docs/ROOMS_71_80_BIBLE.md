# Rooms 71–80 — The Drowned Reliquary

## Block 5 contract

This chapter extends the fixed mobile portrait run from room 70 through room 80 without changing `main` or the separate asset PR #315.

- Base branch: `fix/mobile-telegraphs-room-21-50-balance`
- Exact branch start: `3dfddc5d914e79a0635cc960c596359789d2bccb`
- Rooms 71–79 are individually authored encounters.
- Room 80 is the chapter boss, **The Reliquary Leviathan**.
- The chapter must remain readable on iPhone, Android phone, iPad portrait and Android tablet portrait with Playwright retries set to `0`.
- Landscape blocks input and pauses the run.

## Chapter identity

The Drowned Reliquary is a submerged archive beneath the Shattered Observatory: flooded stone vaults, green-blue veil light, broken reliquaries, suspended chains, drowned memorials and narrow dry routes. It must not look like a recolored Golden Fracture or Observatory room.

The core mechanical language is **advancing tide pressure**:

- clearly telegraphed flood bands activate after a safe warning window;
- dry islands and crossing lanes rotate between cycles;
- hazards never spawn directly under a player without reaction time;
- active water zones are visually distinct from safe floor on all supported devices;
- cleanup is deterministic after room clear, death, continue and renderer recovery.

## Room sequence

| Room | German title | English title | Combat geometry | Primary mechanic |
|---:|---|---|---|---|
| 71 | Versunkene Schwelle | Sunken Threshold | split causeway | alternating flood bands introduce the chapter |
| 72 | Halle der Ketten | Hall of Chains | three dry lanes | lateral chain sweeps force lane changes |
| 73 | Gebrochene Archive | Broken Archives | offset islands | delayed tide circles isolate ranged enemies |
| 74 | Kapelle ohne Atem | Breathless Chapel | ring with two gates | inward tide ring followed by safe-gate rotation |
| 75 | Das grüne Gewölbe | The Green Vault | diagonal crossing | crossing current traces and staggered enemies |
| 76 | Reliquiengräber | Reliquary Graves | four-bay arena | paired bay floods with interrupter pressure |
| 77 | Glocke unter Wasser | Bell Beneath Water | central bell island | expanding pulse waves with readable recovery |
| 78 | Ertrunkene Prozession | Drowned Procession | S-route | moving safe corridor and pursuing melee roles |
| 79 | Letzte Trockenheit | The Last Dry Ground | shrinking island network | controlled overlap of prior mechanics |
| 80 | Der Reliquiar-Leviathan | The Reliquary Leviathan | boss basin | multi-phase boss with tide lanes, chain anchors and safe-island rotation |

## Difficulty and encounter rules

- Difficulty increases through combinations, timing and positioning rather than HP-only scaling.
- No unavoidable spawn attacks, invisible zones, ghost damage or hazard persistence after clear.
- Enemy roles remain visually separable from scenery and hazard effects.
- Room 71 explicitly validates transition from room 70.
- Solo, duo, save/continue, death/restart and renderer recovery must preserve the same deterministic room contract.
- Room 80 rewards exactly once and cannot loop into a second completion.

## Required implementation surfaces

- chapter room data and titles
- Room Bible phase, lighting, portals and safe spawns
- logical setpieces and presentation resolver
- encounter plans, chapter hazards and boss phases
- run cap/progression through room 80
- loot and chapter-boss rewards
- static audits, transition audits and regression tests
- mobile portrait screenshots/videos for rooms 71, 79 and 80 plus critical transition and hazard states

## Merge gate

The PR remains Draft until all relevant Actions are green, the four portrait device outputs are inspected, the landscape blocker is verified, the target branch has not moved unexpectedly and the fixed Pages deployment is confirmed after merge.

# Rooms 61–70 — Shattered Observatory

## Chapter identity

Rooms 61–70 form the **Shattered Observatory**, a broken celestial archive suspended inside the Veil. The chapter must remain recognisably part of Dungeon Veil while being clearly distinct from the Golden Fracture chapter in rooms 51–60.

Visual language:

- deep indigo stone, cold silver mechanisms and restrained cyan star-light
- fractured observatory rings, lenses, suspended bridges and collapsed charting platforms
- violet-gold remains as a linking accent, not the dominant palette
- silhouettes must favour circles, arcs, radial walkways and broken vertical instruments rather than fortress walls
- combat centres, enemy spawns and telegraphs must remain readable in portrait on phones and tablets

Gameplay language:

- rotating safe lanes and delayed starfall zones create movement decisions without unavoidable damage
- enemy combinations pressure positioning through ranged control, pursuit and interruption rather than simple HP inflation
- every room has a distinct route, combat geometry or timing problem
- hazards must stop atomically when the encounter ends and must never deal ghost damage

## Chapter transition

### Room 60 → 61

Room 60 opens a stable fracture into the lower observatory. Room 61 must visually acknowledge the transition with a broken golden gateway behind the entry point and a cold star-lens ahead. Loading, save/continue, solo and duo must preserve the correct room number and chapter presentation.

## Room contracts

### Room 61 — Fallen Orrery

- Purpose: chapter introduction and transition proof
- Geometry: broad circular centre with two broken outer arcs
- Encounter: ranged controller plus two melee pursuers
- Hazard: one slow rotating star-lane with generous warning
- Exit: north through the first intact lens gate

### Room 62 — Meridian Split

- Purpose: teach alternating lanes
- Geometry: two offset semicircular platforms joined at the centre
- Encounter: shielded frontliner and flank attackers
- Hazard: alternating east/west starfall bands
- Exit: north-east

### Room 63 — Lens Graveyard

- Purpose: line-of-sight pressure without hiding telegraphs
- Geometry: open field framed by non-colliding fallen lenses
- Encounter: two ranged attackers and an interrupter
- Hazard: delayed circular lens-burn zones
- Exit: north-west

### Room 64 — Astral Causeway

- Purpose: controlled forward/back movement
- Geometry: long central causeway with safe side pockets
- Encounter: advancing melee wave followed by ranged support
- Hazard: sequential starfall from entrance toward exit, never spawning under an unavoidable recovery lock
- Exit: north

### Room 65 — Clock of Ash

- Purpose: midpoint timing challenge
- Geometry: radial four-spoke arena
- Encounter: durable anchor enemy with rotating support spawns
- Hazard: two opposing rotating lanes with clear recovery gaps
- Exit: north through a fractured clock arch

### Room 66 — Silent Ephemeris

- Purpose: lower visual noise and emphasise enemy tells
- Geometry: wide sparse circle with a broken chart table perimeter
- Encounter: caster, ranger and assassin combination
- Hazard: marked star nodes activate in a readable sequence
- Exit: north-east

### Room 67 — Comet Archive

- Purpose: crossing movement patterns
- Geometry: diagonal broken bridges represented by floor language without unsafe collision traps
- Encounter: mobile pursuers plus ranged denial
- Hazard: two delayed comet traces cross once, then leave a full recovery window
- Exit: north-west

### Room 68 — Parallax Vault

- Purpose: reposition around a stable centre
- Geometry: central safe disk and three outer observation bays
- Encounter: enemies enter from distinct bays with no spawn attacks
- Hazard: outer bays pulse one at a time; centre is not permanently safe
- Exit: north

### Room 69 — The Last Calculation

- Purpose: chapter mechanic exam and boss preparation
- Geometry: large orrery arena with three visible radial sectors
- Encounter: mixed elite composition using pursuit, ranged control and interruption
- Hazard: rotating lane plus one delayed starfall sector, never resolving simultaneously without a safe route
- Exit: sealed north gate that opens only after atomic encounter cleanup

### Room 70 — The Astronomer Unbound

- Purpose: dedicated chapter boss
- Arena: circular observatory crown with a readable central boss ring and three broken outer arcs
- Boss identity: a unique celestial warden, not a scaled standard enemy
- Phase 1: measured ranged patterns and single rotating lane
- Phase 2: alternating starfall sectors plus summoned observation nodes
- Phase 3: faster combined patterns with explicit recovery windows and no unavoidable overlap
- Telegraphs: high-contrast, portrait-readable and never hidden by decoration
- Completion: exactly-once boss reward, chapter completion state and safe transition toward room 71

## Balance contract

- difficulty rises from room 60 through more demanding combinations and movement choices, not only health scaling
- no enemy may attack before its spawn telegraph and recovery contract complete
- all hazards expose warning, active and recovery timing in deterministic encounter data
- solo and duo scaling must preserve safe-route availability
- room 70 must have phase-specific caps that prevent overlapping unavoidable attacks

## Loot and progression

- rooms 61–69 use the extended normal/elite reward contract
- room 70 uses the chapter-boss reward contract
- Forge Marks remain rare and must use the global source-rate contract rather than chapter-specific guaranteed drops
- save, continue and reload must preserve rooms through 70 without clamping to 60 or 50

## Required validation

- Room Bible and title resolution for every room 61–70
- encounter-plan and reward resolution through room 70
- distinct setpiece resolution; no fallback to rooms 50 or 60
- transition checks for 60 → 61 and 70 completion
- deterministic hazard cleanup and no post-clear damage
- production build and all static audits
- real portrait touch evidence on iPhone/WebKit, Android/Chromium, iPad/WebKit and Android tablet/Chromium
- manual review of chapter entry, representative rooms 65 and 69, boss room 70, solo, duo and orientation recovery

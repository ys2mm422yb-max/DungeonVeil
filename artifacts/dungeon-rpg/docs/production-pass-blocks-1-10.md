# Dungeon Veil – Production Pass Blocks 1–10

This document tracks the production pass on PR #40 and separates automated technical validation from real-device visual approval.

## Status

- [x] Block 1 – room, enemy and asset audit
- [x] Block 2 – scale, hitboxes and collider calibration
- [x] Block 3 – rooms 1–20 rebuild and polish
- [x] Block 4 – rooms 21–50 biome differentiation
- [x] Block 5 – regional enemy library and five distinct bosses
- [x] Block 6 – enemy movement, animation and bug fixes
- [x] Block 7 – combat status effects and hit feedback
- [x] Block 8 – general bug and regression pass
- [x] Block 9 – Supabase profile, cloud save, guild and world-boss foundation
- [ ] Block 10 – technical validation complete; iPhone and Android acceptance still required

## Implemented room production pass

### Rooms 1–20

- Rooms retain individual authored identities instead of generic filler layouts.
- Room 6 has no four-wall block in the combat center.
- Room 7 keeps beds and storage at the perimeter with a validated chase lane.
- Room 8 uses readable storage/resource groups instead of random central clutter.
- Room 9 preserves the strong ritual composition.
- Boss rooms 10 and 20 keep open combat centers and bounded visible blockers.

### Rooms 21–50

- Thirty separate compositions replace the shared meadow, darkwood and fortress boundary templates.
- Rooms 21–30 use varied forest trees, bushes, grass, rocks, tools, furniture and ruin fragments.
- Rooms 31–40 combine dark forest anchors with Halloween/graveyard and ruined-village assets.
- Rooms 41–50 use distinct fortress gates, weapons, barriers, forge equipment, resources and lighting arrangements.
- Rooms 24 and 29 include sufficient forest-pack coverage without restoring repeated four-corner framing.

## Scale, hitboxes and collision

- Props use explicit presentation classes: architecture, furniture, heavy props, nature solids, lighting, small props, tools/weapons, wall decoration and foliage.
- Visible scale and gameplay footprint come from the same presentation policy.
- Small decoration, lights, foliage and loose tools do not create invisible movement blockers.
- Furniture, pillars, gates, shrines, trees, rocks and resource stacks keep calibrated collision.
- Rotated rectangular props use rotation-aware footprints.
- Player movement, enemy movement and projectiles read the same visible prop collision source.
- Portal access, spawn overlap and projectile sweeps are validated for all 50 rooms.

## Regional enemies and bosses

Available packages are used as regional identities instead of leaving most models unused:

- imported creatures: slime, rat, spider, bat and angry snake
- skeletons: minion, rogue, mage and warrior roles
- adventurers: ranger, rogue, hooded rogue, mage, barbarian and knight roles

Regional presentation:

- 1–10: mine creatures, rats, spiders, skeletons and guards
- 11–20: undead, grave guards, bats, snakes, veil slimes and mages
- 21–30: forest creatures and adventurer models used as bandits/rangers
- 31–40: dark creatures, hooded cultists, mages and skeleton roles
- 41–50: knights, barbarians, warriors, fire-aligned creatures and heavy guards

Boss rooms now have fixed identities and distinct behavior profiles:

- room 10 – tomb guardian
- room 20 – veil necromancer
- room 30 – forest warden captain
- room 40 – hooded cult leader
- room 50 – ember warden

Each boss profile changes visual role, equipment/model selection, aura, movement pattern, attack range and attack timing.

## Movement, animation and combat feedback

- Enemy facing follows actual movement velocity while chasing and the player while attacking.
- Movement playback is calibrated by creature/role speed to reduce visible moonwalking.
- Obstacle-aware waypoints, angular detours, separation, early recovery and final relocation protect against furniture/pathing stalls.
- Enemy attacks require valid timing/range and boss projectiles respect visible line of sight.
- Burn uses stronger flame particles and a ground halo.
- Frost uses visible ice particles and a frost halo while preserving original model materials.
- Hit flashes, knockback presentation, damage numbers and death presentation remain synchronized with combat state.

## Supabase online foundation

Connected project: `hfndwqfghyomwapqsked` in `eu-west-1`.

Implemented:

- account registration, sign-in, token refresh and sign-out
- player profiles
- authenticated cloud-save upload/download with offline fallback
- guilds, unique membership, roles and expiring invitations
- world-boss events, contributions, deduplicated hits and reward records
- JWT-protected `world-boss-hit` Edge Function
- atomic server-side HP updates, duplicate-token rejection, damage cap and per-user hit-rate limit
- RLS on every public table and no anonymous table access
- private guild policy helpers and optimized RLS/indexes

The frontend contains only the publishable project key. Service-role credentials remain server-side. Supabase security advisors report no findings.

## Automated validation

The production branch runs:

- KayKit/imported asset audit
- all 50 room identities and unique composition fingerprints
- regional asset coverage
- exact prop class, readable scale and collider footprint checks
- spawn safety and encounter capacity
- walkable player-to-portal routes
- boss spawn and visible-blocker limits
- projectile collision sweeps
- TypeScript validation
- production build

## Remaining real-device acceptance

Automated checks do not prove final aesthetics, touch feel, FPS or heat on real phones. PR #40 must remain open and unmerged until the user approves current builds on both iPhone and Android, including:

- rooms 1–50 and all five boss arenas
- visible prop sizes and matching hitboxes
- enemy proportions, movement direction and animation quality
- fire/frost visibility
- projectile and wall collision
- portal access and camera behavior
- FPS, memory behavior and device heat

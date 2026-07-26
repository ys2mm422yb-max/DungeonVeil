# Block 10 – Four-player guild lobby execution plan

This file is the repository-bound implementation record for Block 10 of `docs/MASTER_WORK_PLAN.md`. It builds directly on `docs/BLOCK_9_GUILD_RAID_DESIGN_AND_DATA_CONTRACT.md` and the existing guild surface.

## Fixed scope and safety

- Repository: `ys2mm422yb-max/DungeonVeil`
- Base and only merge target: `fix/mobile-telegraphs-room-21-50-balance`
- Exact branch start: `d0d52c8061d2260a524c958b60b7b08b6749ed65`
- Working branch: `feat/block-10-four-player-guild-lobby-v1`
- `main` is excluded.
- No auto-merge and no automatic branch deletion.
- This block implements the lobby only. Raid combat remains Blocks 11–14.

## Implemented integration points

- `artifacts/dungeon-rpg/src/components/GuildSocialPanel.tsx`
  - authenticated Raid entry inside the guild surface
  - dedicated overlay without reusing Duo state
- `artifacts/dungeon-rpg/src/components/GuildRaidLobbyPanel.tsx`
  - four numbered participant cards
  - leader, ready, invite, leave and start controls
  - portrait-safe scroll and touch targets
  - explicit start lock explanation
- `artifacts/dungeon-rpg/src/game/guildRaidLobbyOnline.ts`
  - typed authoritative snapshots
  - dedicated RPC boundary
  - create/join, invite, ready, leave and idempotent start actions
- `supabase/migrations/20260726113000_guild_raid_lobby_block_10.sql`
  - normalized lobby, member, invitation and initial run entities
  - stable slots and uniqueness constraints
  - RLS read scope and RPC-only mutation boundary
  - same-guild checks, deterministic leadership transfer and atomic start
- `artifacts/dungeon-rpg/scripts/validate-block-10-guild-raid-lobby.mjs`
  - static contract audit covering isolation, four slots, security and idempotency

## Product contract

- Players without an authenticated guild cannot create a raid lobby.
- One active guild raid lobby contains exactly four stable numbered slots.
- Every participant is checked against the authoritative guild membership table.
- A participant cannot occupy more than one active lobby slot.
- The creator is the initial leader; departure transfers leadership by stable slot order.
- Only the leader can invite eligible guild members and request start.
- All four occupied slots must be ready before start becomes eligible.
- Start requires an idempotency key and creates one `guild_raid_runs` row.
- Repeated start calls return the existing lobby/run snapshot.
- Duo lobby identifiers and state are not imported or reused.

## Verification gates

The PR remains Draft until the exact final head has completed the required repository workflows. Before merge:

1. `Dungeon RPG CI`, `Dungeon RPG Check`, regression and diagnostics workflows must be green.
2. The Block 10 validator must pass.
3. Generated mobile evidence must be manually inspected when the runtime evidence workflow is enabled for the final head.
4. The PR must target only `fix/mobile-telegraphs-room-21-50-balance`.

## Handoff to Block 11

Block 10 ends when a valid four-member lobby atomically creates one server-authoritative raid run and every participant can read the same run identifier. Room simulation, enemy authority, active-combat reconnect and rewards begin in Block 11.

# Block 10 – Four-player guild lobby execution plan

This file is the repository-bound implementation record for Block 10 of `docs/MASTER_WORK_PLAN.md`. It builds directly on `docs/BLOCK_9_GUILD_RAID_DESIGN_AND_DATA_CONTRACT.md` and the existing guild surface.

## Fixed scope and safety

- Repository: `ys2mm422yb-max/DungeonVeil`
- Base and only merge target: `fix/mobile-telegraphs-room-21-50-balance`
- Exact branch start: `d0d52c8061d2260a524c958b60b7b08b6749ed65`
- Working branch: `feat/block-10-four-player-guild-lobby-v1`
- `main` is excluded.
- No auto-merge and no automatic branch deletion.
- PR #315 and PR #331 remain untouched.
- This block implements the authoritative lobby and the run handoff only. Raid combat remains Blocks 11–14.

## Implemented integration points

- `artifacts/dungeon-rpg/src/components/GuildSocialPanel.tsx`
  - authenticated Raid entry inside the existing guild surface
  - dedicated four-player surface without reusing Duo state
- `artifacts/dungeon-rpg/src/components/GuildRaidLobbyPanel.tsx`
  - authenticated, guildless, incoming-invite, forming, ready and started states
  - four numbered stable participant cards
  - leader invitation, cancellation, removal and dissolution controls
  - participant ready, leave and invitation-response controls
  - explicit start-lock explanation and Block-11 run handoff
  - portrait-safe scrolling, 44px minimum controls and a complete landscape action blocker
- `artifacts/dungeon-rpg/src/game/guildRaidLobbyOnline.ts`
  - typed authoritative snapshots
  - dedicated idempotent RPC boundary for every mutation
  - Supabase Realtime subscription with heartbeat, reconnect and version-gap snapshot reconciliation
  - low-frequency snapshot polling only as a fallback and foreground refresh on resume
- `supabase/migrations/20260726113000_guild_raid_lobby_block_10.sql`
  - normalized lobby, member, invitation, run, participant, room-state and event entities
  - stable slots and uniqueness constraints
  - participant-scoped RLS using non-recursive private helpers
  - the live `public.profiles` identity source
- `supabase/migrations/20260726113100_guild_raid_lobby_actions_a.sql`
  - idempotency ledger, lobby creation, invitation and cancellation RPCs
- `supabase/migrations/20260726113200_guild_raid_lobby_actions_b.sql`
  - invitation response, readiness and safe non-ready-member removal RPCs
- `supabase/migrations/20260726113300_guild_raid_lobby_start_realtime.sql`
  - deterministic leave and dissolution
  - atomic exact-once run start, four-participant freeze and room-1 handoff
  - explicit execute grants and Realtime publication setup
- `artifacts/dungeon-rpg/scripts/validate-block-10-guild-raid-lobby.mjs`
  - static contract audit covering isolation, security, idempotency, stable slots, Realtime and start authority
- `artifacts/dungeon-rpg/tests/guild-raid-lobby-mobile.spec.mjs`
  - real-touch phone/tablet evidence for leader and invited-member flows
  - create, invite, four ready, exact-once start, reload, non-leader restrictions and landscape lock

## Product contract

- Players without an authenticated guild cannot create or enter a raid lobby.
- A raid party is created explicitly by one guild member; there is no public same-guild auto-join path.
- One active guild raid lobby contains exactly four stable numbered slots.
- Every invitation, join and start is checked against the authoritative guild membership table.
- A participant cannot occupy more than one active raid lobby or active raid run.
- The creator is the initial leader.
- Before start, leader departure transfers leadership deterministically to the remaining active participant with the lowest occupied slot; ties are resolved by join time and user ID.
- Only the leader can invite, cancel invitations, remove a non-ready participant, dissolve the lobby and request start.
- Any membership change clears all ready states and returns the lobby to `forming`.
- All four occupied slots must be ready before start becomes eligible.
- Every mutating RPC requires an idempotency key and records its response in the lobby event ledger.
- Start locks the lobby, revalidates all four same-guild memberships, creates exactly one run, freezes exactly four participants and creates room 1.
- Repeated start calls return the existing run snapshot without creating duplicates.
- Duo lobby identifiers, tables, state and runtime are not imported or reused.

## Verification gates

The PR remains Draft until the exact final head has completed every gate below:

1. `Dungeon RPG CI`, `Dungeon RPG Check`, regression and diagnostics workflows are green.
2. `audit:guild-raid-lobby` and the complete Social audit are green.
3. Product Autopilot QA is green with retries disabled on all four supported projects.
4. Generated phone and tablet Raid screenshots are manually inspected for hierarchy, clipping, overflow and touch-safe controls.
5. Landscape blocks every lobby action and returning to portrait reloads the authoritative server snapshot.
6. The four Supabase migrations apply successfully and security/performance advisors are reviewed.
7. The PR still targets only `fix/mobile-telegraphs-room-21-50-balance` and the exact head has not changed after evidence.

## Handoff to Block 11

Block 10 ends when a valid four-member lobby atomically creates one server-authoritative raid run, freezes the four numbered participants, creates room 1 and every participant reads the same run identifier. Room simulation, enemy authority, active-combat reconnect and rewards begin in Block 11.

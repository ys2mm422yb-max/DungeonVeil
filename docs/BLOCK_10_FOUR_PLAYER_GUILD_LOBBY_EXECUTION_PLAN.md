# Block 10 – Four-player guild lobby execution plan

This file is the repository-bound implementation plan for Block 10 of `docs/MASTER_WORK_PLAN.md`. It builds directly on `docs/BLOCK_9_GUILD_RAID_DESIGN_AND_DATA_CONTRACT.md` and the existing guild surface.

## Fixed scope and safety

- Repository: `ys2mm422yb-max/DungeonVeil`
- Base and only merge target: `fix/mobile-telegraphs-room-21-50-balance`
- Exact branch start: `d0d52c8061d2260a524c958b60b7b08b6749ed65`
- Working branch: `feat/block-10-four-player-guild-lobby-v1`
- `main` is excluded.
- No auto-merge and no automatic branch deletion.
- PR #315 and PR #331 remain untouched.
- This block implements the lobby only. Raid rooms, synchronized combat and rewards remain Blocks 11–14.

## Existing integration points to preserve

The implementation must extend, not replace, the current guild product paths:

- `artifacts/dungeon-rpg/src/components/GuildSocialPanel.tsx`
- `artifacts/dungeon-rpg/src/game/guildMailboxOnline.ts`
- existing guild membership, roles, invitations, mailbox and Supabase session handling
- existing mobile guild layout and safe-area behavior
- normal Duo lobby state must stay separate from raid lobby state

## Product contract

### Entry

- Add one clearly labelled Raid entry inside the authenticated guild area.
- A player without a guild sees an explanatory blocked state and no start control.
- A valid guild member can create or join one active guild raid lobby.
- The Raid surface must not appear as a normal Duo run.

### Membership

- A lobby has exactly four numbered participant slots.
- Every active participant must be an active member of the same guild as the lobby.
- A user cannot occupy multiple slots.
- A user cannot be active in multiple raid lobbies or raid runs.
- Leaving, guild removal or invitation cancellation updates the authoritative lobby state.

### Leadership and invitations

- The creator becomes leader.
- The leader can invite eligible members of the same guild.
- Invitations are explicit records with expiry and terminal states.
- Accepting an invitation is atomic and idempotent.
- A full lobby rejects further accepts without overwriting a participant.
- Leadership transfer after leader departure follows the deterministic rule from Block 9.

### Ready and start

- Every occupied slot has an explicit ready state.
- Membership or slot changes clear the affected ready state and invalidate the previous start eligibility.
- Start is enabled only when exactly four unique participants are present and all four are ready.
- Only the current leader can request start.
- Start must use a server-side idempotency key and create exactly one raid run.
- Repeated taps, retries or concurrent leader requests must return the existing run rather than creating another.

## Supabase implementation

Implement the Block 9 normalized contract through one or more focused migrations. Names may be adjusted only when required by the existing schema, but semantics must remain unchanged.

Required persistent entities:

- `guild_raid_lobbies`
- `guild_raid_lobby_members`
- `guild_raid_invitations`
- `guild_raid_runs` with only the Block 10 creation fields needed for the handoff to Block 11
- idempotency/event record for lobby creation, invitation acceptance and start

Required RPC boundary:

- create or return active lobby
- invite guild member
- accept invitation
- decline/cancel invitation
- set ready state
- leave lobby
- transfer leader when allowed
- atomically start exactly one run
- fetch authoritative lobby snapshot

Security requirements:

- authenticated users only
- all membership and same-guild checks repeated server-side
- no direct client mutation of leader, slot, guild or run identifiers
- RLS read access only for authorized current participants and narrowly scoped invite recipients
- mutation functions use the minimum required `security definer` privileges with fixed `search_path`
- no client-authoritative run creation

## Client implementation

Add a dedicated raid-lobby state layer rather than overloading Duo state.

The client model must include:

- lobby id and guild id
- lifecycle state and monotonically increasing version
- leader user id
- four stable slots
- per-slot display identity, connection presence and ready state
- pending invitations visible to the appropriate user
- authoritative start eligibility and resulting raid run id
- recoverable error codes suitable for localized UI copy

Realtime behavior:

- subscribe only after an authoritative snapshot has loaded
- reconcile by version; never apply an older event over a newer snapshot
- on reconnect, re-fetch the snapshot before accepting further mutations
- unsubscribe completely when the lobby closes or the user leaves

## Mobile portrait UI

The raid lobby must work on:

- iPhone / WebKit
- Android phone / Chromium
- iPad portrait / WebKit
- Android tablet portrait / Chromium

Required presentation:

- fixed compact guild/raid header with reliable close/back action
- four participant cards visible without horizontal scrolling
- clear leader marker and ready state
- large touch-safe Invite, Ready, Leave and Start controls
- start disabled state explains the missing condition
- no clipped cards or controls behind browser safe areas
- loading, empty, full, expired invitation and server-conflict states are explicit
- landscape blocks input and pauses the surface consistently with the product-wide orientation contract

## Test and evidence gates

### Static and database contracts

- migration syntax and policy audit
- RPC ownership, `search_path`, grants and RLS audit
- reject any direct client write to protected raid tables
- reject reuse of normal Duo lobby identifiers or state
- reject client-supplied leader, guild or participant authority

### Deterministic integration cases

- guildless user is blocked
- non-member cannot view or join
- leader creates one active lobby
- four unique same-guild participants fill stable slots
- fifth participant is rejected
- duplicate accept is idempotent
- invitation expiry/cancel/decline is terminal
- ready toggles persist and synchronize
- membership change invalidates readiness
- non-leader start is rejected
- start with fewer than four or any unready participant is rejected
- concurrent repeated start creates exactly one raid run
- leave and deterministic leader transfer are correct
- refresh/reconnect restores the same slot without duplication
- normal Duo flows remain unchanged

### Runtime evidence

Use real touch interactions with Playwright retries fixed at `0`.

Capture and manually inspect, on all four supported portrait projects:

- guildless blocked state
- lobby with one participant
- invitations and acceptance
- four filled slots
- ready progression from zero to four
- enabled leader start
- non-leader disabled start
- leave and leader transfer
- reconnect/reload restoration
- landscape block and portrait resume

No Block 10 PR may be merged until all exact-head checks are green and every generated screenshot/video has been manually inspected.

## Handoff to Block 11

Block 10 is complete when a valid four-member lobby atomically creates one server-authoritative raid run and every participant receives the same run identifier. It does not yet simulate rooms, enemies, boss state, combat authority, reconnect into active combat or rewards; those begin in Block 11.
# Dungeon Veil Supabase foundation

Connected project: `hfndwqfghyomwapqsked` (`eu-west-1`).

## Public tables

- `profiles` – authenticated player profile
- `game_saves` – one versioned JSON save bundle per user
- `guilds` – guild identity and owner
- `guild_members` – one guild membership per user with owner/officer/member roles
- `guild_invites` – expiring invitations and response state
- `world_boss_events` – scheduled/active/defeated global boss state
- `world_boss_contributions` – atomic per-player damage totals
- `world_boss_hits` – deduplicated server-accepted hits
- `world_boss_rewards` – per-player reward payload and claim state

All public tables have RLS enabled. Anonymous table access is revoked. Players can only write their own profile/save data and permitted guild records. World-boss health, hits, contributions and rewards cannot be written directly by the client.

## World boss endpoint

`world-boss-hit` is deployed with JWT verification enabled. It derives the player ID from the bearer token and calls the service-role-only `record_world_boss_hit` database function.

Server protections:

- one globally unique hit token per accepted request
- maximum 50,000 damage per hit
- maximum 20 accepted attempts per player/event/second
- event row lock and atomic HP/contribution update
- inactive, expired or defeated events are rejected

The frontend only contains the publishable Supabase key. Never add a service-role or secret key to this repository.

## Applied migrations

The live project contains named migrations for profiles/cloud saves, guilds, world-boss tables, RLS, private guild helpers, invite acceptance, hit rate limiting and RLS/index performance optimization. Supabase security advisors currently report no findings.

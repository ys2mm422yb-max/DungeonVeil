# Dungeon Veil Supabase foundation

Connected project: `hfndwqfghyomwapqsked` (`eu-west-1`).

## Public tables

- `profiles` – authenticated player profile
- `game_saves` – one versioned JSON save bundle per user
- `guilds` – guild identity and owner
- `guild_members` – one guild membership per user with owner/officer/member roles
- `guild_invites` – expiring invitations and response state
- `guild_invite_links` – hashed, expiring and usage-limited invitation links created by guild leaders or officers
- `player_mailbox` – private per-player guild invitations, rewards, notices and important system information
- `world_boss_events` – scheduled/active/defeated global boss state
- `world_boss_contributions` – atomic per-player damage totals
- `world_boss_hits` – deduplicated server-accepted hits
- `world_boss_rewards` – per-player reward payload and claim state

All public tables have RLS enabled. Anonymous table access is revoked. Players can only read their own mailbox and permitted guild records. Guild invitation tokens are stored only as SHA-256 hashes and can be created or claimed through authenticated security-definer RPCs. World-boss health, hits, contributions and rewards cannot be written directly by the client.

## Guild invitation links and mailbox

Guild leaders and officers can create a link that is valid for seven days and up to 25 claims. Opening `?guildInvite=<token>` stores the token locally until the player signs in. The authenticated claim RPC creates a normal pending guild invitation and the database trigger places it in the player's mailbox. Direct player-name invitations use the same mailbox trigger. Acceptance and decline actions are reflected in both the guild invitation and the mailbox item.

Important game notices can be delivered as `system`, `notice` or `reward` mailbox entries. The initial migration informs existing players that the weekly rift shortcut has been replaced by the world boss.

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

The live project contains named migrations for profiles/cloud saves, guilds, secure guild invitation links, the private player mailbox, world-boss tables, RLS, private guild helpers, invite acceptance, hit rate limiting and RLS/index performance optimization. Supabase security advisors are checked after DDL changes.

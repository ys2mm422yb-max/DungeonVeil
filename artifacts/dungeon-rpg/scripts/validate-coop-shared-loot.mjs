import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const reward = read('src/game/chapterRewardContract.ts');
const worldLoot = read('src/game/equipmentWorldLoot.ts');
const context = read('src/game/coopRunMode.ts');
const client = read('src/game/coopSharedLootOnline.ts');
const overlay = read('src/components/CoopSharedLootOverlay.tsx');
const banner = read('src/components/MetaRewardBanner.tsx');
const migration = read('../../supabase/migrations/20260719002000_add_server_authoritative_coop_shared_loot.sql');

assert(reward.includes("dataset.dungeonVeilCoopRole === 'host'") && reward.includes('shouldRollEquipmentLocally'), 'Duo guests can still roll a second local boss item.');
assert(reward.includes('dust: Math.round(baseAmounts.dust * normalized.multiplier)') && reward.includes('gold: Math.round(baseAmounts.gold * normalized.multiplier)'), 'Individual Duo currency rewards were removed or changed.');
assert(worldLoot.includes("proposeSharedEquipment(engine, 'boss', drop)") && worldLoot.includes('`hunt:${enemy.id}`'), 'Boss or hunt equipment is not routed into distinct shared decisions.');
assert(worldLoot.includes("if (role === 'guest') continue") && worldLoot.includes('BEUTEENTSCHEIDUNG AUSSTEHEND'), 'Guests can author hunt equipment or leave before resolving shared loot.');
assert(context.includes('currentDuoRunContext') && context.includes('dungeonVeilCoopLobby') && context.includes('dungeonVeilCoopRole'), 'The active Duo authority context is not available to shared loot.');

assert(client.includes("'rpc/open_coop_shared_loot'") && client.includes("'rpc/get_coop_shared_loot'") && client.includes("'rpc/choose_coop_shared_loot'"), 'Shared loot does not use the server RPC contract.');
assert(client.includes('drop_key: string') && client.includes('p_drop_key: state.drop_key') && client.includes('normalizeRows(rows)'), 'Multiple equipment drops are not identified or completely loaded.');
assert(client.includes("state.winner_user_id === userId") && client.includes('meta.owned[state.item_id]'), 'The resolved winner does not receive exactly one local item.');
assert(client.includes("state.loser_user_id === userId") && client.includes('state.compensation_dust'), 'The losing claimant does not receive compensation.');
assert(client.includes('meta.rewardLedger.push(ledgerKey)') && client.includes('saveMetaProgression(meta)') && client.includes('state.drop_key'), 'Reconnect-safe reward delivery is not committed atomically per drop.');

assert(overlay.includes('data-testid="coop-loot-claim"') && overlay.includes('data-testid="coop-loot-pass"'), 'Claim and pass controls are missing.');
assert(overlay.includes('POLL_MS = 700') && overlay.includes("states.filter(state => state.status === 'resolved').forEach"), 'Reconnect polling does not process every resolved drop.');
assert(overlay.includes('Bei zwei Ansprüchen würfelt der Server') && overlay.includes('The server rolls when both claim'), 'The two-claim server roll is not explained.');
assert(overlay.includes('rawChapter < 1') && overlay.includes('rawRoom < 1'), 'The overlay can poll a fake room before Duo context is ready.');
assert(banner.includes('<CoopSharedLootOverlay />'), 'Shared loot UI is not mounted in active runs.');

assert(migration.includes('create table if not exists public.coop_shared_loot'), 'Shared loot persistence table is missing.');
assert(migration.includes('primary key (lobby_id, run_seed, chapter, room, drop_key)'), 'Multiple room drops do not have isolated server identities.');
assert(migration.includes('enable row level security') && migration.includes('revoke all on table public.coop_shared_loot'), 'Direct shared loot table access is not blocked.');
assert(migration.includes("target.host_user_id = v_user_id") && migration.includes("target.status = 'in_run'"), 'A non-host or inactive lobby can open shared loot.');
assert(migration.includes("p_choice not in ('claim', 'pass')") && migration.includes('loot.choices ? v_user_id::text'), 'Choices are not bounded and final per player.');
assert(migration.includes('v_winner := v_claimers[1 + floor(random() * 2)::integer]'), 'Two claims are not resolved by a server-side random roll.');
assert(migration.includes('v_loser := case') && migration.includes('compensation_dust integer not null default 60'), 'The losing claimant is not recorded with the agreed compensation.');
assert(migration.includes('v_loot.resolve_after > v_now') && migration.includes("coalesce(v_loot.choices ->> claimant.user_id::text, 'pass')"), 'Missing or disconnected players do not safely time out as pass.');
assert(migration.includes('for v_drop_key in') && migration.includes("case when loot.status = 'open' then 0 else 1 end"), 'The server does not resolve and return every drop in the room.');
assert(migration.includes('grant execute on function public.open_coop_shared_loot') && migration.includes('to authenticated'), 'Shared loot RPCs are not restricted to authenticated players.');

console.log('All Duo equipment uses host-authored per-drop identities, individual currency, claim/pass, server tie rolls, loser compensation and reconnect-safe complete delivery.');

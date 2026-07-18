import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const rewards = read('src/game/chapterRewardContract.ts');
const runMode = read('src/game/coopRunMode.ts');
const client = read('src/game/coopSharedLootOnline.ts');
const runtime = read('src/game/coopSharedLootRuntime.ts');
const roomGuard = read('src/game/coopSharedLootRoomGuard.ts');
const collection = read('src/game/equipmentCollection.ts');
const targeting = read('src/game/equipmentTargeting.ts');
const worldLoot = read('src/game/equipmentWorldLoot.ts');
const drops = read('src/game/equipmentDropContract.ts');
const migration = read('../../supabase/migrations/20260719023000_add_authoritative_coop_shared_loot.sql');

assert(rewards.includes("dataset.dungeonVeilRunMode === 'duo'")
  && rewards.includes('requestCoopSharedLoot(safeChapter, safeFloor)')
  && rewards.includes('options?.equipmentReward ?? !duoMode'), 'Duo boss rooms can still create separate local equipment drops.');
assert(rewards.includes('installCoopSharedLootRoomGuard();')
  && roomGuard.includes('GameEngine.prototype')
  && roomGuard.includes("dataset.dungeonVeilCoopLootPending === '1'")
  && roomGuard.includes('originalNextRoom.call(this)'), 'Direct host or guest nextRoom calls can bypass the shared-loot decision.');
assert(runMode.includes('currentDuoRunContext')
  && runMode.includes('dungeonVeilCoopLobby')
  && runMode.includes('dungeonVeilCoopRole'), 'The exact active Duo context is not recoverable.');
assert(drops.includes('planSharedBossEquipmentReward')
  && drops.includes('return chooseEquipment(loadMetaProgression()'), 'Neutral shared boss-drop planning is missing.');
assert(client.includes('p_lobby_id: context.lobbyId')
  && client.includes('raw.source !== item.dropSource')
  && client.includes("rpc/submit_coop_loot_choice"), 'The client does not bind RPCs to the exact lobby or validate returned equipment.');
assert(runtime.includes('loadCoopSharedLoot(context, activeChapter, activeRoom)')
  && runtime.indexOf('loadCoopSharedLoot(context, activeChapter, activeRoom)') < runtime.indexOf('planSharedBossEquipmentReward(activeChapter, activeRoom)'), 'Host reconnect can reroll before checking the existing drop.');
assert(runtime.includes('collectBalancedEquipmentDropOnce')
  && runtime.includes('grantMetaDustOnce')
  && runtime.includes('grantEquipmentSourceMarkOnce'), 'Shared item, compensation, salvage or source-mark payouts are not idempotent.');
assert(runtime.includes("submitCoopLootChoice(context, snapshot.drop_id")
  && runtime.includes('MAX_CONSECUTIVE_ERRORS')
  && runtime.includes('OHNE BEUTE FORTFAHREN'), 'Claim/pass or the bounded backend-failure escape is incomplete.');
assert(collection.includes('meta.rewardLedger.includes(key)')
  && collection.includes('collectBalancedEquipmentDropOnce')
  && collection.includes('grantMetaDustOnce'), 'Local reconnect payout protection is incomplete.');
assert(targeting.includes('grantEquipmentSourceMarkOnce')
  && targeting.includes('equipment-source-mark:'), 'Both players cannot receive one idempotent source mark.');
assert(worldLoot.includes("dataset.dungeonVeilCoopLootPending === '1'")
  && runtime.includes("dataset.dungeonVeilCoopLootPending = '1'"), 'Normal room exit is not blocked while the decision is open.');

assert(migration.includes('create table if not exists public.coop_loot_drops')
  && migration.includes('create table if not exists public.coop_loot_choices'), 'Shared loot persistence is missing.');
assert(migration.includes('enable row level security')
  && migration.includes('revoke all on table public.coop_loot_drops')
  && migration.includes('revoke all on table public.coop_loot_choices'), 'Shared loot tables are directly exposed.');
assert(migration.includes('function private.resolve_coop_loot_drop')
  && migration.includes('for update')
  && migration.includes('while v_first_roll = v_second_roll loop'), 'Server-authoritative non-tied contested rolls are missing.');
assert(migration.includes('on conflict (drop_id, user_id) do nothing')
  && !migration.includes('set choice = excluded.choice'), 'Players can change their first loot decision.');
assert(migration.includes("select v_drop.id, member.user_id, 'pass'")
  && migration.includes("v_resolution := case when v_now >= v_drop.deadline_at then 'timeout' else 'all_pass' end"), 'Timeout does not convert missing choices into pass.');
assert(migration.includes("v_role <> 'host'")
  && migration.includes('pg_advisory_xact_lock')
  && migration.includes('unique (lobby_id, run_seed, chapter, room)'), 'Only-once host creation is not race protected.');
assert(migration.includes('security definer')
  && migration.includes('grant execute on function public.create_or_get_coop_loot_drop')
  && migration.includes('grant execute on function public.get_my_coop_loot_drop')
  && migration.includes('grant execute on function public.submit_coop_loot_choice'), 'Authenticated RPC permissions are incomplete.');

console.log('Shared Duo loot validated: one boss drop, claim/pass, immutable choices, server roll, timeout pass, reconnect-safe payout, source marks and both normal/direct exit guards.');

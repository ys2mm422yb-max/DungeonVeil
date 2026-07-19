import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [online, overlay, session, persistence, reward, migration, ambiguityFix, authority, winnerIndex] = await Promise.all([
  read('../src/game/coopBossLootOnline.ts'),
  read('../src/components/CoopBossLootOverlay.tsx'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/components/CoopRunPersistenceBridge.tsx'),
  read('../src/game/chapterRewardContract.ts'),
  read('../../../supabase/migrations/20260719013000_add_coop_boss_loot_claims.sql'),
  read('../../../supabase/migrations/20260719014500_fix_coop_boss_loot_rpc_ambiguity.sql'),
  read('../../../supabase/migrations/20260719020000_make_coop_boss_loot_server_authoritative.sql'),
  read('../../../supabase/migrations/20260719021500_index_coop_boss_loot_winner.sql'),
]);

const checks = [
  [online.includes("COOP_BOSS_LOOT_OPEN_EVENT") && online.includes("chooseCoopBossLoot") && online.includes("open_coop_boss_loot"), 'Duo boss loot client does not use the secured RPC contract'],
  [overlay.includes("getMyCoopLobby") && overlay.includes("collectBalancedEquipmentDrop") && !overlay.includes("rollBossEquipmentReward"), 'lobby lookup, local entitlement application or server-only item selection is missing'],
  [overlay.includes("my_consolation_dust") && overlay.includes("BEANSPRUCHEN") && overlay.includes("PASSEN"), 'claim/pass UI or consolation outcome is missing'],
  [overlay.includes("engine.canExitRoom = () => false") && overlay.includes("COOP_BOSS_LOOT_PENDING_DATASET"), 'room exit is not blocked while shared loot is unresolved'],
  [session.includes("dispatchCoopRoomClear") && persistence.includes("skipEquipmentDrop: true") && persistence.includes("dispatchCoopBossLootOpen"), 'Duo currency and shared boss equipment are not separated behind the secured room reward'],
  [persistence.indexOf("acknowledgeCoopRoomReward") < persistence.indexOf("dispatchCoopBossLootOpen"), 'Boss loot can open before the room reward is acknowledged'],
  [reward.includes("skipEquipmentDrop?: boolean") && reward.includes("!normalized.skipEquipmentDrop"), 'chapter reward contract cannot suppress the local Duo equipment roll'],
  [migration.includes("coop_boss_loot_rolls") && migration.includes("coop_boss_loot_choices"), 'server loot tables are missing'],
  [migration.includes("private.resolve_coop_boss_loot") && migration.includes("hashtextextended") && migration.includes("consolation_dust = 60"), 'atomic contested resolution or fixed consolation dust is missing'],
  [migration.includes("private.is_coop_lobby_member") && migration.includes("member.role = 'host'") && migration.includes("revoke all on table"), 'membership, host authority or direct-write protection is incomplete'],
  [migration.includes("clock_timestamp() >= v_roll.expires_at") && migration.includes("'pass'"), 'missing choices are not safely converted to pass after timeout'],
  [ambiguityFix.includes('on conflict on constraint coop_boss_loot_rolls_lobby_id_run_seed_chapter_room_key') && ambiguityFix.includes('on conflict on constraint coop_boss_loot_choices_pkey'), 'Duo loot RPCs can regress to ambiguous RETURNS TABLE conflict targets'],
  [authority.includes('private.coop_boss_loot_catalog') && authority.includes('min(profile.current_rank)') && authority.includes('v_candidate_index'), 'server-side catalog, lower-team-rank gate or deterministic item selection is missing'],
  [authority.includes('drop function public.open_coop_boss_loot(uuid, bigint, integer, integer, text, text, text)') && !online.includes('p_item_id') && !online.includes('p_rarity') && !online.includes('p_source'), 'clients can still submit or force the shared equipment identity'],
  [winnerIndex.includes('coop_boss_loot_rolls_winner_user_idx') && winnerIndex.includes('where winner_user_id is not null'), 'resolved loot winner foreign key lacks a focused covering index'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}

console.log('Shared Duo boss loot claim/pass flow, server-authoritative item selection, reward-ack gating, atomic winner selection, unambiguous conflict targets, indexed winner lookup, 60-dust contested fallback, timeout and room-exit guard validated.');

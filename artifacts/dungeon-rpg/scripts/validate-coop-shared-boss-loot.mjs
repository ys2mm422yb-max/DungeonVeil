import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [online, overlay, session, reward, migration] = await Promise.all([
  read('../src/game/coopBossLootOnline.ts'),
  read('../src/components/CoopBossLootOverlay.tsx'),
  read('../src/components/GameSessionBridge.tsx'),
  read('../src/game/chapterRewardContract.ts'),
  read('../../../supabase/migrations/20260719013000_add_coop_boss_loot_claims.sql'),
]);

const checks = [
  [online.includes("COOP_BOSS_LOOT_OPEN_EVENT") && online.includes("chooseCoopBossLoot") && online.includes("open_coop_boss_loot"), 'Duo boss loot client does not use the secured RPC contract'],
  [overlay.includes("rollBossEquipmentReward") && overlay.includes("getMyCoopLobby") && overlay.includes("collectBalancedEquipmentDrop"), 'host roll, lobby lookup or local entitlement application is missing'],
  [overlay.includes("my_consolation_dust") && overlay.includes("BEANSPRUCHEN") && overlay.includes("PASSEN"), 'claim/pass UI or consolation outcome is missing'],
  [overlay.includes("engine.canExitRoom = () => false") && overlay.includes("COOP_BOSS_LOOT_PENDING_DATASET"), 'room exit is not blocked while shared loot is unresolved'],
  [session.includes("skipEquipmentDrop: true") && session.includes("dispatchCoopBossLootOpen"), 'Duo currency and shared boss equipment are not separated'],
  [reward.includes("skipEquipmentDrop?: boolean") && reward.includes("!normalized.skipEquipmentDrop"), 'chapter reward contract cannot suppress the local Duo equipment roll'],
  [migration.includes("coop_boss_loot_rolls") && migration.includes("coop_boss_loot_choices"), 'server loot tables are missing'],
  [migration.includes("private.resolve_coop_boss_loot") && migration.includes("hashtextextended") && migration.includes("consolation_dust = 60"), 'atomic contested resolution or fixed consolation dust is missing'],
  [migration.includes("private.is_coop_lobby_member") && migration.includes("member.role = 'host'") && migration.includes("revoke all on table"), 'membership, host authority or direct-write protection is incomplete'],
  [migration.includes("clock_timestamp() >= v_roll.expires_at") && migration.includes("'pass'"), 'missing choices are not safely converted to pass after timeout'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'));
  process.exit(1);
}

console.log('Shared Duo boss loot claim/pass flow, atomic winner selection, 60-dust contested fallback, timeout and room-exit guard validated.');

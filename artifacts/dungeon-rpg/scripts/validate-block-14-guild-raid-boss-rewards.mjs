import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const boss = read('artifacts/dungeon-rpg/src/game/guildRaidBoss.ts');
const online = read('artifacts/dungeon-rpg/src/game/guildRaidBossOnline.ts');
const panel = read('artifacts/dungeon-rpg/src/components/GuildRaidRunPanel.tsx');
const migration = read('supabase/migrations/20260726213000_guild_raid_boss_rewards_block_14.sql');

for (const phase of ['veil-armor', 'split-echoes', 'collapse', 'defeated']) expect(boss.includes(phase), `missing boss phase ${phase}`);
expect(online.includes("guild_raid_boss_action"), 'missing authoritative boss RPC');
expect(online.includes("claim_my_guild_raid_reward"), 'missing authoritative reward claim RPC');
expect(panel.includes('submitAuthoritativeGuildRaidBossAction'), 'panel must use authoritative boss mutations');
expect(panel.includes('guild-raid-claim-reward'), 'missing mobile reward claim action');
expect(panel.includes('guild-raid-reward-result'), 'missing localized reward result');
expect(panel.includes('Belohnung beanspruchen') && panel.includes('Claim reward'), 'reward claim must be bilingual');
expect(migration.includes('guild_raid_reward_entitlements'), 'missing reward entitlement table');
expect(migration.includes('unique') && migration.includes('raid_run_id') && migration.includes('user_id'), 'reward entitlement must be exactly-once');
expect(migration.includes('3') && migration.toLowerCase().includes('week'), 'missing weekly anti-farming limit');
expect(migration.includes('p_action') && migration.includes('guild_raid_boss_action'), 'server must validate boss actions');
expect(migration.includes('claim_my_guild_raid_reward'), 'server reward claim function missing');
expect(!panel.includes('submitGuildRaidBossAction('), 'legacy client-side boss reducer submission still active');

console.log('Block 14 guild raid boss, authoritative rewards, anti-farming and localized mobile claim UI validated.');

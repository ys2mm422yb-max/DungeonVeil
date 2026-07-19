#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { simulateWorldBossCombatMatrixV4 } from './worldboss-combat-matrix-v4.mjs';

const [balance, screen, stage, performanceAudit, migration, edge] = await Promise.all([
  readFile(new URL('../src/game/buildBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WorldBossBattleScreenV4.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('./validate-worldboss-performance.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../../../supabase/migrations/20260719150000_version_world_boss_balance_v4.sql', import.meta.url), 'utf8'),
  readFile(new URL('../../../supabase/functions/world-boss-hit/index.ts', import.meta.url), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`World Boss combat matrix V4 audit failed: ${message}`);
}

assert(balance.includes('health: 118000') && balance.includes('timeLimitSeconds: 150'), 'World Boss health or time limit diverged');
assert(balance.includes('fireBreathDamage: 34') && balance.includes('clawDamage: 27') && balance.includes('slamDamage: 42'), 'World Boss attack values diverged');
assert(balance.includes('armorMitigationCap: 0.40') && balance.includes("balanceSeason: 'equipment-v4-s1'"), 'World Boss armor cap or season is missing');
assert(screen.includes('ATTEMPT_DURATION_MS = WORLD_BOSS_BALANCE_V4.timeLimitSeconds * 1000'), 'battle timer is not driven by V4 balance');
assert(screen.includes('boss.maxHp = WORLD_BOSS_BALANCE_V4.health') && screen.includes('raidDamage = Math.max(1, Math.min(WORLD_BOSS_BALANCE_V4.health'), 'local boss health or submitted damage cap is not authoritative');
assert(screen.includes('updateEquipmentRuntimeBalance(engine, equipmentRuntime)'), 'equipment, critical, speed and defense runtime is not active in World Boss');
assert(screen.includes('RAID_PARTICLE_LIMIT') && screen.includes('RAID_EFFECT_LIMIT') && screen.includes('RAID_DAMAGE_LIMIT'), 'mobile World Boss effect budgets are missing');
assert(stage.includes('dragon') || stage.includes('Dragon') || performanceAudit.includes('dragon'), 'Ash King dragon model/fallback contract is missing');
assert(performanceAudit.includes('fireBreath') && performanceAudit.includes('claw') && performanceAudit.includes('slam'), 'attack telegraph/performance audit is incomplete');
assert(edge.includes('damage > 50000') && edge.includes('record_world_boss_hit'), 'server edge function damage cap or RPC is missing');

assert(migration.includes('balance_season text') && migration.includes("'equipment-v4-s1'"), 'World Boss balance season column or V4 season is missing');
assert(migration.includes("set status = 'expired'") && migration.includes("balance_season <> 'equipment-v4-s1'"), 'legacy active events are not separated before V4');
assert(migration.includes('where not exists') && migration.includes("'aschenkoenig-equipment-v4-s1-'"), 'idempotent V4 event creation is missing');
assert(migration.includes('where user_id = v_user_id\n    and event_id = p_event_id'), 'attempt cooldown remains shared across old and new events');
assert(migration.includes("v_event.balance_season <> 'equipment-v4-s1'"), 'attempts or damage can target a different balance season');
assert(migration.includes('on conflict (event_id, user_id)') && migration.includes('world_boss_contributions.damage + excluded.damage'), 'season-event leaderboard aggregation is missing');
assert(migration.includes('grant execute on function public.record_world_boss_hit') && migration.includes('to service_role'), 'World Boss hit RPC is not restricted to service role');

const report = simulateWorldBossCombatMatrixV4();
assert(report.builds.length === 7, `expected seven builds, found ${report.builds.length}`);
assert(report.relics.length === 3 && report.gifts.length === 3, 'expected three relic and gift profiles');
assert(report.scenarioCount === 63, `expected 63 World Boss scenarios, found ${report.scenarioCount}`);
assert(report.boss.health === 118000 && report.boss.timeLimit === 150 && report.boss.season === 'equipment-v4-s1', 'matrix boss contract diverges from runtime');

for (const row of report.rows) {
  assert(Number.isFinite(row.dps) && row.dps > 0, `${row.build}/${row.relic}/${row.gifts} invalid DPS`);
  assert(Number.isFinite(row.clearSeconds) && row.clearSeconds > 0, `${row.build}/${row.relic}/${row.gifts} invalid clear time`);
  assert(row.damage >= 1 && row.damage <= report.boss.health, `${row.build}/${row.relic}/${row.gifts} invalid damage cap`);
  assert(row.cooldown >= 125, `${row.build}/${row.relic}/${row.gifts} attack cooldown escapes the global floor`);
  assert(row.mitigation >= 0 && row.mitigation <= 0.40, `${row.build}/${row.relic}/${row.gifts} armor escapes the World Boss cap`);
  assert(row.damageTaken > 20, `${row.build}/${row.relic}/${row.gifts} becomes effectively immune`);
}

const find = (build, relic, gifts) => report.rows.find(row => row.build === build && row.relic === relic && row.gifts === gifts);
const starter = find('starter', 'none', 'none');
const starterMax = find('starter', 'offensive', 'maximum');
const attack = find('attack', 'offensive', 'maximum');
const critical = find('critical', 'offensive', 'maximum');
const range = find('range', 'offensive', 'maximum');
const tank = find('tank', 'defensive', 'maximum');
const maximum = find('maximum', 'offensive', 'maximum');
const maximumDefensive = find('maximum', 'defensive', 'maximum');
assert(starter && starterMax && attack && critical && range && tank && maximum && maximumDefensive, 'World Boss reference scenarios are missing');
assert(starter.damagePercent >= 0.04 && starter.damagePercent <= 0.08, 'starter/no-gift contribution is outside the intended participation band');
assert(!starterMax.victory && starterMax.damagePercent >= 0.30 && starterMax.damagePercent <= 0.40, 'starter build with gifts becomes trivial or irrelevant');
assert(!attack.victory && attack.damagePercent >= 0.65 && attack.damagePercent <= 0.80, 'attack build contribution tier is outside target');
assert(!critical.victory && Math.abs(critical.damagePercent - attack.damagePercent) <= 0.04, 'critical build dominates or trails the attack specialist excessively');
assert(!range.victory && range.damagePercent >= 0.55, 'range build loses too much World Boss uptime');
assert(!tank.victory && tank.damageTaken < attack.damageTaken && tank.damageTaken > 70, 'tank build is not meaningfully safer or becomes immune');
assert(maximum.victory && maximum.clearSeconds >= 110 && maximum.clearSeconds <= 135, 'maximum offensive build misses the intended victory window');
assert(maximumDefensive.victory && maximumDefensive.clearSeconds >= 130 && maximumDefensive.clearSeconds <= 150, 'maximum defensive relic tradeoff misses the intended window');

console.log(JSON.stringify({
  scenarios: report.scenarioCount,
  season: report.boss.season,
  references: { starter, starterMax, attack, critical, range, tank, maximum, maximumDefensive },
}, null, 2));
console.log('World Boss combat matrix V4 passed: build damage tiers, survival, telegraphs, performance budgets and season-isolated leaderboard contracts remain bounded.');

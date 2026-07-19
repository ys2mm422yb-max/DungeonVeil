#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { simulateWorldBossCombatMatrixV4 } from './worldboss-combat-matrix-v4.mjs';

const [balance, screen, stage, performance, migration, edge] = await Promise.all([
  readFile(new URL('../src/game/buildBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WorldBossBattleScreenV4.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WorldBossLiteStage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('./validate-worldboss-performance.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../../../supabase/migrations/20260719150000_version_world_boss_balance_v4.sql', import.meta.url), 'utf8'),
  readFile(new URL('../../../supabase/functions/world-boss-hit/index.ts', import.meta.url), 'utf8'),
]);
const assert = (condition, message) => { if (!condition) throw new Error(`World Boss matrix V4: ${message}`); };

assert(balance.includes('health: 118000') && balance.includes('timeLimitSeconds: 150'), 'health or timer diverged');
assert(balance.includes('fireBreathDamage: 34') && balance.includes('clawDamage: 27') && balance.includes('slamDamage: 42'), 'attack values diverged');
assert(balance.includes('armorMitigationCap: 0.40') && balance.includes("balanceSeason: 'equipment-v4-s1'"), 'armor cap or season missing');
assert(screen.includes('updateEquipmentRuntimeBalance(engine, equipmentRuntime)'), 'V4 equipment runtime missing');
assert(screen.includes('RAID_PARTICLE_LIMIT') && screen.includes('RAID_EFFECT_LIMIT') && screen.includes('RAID_DAMAGE_LIMIT'), 'mobile budgets missing');
assert(stage.includes('dragon') || stage.includes('Dragon') || performance.includes('dragon'), 'dragon model/fallback missing');
assert(performance.includes("type AttackKind = 'breath' | 'claw' | 'slam'") && performance.includes('BREATH_HIT_RADIUS') && performance.includes('CLAW_RANGE') && performance.includes('SLAM_RANGE'), 'attack audit incomplete');
assert(edge.includes('damage > 50000') && edge.includes('record_world_boss_hit'), 'server cap or RPC missing');
assert(migration.includes('balance_season text') && migration.includes("'equipment-v4-s1'"), 'season migration missing');
assert(migration.includes("set status = 'expired'") && migration.includes("balance_season <> 'equipment-v4-s1'"), 'legacy event separation missing');
assert(migration.includes('where user_id = v_user_id') && migration.includes('and event_id = p_event_id'), 'attempt cooldown not event scoped');
assert(migration.includes('on conflict (event_id, user_id)') && migration.includes('to service_role'), 'leaderboard isolation or grants missing');

const report = simulateWorldBossCombatMatrixV4();
assert(report.scenarioCount === 63 && report.builds.length === 7, 'complete build matrix missing');
for (const row of report.rows) {
  assert(Number.isFinite(row.dps) && row.dps > 0 && row.clearSeconds > 0, `${row.build} invalid output`);
  assert(row.damage >= 1 && row.damage <= report.boss.health, `${row.build} damage cap invalid`);
  assert(row.cooldown >= 125 && row.mitigation <= 0.40 && row.damageTaken > 20, `${row.build} safety cap invalid`);
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
assert(starter && starterMax && attack && critical && range && tank && maximum && maximumDefensive, 'references missing');
assert(starter.damagePercent >= 0.04 && starter.damagePercent <= 0.08, 'starter band invalid');
assert(!starterMax.victory && starterMax.damagePercent >= 0.30 && starterMax.damagePercent <= 0.40, 'starter gifts invalid');
assert(!attack.victory && attack.damagePercent >= 0.65 && attack.damagePercent <= 0.80, 'attack tier invalid');
assert(!critical.victory && Math.abs(critical.damagePercent - attack.damagePercent) <= 0.04, 'critical dominance invalid');
assert(!range.victory && range.damagePercent >= 0.55, 'range uptime invalid');
assert(!tank.victory && tank.damageTaken < attack.damageTaken && tank.damageTaken > 70, 'tank safety invalid');
assert(maximum.victory && maximum.clearSeconds >= 110 && maximum.clearSeconds <= 135, 'maximum victory window invalid');
assert(maximumDefensive.victory && maximumDefensive.clearSeconds >= 130 && maximumDefensive.clearSeconds <= 150, 'defensive victory window invalid');
console.log(JSON.stringify({ scenarios: report.scenarioCount, season: report.boss.season, starter, attack, critical, range, tank, maximum, maximumDefensive }, null, 2));
console.log('World Boss combat matrix V4 passed.');

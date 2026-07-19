#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { simulateSoloCombatMatrixV4 } from './solo-combat-matrix-v4.mjs';

const [builds, curve, combat, runtime, relics] = await Promise.all([
  readFile(new URL('../src/game/buildBalanceV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/combatCurveV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentCombatV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/equipmentPlayerRuntimeV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/veilRelics.ts', import.meta.url), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Solo combat matrix V4 audit failed: ${message}`);
}

assert(builds.includes('starter:') && builds.includes('critical:') && builds.includes('range:') && builds.includes('tank:') && builds.includes('hybrid:') && builds.includes('maximum:'), 'canonical build reference is incomplete');
assert(curve.includes('roomCombatScaleV4') && curve.includes('chapterCombatProfileV4') && curve.includes('BOSS_TARGETS_V4'), 'room, chapter or boss curve is not canonical');
assert(combat.includes('criticalDamage') && combat.includes('defenseMitigation') && combat.includes('mitigatedIncomingDamage'), 'critical or defense runtime is incomplete');
assert(runtime.includes('MIN_ATTACK_COOLDOWN_MS = 125') && runtime.includes('Math.min(1.75'), 'attack-speed safety bounds are missing');
assert(runtime.includes("equippedVeilRelic() === 'depth-rune-shard' ? 0.82 : 1"), 'Runensplitter reduction is not applied before armor mitigation');
assert(relics.includes('Jeder siebte Kill') && relics.includes('maximal vier Stapel') && relics.includes('+4 % Angriff und +7 % maximales Leben'), 'bounded relic reference values are missing');

const report = simulateSoloCombatMatrixV4();
assert(report.buildCount === 7, `expected seven canonical build profiles, found ${report.buildCount}`);
assert(report.relicProfiles.length === 6, 'expected no-relic plus five combat relic profiles');
assert(report.giftProfiles.length === 3, 'expected no, balanced and maximum gift profiles');
assert(report.checkpoints.length === 6, 'expected six chapter/room checkpoints');
assert(report.scenarioCount === 756, `expected 756 combat scenarios, found ${report.scenarioCount}`);

for (const row of report.rows) {
  assert(Number.isFinite(row.ttkSeconds) && row.ttkSeconds > 0, `${row.build}/${row.relic}/${row.gifts}/${row.chapter}:${row.room} invalid TTK`);
  assert(row.hitsRequired >= row.enemyCount, `${row.build}/${row.chapter}:${row.room} invalid hit count`);
  assert(row.damageDealt >= 1 && row.damageReceived >= 1, `${row.build}/${row.chapter}:${row.room} damage accounting is empty`);
  assert(row.healingNeeded >= 0, `${row.build}/${row.chapter}:${row.room} healing requirement is negative`);
  assert(row.attackCooldownMs >= 125, `${row.build}/${row.relic}/${row.gifts} attack cooldown falls below 125 ms`);
  assert(row.projectileRate <= 24, `${row.build}/${row.relic}/${row.gifts} projectile rate is uncontrolled`);
  assert(row.totalProjectileLoad <= 32, `${row.build}/${row.chapter}:${row.room} total projectile load exceeds the mobile budget`);
  assert(row.mobileControlScore >= 0.35, `${row.build}/${row.chapter}:${row.room} mobile control score is unsafe`);
  assert(row.roomDurationSeconds >= row.ttkSeconds, `${row.build}/${row.chapter}:${row.room} room duration predates combat completion`);
  assert(row.mitigation >= 0 && row.mitigation <= 0.52, `${row.build}/${row.chapter}:${row.room} defense mitigation escaped the cap`);
}

const find = (build, relic, gifts, chapter, room) => report.rows.find(row => row.build === build && row.relic === relic && row.gifts === gifts && row.chapter === chapter && row.room === room);
const starterEarly = find('starter', 'none', 'none', 1, 1);
const maximumEarly = find('maximum', 'guardianCrown', 'maximum', 1, 1);
const criticalLateBoss = find('critical', 'guardianCrown', 'maximum', 10, 50);
const maximumLateBoss = find('maximum', 'guardianCrown', 'maximum', 10, 50);
const tankLateBoss = find('tank', 'runeShard', 'maximum', 10, 50);
const attackLateBoss = find('attack', 'none', 'maximum', 10, 50);
const rangeLatePack = find('range', 'none', 'balanced', 8, 40);
const starterLateBoss = find('starter', 'none', 'none', 10, 50);

assert(starterEarly && maximumEarly && criticalLateBoss && maximumLateBoss && tankLateBoss && attackLateBoss && rangeLatePack && starterLateBoss, 'reference scenarios are missing');
assert(starterEarly.ttkSeconds >= 1.5 && starterEarly.ttkSeconds <= 8, 'starter opening combat is too fast or too slow');
assert(maximumEarly.ttkSeconds >= 0.5, 'maximum equipment deletes opening encounters instantly');
assert(criticalLateBoss.ttkSeconds >= 70, 'critical build deletes the chapter-10 boss too quickly');
assert(maximumLateBoss.ttkSeconds >= 45 && maximumLateBoss.ttkSeconds <= 130, 'maximum build chapter-10 boss target is outside the intended band');
assert(starterLateBoss.ttkSeconds > maximumLateBoss.ttkSeconds * 2.5, 'late equipment progression lacks meaningful power growth');
assert(tankLateBoss.mitigation > attackLateBoss.mitigation, 'tank mitigation is not stronger than the offensive build');
assert(tankLateBoss.damageReceived >= 1, 'tank build becomes damage immune');
assert(rangeLatePack.mobileControlScore > 0.55, 'range build does not provide its intended control advantage');
assert(report.byBuild.maximum.averageRoomDurationSeconds < report.byBuild.starter.averageRoomDurationSeconds, 'maximum equipment does not improve room pace');
assert(report.byBuild.critical.maximumProjectileRate <= 24, 'critical/attack-speed build creates a projectile flood');

console.log(JSON.stringify({
  scenarioCount: report.scenarioCount,
  byBuild: report.byBuild,
  references: { starterEarly, maximumEarly, criticalLateBoss, maximumLateBoss, tankLateBoss, rangeLatePack },
}, null, 2));
console.log('Solo combat matrix V4 passed: TTK, hits, damage, healing, projectile load, room duration and mobile control remain bounded across builds, relics and gifts.');

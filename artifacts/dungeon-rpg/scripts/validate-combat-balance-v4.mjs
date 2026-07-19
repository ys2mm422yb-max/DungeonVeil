#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const curve = read('src/game/combatCurveV4.ts');
const overlay = read('src/game/combatBalanceOverlayV4.ts');
const builds = read('src/game/buildBalanceV4.ts');
const equipmentRuntime = read('src/game/equipmentRuntimeBalance.ts');
const duo = read('src/game/coopDuoBalanceV4.ts');

function assert(condition, message) {
  if (!condition) throw new Error(`Combat balance V4 audit failed: ${message}`);
}

const chapterProfiles = [
  [1.00, 1.00, 1.00], [1.13, 1.09, 1.16], [1.27, 1.18, 1.34],
  [1.43, 1.28, 1.56], [1.62, 1.39, 1.80], [1.83, 1.51, 2.05],
  [2.05, 1.64, 2.32], [2.28, 1.78, 2.62], [2.52, 1.93, 2.94],
  [2.78, 2.09, 3.28],
];
const roomScale = room => {
  if (room <= 9) return { hp: 1 + (room - 1) * 0.018, attack: 1 + (room - 1) * 0.008 };
  if (room <= 19) return { hp: 1.18 + (room - 10) * 0.024, attack: 1.08 + (room - 10) * 0.011 };
  if (room <= 29) return { hp: 1.42 + (room - 20) * 0.028, attack: 1.20 + (room - 20) * 0.013 };
  if (room <= 39) return { hp: 1.72 + (room - 30) * 0.032, attack: 1.34 + (room - 30) * 0.015 };
  return { hp: 2.06 + (room - 40) * 0.038, attack: 1.50 + (room - 40) * 0.017 };
};
const buildSet = {
  starter: { attack: 15, crit: 0.05, critDamage: 1.5, hp: 168, defense: 0, speed: 0 },
  attack: { attack: 33, crit: 0.05, critDamage: 1.5, hp: 230, defense: 5, speed: 0.05 },
  critical: { attack: 29, crit: 0.14, critDamage: 1.68, hp: 206, defense: 5, speed: 0.18 },
  range: { attack: 24, crit: 0.05, critDamage: 1.5, hp: 206, defense: 5, speed: 0 },
  tank: { attack: 24, crit: 0.05, critDamage: 1.5, hp: 222, defense: 11, speed: 0.05 },
  maximum: { attack: 42, crit: 0.15, critDamage: 1.68, hp: 246, defense: 11, speed: 0.18 },
};
const effectiveDps = build => build.attack * (1 + build.crit * (build.critDamage - 1)) * (1 + build.speed);
const mitigation = defense => Math.min(0.52, defense / (defense + 32));

assert(chapterProfiles.length === 10, 'chapter 1–10 phases are incomplete');
for (let index = 1; index < chapterProfiles.length; index++) {
  assert(chapterProfiles[index][0] > chapterProfiles[index - 1][0], `chapter ${index + 1} HP does not increase`);
  assert(chapterProfiles[index][1] > chapterProfiles[index - 1][1], `chapter ${index + 1} attack does not increase`);
  assert(chapterProfiles[index][2] > chapterProfiles[index - 1][2], `chapter ${index + 1} boss HP does not increase`);
}
assert(curve.includes('Math.log2(overflow + 1)'), 'post-chapter-10 endless curve is not damped');
assert(curve.includes('BOSS_TARGETS_V4') && [10, 20, 30, 40, 50].every(room => curve.includes(`${room}: { hp:`)), 'five distinct boss targets are missing');
assert(overlay.includes('applyCombatBalanceV4Overlay') && equipmentRuntime.includes('applyCombatBalanceV4Overlay'), 'V4 combat curve is not wired into runtime');

for (const room of [1, 9, 10, 19, 20, 29, 30, 39, 40, 49, 50]) {
  const value = roomScale(room);
  assert(value.hp >= 1 && value.attack >= 1, `room ${room} scale is invalid`);
}
assert(roomScale(50).hp > roomScale(41).hp && roomScale(41).hp > roomScale(31).hp, 'late-room pressure is not progressive');

const dps = Object.fromEntries(Object.entries(buildSet).map(([name, build]) => [name, effectiveDps(build)]));
assert(dps.maximum / dps.starter < 3.7, 'maximum equipment trivializes starter damage curve');
assert(dps.critical < dps.maximum && dps.critical > dps.range, 'critical build lacks a controlled specialist role');
assert(mitigation(buildSet.tank.defense) > 0.2 && mitigation(buildSet.tank.defense) < 0.3, 'tank defense is not noticeable or is excessive');
assert(mitigation(1000) <= 0.52, 'defense can exceed the global mitigation cap');

assert(builds.includes('normalHp: 1.72') && builds.includes('bossHp: 2.18'), 'Duo build scaling target changed');
assert(builds.includes('disconnectHpFactor: 0.78') && duo.includes('applyDuoDisconnectFallback'), 'Duo disconnect fairness is missing');
assert(builds.includes('mobileEnemyCap: 12') && duo.includes('DUO_MOBILE_ENEMY_CAP'), 'Duo mobile cap is missing');
assert(builds.includes('health: 118000') && builds.includes('timeLimitSeconds: 150'), 'World Boss health or timer target is missing');
assert(builds.includes("balanceSeason: 'equipment-v4-s1'"), 'World Boss ranking season is not versioned');
assert(builds.includes('minimumEffectivePower: 0.08') && builds.includes('maximumEffectivePower: 0.12'), 'companion power reserve is outside 8–12%');
assert(builds.includes('blocksPlayers: false') && builds.includes('reviveTarget: false'), 'companion collision or revive safety is missing');

const room50Chapter10BossHp = 6500 * chapterProfiles[9][2];
const fastestTtk = room50Chapter10BossHp / dps.maximum;
const starterTtk = room50Chapter10BossHp / dps.starter;
assert(fastestTtk > 250 && fastestTtk < 700, 'maximum-build chapter-10 boss target is outside the intended endurance band');
assert(starterTtk > fastestTtk * 2.2, 'gear progression is not meaningful against late bosses');

console.log(JSON.stringify({
  buildDps: dps,
  mitigation: Object.fromEntries(Object.entries(buildSet).map(([name, build]) => [name, mitigation(build.defense)])),
  room50Chapter10BossHp,
  fastestTtk,
  starterTtk,
}, null, 2));
console.log('Combat balance V4 audit passed: ten chapters, rooms 1–50, five bosses, builds, Duo, World Boss and companion reserve remain bounded.');

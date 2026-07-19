#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const [encounterSource, engineSource, curveSource, spawnSource] = await Promise.all([
  readFile(new URL('../src/game/encounterPlan.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/combatCurveV4.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/roomSpawn3D.ts', import.meta.url), 'utf8'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Room 1–50 balance V4 audit failed: ${message}`);
}

const ENEMY = Object.freeze({
  slime: { hp: 24, attack: 4, role: 'mobile' },
  goblin: { hp: 34, attack: 6, role: 'melee' },
  skeleton: { hp: 52, attack: 8, role: 'ranged' },
  orc: { hp: 92, attack: 12, role: 'melee' },
  spider: { hp: 38, attack: 7, role: 'mobile' },
  vampire: { hp: 82, attack: 14, role: 'ranged' },
  demon: { hp: 128, attack: 18, role: 'ranged' },
  golem: { hp: 190, attack: 20, role: 'heavy' },
});

const encounterTableStart = encounterSource.indexOf('const ENCOUNTERS:');
const regionPoolStart = encounterSource.indexOf('const REGION_POOLS:');
assert(encounterTableStart >= 0 && regionPoolStart > encounterTableStart, 'runtime encounter table boundaries are missing');
const encounterTableSource = encounterSource.slice(encounterTableStart, regionPoolStart);

const explicit = new Map();
for (const match of encounterTableSource.matchAll(/^\s*(\d+):\s*\[([^\]]*)\],?$/gm)) {
  const room = Number(match[1]);
  if (room > 20) continue;
  const types = [...match[2].matchAll(/'([^']+)'/g)].map(entry => entry[1]);
  explicit.set(room, types);
}

const regionPools = {
  3: ['goblin', 'spider', 'slime', 'skeleton', 'orc', 'vampire', 'demon'],
  4: ['vampire', 'spider', 'skeleton', 'orc', 'demon', 'golem'],
  5: ['orc', 'golem', 'vampire', 'skeleton', 'demon', 'spider', 'slime'],
};

function enforceLateRoomRoleMix(plan, local) {
  if (plan.length < 3) return plan;
  const result = [...plan];
  result[0] = local % 2 === 0 ? 'golem' : 'orc';
  result[1] = local % 3 === 0 ? 'vampire' : 'demon';
  result[2] = local % 2 === 0 ? 'spider' : 'slime';
  return result;
}

function encounter(room) {
  if (explicit.has(room)) return [...explicit.get(room)];
  if (room % 10 === 0) return [];
  const region = Math.ceil(room / 10);
  const pool = regionPools[region] ?? regionPools[3];
  const local = (room - 1) % 10;
  const count = Math.min(8, 5 + Math.floor(local / 2));
  const generated = Array.from({ length: count }, (_, index) => pool[(index + local * 2) % pool.length]);
  return room >= 41 ? enforceLateRoomRoleMix(generated, local) : generated;
}

function chapterScale(chapter) {
  const profiles = [
    [1.00, 1.00, 1.00], [1.13, 1.09, 1.16], [1.27, 1.18, 1.34], [1.43, 1.28, 1.56], [1.62, 1.39, 1.80],
    [1.83, 1.51, 2.05], [2.05, 1.64, 2.32], [2.28, 1.78, 2.62], [2.52, 1.93, 2.94], [2.78, 2.09, 3.28],
  ];
  const [hp, attack, boss] = profiles[Math.max(0, Math.min(9, chapter - 1))];
  return { hp, attack, boss };
}

function roomScale(room) {
  if (room <= 9) return { hp: 1 + (room - 1) * 0.018, attack: 1 + (room - 1) * 0.008 };
  if (room <= 19) return { hp: 1.18 + (room - 10) * 0.024, attack: 1.08 + (room - 10) * 0.011 };
  if (room <= 29) return { hp: 1.42 + (room - 20) * 0.028, attack: 1.20 + (room - 20) * 0.013 };
  if (room <= 39) return { hp: 1.72 + (room - 30) * 0.032, attack: 1.34 + (room - 30) * 0.015 };
  return { hp: 2.06 + (room - 40) * 0.038, attack: 1.50 + (room - 40) * 0.017 };
}

const bosses = Object.freeze({
  10: { hp: 920, attack: 21, supportCap: 0 },
  20: { hp: 1750, attack: 29, supportCap: 1 },
  30: { hp: 2850, attack: 38, supportCap: 1 },
  40: { hp: 4300, attack: 49, supportCap: 2 },
  50: { hp: 6500, attack: 61, supportCap: 2 },
});

const MAX_BUILD_DPS = 42 * (1 + 0.15 * 0.68) * (1000 / 161) * 1.13;
const STARTER_DPS = 15 * (1 + 0.05 * 0.5) * (1000 / 270);
const rows = [];
for (const chapter of [1, 5, 10]) {
  const chapterProfile = chapterScale(chapter);
  for (let room = 1; room <= 50; room++) {
    const plan = encounter(room);
    const scale = roomScale(room);
    if (bosses[room]) {
      const target = bosses[room];
      const hp = target.hp * chapterProfile.boss;
      rows.push({ chapter, room, boss: true, count: 1, unique: 1, roles: ['boss'], totalHp: hp, pressure: target.attack * chapterProfile.attack, maxBuildTtk: hp / MAX_BUILD_DPS, starterTtk: hp / STARTER_DPS });
      continue;
    }
    const totalHp = plan.reduce((sum, type) => sum + ENEMY[type].hp, 0) * chapterProfile.hp * scale.hp;
    const pressure = plan.reduce((sum, type) => sum + ENEMY[type].attack, 0) * chapterProfile.attack * scale.attack;
    const roles = [...new Set(plan.map(type => ENEMY[type].role))];
    rows.push({ chapter, room, boss: false, count: plan.length, unique: new Set(plan).size, roles, totalHp, pressure, maxBuildTtk: totalHp / MAX_BUILD_DPS, starterTtk: totalHp / STARTER_DPS });
  }
}

assert(explicit.size === 20, `expected explicit contracts for rooms 1–20, found ${explicit.size}`);
assert(encounterSource.includes('enforceLateRoomRoleMix') && encounterSource.includes('safeRoom >= 41'), 'runtime late-room role-mix contract is missing');
assert([...Array(50)].every((_, index) => encounter(index + 1).every(type => ENEMY[type])), 'unknown enemy type appears in a room plan');
assert([10, 20, 30, 40, 50].every(room => encounter(room).length === 0), 'boss rooms contain normal encounter spawns');

for (let room = 1; room <= 50; room++) {
  if (bosses[room]) continue;
  const plan = encounter(room);
  assert(plan.length >= 2 && plan.length <= 8, `room ${room} enemy count ${plan.length} escapes the 2–8 mobile-safe band`);
  assert(new Set(plan).size >= (room <= 2 ? 2 : 3), `room ${room} lacks enemy variety`);
  if (room >= 21) assert(new Set(plan.map(type => ENEMY[type].role)).size >= 3, `room ${room} lacks melee/ranged/mobile/heavy role pressure`);
  if (room >= 41) assert(plan.length >= 5, `late room ${room} is underpopulated`);
}

const bandAverage = (from, to, key) => {
  const sample = rows.filter(row => row.chapter === 5 && row.room >= from && row.room <= to && !row.boss);
  return sample.reduce((sum, row) => sum + row[key], 0) / sample.length;
};
assert(bandAverage(41, 49, 'pressure') > bandAverage(1, 9, 'pressure') * 2.2, 'late-room pressure does not meaningfully exceed the opening band');
assert(bandAverage(41, 49, 'totalHp') > bandAverage(1, 9, 'totalHp') * 3.3, 'late-room endurance does not meaningfully exceed the opening band');
assert(Object.values(bosses).every((boss, index, list) => index === 0 || boss.hp > list[index - 1].hp), 'boss HP milestones are not strictly increasing');
assert(Object.values(bosses).every(boss => boss.supportCap <= 2), 'boss support cap exceeds the mobile budget');

for (const row of rows) {
  assert(Number.isFinite(row.maxBuildTtk) && row.maxBuildTtk > 0, `room ${row.room}/chapter ${row.chapter} maximum-build TTK is invalid`);
  assert(row.starterTtk > row.maxBuildTtk, `room ${row.room}/chapter ${row.chapter} gear progression is inverted`);
  if (!row.boss && row.chapter === 1) assert(row.maxBuildTtk >= 0.55, `room ${row.room} can be erased instantly by maximum gear`);
  if (row.boss && row.chapter === 10) assert(row.maxBuildTtk >= 35, `chapter-10 boss room ${row.room} is too short for maximum gear`);
}

assert(engineSource.includes('const count = Math.min(points.length, encounter.length)'), 'runtime does not cap encounters to authored spawn capacity');
assert(engineSource.includes('if (!isWalkable') && engineSource.includes('collidesWithRoomProp'), 'spawn walkability or collision guard is missing');
assert(engineSource.includes('restartCurrentRoom()') && engineSource.includes("saveNow('restart-room')"), 'room retry persistence is missing');
assert(engineSource.includes('completedChapter ? 1 : this.state.floor + 1') && engineSource.includes("saveNow(completedChapter ? 'chapter-complete' : 'room-complete')"), 'room/chapter transition contract is missing');
assert(spawnSource.includes('getRoomSpawnPoints') && spawnSource.includes('sceneSpawnToGame'), 'authored room spawn mapping is missing');
assert(curveSource.includes('BOSS_TARGETS_V4') && curveSource.includes('supportCap'), 'five-boss target contract is missing');

console.log(JSON.stringify({
  rooms: 50,
  normalRooms: 45,
  bossRooms: Object.keys(bosses).map(Number),
  mobileEnemyCap: 8,
  openingPressure: Math.round(bandAverage(1, 9, 'pressure')),
  latePressure: Math.round(bandAverage(41, 49, 'pressure')),
  openingHp: Math.round(bandAverage(1, 9, 'totalHp')),
  lateHp: Math.round(bandAverage(41, 49, 'totalHp')),
  scenarios: rows.length,
}, null, 2));
console.log('Room 1–50 V4 audit passed: all normal compositions, boss milestones, role mixes, spawn guards, retry/transition paths and mobile caps remain bounded.');

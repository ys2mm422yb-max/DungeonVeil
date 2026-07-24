import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = message => {
  console.error(`Shattered Observatory audit failed: ${message}`);
  process.exitCode = 1;
};

const rooms = read('src/game/shatteredObservatoryRooms.ts');
const setpieces = read('src/game/shatteredObservatorySetpieces.ts');
const chapterRun = read('src/game/chapterRun.ts');
const encounters = read('src/game/encounterPlan.ts');
const spawns = read('src/game/roomSpawn3D.ts');
const roomBible = read('src/game/roomBible.ts');
const logicalSetpieces = read('src/game/logicalRoomSetpieces.ts');
const legacySetpieces = read('src/game/logicalRoomSetpiecesLegacy.ts');
const mechanics = read('src/game/shatteredObservatoryMechanics.ts');
const runBalance = read('src/game/runBalance.ts');
const legacyRunBalance = read('src/game/runBalanceLegacy.ts');

const roomLines = rooms.split('\n').map(line => line.trim());
const setpieceLines = setpieces.split('\n').map(line => line.trim());
const encounterLines = encounters.split('\n').map(line => line.trim());

for (let room = 61; room <= 70; room += 1) {
  if (!roomLines.some(line => line.startsWith(`${room}: R(${room},`))) fail(`room ${room} is missing from SHATTERED_OBSERVATORY_ROOMS`);
  if (!setpieceLines.some(line => line.startsWith(`${room}: [`))) fail(`room ${room} has no authored setpiece layout`);
}

const authoredTitleLines = roomLines.filter(line => {
  const room = Number(line.slice(0, 2));
  return room >= 61 && room <= 70 && line.includes(': R(');
});
if (authoredTitleLines.length !== 10) fail(`expected 10 bilingual room titles, found ${authoredTitleLines.length}`);

for (const token of ['fallen-orrery', 'meridian-split', 'lens-graveyard', 'astral-causeway', 'clock-of-ash', 'silent-ephemeris', 'comet-archive', 'parallax-vault', 'last-calculation', 'astronomer-crown']) {
  if (!rooms.includes(`'${token}'`)) fail(`missing silhouette ${token}`);
}
for (const token of ['rotating-star-lane', 'alternating-starfall-bands', 'lens-burn-zones', 'sequential-starfall', 'opposed-rotating-lanes', 'star-node-sequence', 'crossing-comet-traces', 'parallax-bay-pulses', 'calculation-overlap', 'astronomer-phases']) {
  if (!rooms.includes(`'${token}'`)) fail(`missing hazard ${token}`);
}

if (!rooms.includes('room >= 61 && room <= 70') && !rooms.includes('roomNumber >= 61 && roomNumber <= 70')) fail('room range guard does not cover exactly 61-70');
const chapterRoomLine = chapterRun.split('\n').find(line => line.includes('export const CHAPTER_ROOMS =')) ?? '';
const finalBossLine = chapterRun.split('\n').find(line => line.includes('export const FINAL_BOSS_ROOM =')) ?? '';
const chapterRoomValue = Number(chapterRoomLine.split('=')[1]?.replace(';', '').trim());
const finalBossValue = Number(finalBossLine.split('=')[1]?.replace(';', '').trim());
if (!Number.isFinite(chapterRoomValue) || chapterRoomValue < 70) fail('chapter run does not reach room 70');
if (!Number.isFinite(finalBossValue) || finalBossValue < 70) fail('configured final boss occurs before room 70');
if (!chapterRun.includes('10, 20, 30, 40, 50, 60, 70')) fail('boss-room registry is missing room 70');
if (!chapterRun.includes('observatoryPortalTile(room')) fail('chapter room generation does not use Observatory portals');

for (let room = 61; room <= 69; room += 1) {
  const line = encounterLines.find(entry => entry.startsWith(`${room}: [`));
  if (!line) {
    fail(`room ${room} lacks an explicit encounter`);
    continue;
  }
  const count = (line.match(/'/g)?.length ?? 0) / 2;
  if (count < 6 || count > 8) fail(`room ${room} enemy count ${count} escapes the 6-8 band`);
}
if (!encounterLines.some(line => line === '70: [],')) fail('room 70 must reserve normal encounters for the boss');

if (!spawns.includes("import { shatteredObservatoryRoomSpec }")) fail('runtime spawn resolver does not import Observatory room specs');
if (!spawns.includes('const authored = observatory ?? golden ?? legacy!;') || !spawns.includes('const authoredSpawns = authored.enemySpawns;')) fail('runtime spawn resolver does not consume authored Observatory spawns');

if (!roomBible.includes("'shattered-observatory'")) fail('Observatory lighting phase is missing');
if (!roomBible.includes('for (const spec of Object.values(SHATTERED_OBSERVATORY_ROOMS))')) fail('rooms 61-70 are not registered in the room bible');
if (!roomBible.includes('Math.min(70')) fail('room bible is still clamped below room 70');
if (!roomBible.includes('Krone des entfesselten Astronomen')) fail('room 70 presentation identity is missing');

if (!logicalSetpieces.includes("from './logicalRoomSetpiecesLegacy'")) fail('logical setpiece resolver does not preserve the legacy layouts');
if (!logicalSetpieces.includes("from './shatteredObservatorySetpieces'")) fail('logical setpiece resolver does not import Observatory layouts');
if (!logicalSetpieces.includes('Math.min(70')) fail('logical setpiece resolver is still clamped below room 70');
if (!logicalSetpieces.includes('if (observatory.length)')) fail('Observatory layouts are not preferred before legacy fallback');
if (!legacySetpieces.includes('goldenFractureSetpieces')) fail('legacy setpiece implementation was not preserved');

if (!runBalance.includes("from './runBalanceLegacy'")) fail('run balance does not preserve the proven legacy balance path');
if (!runBalance.includes('updateShatteredObservatoryMechanics(engine)')) fail('run balance does not execute Observatory mechanics');
if (!legacyRunBalance.includes('updateGoldenFractureMechanics')) fail('legacy chapter mechanics were not preserved');
if (!mechanics.includes("const EFFECT_PREFIX = 'shattered-observatory-'")) fail('Observatory effects do not have an isolated cleanup prefix');
if (!mechanics.includes('clearObservatoryHazards(engine, state)')) fail('Observatory hazards do not clean up atomically after combat');
if (!mechanics.includes('boss.maxHp = Math.max(7600')) fail('Astronomer does not have unique boss HP tuning');
if (!mechanics.includes('boss.nextAttackTime = now + 1100')) fail('Astronomer opening recovery window is missing');
if (!mechanics.includes('ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1')) fail('Astronomer three-phase thresholds are missing');
if (!mechanics.includes('spec.telegraphMs + spec.activeMs + spec.recoveryMs')) fail('authored warning, active and recovery timing is not respected');
if (!mechanics.includes('DER ENTFESSELTE ASTRONOM')) fail('unique Astronomer runtime identity is missing');

if (!process.exitCode) console.log('Shattered Observatory chapter contract passed: rooms 61-70 remain fully wired while later chapters may extend the run.');

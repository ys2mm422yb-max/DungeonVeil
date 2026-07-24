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

for (let room = 61; room <= 70; room += 1) {
  if (!new RegExp(`\\b${room}:\\s*R\\(${room},`).test(rooms)) fail(`room ${room} is missing from SHATTERED_OBSERVATORY_ROOMS`);
  if (!new RegExp(`\\b${room}:\\s*\\[`).test(setpieces)) fail(`room ${room} has no authored setpiece layout`);
}

const titleMatches = [...rooms.matchAll(/\b(6[1-9]|70):\s*R\([^,]+,\s*'([^']+)',\s*'([^']+)'/g)];
if (titleMatches.length !== 10) fail(`expected 10 bilingual room titles, found ${titleMatches.length}`);
if (new Set(titleMatches.map(match => match[3])).size !== 10) fail('English room titles are not unique');

for (const token of ['fallen-orrery', 'meridian-split', 'lens-graveyard', 'astral-causeway', 'clock-of-ash', 'silent-ephemeris', 'comet-archive', 'parallax-vault', 'last-calculation', 'astronomer-crown']) {
  if (!rooms.includes(`'${token}'`)) fail(`missing silhouette ${token}`);
}
for (const token of ['rotating-star-lane', 'alternating-starfall-bands', 'lens-burn-zones', 'sequential-starfall', 'opposed-rotating-lanes', 'star-node-sequence', 'crossing-comet-traces', 'parallax-bay-pulses', 'calculation-overlap', 'astronomer-phases']) {
  if (!rooms.includes(`'${token}'`)) fail(`missing hazard ${token}`);
}

if (!rooms.includes('room >= 61 && room <= 70') && !rooms.includes('roomNumber >= 61 && roomNumber <= 70')) fail('room range guard does not cover exactly 61-70');
if (!chapterRun.includes('export const CHAPTER_ROOMS = 70;')) fail('chapter run is not extended to room 70');
if (!chapterRun.includes('export const FINAL_BOSS_ROOM = 70;')) fail('final boss room is not room 70');
if (!chapterRun.includes('10, 20, 30, 40, 50, 60, 70')) fail('boss-room registry is missing room 70');
if (!chapterRun.includes('observatoryPortalTile(room')) fail('chapter room generation does not use Observatory portals');

for (let room = 61; room <= 69; room += 1) {
  const match = encounters.match(new RegExp(`^\\s*${room}:\\s*\\[([^\\]]+)\\]`, 'm'));
  if (!match) fail(`room ${room} lacks an explicit encounter`);
  const count = match ? [...match[1].matchAll(/'([^']+)'/g)].length : 0;
  if (count < 6 || count > 8) fail(`room ${room} enemy count ${count} escapes the 6-8 band`);
}
if (!/^\s*70:\s*\[\],?$/m.test(encounters)) fail('room 70 must reserve normal encounters for the boss');

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
if (!mechanics.includes('const EFFECT_PREFIX = \'shattered-observatory-\'')) fail('Observatory effects do not have an isolated cleanup prefix');
if (!mechanics.includes('clearObservatoryHazards(engine, state)')) fail('Observatory hazards do not clean up atomically after combat');
if (!mechanics.includes('boss.maxHp = Math.max(7600')) fail('Astronomer does not have unique boss HP tuning');
if (!mechanics.includes('boss.nextAttackTime = now + 1100')) fail('Astronomer opening recovery window is missing');
if (!mechanics.includes('ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1')) fail('Astronomer three-phase thresholds are missing');
if (!mechanics.includes('spec.telegraphMs + spec.activeMs + spec.recoveryMs')) fail('authored warning, active and recovery timing is not respected');
if (!mechanics.includes('DER ENTFESSELTE ASTRONOM')) fail('unique Astronomer runtime identity is missing');

if (!process.exitCode) console.log('Shattered Observatory chapter contract passed: rooms 61-70, encounters, spawns, presentation, hazards, balance and Astronomer phases are fully wired.');

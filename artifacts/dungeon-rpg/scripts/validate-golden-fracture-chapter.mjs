#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [chapterRun, fractureRooms, encounters, balance, spawns, roomBible, logicalSetpieces, fractureSetpieces] = await Promise.all([
  read('../src/game/chapterRun.ts'),
  read('../src/game/goldenFractureRooms.ts'),
  read('../src/game/encounterPlan.ts'),
  read('../src/game/runBalance.ts'),
  read('../src/game/roomSpawn3D.ts'),
  read('../src/game/roomBible.ts'),
  read('../src/game/logicalRoomSetpieces.ts'),
  read('../src/game/goldenFractureSetpieces.ts'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Golden Fracture audit failed: ${message}`);
}

assert(chapterRun.includes('export const CHAPTER_ROOMS = 60'), 'chapter length is not 60 rooms');
assert(chapterRun.includes('export const FINAL_BOSS_ROOM = 60'), 'room 60 is not the final boss room');
assert(chapterRun.includes('60') && chapterRun.includes('BOSS_ROOMS'), 'room 60 is missing from the boss-room registry');

const specs = [...fractureRooms.matchAll(/^\s*(5[1-9]|60): room\((5[1-9]|60),/gm)];
assert(specs.length === 10, `expected 10 authored room specs, found ${specs.length}`);
assert(new Set(specs.map(match => Number(match[1]))).size === 10, 'room specs contain duplicates');
assert(fractureRooms.includes("'aurel-phases'"), 'Aurel phase hazard contract is missing');
assert(fractureRooms.includes("['chapter-boss']"), 'room 60 chapter-boss role is missing');
assert(fractureRooms.includes('enemySpawns: readonly GoldenFracturePoint[]'), 'authored spawn contract is missing');

for (let room = 51; room <= 59; room++) {
  const match = encounters.match(new RegExp(`^\\s*${room}:\\s*\\[([^\\]]+)\\]`, 'm'));
  assert(match, `room ${room} lacks an explicit encounter`);
  const enemies = [...match[1].matchAll(/'([^']+)'/g)].map(entry => entry[1]);
  assert(enemies.length >= 6 && enemies.length <= 8, `room ${room} enemy count ${enemies.length} escapes the 6-8 band`);
  assert(new Set(enemies).size >= 4, `room ${room} lacks enemy variety`);
}
assert(/^\s*60:\s*\[\],?$/m.test(encounters), 'room 60 must reserve normal encounters for the boss');
assert(encounters.includes('Math.min(CHAPTER_ROOMS, room)'), 'encounter lookup is still clamped below chapter length');

assert(balance.includes('Math.min(CHAPTER_ROOMS, engine.state.floor)'), 'run balance is still clamped below chapter length');
assert(balance.includes('room >= 60 ? 1.3'), 'room 60 boss spawn scale is missing');
assert(balance.includes('if (room >= 60) return { hpFloor: 6200'), 'Aurel boss tuning is missing');
assert(balance.includes('firstAttackDelay: 760'), 'Aurel opening recovery window is missing');

assert(spawns.includes('goldenFractureRoomSpec(room)'), 'runtime spawn resolver does not recognize rooms 51-60');
assert(spawns.includes('golden?.enemySpawns ?? legacy!.enemySpawns'), 'runtime spawn resolver does not consume authored chapter spawns');

assert(roomBible.includes("import { GOLDEN_FRACTURE_ROOMS"), 'room bible does not import Golden Fracture presentation specs');
assert(roomBible.includes("'golden-fracture'"), 'Golden Fracture lighting phase is missing');
assert(roomBible.includes('for (const spec of Object.values(GOLDEN_FRACTURE_ROOMS))'), 'rooms 51-60 are not registered in the room bible');
assert(roomBible.includes('Math.min(60, roomNumber)'), 'room bible presentation remains clamped below room 60');
assert(!roomBible.includes('Math.min(50, roomNumber)'), 'room bible still falls back to room 50 above the old boundary');
assert(roomBible.includes("spec.room === 60 ? 'goldenes Oculus mit vier Phasenankern'"), 'Aurel boss-room presentation identity is missing');

assert(logicalSetpieces.includes("import { goldenFractureSetpieces }"), 'logical room presentation does not import Golden Fracture setpieces');
assert(logicalSetpieces.includes('Math.min(60, room)'), 'logical room presentation remains clamped below room 60');
assert(!logicalSetpieces.includes('Math.min(50, room)'), 'logical room presentation still falls back to room 50');
assert(logicalSetpieces.includes('const golden = goldenFractureSetpieces(safeRoom);'), 'logical room resolver does not select Golden Fracture props');
const authoredSetpieceRooms = [...fractureSetpieces.matchAll(/^\s*(5[1-9]|60):\s*\[/gm)];
assert(authoredSetpieceRooms.length === 10, `expected 10 Golden Fracture setpiece layouts, found ${authoredSetpieceRooms.length}`);
assert(fractureSetpieces.includes('goldenes') || fractureSetpieces.includes('circle_magic'), 'Aurel presentation centerpiece is missing');

console.log(JSON.stringify({
  rooms: 10,
  normalRooms: 9,
  bossRoom: 60,
  encounterBand: [6, 8],
  aurelHpFloor: 6200,
  aurelFirstAttackDelayMs: 760,
  presentationBoundary: 60,
  authoredSetpieceRooms: 10,
}, null, 2));
console.log('Golden Fracture audit passed: rooms 51-60, encounters, spawns, room bible, setpieces, balance and Aurel tuning are wired.');

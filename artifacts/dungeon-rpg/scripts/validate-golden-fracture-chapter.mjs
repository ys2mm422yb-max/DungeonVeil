#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [chapterRun, fractureRooms, encounters, balance, legacyBalance, spawns, roomBible, logicalSetpieces, legacySetpieces, fractureSetpieces] = await Promise.all([
  read('../src/game/chapterRun.ts'),
  read('../src/game/goldenFractureRooms.ts'),
  read('../src/game/encounterPlan.ts'),
  read('../src/game/runBalance.ts'),
  read('../src/game/runBalanceLegacy.ts'),
  read('../src/game/roomSpawn3D.ts'),
  read('../src/game/roomBible.ts'),
  read('../src/game/logicalRoomSetpieces.ts'),
  read('../src/game/logicalRoomSetpiecesLegacy.ts'),
  read('../src/game/goldenFractureSetpieces.ts'),
]);

function assert(condition, message) {
  if (!condition) throw new Error(`Golden Fracture audit failed: ${message}`);
}

assert(/export const CHAPTER_ROOMS = (?:6[0-9]|[7-9][0-9]|[1-9][0-9]{2,})/.test(chapterRun), 'chapter length no longer includes rooms 51-60');
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
const usesChapterLengthClamp = encounters.includes('CHAPTER_ROOMS')
  && encounters.includes('Math.floor(room)')
  && !encounters.includes('Math.min(50,')
  && !encounters.includes('Math.min(60,');
assert(usesChapterLengthClamp, 'encounter lookup is still clamped below chapter length');

assert(balance.includes("from './runBalanceLegacy'"), 'active run balance no longer preserves the Golden Fracture balance implementation');
assert(legacyBalance.includes('Math.min(CHAPTER_ROOMS, engine.state.floor)'), 'run balance is still clamped below chapter length');
assert(legacyBalance.includes('room >= 60 ? 1.3'), 'room 60 boss spawn scale is missing');
assert(legacyBalance.includes('if (room >= 60) return { hpFloor: 6200'), 'Aurel boss tuning is missing');
assert(legacyBalance.includes('firstAttackDelay: 760'), 'Aurel opening recovery window is missing');

assert(spawns.includes('goldenFractureRoomSpec(room)'), 'runtime spawn resolver does not recognize rooms 51-60');
assert(spawns.includes('const authored = cinder ?? reliquary ?? observatory ?? golden ?? legacy!;') && spawns.includes('const authoredSpawns = authored.enemySpawns;'), 'runtime spawn resolver does not consume authored Golden Fracture spawns after later chapter resolvers');

assert(roomBible.includes("import { GOLDEN_FRACTURE_ROOMS"), 'room bible does not import Golden Fracture presentation specs');
assert(roomBible.includes("'golden-fracture'"), 'Golden Fracture lighting phase is missing');
assert(roomBible.includes('for (const spec of Object.values(GOLDEN_FRACTURE_ROOMS))'), 'rooms 51-60 are not registered in the room bible');
assert(/Math\.min\((?:6[0-9]|[7-9][0-9]|[1-9][0-9]{2,}), Math\.floor\(roomNumber\)\)/.test(roomBible) || /Math\.min\((?:6[0-9]|[7-9][0-9]|[1-9][0-9]{2,}), roomNumber\)/.test(roomBible), 'room bible presentation remains clamped below room 60');
assert(!roomBible.includes('Math.min(50, roomNumber)'), 'room bible still falls back to room 50 above the old boundary');
assert(roomBible.includes("spec.room === 60 ? 'goldenes Oculus mit vier Phasenankern'"), 'Aurel boss-room presentation identity is missing');

assert(logicalSetpieces.includes("from './logicalRoomSetpiecesLegacy'"), 'active logical room resolver does not preserve the Golden Fracture implementation');
assert(legacySetpieces.includes("import { goldenFractureSetpieces }"), 'legacy room presentation does not import Golden Fracture setpieces');
assert(/Math\.min\((?:6[0-9]|[7-9][0-9]|[1-9][0-9]{2,}), Math\.floor\(room\)\)/.test(logicalSetpieces), 'active logical room presentation remains clamped below room 60');
assert(!legacySetpieces.includes('Math.min(50, room)'), 'legacy logical room presentation still falls back to room 50');
assert(legacySetpieces.includes('const golden = goldenFractureSetpieces(safeRoom);'), 'logical room resolver does not select Golden Fracture props');
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
  minimumChapterLength: 60,
  authoredSetpieceRooms: 10,
}, null, 2));
console.log('Golden Fracture audit passed: rooms 51-60 remain wired through the legacy-preserving resolver while later chapters extend the run.');

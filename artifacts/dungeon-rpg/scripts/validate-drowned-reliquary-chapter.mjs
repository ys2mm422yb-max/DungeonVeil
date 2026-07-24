import { readFile } from 'node:fs/promises';

const [rooms, mechanics, chapterRun, runBalance, bible] = await Promise.all([
  readFile(new URL('../src/game/drownedReliquaryRooms.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/drownedReliquaryMechanics.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/chapterRun.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/runBalance.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../../docs/ROOMS_71_80_BIBLE.md', import.meta.url), 'utf8'),
]);

const authoredRooms = [...rooms.matchAll(/^\s*(7[1-9]|80): R\(/gm)].map(match => Number(match[1]));
const uniqueRooms = new Set(authoredRooms);
const requiredHazards = [
  'alternating-flood-bands',
  'lateral-chain-sweeps',
  'delayed-tide-circles',
  'inward-tide-ring',
  'crossing-current-traces',
  'paired-bay-floods',
  'expanding-bell-waves',
  'moving-safe-corridor',
  'shrinking-island-overlap',
  'leviathan-phases',
];

const chapterRoomMatch = chapterRun.match(/export const CHAPTER_ROOMS = (\d+);/);
const finalBossMatch = chapterRun.match(/export const FINAL_BOSS_ROOM = (\d+);/);
const chapterRoomLimit = Number(chapterRoomMatch?.[1] ?? 0);
const finalBossRoom = Number(finalBossMatch?.[1] ?? 0);

const checks = [
  [authoredRooms.length === 10 && uniqueRooms.size === 10, 'rooms 71-80 are not exactly ten unique authored room specs'],
  [[...uniqueRooms].every(room => room >= 71 && room <= 80), 'room registry contains values outside 71-80'],
  [requiredHazards.every(hazard => rooms.includes(`'${hazard}'`)), 'one or more Drowned Reliquary hazard contracts are missing'],
  [rooms.includes("80: R(80, 'Der Reliquiar-Leviathan'") && rooms.includes("['chapter-boss']"), 'room 80 is not registered as the Reliquary Leviathan boss'],
  [rooms.includes('room >= 71 && room <= 80'), 'Drowned Reliquary range guard is missing'],
  [chapterRun.includes("import { reliquaryPortalTile } from './drownedReliquaryRooms';") && chapterRun.includes('reliquaryPortalTile(room, width, height)'), 'authored Reliquary portals are not used by the run generator'],
  [chapterRoomLimit >= 80 && finalBossRoom >= 80, 'run progression no longer includes the complete rooms 71-80 chapter'],
  [chapterRun.includes('10, 20, 30, 40, 50, 60, 70, 80'), 'boss registry does not include room 80'],
  [runBalance.includes('updateDrownedReliquaryMechanics(engine);'), 'Drowned Reliquary runtime mechanics are not connected to the balance loop'],
  [mechanics.includes("const EFFECT_PREFIX = 'drowned-reliquary-';"), 'chapter hazard effects do not have an isolated cleanup prefix'],
  [mechanics.includes('clearReliquaryHazards(engine, state);'), 'chapter hazards are not deterministically cleared after combat'],
  [mechanics.includes('engine.state.floor !== 80') && mechanics.includes('state.phase = nextPhase'), 'Leviathan phase handling is missing'],
  [mechanics.includes('now + spec.telegraphMs') && mechanics.includes('now > player.invincibleUntil'), 'hazards do not preserve warning and invulnerability contracts'],
  [bible.includes('Room 71 explicitly validates transition from room 70.') && bible.includes('Room 80 rewards exactly once'), 'chapter bible does not preserve transition and single-reward contracts'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Drowned Reliquary chapter audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log(`Drowned Reliquary chapter audit passed: rooms 71-80 remain intact inside the ${chapterRoomLimit}-room run, with tide hazards, room-80 boss ownership and cleanup registered.`);

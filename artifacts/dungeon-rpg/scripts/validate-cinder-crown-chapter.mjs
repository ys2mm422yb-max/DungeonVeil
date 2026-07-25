import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const rooms = read('src/game/cinderCrownRooms.ts');
const mechanics = read('src/game/cinderCrownMechanics.ts');
const setpieces = read('src/game/cinderCrownSetpieces.ts');
const chapterRun = read('src/game/chapterRun.ts');
const logicalSetpieces = read('src/game/logicalRoomSetpieces.ts');
const roomBible = read('src/game/roomBible.ts');
const roomIdentity = read('src/game/roomIdentity.ts');
const bible = read('../../docs/ROOMS_81_90_BIBLE.md');

for (let room = 81; room <= 90; room += 1) {
  expect(new RegExp(`\\b${room}: R\\(${room},`).test(rooms), `Room ${room} is missing from Cinder Crown authored specs.`);
  expect(new RegExp(`\\b${room}: \\[`).test(setpieces), `Room ${room} is missing authored Cinder Crown setpieces.`);
  expect(bible.includes(`| ${room} |`), `Room ${room} is missing from ROOMS_81_90_BIBLE.md.`);
}

expect(rooms.includes("90: R(90, 'Der Aschenkönig', 'The Ashen King'"), 'Room 90 must be The Ashen King.');
expect(rooms.includes("'ashen-king-phases'"), 'The Ashen King phase hazard is missing.');
expect(mechanics.includes('updateCinderCrownMechanics'), 'Cinder Crown runtime update is missing.');
expect(mechanics.includes("engine.state.floor !== 90"), 'Room 90 boss tuning guard is missing.');
expect(mechanics.includes("value: 'DER ASCHENKÖNIG'"), 'Ashen King awakening presentation is missing.');
expect(mechanics.includes("effect.id.startsWith(EFFECT_PREFIX)"), 'Cinder hazards must be cleaned after combat.');
expect(/Math\.min\((?:90|100)/.test(logicalSetpieces), 'Logical room setpieces must resolve through at least room 90.');
expect(logicalSetpieces.includes('cinderCrownSetpieces'), 'Cinder Crown setpieces are not routed.');
const chapterRoomMatch = chapterRun.match(/export const CHAPTER_ROOMS = (\d+);/);
const finalBossMatch = chapterRun.match(/export const FINAL_BOSS_ROOM = (\d+);/);
const chapterRooms = Number(chapterRoomMatch?.[1] ?? 0);
const finalBossRoom = Number(finalBossMatch?.[1] ?? 0);
expect(chapterRooms >= 90, 'Run length must extend through at least room 90.');
expect(finalBossRoom >= 90, 'Final boss registry must not regress below room 90.');
expect(chapterRun.includes('90') && chapterRun.includes('] as const'), 'Boss room registry must include room 90.');
expect(chapterRun.includes('cinderCrownPortalTile'), 'Room generation must use Cinder Crown portals.');
expect(roomBible.includes("import { CINDER_CROWN_ROOMS"), 'Central room bible does not import Cinder Crown specs.');
expect(roomBible.includes("'cinder-crown'"), 'Central room bible does not register the Cinder Crown phase.');
expect(roomBible.includes('for (const spec of Object.values(CINDER_CROWN_ROOMS))'), 'Central room bible does not register rooms 81-90.');
expect(/Math\.min\((?:90|100)/.test(roomBible), 'Central room bible still clamps below room 90.');
expect(roomIdentity.includes('CINDER_CROWN_ROOMS'), 'Room identity registry does not include Cinder Crown rooms.');

const telegraphs = [...rooms.matchAll(/R\(\d+,[\s\S]*?,\s*(\d+),\s*(\d+),\s*(\d+)\)/g)].map(match => ({ telegraph: Number(match[1]), active: Number(match[2]), recovery: Number(match[3]) }));
expect(telegraphs.length === 10, `Expected 10 Cinder Crown timing contracts, found ${telegraphs.length}.`);
for (const timing of telegraphs) {
  expect(timing.telegraph >= 1100, `Cinder Crown telegraph ${timing.telegraph}ms is below the mobile readability floor.`);
  expect(timing.recovery >= 900, `Cinder Crown recovery ${timing.recovery}ms is below the fairness floor.`);
}

console.log('Cinder Crown chapter contract passed: authored rooms 81-90, central room bible, identities, boss, hazards, setpieces and run routing remain registered without blocking later chapters.');
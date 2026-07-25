import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const expect = (condition, message) => { if (!condition) throw new Error(message); };

const rooms = read('src/game/veilNexusRooms.ts');
const mechanics = read('src/game/veilNexusMechanics.ts');
const setpieces = read('src/game/veilNexusSetpieces.ts');
const chapterRun = read('src/game/chapterRun.ts');
const logicalSetpieces = read('src/game/logicalRoomSetpieces.ts');
const roomBible = read('src/game/roomBible.ts');
const roomIdentity = read('src/game/roomIdentity.ts');
const rewardContract = read('src/game/chapterRewardContract.ts');
const bible = read('../../docs/ROOMS_91_100_BIBLE.md');

for (let room = 91; room <= 100; room += 1) {
  expect(new RegExp(`\\b${room}: R\\(${room},`).test(rooms), `Room ${room} is missing from Veil Nexus authored specs.`);
  expect(new RegExp(`\\b${room}: \\[`).test(setpieces), `Room ${room} is missing authored Veil Nexus setpieces.`);
  expect(bible.includes(`| ${room} |`), `Room ${room} is missing from ROOMS_91_100_BIBLE.md.`);
}

expect(rooms.includes("100: R(100, 'Der Schleierkern', 'The Veil Core'"), 'Room 100 must be The Veil Core.');
expect(rooms.includes("'veil-core-phases'"), 'The Veil Core phase hazard is missing.');
expect(mechanics.includes('updateVeilNexusMechanics'), 'Veil Nexus runtime update is missing.');
expect(mechanics.includes('engine.state.floor !== 100'), 'Room 100 boss tuning guard is missing.');
expect(mechanics.includes("value: 'DER SCHLEIERKERN'"), 'Veil Core awakening presentation is missing.');
expect(mechanics.includes('effect.id.startsWith(EFFECT_PREFIX)'), 'Veil Nexus hazards must be cleaned after combat.');
expect(mechanics.includes('ratio <= 0.22 ? 4'), 'The Veil Core must own a dedicated four-phase contract.');
expect(logicalSetpieces.includes('Math.min(100'), 'Logical room setpieces must resolve through room 100.');
expect(logicalSetpieces.includes('veilNexusSetpieces'), 'Veil Nexus setpieces are not routed.');
expect(chapterRun.includes('export const CHAPTER_ROOMS = 100;'), 'Run length must extend through room 100.');
expect(chapterRun.includes('export const FINAL_BOSS_ROOM = 100;'), 'Final boss registry must point to room 100 for Block 7.');
expect(chapterRun.includes('100] as const'), 'Boss room registry must include room 100.');
expect(chapterRun.includes('veilNexusPortalTile'), 'Room generation must use Veil Nexus portals.');
expect(roomBible.includes("import { VEIL_NEXUS_ROOMS"), 'Central room bible does not import Veil Nexus specs.');
expect(roomBible.includes("'veil-nexus'"), 'Central room bible does not register the Veil Nexus phase.');
expect(roomBible.includes('for (const spec of Object.values(VEIL_NEXUS_ROOMS))'), 'Central room bible does not register rooms 91-100.');
expect(roomBible.includes('Math.min(100'), 'Central room bible still clamps below room 100.');
expect(roomIdentity.includes('VEIL_NEXUS_ROOMS'), 'Room identity registry does not include Veil Nexus rooms.');
expect(rewardContract.includes('safeFloor === FINAL_BOSS_ROOM'), 'Final reward ownership must derive from FINAL_BOSS_ROOM.');

const telegraphs = [...rooms.matchAll(/R\(\d+,[\s\S]*?,\s*(\d+),\s*(\d+),\s*(\d+)\)/g)].map(match => ({ telegraph: Number(match[1]), active: Number(match[2]), recovery: Number(match[3]) }));
expect(telegraphs.length === 10, `Expected 10 Veil Nexus timing contracts, found ${telegraphs.length}.`);
for (const timing of telegraphs) {
  expect(timing.telegraph >= 1400, `Veil Nexus telegraph ${timing.telegraph}ms is below the mobile readability floor.`);
  expect(timing.recovery >= 1100, `Veil Nexus recovery ${timing.recovery}ms is below the fairness floor.`);
}

console.log('Veil Nexus chapter contract passed: authored rooms 91-100, central room bible, identities, final boss, hazards, setpieces, rewards and run routing are registered.');

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

for (let room = 61; room <= 70; room += 1) {
  if (!new RegExp(`\\b${room}:\\s*room\\(${room},`).test(rooms)) fail(`room ${room} is missing from SHATTERED_OBSERVATORY_ROOMS`);
  if (!new RegExp(`\\b${room}:\\s*\\[`).test(setpieces)) fail(`room ${room} has no authored setpiece layout`);
}

const titleMatches = [...rooms.matchAll(/\b(6[1-9]|70):\s*room\([^,]+,\s*'([^']+)',\s*'([^']+)'/g)];
if (titleMatches.length !== 10) fail(`expected 10 bilingual room titles, found ${titleMatches.length}`);
const uniqueEnglishTitles = new Set(titleMatches.map(match => match[3]));
if (uniqueEnglishTitles.size !== 10) fail('English room titles are not unique');

for (const token of ['fallen-orrery', 'meridian-split', 'lens-graveyard', 'astral-causeway', 'clock-of-ash', 'silent-ephemeris', 'comet-archive', 'parallax-vault', 'last-calculation', 'astronomer-crown']) {
  if (!rooms.includes(`'${token}'`)) fail(`missing silhouette ${token}`);
}
for (const token of ['rotating-star-lane', 'alternating-starfall', 'lens-burn', 'sequential-starfall', 'opposed-star-lanes', 'star-node-sequence', 'crossing-comets', 'parallax-pulse', 'calculation-overlap', 'astronomer-phases']) {
  if (!rooms.includes(`'${token}'`)) fail(`missing hazard ${token}`);
}

if (!rooms.includes("roomNumber >= 61 && roomNumber <= 70")) fail('room range guard does not cover exactly 61-70');
if (!chapterRun.includes('export const CHAPTER_ROOMS = 70;')) fail('chapter run is not extended to room 70');
if (!chapterRun.includes('export const FINAL_BOSS_ROOM = 70;')) fail('final boss room is not room 70');
if (!chapterRun.includes('10, 20, 30, 40, 50, 60, 70')) fail('boss-room registry is missing room 70');

if (!process.exitCode) console.log('Shattered Observatory chapter contract passed.');

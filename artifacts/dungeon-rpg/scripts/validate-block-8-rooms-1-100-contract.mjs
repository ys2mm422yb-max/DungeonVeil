import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = relativePath => readFile(resolve(root, relativePath), 'utf8');

const required = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [roomBible, veilNexus, evidence, runEngine, encounterPlan, chapterRun, runBalance, saveManager, progression, plan] = await Promise.all([
  read('src/game/roomBible.ts'),
  read('src/game/veilNexusRooms.ts'),
  read('tests/kaykit-chapter-evidence.spec.mjs'),
  read('src/game/runEngine.ts'),
  read('src/game/encounterPlan.ts'),
  read('src/game/chapterRun.ts'),
  read('src/game/runBalanceLegacy.ts'),
  read('src/game/saveManager.ts'),
  read('src/game/chapterProgression.ts'),
  read('../../docs/BLOCK_8_BALANCE_EVIDENCE_PLAN.md'),
]);

required(/export\s+const\s+CHAPTER_ROOMS\s*=\s*100\s*;/.test(chapterRun), 'Every chapter must contain exactly 100 rooms.');
required(/export\s+const\s+FINAL_BOSS_ROOM\s*=\s*100\s*;/.test(chapterRun), 'Room 100 must remain the chapter final boss.');
required(/Math\.min\(100,\s*Math\.floor\(roomNumber\)\)/.test(roomBible), 'Room Bible must resolve through room 100.');
required(/(?:room|roomNumber)\s*>=\s*91\s*&&\s*(?:room|roomNumber)\s*<=\s*100/.test(veilNexus), 'Veil Nexus room guard must cover rooms 91-100.');

for (let room = 91; room <= 100; room += 1) {
  required(new RegExp(`\\b${room}:\\s*R\\(${room},`).test(veilNexus), `Room ${room} is missing from the Veil Nexus room registry.`);
}

required(/const\s+CHAPTER_ROOMS\s*=\s*100\s*;/.test(evidence), 'Portrait evidence must display a 100-room chapter contract.');
for (const room of [50, 51, 60, 61, 70, 71, 80, 81, 90, 91, 99, 100]) {
  required(new RegExp(`(?:^|[\\s,\\[])${room}(?:[\\s,\\]])`).test(evidence), `Portrait evidence is missing critical room ${room}.`);
}

required(!/Math\.min\(50,\s*(?:room|roomNumber|floor)\b/.test(roomBible), 'Room Bible still contains a room-50 clamp.');
required(!/MAX_(?:ROOM|FLOOR)\s*=\s*(?:50|90)\b/.test(runEngine), 'Run engine still exposes a pre-room-100 maximum.');
required(!/MAX_(?:ROOM|FLOOR)\s*=\s*(?:50|90)\b/.test(encounterPlan), 'Encounter planning still exposes a pre-room-100 maximum.');

required(/chapterBalanceProfile\s*\(chapter/.test(runBalance), 'Runtime balance must derive a chapter profile.');
required(/Math\.max\(1,\s*Math\.(?:floor|round)\(chapter\)\)/.test(runBalance), 'Chapter balance must normalize the chapter independently from room.');
required(/earlyElitePressure/.test(runBalance), 'Chapter scaling must include mechanical elite pressure, not only HP.');
required(/shouldBeElite\([^)]*chapter/.test(runBalance), 'Elite composition must react to chapter progression.');
required(/attackCapForRoom\([^)]*chapter/.test(runBalance), 'Attack pressure must be bounded through a chapter-aware cap.');

required(/chapter\s*:\s*number/.test(runEngine), 'Runtime state must store chapter separately from floor.');
required(/chapter\??\s*:\s*number/.test(saveManager), 'Save data must store chapter separately from room/floor.');
required(/claimedChapterRewards\??\s*:\s*number\[\]/.test(saveManager), 'Save data must persist claimed chapter rewards.');
required(/SAVE_VERSION\s*=\s*5/.test(saveManager), 'Chapter reward persistence must use save version 5 or newer.');
required(/normalizeChapter\(compactData\.chapter/.test(saveManager), 'Saved chapters must be normalized to the supported 1-100 range.');
required(/normalizeRoom\(compactData\.floor\)/.test(saveManager), 'Saved rooms must be normalized to the supported 1-100 range.');
required(/normalizeClaimedChapterRewards\(compactData\.claimedChapterRewards\)/.test(saveManager), 'Saved chapter reward claims must be normalized.');
required(/claimedChapterRewards:\s*normalizeClaimedChapterRewards\(parsed\.claimedChapterRewards\)/.test(saveManager), 'Loaded chapter reward claims must be normalized.');

required(/export\s+const\s+MAX_CHAPTER\s*=\s*100\s*;/.test(progression), 'Progression must define chapter 100 as the terminal boundary.');
required(/export\s+const\s+ROOMS_PER_CHAPTER\s*=\s*100\s*;/.test(progression), 'Progression must define 100 rooms per chapter.');
required(/safeChapter\s*>=\s*MAX_CHAPTER/.test(progression), 'Chapter 100 room 100 must enter a terminal state.');
required(/chapter:\s*safeChapter\s*\+\s*1,\s*room:\s*1/.test(progression), 'Room 100 must advance to room 1 of the next chapter.');
required(/claimChapterReward/.test(progression), 'Progression must expose an idempotent chapter reward claim.');
required(/current\.includes\(safeChapter\)/.test(progression), 'Duplicate chapter reward claims must be rejected.');
required(/normalizeClaimedChapterRewards/.test(progression), 'Persisted chapter reward claims must be normalized.');

required(/this\.state\.floor\s*=\s*completedChapter\s*\?\s*1/.test(runEngine), 'Runtime chapter advancement must reset the room position to 1.');
required(/this\.state\.chapter\+\+/.test(runEngine), 'Runtime must advance the chapter after room 100.');
required(/chapter-complete/.test(runEngine), 'Runtime must persist chapter completion separately from normal room completion.');

for (const chapter of [1, 2, 5, 10, 25, 50, 75, 100]) {
  required(new RegExp(`(?:^|[\\s,])${chapter}(?:[\\s,])`).test(plan), `Block 8 plan is missing representative chapter ${chapter}.`);
}
required(/100 Kapitel/.test(plan), 'Block 8 plan must explicitly cover 100 chapters.');
required(/Kapitel 100.*endgültigen Abschlusszustand|endgültige[rn]? Abschluss.*Kapitel 100/s.test(plan), 'Block 8 plan must require a distinct final state after chapter 100.');
required(/Kapitel 1 Raum 100.*Kapitel 2 Raum 1/.test(plan), 'Block 8 plan must cover the chapter 1 to chapter 2 transition.');

console.log('Block 8 combined 100-room and 100-chapter contract validated.');
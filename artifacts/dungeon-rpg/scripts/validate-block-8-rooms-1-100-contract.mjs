import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = relativePath => readFile(resolve(root, relativePath), 'utf8');

const required = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [roomBible, veilNexus, evidence, runEngine, encounterPlan, chapterRun, runBalance, saveManager, plan] = await Promise.all([
  read('src/game/roomBible.ts'),
  read('src/game/veilNexusRooms.ts'),
  read('tests/kaykit-chapter-evidence.spec.mjs'),
  read('src/game/runEngine.ts'),
  read('src/game/encounterPlan.ts'),
  read('src/game/chapterRun.ts'),
  read('src/game/runBalanceLegacy.ts'),
  read('src/game/saveManager.ts'),
  read('../../docs/BLOCK_8_BALANCE_EVIDENCE_PLAN.md'),
]);

required(/export\s+const\s+CHAPTER_ROOMS\s*=\s*100\s*;/.test(chapterRun), 'Every chapter must contain exactly 100 rooms.');
required(/export\s+const\s+FINAL_BOSS_ROOM\s*=\s*100\s*;/.test(chapterRun), 'Room 100 must remain the chapter final boss.');
required(/Math\.min\(100,\s*Math\.floor\(roomNumber\)\)/.test(roomBible), 'Room Bible must resolve through room 100.');
required(/roomNumber\s*>=\s*91\s*&&\s*roomNumber\s*<=\s*100/.test(veilNexus), 'Veil Nexus room guard must cover rooms 91-100.');

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
required(/chapter\s*:\s*number/.test(saveManager), 'Save data must store chapter separately from room/floor.');
required(/rewardLedger|claimed|claim|completion/i.test(saveManager + runEngine), 'Persistence must track claimed completion rewards.');

required(/room\s*===\s*100|roomNumber\s*===\s*100|floor\s*===\s*100|FINAL_BOSS_ROOM/.test(runEngine), 'Run engine must contain an explicit room-100 completion path.');
required(/chapter\s*\+\s*1|nextChapter|advanceChapter|chapterCompleted/i.test(runEngine), 'Room 100 must advance to the next chapter.');
required(/floor\s*[:=]\s*1|room\s*[:=]\s*1|nextFloor\s*=\s*1/.test(runEngine), 'Chapter advancement must reset the room position to 1.');
required(/exactly|once|ledger|claim|completion/i.test(runEngine), 'Run engine must preserve an idempotent completion/reward contract.');
required(/chapter\s*(?:===|>=)\s*100|MAX_CHAPTER\s*=\s*100|FINAL_CHAPTER\s*=\s*100/.test(runEngine + saveManager), 'The product must define a distinct chapter-100 terminal boundary.');

for (const chapter of [1, 2, 5, 10, 25, 50, 75, 100]) {
  required(new RegExp(`(?:^|[\\s,])${chapter}(?:[\\s,])`).test(plan), `Block 8 plan is missing representative chapter ${chapter}.`);
}
required(/100 Kapitel/.test(plan), 'Block 8 plan must explicitly cover 100 chapters.');
required(/Kapitel 100.*endgültigen Abschlusszustand|endgültige[rn]? Abschluss.*Kapitel 100/s.test(plan), 'Block 8 plan must require a distinct final state after chapter 100.');
required(/Kapitel 1 Raum 100.*Kapitel 2 Raum 1/.test(plan), 'Block 8 plan must cover the chapter 1 to chapter 2 transition.');

console.log('Block 8 combined 100-room and 100-chapter contract validated.');

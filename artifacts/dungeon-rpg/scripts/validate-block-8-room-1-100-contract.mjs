import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = relativePath => readFile(resolve(root, relativePath), 'utf8');

const required = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [roomBible, veilNexus, evidence, runEngine, encounterPlan] = await Promise.all([
  read('src/game/roomBible.ts'),
  read('src/game/veilNexusRooms.ts'),
  read('tests/product-autopilot-chapter-evidence.spec.mjs'),
  read('src/game/runEngine.ts'),
  read('src/game/encounterPlan.ts'),
]);

required(/Math\.min\(100,\s*Math\.floor\(roomNumber\)\)/.test(roomBible), 'Room Bible must resolve through room 100.');
required(/roomNumber\s*>=\s*91\s*&&\s*roomNumber\s*<=\s*100/.test(veilNexus), 'Veil Nexus room guard must cover rooms 91-100.');

for (let room = 91; room <= 100; room += 1) {
  required(new RegExp(`\\b${room}:\\s*R\\(${room},`).test(veilNexus), `Room ${room} is missing from the Veil Nexus room registry.`);
}

required(/const\s+CHAPTER_ROOMS\s*=\s*100\s*;/.test(evidence), 'Portrait evidence must display a 100-room run contract.');
for (const room of [50, 51, 60, 61, 70, 71, 80, 81, 90, 91, 99, 100]) {
  required(new RegExp(`(?:^|[\\s,\\[])${room}(?:[\\s,\\]])`).test(evidence), `Portrait evidence is missing critical room ${room}.`);
}

required(!/Math\.min\(50,\s*(?:room|roomNumber|floor)\b/.test(roomBible), 'Room Bible still contains a room-50 clamp.');
required(!/MAX_(?:ROOM|FLOOR)\s*=\s*(?:50|90)\b/.test(runEngine), 'Run engine still exposes a pre-room-100 maximum.');
required(!/MAX_(?:ROOM|FLOOR)\s*=\s*(?:50|90)\b/.test(encounterPlan), 'Encounter planning still exposes a pre-room-100 maximum.');

required(/room\s*===\s*100|roomNumber\s*===\s*100|floor\s*===\s*100/.test(runEngine), 'Run engine must contain an explicit room-100 completion path.');
required(/exactly|once|ledger|claim|completion/i.test(runEngine), 'Run engine must preserve an idempotent completion/reward contract.');

console.log('Block 8 rooms 1-100 contract validated.');

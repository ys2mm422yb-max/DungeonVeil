import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../src');
const read = relative => fs.readFileSync(path.join(sourceRoot, relative), 'utf8');
const balance = read('game/runBalance.ts');
const feedback = read('components/CombatFeedbackOverlay.tsx');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(balance.includes('Math.min(50, engine.state.floor)'), 'Late-room balance must use the full 50-room chapter.');
assert(!balance.includes('Math.min(20, engine.state.floor)'), 'Room 21-50 must not be collapsed into room 20.');
assert(balance.includes('1 + Math.max(0, room - 1) * 0.022'), 'Central HP pressure must rise across all fifty rooms.');
assert(balance.includes('1 + Math.max(0, room - 1) * 0.0105'), 'Central attack pressure must rise across all fifty rooms.');
assert(balance.includes("if (room >= 35) return index === 0 || index === 3 || (chapter >= 6 && index === 2);"), 'Room 35+ must add deliberate late elite pressure.');
assert(balance.includes('hpFloor: 2200') && balance.includes('hpFloor: 3200') && balance.includes('hpFloor: 4500'), 'Rooms 30, 40 and 50 need distinct final boss HP floors.');
assert(balance.includes('attackCap: 48') && balance.includes('attackCap: 60') && balance.includes('attackCap: 72'), 'Rooms 30, 40 and 50 need distinct final boss attack caps.');

const hpFactor = room => 1 + Math.max(0, room - 1) * 0.022;
for (let room = 2; room <= 50; room++) {
  assert(hpFactor(room) > hpFactor(room - 1), `HP factor must rise from room ${room - 1} to ${room}.`);
}

const attackFactor = room => 1 + Math.max(0, room - 1) * 0.0105;
for (let room = 2; room <= 50; room++) {
  assert(attackFactor(room) > attackFactor(room - 1), `Attack factor must rise from room ${room - 1} to ${room}.`);
}
assert(attackFactor(35) > attackFactor(25), 'Room 35 must be more dangerous than room 25.');
assert(attackFactor(50) > attackFactor(40), 'The final boss tier must exceed room 40 pressure.');

assert(feedback.includes('const EARLY_ATTACK_WARNING_MS = 520;'), 'Mobile attack warnings need an early warning window.');
assert(feedback.includes('enemy.nextAttackTime - now'), 'Attack warnings must use the existing next-attack timestamp before windup.');
assert(feedback.includes("effect.id.startsWith('telegraph-')") && feedback.includes("effect.id.startsWith('rune-warning-')"), 'Enemy and rune danger zones must both reach the overlay.');
assert(feedback.includes('data-testid="combat-danger-warning"'), 'Danger zones need a browser-test hook.');
assert(feedback.includes('1.36 - marker.progress * 1.02'), 'The inner warning ring must visibly converge as impact approaches.');
assert(feedback.includes('IS_MOBILE && gameState.floor >= 13'), 'Mobile enemy-presence protection must start at room 13.');
assert(feedback.includes('dv-ground-warning-outer') && feedback.includes('dv-ground-warning-converge'), 'Danger zones need distinct fixed and converging rings.');

console.log('Combat telegraph and centralized room 21-50 balance audit passed.');

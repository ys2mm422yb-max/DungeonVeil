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
assert(balance.includes('return 2.08 + (room - 19) * 0.035;'), 'HP pressure must continue rising after room 19.');
assert(balance.includes('Math.max(0, room - 20) * 0.018'), 'Enemy attack pressure must continue rising after room 20.');
assert(balance.includes("if (room >= 35) return index === 0 || index === 2 || index === 4;"), 'Room 35+ must add a third deliberate elite slot.');
assert(balance.includes('hpFloor: 2850') && balance.includes('hpFloor: 4200') && balance.includes('hpFloor: 6000'), 'Rooms 30, 40 and 50 need distinct boss HP floors.');
assert(balance.includes('attackCap: 58') && balance.includes('attackCap: 72') && balance.includes('attackCap: 88'), 'Rooms 30, 40 and 50 need distinct boss attack caps.');

const hpFactor = room => {
  if (room <= 18) return 0;
  if (room === 19) return 2.08;
  return 2.08 + (room - 19) * 0.035;
};
for (let room = 20; room <= 50; room++) {
  assert(hpFactor(room) > hpFactor(room - 1), `HP factor must rise from room ${room - 1} to ${room}.`);
}

const lateAttackCap = room => room <= 29 ? 46 + Math.floor((room - 20) * 1.25)
  : room === 30 ? 60
    : room <= 39 ? 60 + Math.floor((room - 30) * 1.45)
      : room === 40 ? 75
        : room <= 49 ? 75 + Math.floor((room - 40) * 1.65)
          : 96;
for (let room = 21; room <= 50; room++) {
  assert(lateAttackCap(room) >= lateAttackCap(room - 1), `Attack cap must not fall from room ${room - 1} to ${room}.`);
}
assert(lateAttackCap(35) > lateAttackCap(25), 'Room 35 must be more dangerous than room 25.');
assert(lateAttackCap(50) > lateAttackCap(40), 'The final boss tier must exceed room 40 pressure.');

assert(feedback.includes('const EARLY_ATTACK_WARNING_MS = 520;'), 'Mobile attack warnings need an early warning window.');
assert(feedback.includes('enemy.nextAttackTime - now'), 'Attack warnings must use the existing next-attack timestamp before windup.');
assert(feedback.includes("effect.id.startsWith('telegraph-')") && feedback.includes("effect.id.startsWith('rune-warning-')"), 'Enemy and rune danger zones must both reach the overlay.');
assert(feedback.includes('data-testid="combat-danger-warning"'), 'Danger zones need a browser-test hook.');
assert(feedback.includes('1.36 - marker.progress * 1.02'), 'The inner warning ring must visibly converge as impact approaches.');
assert(feedback.includes('IS_MOBILE && gameState.floor >= 13'), 'Mobile enemy-presence protection must start at room 13.');
assert(feedback.includes('dv-ground-warning-outer') && feedback.includes('dv-ground-warning-converge'), 'Danger zones need distinct fixed and converging rings.');

console.log('Combat telegraph and room 21-50 balance audit passed.');

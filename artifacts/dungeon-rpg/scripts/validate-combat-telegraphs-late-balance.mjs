import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../src');
const read = relative => fs.readFileSync(path.join(sourceRoot, relative), 'utf8');
const balance = read('game/runBalance.ts');
const feedback = read('components/CombatFeedbackOverlay.tsx');
const finale = read('game/firstWardenFinale.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(balance.includes('Math.min(50, engine.state.floor)'), 'Late-room balance must use the full 50-room chapter.');
assert(!balance.includes('Math.min(20, engine.state.floor)'), 'Room 21-50 must not be collapsed into room 20.');
assert(balance.includes('return 2.4 + (value - 41) * 0.04;'), 'HP pressure must continue rising through rooms 41-49.');
assert(balance.includes('Math.max(0, value - 1) * 0.012'), 'Enemy attack pressure must continue rising through room 50.');
assert(balance.includes("if (room >= 40) return index === 0 || index === 2 || index === 4;"), 'Room 40+ must use the deliberate three-elite ceiling.');
assert(balance.includes('hp: 2600, attack: 34') && balance.includes('hp: 4200, attack: 42') && balance.includes('hp: 6500, attack: 50'), 'Rooms 30, 40 and 50 need distinct boss tiers.');
assert(balance.includes('const eliteHp = enemy.isElite ? 1.3 : 1') && balance.includes('const eliteAttack = enemy.isElite ? 1.1 : 1'), 'Elite pressure exceeds the moderated 30/10 contract.');
assert(finale.includes('engine.state.floor !== 50') && !finale.includes('engine.state.floor !== 20'), 'The chapter finale must belong to room 50.');

const hpFactor = room => {
  if (room <= 29) return 0;
  if (room === 30 || room === 40 || room === 50) return 0;
  if (room <= 39) return 2.25 + (room - 31) * 0.045;
  return 2.4 + (room - 41) * 0.04;
};
for (let room = 32; room <= 39; room++) {
  assert(hpFactor(room) > hpFactor(room - 1), `HP factor must rise from room ${room - 1} to ${room}.`);
}
for (let room = 42; room <= 49; room++) {
  assert(hpFactor(room) > hpFactor(room - 1), `HP factor must rise from room ${room - 1} to ${room}.`);
}

const lateAttackScale = room => 1 + Math.max(0, room - 1) * 0.012;
for (let room = 21; room <= 50; room++) {
  assert(lateAttackScale(room) > lateAttackScale(room - 1), `Attack scale must rise from room ${room - 1} to ${room}.`);
}
assert(lateAttackScale(35) > lateAttackScale(25), 'Room 35 must be more dangerous than room 25.');
assert(lateAttackScale(50) > lateAttackScale(40), 'The final boss tier must exceed room 40 pressure.');

assert(feedback.includes('const EARLY_ATTACK_WARNING_MS = 520;'), 'Mobile attack warnings need an early warning window.');
assert(feedback.includes('enemy.nextAttackTime - now'), 'Attack warnings must use the existing next-attack timestamp before windup.');
assert(feedback.includes("effect.id.startsWith('telegraph-')") && feedback.includes("effect.id.startsWith('rune-warning-')"), 'Enemy and rune danger zones must both reach the overlay.');
assert(feedback.includes('data-testid="combat-danger-warning"'), 'Danger zones need a browser-test hook.');
assert(feedback.includes('1.36 - marker.progress * 1.02'), 'The inner warning ring must visibly converge as impact approaches.');
assert(feedback.includes('IS_MOBILE && gameState.floor >= 13'), 'Mobile enemy-presence protection must start at room 13.');
assert(feedback.includes('dv-ground-warning-outer') && feedback.includes('dv-ground-warning-converge'), 'Danger zones need distinct fixed and converging rings.');

console.log('Combat telegraph and central room 1-50 balance audit passed.');

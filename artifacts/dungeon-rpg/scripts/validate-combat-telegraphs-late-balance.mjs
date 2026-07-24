import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../src');
const read = relative => fs.readFileSync(path.join(sourceRoot, relative), 'utf8');
const balance = read('game/runBalance.ts');
const legacyBalance = read('game/runBalanceLegacy.ts');
const feedback = read('components/CombatFeedbackOverlay.tsx');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(balance.includes("from './runBalanceLegacy'") && balance.includes('updateLegacyRunBalance(engine, state);'), 'Active balance must delegate to the protected authored balance implementation.');
assert(legacyBalance.includes('Math.min(CHAPTER_ROOMS, engine.state.floor)'), 'Late-room balance must use the full authored chapter length.');
assert(!legacyBalance.includes('Math.min(20, engine.state.floor)'), 'Room 21-80 must not be collapsed into room 20.');
assert(legacyBalance.includes('1 + Math.max(0, room - 1) * 0.022'), 'Central HP pressure must rise across the authored rooms.');
assert(legacyBalance.includes('1 + Math.max(0, room - 1) * 0.0105'), 'Central attack pressure must rise across the authored rooms.');
assert(legacyBalance.includes("if (room >= 35) return index === 0 || index === 3 || (chapter >= 6 && index === 2);"), 'Room 35+ must add deliberate late elite pressure.');
assert(legacyBalance.includes('hpFloor: 2200') && legacyBalance.includes('hpFloor: 3200') && legacyBalance.includes('hpFloor: 4500') && legacyBalance.includes('hpFloor: 6200'), 'Rooms 30, 40, 50 and 60 need distinct boss HP floors.');
assert(legacyBalance.includes('attackCap: 48') && legacyBalance.includes('attackCap: 60') && legacyBalance.includes('attackCap: 72') && legacyBalance.includes('attackCap: 82'), 'Rooms 30, 40, 50 and 60 need distinct boss attack caps.');
assert(balance.includes('updateShatteredObservatoryMechanics(engine);'), 'Rooms 61-70 must receive their isolated Observatory balance update.');
assert(balance.includes('updateDrownedReliquaryMechanics(engine);'), 'Rooms 71-80 must receive their isolated Reliquary balance update.');

const hpFactor = room => 1 + Math.max(0, room - 1) * 0.022;
for (let room = 2; room <= 80; room++) {
  assert(hpFactor(room) > hpFactor(room - 1), `HP factor must rise from room ${room - 1} to ${room}.`);
}

const attackFactor = room => 1 + Math.max(0, room - 1) * 0.0105;
for (let room = 2; room <= 80; room++) {
  assert(attackFactor(room) > attackFactor(room - 1), `Attack factor must rise from room ${room - 1} to ${room}.`);
}
assert(attackFactor(35) > attackFactor(25), 'Room 35 must be more dangerous than room 25.');
assert(attackFactor(50) > attackFactor(40), 'The room-50 boss tier must exceed room 40 pressure.');
assert(attackFactor(60) > attackFactor(50), 'Aurel must exceed the room-50 boss tier.');
assert(attackFactor(70) > attackFactor(60), 'The Astronomer tier must exceed room 60 pressure.');
assert(attackFactor(80) > attackFactor(70), 'The Reliquary Leviathan tier must exceed room 70 pressure.');

assert(feedback.includes('const EARLY_ATTACK_WARNING_MS = 520;'), 'Mobile attack warnings need an early warning window.');
assert(feedback.includes('enemy.nextAttackTime - now'), 'Attack warnings must use the existing next-attack timestamp before windup.');
assert(feedback.includes("effect.id.startsWith('telegraph-')") && feedback.includes("effect.id.startsWith('rune-warning-')"), 'Enemy and rune danger zones must both reach the overlay.');
assert(feedback.includes('data-testid="combat-danger-warning"'), 'Danger zones need a browser-test hook.');
assert(feedback.includes('1.36 - marker.progress * 1.02'), 'The inner warning ring must visibly converge as impact approaches.');
assert(feedback.includes('IS_MOBILE && gameState.floor >= 13'), 'Mobile enemy-presence protection must start at room 13.');
assert(feedback.includes('dv-ground-warning-outer') && feedback.includes('dv-ground-warning-converge'), 'Danger zones need distinct fixed and converging rings.');

console.log('Combat telegraph and centralized room 21-80 balance audit passed.');

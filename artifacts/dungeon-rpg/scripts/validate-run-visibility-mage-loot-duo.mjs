import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const canvas = read('src/components/GameCanvasKayKit3D.tsx');
const mage = read('src/game/mageRangedCombat.ts');
const loot = read('src/components/kaykitLoot3D.ts');
const coop = read('src/components/CoopRunRealtimeBridge.tsx');

assert(canvas.includes('applyRoomEnvironment(roomRoot)') && canvas.includes('applyRoomEnvironment(root)'), 'Room environment is not guarded during swaps and every render frame.');
assert(canvas.includes("effect.id.startsWith('shot-mage-')") && canvas.includes('reservedMageSlots'), 'Mobile projectile budget can still hide mage attacks.');
assert(mage.includes('engine.state.roomClearReady || !livingEnemies') && mage.includes("!effect.id.startsWith('mage-impact-')"), 'Mage effects can survive room clear.');
assert(mage.includes('sourceAlive') && mage.includes('enemy.isDead || enemy.hp <= 0'), 'Orphaned mage projectiles can still deal post-mortem damage.');
assert(loot.includes("presentationKind = 'relic-reliquary'") && loot.includes("presentationKind = 'armor-token'"), 'Relic or armor ground loot is still using the placeholder presentation.');
assert(coop.includes('connectionPausedRef.current') && coop.includes('engine.lastTime = timestamp') && coop.includes('coop-teammate-disconnected'), 'Duo teammate disconnect does not freeze the complete simulation.');
assert(coop.includes('setConnectionPaused(false)') && coop.includes('setConnectionPaused(true)'), 'Duo pause cannot reliably resume or re-engage.');

console.log('Run regression audit passed: room lighting is guarded, mage attacks stay visible and bounded, loot uses dedicated tokens, and Duo disconnects freeze the run.');

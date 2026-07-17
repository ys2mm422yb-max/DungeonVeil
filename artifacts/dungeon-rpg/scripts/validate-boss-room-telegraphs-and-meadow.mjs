import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const boss = read('src/game/bossAttackTelegraphs.ts');
const bridge = read('src/components/GameSessionBridge.tsx');
const meadow = read('src/components/meadowRoomsTheme3D.ts');
const themes = read('src/components/kaykitRoomThemes3D.ts');
const expanded = read('src/game/expandedWorldRooms.ts');
const enemy3D = read('src/components/kaykitEnemy3D.ts');
const enemyBase3D = read('src/components/kaykitEnemyBase3D.ts');

for (const room of [20, 30, 40, 50]) {
  assert(boss.includes(`${room}: { room: ${room}`), `Boss room ${room} needs an explicit attack contract.`);
}
assert(boss.includes("target: 'locked-ground'") && boss.includes("target: 'boss-radius'"), 'Boss attacks need locked ground and boss-radius contracts.');
assert(boss.includes('runtime.resolveEnemyAttack =') && boss.includes('runtime.updateEnemies ='), 'Boss contract must intercept windup and resolution.');
assert(boss.includes('telegraph-boss-') && boss.includes('telegraph-inner-boss-'), 'Boss attacks need visible outer and converging warnings.');
assert(boss.includes('shot-boss-'), 'Ranged boss attacks need a renderer-visible projectile id.');
assert(boss.includes('Math.hypot(playerPosition.x - center.x') && boss.includes('snapshot.contract.radius'), 'Visible warning radius and hit radius must use the same contract value.');
assert(bridge.includes('installBossAttackTelegraphs') && bridge.includes('disposeBossAttacks'), 'Game session must install and clean up boss attack contracts.');

assert(enemy3D.includes("from './kaykitEnemyBase3D'"), 'The flight wrapper must preserve the established enemy renderer.');
assert(enemy3D.includes('export function room20BossFlightPose'), 'Room 20 needs an explicit real-model flight pose.');
assert(enemy3D.includes('const maxHeight = 1.9'), 'Room 20 boss must visibly leave the ground.');
assert(enemy3D.includes('height = maxHeight * (1 - phase * phase)'), 'Room 20 boss must accelerate into its landing.');
assert(enemy3D.includes('visual.scene.position.y = state.baseSceneY + flight.height'), 'The actual 3D boss model must move vertically.');
assert(enemy3D.includes('state.shadow.scale.setScalar(flight.shadowScale)') && enemy3D.includes('flight.shadowOpacity'), 'The ground shadow must react to flight height.');
assert(enemy3D.includes('safetyShell.visible = !flight.active'), 'The permanent visibility shell must not leave a duplicate boss on the floor.');
assert(enemyBase3D.includes("const attackDuration = finalBoss ? 0.68 : enemy.enemyType === 'boss' ? 0.72"), 'The existing 720 ms room-20 attack animation timing must remain unchanged.');

for (let room = 21; room <= 30; room++) {
  assert(meadow.includes(`  ${room}: [`), `Room ${room} needs explicit meadow decoration.`);
}
assert(meadow.includes('Rock_3_A_Color1.gltf'), 'Room 30 needs a valid visible replacement rock.');
assert(!expanded.includes('Rock_3_R_Color1.gltf'), 'The missing room-30 rock asset must not remain referenced.');
assert(themes.includes('buildMeadowRoomTheme') && themes.includes('preloadMeadowRoomTheme'), 'Meadow additions must be built and preloaded.');
assert(themes.includes('Base room theme partially unavailable'), 'Room theme loading must survive one unavailable decoration.');

console.log('Boss telegraphs, room-20 flight, meadow density and room-30 visibility audit passed.');

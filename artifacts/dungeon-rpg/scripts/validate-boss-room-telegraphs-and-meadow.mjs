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
const darkwood = read('src/components/darkwoodRoomsTheme3D.ts');
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
assert(
  boss.includes("20: { room: 20, target: 'locked-ground', radius: 92, windupMs: 720")
    && enemyBase3D.includes("const bossContract = enemy.enemyType === 'boss' ? bossAttackContract(room) : null")
    && enemyBase3D.includes('enemy.lastAttackTime + bossContract.windupMs'),
  'The room-20 animation must continue to follow the existing 720 ms boss windup contract.',
);

for (let room = 21; room <= 30; room++) {
  assert(meadow.includes(`  ${room}: [`), `Room ${room} needs explicit meadow decoration.`);
}
const sourceBlock = (source, room, nextRoom, label) => {
  const start = source.indexOf(`  ${room}: [`);
  const end = nextRoom ? source.indexOf(`  ${nextRoom}: [`, start + 1) : source.indexOf('\n};', start);
  assert(start >= 0 && end > start, `Room ${room} ${label} source block is unavailable.`);
  return source.slice(start, end);
};
const room21Meadow = sourceBlock(meadow, 21, 22, 'meadow');
const room30Meadow = sourceBlock(meadow, 30, null, 'meadow');
for (const [room, block] of [[21, room21Meadow], [30, room30Meadow]]) {
  assert(block.includes('wall_arched.gltf'), `Room ${room} needs a visible architectural backdrop.`);
  assert(block.includes('pillar.gltf') && block.includes('banner_patternA_green.gltf'), `Room ${room} needs framed chapter identity.`);
}
assert(meadow.includes("'ForestGateStoneTrail'") && meadow.includes("'ForestWardenStoneArena'"), 'Rooms 21 and 30 need distinct ground compositions.');
assert(meadow.includes('buildMeadowGroundComposition') && meadow.includes('InstancedMesh'), 'Meadow framing must keep the compact instanced ground treatment.');
assert(meadow.includes('Rock_3_A_Color1.gltf') || expanded.includes('Rock_3_A_Color1.gltf'), 'Room 30 needs a valid visible replacement rock.');
assert(!expanded.includes('Rock_3_R_Color1.gltf'), 'The missing room-30 rock asset must not remain referenced.');
assert(themes.includes('buildMeadowRoomTheme') && themes.includes('preloadMeadowRoomTheme'), 'Meadow additions must be built and preloaded.');
assert(themes.includes('MEADOW_ENVIRONMENT') && themes.includes('background: 0x233d3a') && themes.includes('exposure: 1.06'), 'Rooms 21-30 need the verified lower-contrast meadow environment.');

const room31Darkwood = sourceBlock(darkwood, 31, 40, 'darkwood');
const room40Darkwood = sourceBlock(darkwood, 40, null, 'darkwood');
assert(room31Darkwood.includes('arch_gate.gltf') && room31Darkwood.includes('post_lantern.gltf'), 'Room 31 needs a framed Darkwood entrance.');
assert(room40Darkwood.includes('wall_arched.gltf') && room40Darkwood.includes('pillar.gltf') && room40Darkwood.includes('banner_patternB_blue.gltf'), 'Room 40 needs a distinct Shadow Warden backdrop.');
assert(darkwood.includes("'DarkwoodGateStoneTrail'") && darkwood.includes("'ShadowWardenStoneArena'"), 'Rooms 31 and 40 need distinct ground compositions.');
assert(darkwood.includes('buildDarkwoodGroundComposition') && darkwood.includes('InstancedMesh'), 'Darkwood framing must keep the compact instanced ground treatment.');
assert(!darkwood.includes('collider'), 'Darkwood chapter frames must remain decorative and non-blocking.');
assert(themes.includes('buildDarkwoodRoomTheme') && themes.includes('preloadDarkwoodRoomTheme'), 'Darkwood endpoint additions must be built and preloaded.');
assert(themes.includes('room === 31 || room === 40'), 'Darkwood endpoint additions must stay limited to rooms 31 and 40.');
assert(themes.includes('Base room theme partially unavailable'), 'Room theme loading must survive one unavailable decoration.');

console.log('Boss telegraphs, room-20 flight, meadow contrast, chapter endpoint framing and room visibility audit passed.');

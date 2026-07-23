import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const player = read('src/components/kaykitPlayer3D.ts');
const canvas = read('src/components/GameCanvasKayKit3D.tsx');
const enemy = read('src/components/kaykitEnemyBase3D.ts');

const enemyLoadsMelee = enemy.includes('/rig_medium_combatmelee\\.glb$/i');
const enemyLoadsRanged = enemy.includes('/rig_medium_combatranged\\.glb$/i');

const checks = [
  [player.includes('Rig_Medium_CombatRanged.glb'), 'Ranger does not load the KayKit ranged animation package'],
  [player.includes("['ranged', 'bow', 'aiming', 'idle']"), 'Ranger aiming idle is not selected from the KayKit ranged package'],
  [player.includes("['running', 'holding', 'bow']"), 'Ranger movement does not prefer the authored bow-running clip'],
  [player.includes("['ranged', 'bow', 'release']") && player.includes("['ranged', 'bow', 'draw']"), 'Ranger draw/release clips are not selected explicitly'],
  [player.includes("attackPhase: 'none' | 'release' | 'draw'") && player.includes('if (attackRemaining === 0) beginDraw();'), 'Ranger does not transition from release into the authored draw phase'],
  [!player.includes("findBone(visual, ['upperarml'])") && !player.includes('lowerArmR.rotation'), 'Manual ranger arm-rotation fallback remains active'],
  [canvas.includes('playerRig.triggerAttack()') && canvas.includes('state.player.lastAttackTime > lastAttack'), 'Run renderer does not trigger the ranger attack from the authoritative shot event'],
  [enemyLoadsMelee && enemyLoadsRanged, 'Enemy library does not load both KayKit melee and ranged animation packs through the manifest'],
  [enemy.includes("['bow', 'attack']") || enemy.includes("['ranged', 'attack']"), 'Enemy ranged roles do not request ranged attack clips'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error('KayKit combat animation contract failed:');
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('KayKit combat animation contract passed: ranger uses authored bow clips and enemy roles retain melee/ranged package selection.');

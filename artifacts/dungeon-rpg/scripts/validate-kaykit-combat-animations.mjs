import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const player = read('src/components/kaykitPlayer3D.ts');
const canvas = read('src/components/GameCanvasKayKit3D.tsx');
const enemy = read('src/components/kaykitEnemyBase3D.ts');
const manifest = read('src/components/kaykitManifest3D.ts');
const regional = read('src/game/enemyRegionalIdentity.ts');

const enemyLoadsMelee = enemy.includes('/rig_medium_combatmelee\\.glb$/i');
const enemyLoadsRanged = enemy.includes('/rig_medium_combatranged\\.glb$/i');
const selectedExtras = [
  'Necromancer',
  'Skeleton_Golem',
  'Skeleton_Mage',
  'Skeleton_Minion',
  'Skeleton_Rogue',
  'Skeleton_Warrior',
];
const allExtrasInManifest = selectedExtras.every(name => manifest.includes(`'${name}'`));
const noRoleAliasModels = !manifest.includes('Skeleton_Mage_Necromancer') && !manifest.includes('Skeleton_Warrior_Golem');
const preservedMiddleChapters = regional.includes('if (safeRoom <= 30)')
  && regional.includes("return adventurer('ranger', 'ranger')")
  && regional.includes('if (safeRoom <= 40)')
  && regional.includes("return index % 2 === 0 ? realMage() : skeleton('rogue', 'rogue')");

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
  [allExtrasInManifest && manifest.includes('includeSkeletonExtras'), 'Selected Skeletons Extra models are not exposed through the existing KayKit manifest loader'],
  [noRoleAliasModels && regional.includes('SKELETON_EXTRA_MODEL'), 'Skeleton Extra roles still rely on duplicate alias files instead of explicit metadata'],
  [regional.includes("extraSkeleton('mage', 'necromancer')"), 'Room 20 does not use the selected Necromancer with the mage animation role'],
  [regional.includes("extraSkeleton('warrior', 'golem')"), 'Tomb guardian/Golem does not use the selected heavy warrior role'],
  [regional.includes("extraSkeleton('rogue', 'rogue')") && regional.includes("extraSkeleton('minion', 'minion')"), 'Early skeleton variants are not mapped to distinct roles'],
  [preservedMiddleChapters, 'The already validated room 21–40 silhouette mapping was changed unexpectedly'],
  [regional.includes("if (type === 'skeleton') return extraSkeleton('warrior', 'warrior');"), 'Late fortress skeletons do not use the selected warrior model'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error('KayKit combat animation contract failed:');
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('KayKit combat animation contract passed: authored ranger clips, explicit Skeleton Extra role metadata, and room 21–40 visual boundaries are preserved.');

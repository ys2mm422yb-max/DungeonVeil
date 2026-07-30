import type { EnemyType } from './entities';
import { enemyDefinition, enemyFamilyForSpawn } from './enemyRegistry';

export type EnemyVisualFamily = 'creature' | 'skeleton' | 'adventurer';
export type EnemyVisualRole = 'minion' | 'rogue' | 'mage' | 'warrior' | 'ranger' | 'barbarian' | 'knight';
export type BossVariant = 'tomb-guardian' | 'veil-necromancer' | 'forest-captain' | 'shadow-cultist' | 'ember-warden';

export type EnemyVisualProfile = {
  family: EnemyVisualFamily;
  role: EnemyVisualRole;
  modelToken?: string;
  useImported: boolean;
  bossVariant?: BossVariant;
};

const SKELETON_EXTRA_ROOT = 'extras/kaykit_skeletons_1.1_extra/characters/gltf';
const SKELETON_EXTRA_MODEL = {
  necromancer: 'necromancer',
  golem: 'skeleton_golem',
  mage: 'skeleton_mage',
  minion: 'skeleton_minion',
  rogue: 'skeleton_rogue',
  warrior: 'skeleton_warrior',
} as const;
const creature = (role: EnemyVisualRole = 'minion'): EnemyVisualProfile => ({ family: 'creature', role, useImported: true });
const skeleton = (role: EnemyVisualRole, modelToken?: string): EnemyVisualProfile => ({ family: 'skeleton', role, modelToken, useImported: false });
const extraSkeleton = (role: EnemyVisualRole, model: keyof typeof SKELETON_EXTRA_MODEL): EnemyVisualProfile => skeleton(role, `${SKELETON_EXTRA_ROOT}/${SKELETON_EXTRA_MODEL[model]}.glb`);
const adventurer = (role: EnemyVisualRole, modelToken: string): EnemyVisualProfile => ({ family: 'adventurer', role, modelToken, useImported: false });
const realMage = (): EnemyVisualProfile => adventurer('mage', '/characters/gltf/mage.glb');

export function bossVisualProfile(room: number): EnemyVisualProfile {
  if (room === 20) return { ...extraSkeleton('mage', 'necromancer'), bossVariant: 'veil-necromancer' };
  if (room === 30) return { ...adventurer('ranger', 'ranger'), bossVariant: 'forest-captain' };
  if (room === 40) return { ...adventurer('rogue', 'rogue_hooded'), bossVariant: 'shadow-cultist' };
  if (room === 50) return { ...adventurer('knight', 'knight'), bossVariant: 'ember-warden' };
  if (room === 60) return { ...adventurer('ranger', 'ranger'), bossVariant: 'forest-captain' };
  if (room === 70 || room === 100) return { ...extraSkeleton('mage', 'necromancer'), bossVariant: 'veil-necromancer' };
  if (room === 80) return { ...adventurer('rogue', 'rogue_hooded'), bossVariant: 'shadow-cultist' };
  if (room === 90) return { ...adventurer('knight', 'knight'), bossVariant: 'ember-warden' };
  return { ...extraSkeleton('warrior', 'golem'), bossVariant: 'tomb-guardian' };
}

function lateRegistryVisual(room: number, type: EnemyType, index: number): EnemyVisualProfile {
  const familyId = enemyFamilyForSpawn(room, index, type);
  const definition = enemyDefinition(familyId);
  const role = definition.role;

  if (role === 'ranged') return adventurer('ranger', 'ranger');
  if (role === 'caster' || role === 'support' || role === 'control') {
    return definition.region === 'nexus' ? extraSkeleton('mage', 'necromancer') : realMage();
  }
  if (role === 'tank') {
    return definition.region === 'cinder' || definition.region === 'fracture'
      ? adventurer('knight', 'knight')
      : extraSkeleton('warrior', 'golem');
  }
  if (role === 'bruiser') {
    return definition.region === 'cinder'
      ? adventurer('barbarian', 'barbarian')
      : extraSkeleton('warrior', 'warrior');
  }
  if (role === 'skirmisher' || role === 'ambusher' || role === 'drain') {
    if (type === 'spider' || type === 'vampire' || type === 'goblin') return creature(role === 'drain' ? 'mage' : 'rogue');
    return adventurer('rogue', index % 2 === 0 ? 'rogue_hooded' : 'rogue');
  }
  if (role === 'swarm') return creature('minion');
  return type === 'skeleton' ? extraSkeleton('warrior', 'warrior') : creature('minion');
}

export function enemyVisualProfile(room: number, type: EnemyType, index = 0): EnemyVisualProfile {
  const safeRoom = Math.max(1, Math.min(100, room));
  if (type === 'boss') return bossVisualProfile(safeRoom);

  // Preserve the already validated rooms 1–50 silhouettes and animation roles.
  // Block 21 adds genuine family identity through the registry without regressing
  // the established early/middle-game bodies or final-boss presentation.
  if (safeRoom <= 10) {
    if (type === 'skeleton') return index % 3 === 0
      ? extraSkeleton('rogue', 'rogue')
      : extraSkeleton('minion', 'minion');
    if (type === 'orc') return extraSkeleton('warrior', 'warrior');
    if (type === 'golem') return extraSkeleton('warrior', 'golem');
    return creature(type === 'vampire' ? 'mage' : type === 'spider' || type === 'goblin' ? 'rogue' : 'minion');
  }

  if (safeRoom <= 20) {
    if (type === 'skeleton') return index % 2 === 0
      ? extraSkeleton('mage', 'mage')
      : extraSkeleton('rogue', 'rogue');
    if (type === 'orc') return extraSkeleton('warrior', 'warrior');
    if (type === 'golem') return extraSkeleton('warrior', 'golem');
    if (type === 'vampire' && index % 2 === 1) return realMage();
    return creature(type === 'vampire' ? 'mage' : type === 'spider' ? 'rogue' : 'minion');
  }

  if (safeRoom <= 30) {
    if (type === 'skeleton') return adventurer('ranger', 'ranger');
    if (type === 'orc') return adventurer('barbarian', 'barbarian');
    if (type === 'vampire') return adventurer('rogue', index % 2 === 0 ? 'rogue_hooded' : 'rogue');
    if (type === 'golem') return adventurer('knight', 'knight');
    return creature(type === 'spider' || type === 'goblin' ? 'rogue' : 'minion');
  }

  if (safeRoom <= 40) {
    if (type === 'skeleton') return index % 2 === 0 ? realMage() : skeleton('rogue', 'rogue');
    if (type === 'orc') return adventurer('rogue', 'rogue_hooded');
    if (type === 'golem') return adventurer('knight', 'knight');
    if (type === 'vampire') return index % 2 === 0 ? creature('mage') : realMage();
    return creature(type === 'spider' ? 'rogue' : 'minion');
  }

  if (safeRoom <= 50) {
    if (type === 'orc') return adventurer('barbarian', 'barbarian');
    if (type === 'golem') return adventurer('knight', 'knight');
    if (type === 'vampire') return realMage();
    if (type === 'skeleton') return extraSkeleton('warrior', 'warrior');
    return creature(type === 'spider' ? 'rogue' : 'minion');
  }

  return lateRegistryVisual(safeRoom, type, index);
}

export function bossCombatProfile(room: number) {
  if (room === 20) return { attackRange: 178, attackDelay: 1040, moveScale: 0.9, element: 'arcane' as const, pattern: 'caster' as const };
  if (room === 30) return { attackRange: 190, attackDelay: 820, moveScale: 1.12, element: 'normal' as const, pattern: 'ranger' as const };
  if (room === 40) return { attackRange: 92, attackDelay: 690, moveScale: 1.2, element: 'arcane' as const, pattern: 'assassin' as const };
  if (room === 50) return { attackRange: 138, attackDelay: 720, moveScale: 1.06, element: 'fire' as const, pattern: 'warden' as const };
  if (room === 60) return { attackRange: 176, attackDelay: 790, moveScale: 1.02, element: 'normal' as const, pattern: 'ranger' as const };
  if (room === 70 || room === 100) return { attackRange: 184, attackDelay: 930, moveScale: 0.94, element: 'arcane' as const, pattern: 'caster' as const };
  if (room === 80) return { attackRange: 108, attackDelay: 740, moveScale: 1.08, element: 'normal' as const, pattern: 'assassin' as const };
  if (room === 90) return { attackRange: 146, attackDelay: 700, moveScale: 1.04, element: 'fire' as const, pattern: 'warden' as const };
  return { attackRange: 72, attackDelay: 860, moveScale: 0.96, element: 'normal' as const, pattern: 'guardian' as const };
}

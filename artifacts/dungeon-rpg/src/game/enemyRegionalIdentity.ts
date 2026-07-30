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
  necromancer: 'necromancer', golem: 'skeleton_golem', mage: 'skeleton_mage', minion: 'skeleton_minion',
  rogue: 'skeleton_rogue', warrior: 'skeleton_warrior',
} as const;
const creature = (role: EnemyVisualRole = 'minion'): EnemyVisualProfile => ({ family: 'creature', role, useImported: true });
const skeleton = (role: EnemyVisualRole, modelToken?: string): EnemyVisualProfile => ({ family: 'skeleton', role, modelToken, useImported: false });
const extraSkeleton = (role: EnemyVisualRole, model: keyof typeof SKELETON_EXTRA_MODEL): EnemyVisualProfile => skeleton(role, `${SKELETON_EXTRA_ROOT}/${SKELETON_EXTRA_MODEL[model]}.glb`);
const adventurer = (role: EnemyVisualRole, modelToken: string): EnemyVisualProfile => ({ family: 'adventurer', role, modelToken, useImported: false });
const realMage = (): EnemyVisualProfile => adventurer('mage', '/characters/gltf/mage.glb');

export function bossVisualProfile(room: number): EnemyVisualProfile {
  if (room === 20 || room === 70 || room === 100) return { ...extraSkeleton('mage', 'necromancer'), bossVariant: 'veil-necromancer' };
  if (room === 30 || room === 60) return { ...adventurer('ranger', 'ranger'), bossVariant: 'forest-captain' };
  if (room === 40 || room === 80) return { ...adventurer('rogue', 'rogue_hooded'), bossVariant: 'shadow-cultist' };
  if (room === 50 || room === 90) return { ...adventurer('knight', 'knight'), bossVariant: 'ember-warden' };
  return { ...extraSkeleton('warrior', 'golem'), bossVariant: 'tomb-guardian' };
}

function creatureRole(type: EnemyType, fallback: EnemyVisualRole): EnemyVisualProfile {
  if (type === 'skeleton' || type === 'golem' || type === 'orc') return skeleton(fallback);
  return creature(fallback);
}

export function enemyVisualProfile(room: number, type: EnemyType, index = 0): EnemyVisualProfile {
  const safeRoom = Math.max(1, Math.min(100, room));
  if (type === 'boss') return bossVisualProfile(safeRoom);

  const familyId = enemyFamilyForSpawn(safeRoom, index, type);
  const definition = enemyDefinition(familyId);
  const role = definition.role;

  if (role === 'ranged') {
    if (definition.region === 'grave') return adventurer('ranger', 'ranger');
    if (type === 'vampire') return realMage();
    return adventurer('ranger', 'ranger');
  }
  if (role === 'caster' || role === 'support' || role === 'control') {
    if (definition.region === 'grave' || definition.region === 'nexus') return extraSkeleton('mage', definition.region === 'grave' ? 'mage' : 'necromancer');
    return realMage();
  }
  if (role === 'tank') {
    if (definition.region === 'grave') return extraSkeleton('warrior', 'golem');
    if (definition.region === 'ember' || definition.region === 'fracture' || definition.region === 'cinder') return adventurer('knight', 'knight');
    return creatureRole(type, 'knight');
  }
  if (role === 'bruiser') {
    if (definition.region === 'grave') return extraSkeleton('warrior', 'warrior');
    if (definition.region === 'marsh' || definition.region === 'cinder') return adventurer('barbarian', 'barbarian');
    return adventurer('warrior', 'knight');
  }
  if (role === 'skirmisher' || role === 'ambusher' || role === 'drain') {
    if (type === 'spider' || type === 'vampire' || type === 'goblin') return creature(role === 'drain' ? 'mage' : 'rogue');
    return adventurer('rogue', index % 2 === 0 ? 'rogue_hooded' : 'rogue');
  }
  if (role === 'swarm') return creature('minion');

  if (safeRoom <= 20) return type === 'skeleton' ? extraSkeleton('minion', 'minion') : creature('minion');
  return creatureRole(type, 'minion');
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

import type { EnemyType } from './entities';

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
const creature = (role: EnemyVisualRole = 'minion'): EnemyVisualProfile => ({ family: 'creature', role, useImported: true });
const skeleton = (role: EnemyVisualRole, modelToken?: string): EnemyVisualProfile => ({ family: 'skeleton', role, modelToken, useImported: false });
const extraSkeleton = (role: EnemyVisualRole, model: string): EnemyVisualProfile => skeleton(role, `${SKELETON_EXTRA_ROOT}/${model}.glb`);
const adventurer = (role: EnemyVisualRole, modelToken: string): EnemyVisualProfile => ({ family: 'adventurer', role, modelToken, useImported: false });
const realMage = (): EnemyVisualProfile => adventurer('mage', '/characters/gltf/mage.glb');

export function bossVisualProfile(room: number): EnemyVisualProfile {
  if (room === 20) return { ...extraSkeleton('mage', 'skeleton_mage_necromancer'), bossVariant: 'veil-necromancer' };
  if (room === 30) return { ...adventurer('ranger', 'ranger'), bossVariant: 'forest-captain' };
  if (room === 40) return { ...adventurer('rogue', 'rogue_hooded'), bossVariant: 'shadow-cultist' };
  if (room === 50) return { ...adventurer('knight', 'knight'), bossVariant: 'ember-warden' };
  return { ...extraSkeleton('warrior', 'skeleton_warrior_golem'), bossVariant: 'tomb-guardian' };
}

export function enemyVisualProfile(room: number, type: EnemyType, index = 0): EnemyVisualProfile {
  const safeRoom = Math.max(1, Math.min(50, room));
  if (type === 'boss') return bossVisualProfile(safeRoom);

  if (safeRoom <= 10) {
    if (type === 'skeleton') return index % 3 === 0
      ? extraSkeleton('rogue', 'skeleton_rogue')
      : extraSkeleton('minion', 'skeleton_minion');
    if (type === 'orc') return extraSkeleton('warrior', 'skeleton_warrior');
    if (type === 'golem') return extraSkeleton('warrior', 'skeleton_warrior_golem');
    return creature(type === 'vampire' ? 'mage' : type === 'spider' || type === 'goblin' ? 'rogue' : 'minion');
  }

  if (safeRoom <= 20) {
    if (type === 'skeleton') return index % 2 === 0
      ? extraSkeleton('mage', 'skeleton_mage')
      : extraSkeleton('rogue', 'skeleton_rogue');
    if (type === 'orc') return extraSkeleton('warrior', 'skeleton_warrior');
    if (type === 'golem') return extraSkeleton('warrior', 'skeleton_warrior_golem');
    if (type === 'vampire' && index % 2 === 1) return realMage();
    return creature(type === 'vampire' ? 'mage' : type === 'spider' ? 'rogue' : 'minion');
  }

  // The meadow and darkwood chapters already read clearly in the room 21–40
  // mobile evidence. Keep their established adventurer/creature silhouettes.
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

  if (type === 'orc') return adventurer('barbarian', 'barbarian');
  if (type === 'golem') return adventurer('knight', 'knight');
  if (type === 'vampire') return realMage();
  if (type === 'skeleton') return extraSkeleton('warrior', 'skeleton_warrior');
  return creature(type === 'spider' ? 'rogue' : 'minion');
}

export function bossCombatProfile(room: number) {
  if (room === 20) return { attackRange: 178, attackDelay: 1040, moveScale: 0.9, element: 'arcane' as const, pattern: 'caster' as const };
  if (room === 30) return { attackRange: 190, attackDelay: 820, moveScale: 1.12, element: 'normal' as const, pattern: 'ranger' as const };
  if (room === 40) return { attackRange: 92, attackDelay: 690, moveScale: 1.2, element: 'arcane' as const, pattern: 'assassin' as const };
  if (room === 50) return { attackRange: 138, attackDelay: 720, moveScale: 1.06, element: 'fire' as const, pattern: 'warden' as const };
  return { attackRange: 72, attackDelay: 860, moveScale: 0.96, element: 'normal' as const, pattern: 'guardian' as const };
}

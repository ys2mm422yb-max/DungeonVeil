import type { EnemyType } from './entities';
import {
  enemyFamilyForSpawn,
  type EnemyAttackPattern,
  type EnemyFamilyId,
} from './enemyRegistry';
import { enemyPresentationKeyForFamily, type EnemyPresentationKey } from './enemyPresentationContract';

export type EnemyVisualFamily = 'creature' | 'skeleton' | 'adventurer';
export type EnemyVisualRole = 'minion' | 'rogue' | 'mage' | 'warrior' | 'ranger' | 'barbarian' | 'knight';
export type EnemyWeaponProfile = 'natural' | 'single-blade' | 'dual-blade' | 'bow' | 'staff' | 'axe-shield' | 'heavy-axe';
export type BossVariant = 'tomb-guardian' | 'veil-necromancer' | 'forest-captain' | 'shadow-cultist' | 'ember-warden';

export type EnemyVisualProfile = {
  presentationKey: EnemyPresentationKey | `boss-${string}` | `legacy-${EnemyType}`;
  family: EnemyVisualFamily;
  role: EnemyVisualRole;
  modelToken?: string;
  useImported: boolean;
  attackProfile: EnemyAttackPattern;
  weaponProfile: EnemyWeaponProfile;
  scaleMultiplier?: number;
  bossVariant?: BossVariant;
};

type NormalEnemyFamilyId = Exclude<EnemyFamilyId, 'boss'>;

const SKELETON_EXTRA_ROOT = 'extras/kaykit_skeletons_1.1_extra/characters/gltf';
const SKELETON_EXTRA_MODEL = {
  necromancer: 'necromancer',
  golem: 'skeleton_golem',
  mage: 'skeleton_mage',
  minion: 'skeleton_minion',
  rogue: 'skeleton_rogue',
  warrior: 'skeleton_warrior',
} as const;

function creature(
  presentationKey: EnemyVisualProfile['presentationKey'],
  role: EnemyVisualRole,
  attackProfile: EnemyAttackPattern,
  scaleMultiplier = 1,
): EnemyVisualProfile {
  return { presentationKey, family: 'creature', role, useImported: true, attackProfile, weaponProfile: 'natural', scaleMultiplier };
}

function skeleton(
  presentationKey: EnemyVisualProfile['presentationKey'],
  role: EnemyVisualRole,
  model: keyof typeof SKELETON_EXTRA_MODEL,
  attackProfile: EnemyAttackPattern,
  weaponProfile: EnemyWeaponProfile,
  scaleMultiplier = 1,
): EnemyVisualProfile {
  return {
    presentationKey,
    family: 'skeleton',
    role,
    modelToken: `${SKELETON_EXTRA_ROOT}/${SKELETON_EXTRA_MODEL[model]}.glb`,
    useImported: false,
    attackProfile,
    weaponProfile,
    scaleMultiplier,
  };
}

function adventurer(
  presentationKey: EnemyVisualProfile['presentationKey'],
  role: EnemyVisualRole,
  modelToken: string,
  attackProfile: EnemyAttackPattern,
  weaponProfile: EnemyWeaponProfile,
  scaleMultiplier = 1,
): EnemyVisualProfile {
  return { presentationKey, family: 'adventurer', role, modelToken, useImported: false, attackProfile, weaponProfile, scaleMultiplier };
}

const realMage = (presentationKey: EnemyVisualProfile['presentationKey'], attackProfile: EnemyAttackPattern, scaleMultiplier = 1): EnemyVisualProfile =>
  adventurer(presentationKey, 'mage', '/characters/gltf/mage.glb', attackProfile, 'staff', scaleMultiplier);

function familyCreature(
  familyId: NormalEnemyFamilyId,
  role: EnemyVisualRole,
  attackProfile: EnemyAttackPattern,
  scaleMultiplier = 1,
): EnemyVisualProfile {
  return creature(enemyPresentationKeyForFamily(familyId), role, attackProfile, scaleMultiplier);
}

function familySkeleton(
  familyId: NormalEnemyFamilyId,
  role: EnemyVisualRole,
  model: keyof typeof SKELETON_EXTRA_MODEL,
  attackProfile: EnemyAttackPattern,
  weaponProfile: EnemyWeaponProfile,
  scaleMultiplier = 1,
): EnemyVisualProfile {
  return skeleton(enemyPresentationKeyForFamily(familyId), role, model, attackProfile, weaponProfile, scaleMultiplier);
}

function familyAdventurer(
  familyId: NormalEnemyFamilyId,
  role: EnemyVisualRole,
  modelToken: string,
  attackProfile: EnemyAttackPattern,
  weaponProfile: EnemyWeaponProfile,
  scaleMultiplier = 1,
): EnemyVisualProfile {
  return adventurer(enemyPresentationKeyForFamily(familyId), role, modelToken, attackProfile, weaponProfile, scaleMultiplier);
}

const familyRealMage = (familyId: NormalEnemyFamilyId, attackProfile: EnemyAttackPattern, scaleMultiplier = 1): EnemyVisualProfile =>
  realMage(enemyPresentationKeyForFamily(familyId), attackProfile, scaleMultiplier);

/**
 * Canonical family presentation matrix.
 *
 * Runtime enemy types remain deliberately coarse for simulation compatibility.
 * This table is the visual contract: it selects the actual body, weapon posture
 * and animation role for every authored family independently of runtimeType.
 */
export const ENEMY_FAMILY_PRESENTATIONS = {
  slime: familyCreature('slime', 'minion', 'contact', 0.94),
  goblin: familyAdventurer('goblin', 'rogue', 'rogue', 'lunge', 'dual-blade', 0.88),
  'cave-bat': familyCreature('cave-bat', 'mage', 'projectile', 0.9),
  'thorn-crawler': familyCreature('thorn-crawler', 'rogue', 'web', 1.02),

  skeleton: familySkeleton('skeleton', 'warrior', 'warrior', 'slam', 'axe-shield', 1.04),
  'bone-archer': familySkeleton('bone-archer', 'ranger', 'rogue', 'projectile', 'bow', 0.96),
  'crypt-acolyte': familySkeleton('crypt-acolyte', 'mage', 'mage', 'summon', 'staff', 1),
  'grave-hound': familyCreature('grave-hound', 'rogue', 'lunge', 0.9),

  orc: familyAdventurer('orc', 'barbarian', 'barbarian', 'slam', 'heavy-axe', 1.08),
  spider: familyCreature('spider', 'rogue', 'web', 1.08),
  'briar-shaman': familyRealMage('briar-shaman', 'burst', 1),
  'boar-brute': familySkeleton('boar-brute', 'barbarian', 'golem', 'lunge', 'heavy-axe', 1.14),

  vampire: familyCreature('vampire', 'mage', 'drain', 1.02),
  'shadow-rogue': familyAdventurer('shadow-rogue', 'rogue', 'rogue_hooded', 'lunge', 'dual-blade', 0.96),
  'dusk-mage': familyAdventurer('dusk-mage', 'mage', 'rogue_hooded', 'projectile', 'staff', 1.02),
  'carrion-swarm': familySkeleton('carrion-swarm', 'minion', 'minion', 'burst', 'single-blade', 0.82),

  demon: familyCreature('demon', 'minion', 'fire', 1.06),
  'veil-cultist': familySkeleton('veil-cultist', 'mage', 'necromancer', 'summon', 'staff', 1.02),
  golem: familySkeleton('golem', 'warrior', 'golem', 'quake', 'heavy-axe', 1.18),
  'flame-imp': familySkeleton('flame-imp', 'mage', 'minion', 'projectile', 'staff', 0.82),

  'gilded-sentinel': familyAdventurer('gilded-sentinel', 'knight', 'knight', 'slam', 'axe-shield', 1.08),
  'fracture-wisp': familySkeleton('fracture-wisp', 'minion', 'mage', 'beam', 'single-blade', 0.86),
  'crystal-lancer': familySkeleton('crystal-lancer', 'warrior', 'rogue', 'lunge', 'axe-shield', 1.02),

  'star-seer': familyAdventurer('star-seer', 'mage', 'ranger', 'beam', 'staff', 1.04),
  'astral-mote': familySkeleton('astral-mote', 'mage', 'rogue', 'burst', 'staff', 0.78),
  'void-knight': familyAdventurer('void-knight', 'knight', 'rogue_hooded', 'slam', 'axe-shield', 1.1),

  'drowned-revenant': familySkeleton('drowned-revenant', 'warrior', 'golem', 'tide', 'axe-shield', 1.04),
  tidecaller: familySkeleton('tidecaller', 'mage', 'warrior', 'tide', 'staff', 1),
  'chain-crab': familyCreature('chain-crab', 'rogue', 'lunge', 1.12),

  'cinder-knight': familyAdventurer('cinder-knight', 'knight', 'barbarian', 'fire', 'axe-shield', 1.12),
  'furnace-hound': familyCreature('furnace-hound', 'rogue', 'lunge', 1.08),
  'ember-witch': familySkeleton('ember-witch', 'mage', 'rogue', 'fire', 'staff', 1.02),

  'veil-aberration': familySkeleton('veil-aberration', 'barbarian', 'warrior', 'burst', 'heavy-axe', 1.2),
  'nexus-herald': familySkeleton('nexus-herald', 'mage', 'golem', 'summon', 'staff', 1.08),
  'rift-beast': familyCreature('rift-beast', 'minion', 'lunge', 1.16),
} satisfies Record<NormalEnemyFamilyId, EnemyVisualProfile>;

export function bossVisualProfile(room: number): EnemyVisualProfile {
  if (room === 20) return { ...skeleton('boss-veil-necromancer', 'mage', 'necromancer', 'boss-cycle', 'staff', 1.1), bossVariant: 'veil-necromancer' };
  if (room === 30) return { ...adventurer('boss-forest-captain', 'ranger', 'ranger', 'boss-cycle', 'bow', 1.1), bossVariant: 'forest-captain' };
  if (room === 40) return { ...adventurer('boss-shadow-cultist', 'rogue', 'rogue_hooded', 'boss-cycle', 'dual-blade', 1.1), bossVariant: 'shadow-cultist' };
  if (room === 50) return { ...adventurer('boss-ember-warden', 'knight', 'knight', 'boss-cycle', 'axe-shield', 1.16), bossVariant: 'ember-warden' };
  if (room === 60) return { ...adventurer('boss-fracture-captain', 'ranger', 'ranger', 'boss-cycle', 'bow', 1.12), bossVariant: 'forest-captain' };
  if (room === 70 || room === 100) return { ...skeleton('boss-nexus-necromancer', 'mage', 'necromancer', 'boss-cycle', 'staff', 1.14), bossVariant: 'veil-necromancer' };
  if (room === 80) return { ...adventurer('boss-reliquary-assassin', 'rogue', 'rogue_hooded', 'boss-cycle', 'dual-blade', 1.12), bossVariant: 'shadow-cultist' };
  if (room === 90) return { ...adventurer('boss-cinder-warden', 'knight', 'knight', 'boss-cycle', 'axe-shield', 1.18), bossVariant: 'ember-warden' };
  return { ...skeleton('boss-tomb-guardian', 'warrior', 'golem', 'boss-cycle', 'heavy-axe', 1.18), bossVariant: 'tomb-guardian' };
}

export function enemyVisualProfile(room: number, type: EnemyType, index = 0, explicitFamilyId?: EnemyFamilyId): EnemyVisualProfile {
  const safeRoom = Math.max(1, Math.min(100, room));
  if (type === 'boss' || explicitFamilyId === 'boss') return bossVisualProfile(safeRoom);

  const familyId = (explicitFamilyId ?? enemyFamilyForSpawn(safeRoom, index, type)) as NormalEnemyFamilyId;
  const profile = ENEMY_FAMILY_PRESENTATIONS[familyId];
  if (profile) return profile;

  // Defensive fallback for corrupted/legacy saves. It intentionally remains
  // readable and animated while never changing simulation or family metadata.
  return creature(`legacy-${type}`, type === 'vampire' ? 'mage' : type === 'spider' || type === 'goblin' ? 'rogue' : 'minion', 'contact');
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

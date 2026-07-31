import type { EnemyFamilyId } from './enemyRegistry';

/**
 * Canonical presentation identity for every authored enemy family.
 *
 * Runtime EnemyType values remain coarse simulation carriers. These keys are
 * deliberately independent and are the only normal-family presentation-key
 * literals used by the registry and renderer.
 */
export const ENEMY_PRESENTATION_KEY_BY_FAMILY = {
  'slime': 'crypt-slime',
  'goblin': 'crypt-goblin-skirmisher',
  'cave-bat': 'crypt-cave-bat',
  'thorn-crawler': 'crypt-thorn-crawler',
  'skeleton': 'grave-skeleton-guard',
  'bone-archer': 'grave-bone-archer',
  'crypt-acolyte': 'grave-crypt-acolyte',
  'grave-hound': 'grave-hound',
  'orc': 'marsh-orc-raider',
  'spider': 'marsh-spider',
  'briar-shaman': 'marsh-briar-shaman',
  'boar-brute': 'marsh-boar-brute',
  'vampire': 'darkwood-vampire-stalker',
  'shadow-rogue': 'darkwood-shadow-rogue',
  'dusk-mage': 'darkwood-dusk-mage',
  'carrion-swarm': 'darkwood-carrion-swarm',
  'demon': 'ember-demon-serpent',
  'veil-cultist': 'ember-veil-cultist',
  'golem': 'ember-stone-golem',
  'flame-imp': 'ember-flame-imp',
  'gilded-sentinel': 'fracture-gilded-sentinel',
  'fracture-wisp': 'fracture-wisp',
  'crystal-lancer': 'fracture-crystal-lancer',
  'star-seer': 'astral-star-seer',
  'astral-mote': 'astral-mote',
  'void-knight': 'astral-void-knight',
  'drowned-revenant': 'reliquary-drowned-revenant',
  'tidecaller': 'reliquary-tidecaller',
  'chain-crab': 'reliquary-chain-crab',
  'cinder-knight': 'cinder-knight',
  'furnace-hound': 'cinder-furnace-hound',
  'ember-witch': 'cinder-ember-witch',
  'veil-aberration': 'nexus-veil-aberration',
  'nexus-herald': 'nexus-herald',
  'rift-beast': 'nexus-rift-beast',
  'boss': 'boss-family',
} as const satisfies Record<EnemyFamilyId, string>;

export type EnemyPresentationKey = (typeof ENEMY_PRESENTATION_KEY_BY_FAMILY)[EnemyFamilyId];

export function enemyPresentationKeyForFamily(id: EnemyFamilyId): EnemyPresentationKey {
  return ENEMY_PRESENTATION_KEY_BY_FAMILY[id];
}

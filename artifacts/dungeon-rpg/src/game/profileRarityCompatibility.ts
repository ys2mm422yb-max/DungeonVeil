import { PROFILE_AVATARS, PROFILE_CARDS, PROFILE_TITLES } from './playerProfile';

const labels: Record<string, string> = {
  common: 'gewöhnlich',
  rare: 'selten',
  epic: 'episch',
  mythic: 'mythisch',
};

for (const definition of [...PROFILE_TITLES, ...PROFILE_CARDS, ...PROFILE_AVATARS] as Array<{ rarity?: string }>) {
  if (definition.rarity && labels[definition.rarity]) definition.rarity = labels[definition.rarity];
}

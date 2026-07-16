import type { UpgradeKey } from '../i18n/translations';

export type SkillRankDef = {
  maxRank: number;
  rankTextDe: string[];
  rankTextEn: string[];
};

export type FusionKey = 'elementalStorm' | 'arrowStorm' | 'veilChain';
export type InstantGiftKey = 'heal' | 'veilCache' | 'goldCache';
export type MasteryGiftKey = 'hunterBlessing' | 'vitalSpark';
export type OverflowGiftKey = InstantGiftKey | MasteryGiftKey;
export type BaseCombatGiftKey = 'multishot' | 'ricochet' | 'fireArrow' | 'iceArrow' | 'attackSpeed' | 'piercing';

export const DEFAULT_RUN_UPGRADE_POOL: UpgradeKey[] = [
  'multishot', 'ricochet', 'fireArrow', 'iceArrow', 'attackSpeed', 'piercing',
  'attack', 'maxHp', 'speed', 'defense',
];

export const FUSION_RECIPES: Record<FusionKey, readonly [BaseCombatGiftKey, BaseCombatGiftKey]> = {
  elementalStorm: ['fireArrow', 'iceArrow'],
  arrowStorm: ['multishot', 'attackSpeed'],
  veilChain: ['ricochet', 'piercing'],
};

export const OVERFLOW_GIFTS: OverflowGiftKey[] = ['hunterBlessing', 'vitalSpark', 'heal', 'veilCache', 'goldCache'];

export const RUN_SKILL_DEFS: Record<UpgradeKey, SkillRankDef> = {
  multishot: {
    maxRank: 3,
    rankTextDe: ['2 Pfeile im Fächer · Zusatzpfeil 82% Schaden', '3 Pfeile im Fächer · Zusatzpfeile 82% Schaden', '4 Pfeile im breiten Fächer · Zusatzpfeile 82% Schaden'],
    rankTextEn: ['2 arrows in a fan · extra arrow 82% damage', '3 arrows in a fan · extra arrows 82% damage', '4 arrows in a wide fan · extra arrows 82% damage'],
  },
  ricochet: {
    maxRank: 3,
    rankTextDe: ['1 Abpraller · 65% Schaden', '2 Abpraller · 70% Schaden', '3 Abpraller · 75% Schaden'],
    rankTextEn: ['1 ricochet · 65% damage', '2 ricochets · 70% damage', '3 ricochets · 75% damage'],
  },
  fireArrow: {
    maxRank: 3,
    rankTextDe: ['2 Brandschaden × 3', '3 Brandschaden × 4', '4 Brandschaden × 5 + Feuerburst beim Tod'],
    rankTextEn: ['2 burn damage × 3', '3 burn damage × 4', '4 burn damage × 5 + death fire burst'],
  },
  iceArrow: {
    maxRank: 3,
    rankTextDe: ['Gegnerbewegung -20% · 2,0s', 'Gegnerbewegung -32% · 2,5s', 'Gegnerbewegung -45% · 3,0s'],
    rankTextEn: ['Enemy movement -20% · 2.0s', 'Enemy movement -32% · 2.5s', 'Enemy movement -45% · 3.0s'],
  },
  attackSpeed: {
    maxRank: 3,
    rankTextDe: ['16% schneller', '30% schneller', '42% schneller'],
    rankTextEn: ['16% faster', '30% faster', '42% faster'],
  },
  piercing: {
    maxRank: 3,
    rankTextDe: ['1 Durchschlag · 70% Schaden', '2 Durchschläge · 75% Schaden', '3 Durchschläge · 80% Schaden'],
    rankTextEn: ['1 pierce · 70% damage', '2 pierces · 75% damage', '3 pierces · 80% damage'],
  },
  elementalStorm: {
    maxRank: 1,
    rankTextDe: ['Feuerpfeil III + Frostpfeil III · jeder fünfte Angriff entfesselt einen kleinen Feuer- oder Frostburst'],
    rankTextEn: ['Fire Arrow III + Frost Arrow III · every fifth attack releases a small fire or frost burst'],
  },
  arrowStorm: {
    maxRank: 1,
    rankTextDe: ['Mehrfachpfeil III + Schnellzug III · jede fünfte Extrasalve trifft bis zu 4 Ziele mit 90% Schaden'],
    rankTextEn: ['Multishot III + Quick Draw III · every fifth extra volley hits up to 4 targets for 90% damage'],
  },
  veilChain: {
    maxRank: 1,
    rankTextDe: ['Abpraller III + Durchbohren III · jeder Kettentreffer verursacht zusätzlich 10% Angriffsschaden'],
    rankTextEn: ['Ricochet III + Piercing III · every chain hit deals an additional 10% attack damage'],
  },
  attack: {
    maxRank: 3,
    rankTextDe: ['+4 Angriff', '+4 Angriff · stärkerer Einschlag', '+5 Angriff · maximaler Einschlag'],
    rankTextEn: ['+4 attack', '+4 attack · heavier impact', '+5 attack · maximum impact'],
  },
  maxHp: {
    maxRank: 3,
    rankTextDe: ['+20 Max-LP und +20 LP', '+25 Max-LP und +25 LP', '+30 Max-LP und +30 LP'],
    rankTextEn: ['+20 max HP and +20 HP', '+25 max HP and +25 HP', '+30 max HP and +30 HP'],
  },
  speed: {
    maxRank: 3,
    rankTextDe: ['+12 Bewegung', '+10 Bewegung · Windspur', '+8 Bewegung · Dash +15%'],
    rankTextEn: ['+12 movement', '+10 movement · wind trail', '+8 movement · dash +15%'],
  },
  defense: {
    maxRank: 3,
    rankTextDe: ['+1 Verteidigung · Schutzflash bei Treffern', '+2 Verteidigung · grüne Schutzfunken', '+2 Verteidigung · maximale Schadensreduktion'],
    rankTextEn: ['+1 defense · guard flash on hits', '+2 defense · green guard sparks', '+2 defense · maximum damage reduction'],
  },
  heal: {
    maxRank: 1,
    rankTextDe: ['Sofort 20% der Max-LP heilen'],
    rankTextEn: ['Instantly heal 20% max HP'],
  },
  hunterBlessing: {
    maxRank: 3,
    rankTextDe: ['Meisterschaft I · +2 Angriff', 'Meisterschaft II · nochmals +2 Angriff', 'Meisterschaft III · letztmals +2 Angriff'],
    rankTextEn: ['Mastery I · +2 attack', 'Mastery II · another +2 attack', 'Mastery III · final +2 attack'],
  },
  vitalSpark: {
    maxRank: 3,
    rankTextDe: ['Meisterschaft I · +8 Max-LP und +8 LP', 'Meisterschaft II · nochmals +8 Max-LP und LP', 'Meisterschaft III · letztmals +8 Max-LP und LP'],
    rankTextEn: ['Mastery I · +8 max HP and HP', 'Mastery II · another +8 max HP and HP', 'Mastery III · final +8 max HP and HP'],
  },
  veilCache: {
    maxRank: 1,
    rankTextDe: ['Sofort +30 Schleierstaub erhalten'],
    rankTextEn: ['Instantly gain +30 Veil Dust'],
  },
  goldCache: {
    maxRank: 1,
    rankTextDe: ['Sofort +300 Gold erhalten'],
    rankTextEn: ['Instantly gain +300 gold'],
  },
};

function rawSkillRank(skills: Partial<Record<UpgradeKey, number>>, key: UpgradeKey) {
  return Math.max(0, Math.min(RUN_SKILL_DEFS[key].maxRank, skills[key] ?? 0));
}

export function isFusionKey(key: UpgradeKey): key is FusionKey {
  return key === 'elementalStorm' || key === 'arrowStorm' || key === 'veilChain';
}

export function isInstantGift(key: UpgradeKey): key is InstantGiftKey {
  return key === 'heal' || key === 'veilCache' || key === 'goldCache';
}

export function isMasteryGift(key: UpgradeKey): key is MasteryGiftKey {
  return key === 'hunterBlessing' || key === 'vitalSpark';
}

export function activeFusionForBase(skills: Partial<Record<UpgradeKey, number>>, key: UpgradeKey): FusionKey | null {
  for (const fusion of Object.keys(FUSION_RECIPES) as FusionKey[]) {
    const components: readonly BaseCombatGiftKey[] = FUSION_RECIPES[fusion];
    if (rawSkillRank(skills, fusion) > 0 && components.includes(key as BaseCombatGiftKey)) return fusion;
  }
  return null;
}

export function skillRank(skills: Partial<Record<UpgradeKey, number>>, key: UpgradeKey) {
  const direct = rawSkillRank(skills, key);
  if (direct > 0 || isFusionKey(key) || isInstantGift(key)) return direct;
  return activeFusionForBase(skills, key) ? 3 : direct;
}

export function nextSkillRank(skills: Partial<Record<UpgradeKey, number>>, key: UpgradeKey) {
  return Math.min(RUN_SKILL_DEFS[key].maxRank, rawSkillRank(skills, key) + 1);
}

export function availableFusionSkills(skills: Partial<Record<UpgradeKey, number>>): FusionKey[] {
  return (Object.keys(FUSION_RECIPES) as FusionKey[]).filter(fusion => {
    if (rawSkillRank(skills, fusion) > 0) return false;
    const [first, second] = FUSION_RECIPES[fusion];
    return rawSkillRank(skills, first) >= 3 && rawSkillRank(skills, second) >= 3;
  });
}

export function consumeFusionComponents(skills: Partial<Record<UpgradeKey, number>>, fusion: FusionKey): void {
  const [first, second] = FUSION_RECIPES[fusion];
  delete skills[first];
  delete skills[second];
  skills[fusion] = 1;
}

export function availableRunSkills(skills: Partial<Record<UpgradeKey, number>>, pool: UpgradeKey[]) {
  return pool.filter(key => {
    if (isInstantGift(key)) return true;
    if (activeFusionForBase(skills, key)) return false;
    return rawSkillRank(skills, key) < RUN_SKILL_DEFS[key].maxRank;
  });
}

function availableOverflowGifts(skills: Partial<Record<UpgradeKey, number>>): OverflowGiftKey[] {
  return OVERFLOW_GIFTS.filter(key => isInstantGift(key) || rawSkillRank(skills, key) < RUN_SKILL_DEFS[key].maxRank);
}

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function buildRunGiftChoices(skills: Partial<Record<UpgradeKey, number>>, pool: UpgradeKey[] = DEFAULT_RUN_UPGRADE_POOL): UpgradeKey[] {
  const fusions = shuffled<UpgradeKey>(availableFusionSkills(skills));
  const regular = shuffled(availableRunSkills(skills, pool));
  const overflow = shuffled<UpgradeKey>(availableOverflowGifts(skills));
  const choices: UpgradeKey[] = [];

  for (const fusion of fusions) if (choices.length < 3) choices.push(fusion);
  for (const gift of regular) if (choices.length < 3 && !choices.includes(gift)) choices.push(gift);
  for (const fallback of overflow) if (choices.length < 3 && !choices.includes(fallback)) choices.push(fallback);

  return choices.slice(0, 3);
}

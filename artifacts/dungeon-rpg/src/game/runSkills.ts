import type { UpgradeKey } from '../i18n/translations';

export type SkillRankDef = {
  maxRank: number;
  rankTextDe: string[];
  rankTextEn: string[];
};

export const RUN_SKILL_DEFS: Record<UpgradeKey, SkillRankDef> = {
  multishot: {
    maxRank: 3,
    rankTextDe: ['2 Pfeile im Fächer', '3 Pfeile im Fächer', '4 Pfeile im breiten Fächer'],
    rankTextEn: ['2 arrows in a fan', '3 arrows in a fan', '4 arrows in a wide fan'],
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
    rankTextDe: ['20% Slow · 2,0s', '32% Slow · 2,5s', '45% Slow · 3,0s'],
    rankTextEn: ['20% slow · 2.0s', '32% slow · 2.5s', '45% slow · 3.0s'],
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
  attack: {
    maxRank: 3,
    rankTextDe: ['+4 Angriff', '+4 Angriff · stärkerer Einschlag', '+5 Angriff · maximaler Einschlag'],
    rankTextEn: ['+4 attack', '+4 attack · heavier impact', '+5 attack · maximum impact'],
  },
  maxHp: {
    maxRank: 3,
    rankTextDe: ['+20 Max-LP', '+25 Max-LP', '+30 Max-LP'],
    rankTextEn: ['+20 max HP', '+25 max HP', '+30 max HP'],
  },
  speed: {
    maxRank: 3,
    rankTextDe: ['+12 Bewegung', '+10 Bewegung · Windspur', '+8 Bewegung · Dash +15%'],
    rankTextEn: ['+12 movement', '+10 movement · wind trail', '+8 movement · dash +15%'],
  },
  defense: {
    maxRank: 3,
    rankTextDe: ['+1 Verteidigung', '+2 Verteidigung', '+2 Verteidigung · starker Schutzflash'],
    rankTextEn: ['+1 defense', '+2 defense', '+2 defense · strong guard flash'],
  },
  heal: {
    maxRank: 1,
    rankTextDe: ['50% Heilung'],
    rankTextEn: ['50% heal'],
  },
};

export function skillRank(skills: Partial<Record<UpgradeKey, number>>, key: UpgradeKey) {
  return Math.max(0, Math.min(RUN_SKILL_DEFS[key].maxRank, skills[key] ?? 0));
}

export function nextSkillRank(skills: Partial<Record<UpgradeKey, number>>, key: UpgradeKey) {
  return Math.min(RUN_SKILL_DEFS[key].maxRank, skillRank(skills, key) + 1);
}

export function availableRunSkills(skills: Partial<Record<UpgradeKey, number>>, pool: UpgradeKey[]) {
  return pool.filter(key => key === 'heal' || skillRank(skills, key) < RUN_SKILL_DEFS[key].maxRank);
}

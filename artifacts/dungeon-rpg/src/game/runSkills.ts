import type { UpgradeKey } from '../i18n/translations';

export type SkillRankDef = {
  maxRank: number;
  rankTextDe: string[];
  rankTextEn: string[];
};

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
    rankTextDe: ['Sofort 50% Max-LP heilen'],
    rankTextEn: ['Instantly heal 50% max HP'],
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

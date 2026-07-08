export type ClassKey = 'warrior' | 'mage' | 'archer';

export interface ClassDef {
  key: ClassKey;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  color: string;
  glowColor: string;
  attackRange: number;
  attackCooldownMs: number;
  skillCooldownMs: number;
  skillRange: number;
  skillDamageMult: number;
  dodgeCooldownMs: number;
  dashDistance: number;
  skillEffectColor: string;
}

export const CLASS_DEFS: Record<ClassKey, ClassDef> = {
  warrior: {
    key: 'warrior',
    maxHp: 150,
    attack: 12,
    defense: 8,
    speed: 118,
    color: '#3498db',
    glowColor: 'rgba(52,152,219,0.6)',
    attackRange: 65,
    attackCooldownMs: 350,
    skillCooldownMs: 6000,
    skillRange: 130,
    skillDamageMult: 2.5,
    dodgeCooldownMs: 1200,
    dashDistance: 80,
    skillEffectColor: 'rgba(231,76,60,0.55)',
  },
  mage: {
    key: 'mage',
    maxHp: 80,
    attack: 20,
    defense: 2,
    speed: 130,
    color: '#9b59b6',
    glowColor: 'rgba(155,89,182,0.7)',
    attackRange: 55,
    attackCooldownMs: 550,
    skillCooldownMs: 4000,
    skillRange: 175,
    skillDamageMult: 3.0,
    dodgeCooldownMs: 1800,
    dashDistance: 105,
    skillEffectColor: 'rgba(155,89,182,0.6)',
  },
  archer: {
    key: 'archer',
    maxHp: 100,
    attack: 10,
    defense: 4,
    speed: 218,
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.6)',
    attackRange: 105,
    attackCooldownMs: 270,
    skillCooldownMs: 3000,
    skillRange: 95,
    skillDamageMult: 1.4,
    dodgeCooldownMs: 900,
    dashDistance: 100,
    skillEffectColor: 'rgba(46,204,113,0.55)',
  },
};

export const CLASS_SKILL_NAMES: Record<ClassKey, { en: string; de: string }> = {
  warrior: { en: 'RAGE', de: 'WUT' },
  mage:    { en: 'BOLT', de: 'BLITZ' },
  archer:  { en: 'RAIN', de: 'PFEILREGEN' },
};

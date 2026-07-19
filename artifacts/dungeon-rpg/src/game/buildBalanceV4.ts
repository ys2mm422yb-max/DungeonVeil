export const BUILD_REFERENCE_V4 = Object.freeze({
  starter: { attack: 15, critChance: 0.05, critDamage: 1.5, maxHp: 168, defense: 0, range: 560, attackSpeed: 0 },
  attack: { attack: 33, critChance: 0.05, critDamage: 1.5, maxHp: 230, defense: 5, range: 592, attackSpeed: 0.05 },
  critical: { attack: 29, critChance: 0.14, critDamage: 1.68, maxHp: 206, defense: 5, range: 565, attackSpeed: 0.18 },
  range: { attack: 24, critChance: 0.05, critDamage: 1.5, maxHp: 206, defense: 5, range: 670, attackSpeed: 0 },
  tank: { attack: 24, critChance: 0.05, critDamage: 1.5, maxHp: 222, defense: 11, range: 592, attackSpeed: 0.05 },
  hybrid: { attack: 30, critChance: 0.105, critDamage: 1.5, maxHp: 225, defense: 5, range: 592, attackSpeed: 0.11 },
  maximum: { attack: 42, critChance: 0.15, critDamage: 1.68, maxHp: 246, defense: 11, range: 670, attackSpeed: 0.18 },
});

export const DUO_BALANCE_V4 = Object.freeze({
  normalHp: 1.72,
  eliteHp: 1.92,
  bossHp: 2.18,
  enemyAttack: 1.16,
  spawnFactor: 1.20,
  mobileEnemyCap: 12,
  disconnectHpFactor: 0.78,
  disconnectAttackFactor: 0.92,
});

export const WORLD_BOSS_BALANCE_V4 = Object.freeze({
  health: 118000,
  timeLimitSeconds: 150,
  fireBreathDamage: 34,
  clawDamage: 27,
  slamDamage: 42,
  armorMitigationCap: 0.40,
  balanceSeason: 'equipment-v4-s1',
});

export const COMPANION_RESERVE_V4 = Object.freeze({
  minimumEffectivePower: 0.08,
  averageEffectivePower: 0.10,
  maximumEffectivePower: 0.12,
  maxVisiblePerPlayer: 1,
  duoVisibleCap: 2,
  projectileBudgetPerCompanion: 2,
  particleBudgetPerCompanion: 12,
  aiUpdatesPerSecond: 10,
  blocksPlayers: false,
  reviveTarget: false,
});

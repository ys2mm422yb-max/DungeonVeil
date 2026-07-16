#!/usr/bin/env node

export const COMBAT_BASE = Object.freeze({
  slime: { hp: 20, attack: 4, defense: 0 },
  goblin: { hp: 28, attack: 6, defense: 1 },
  skeleton: { hp: 42, attack: 8, defense: 2 },
  orc: { hp: 72, attack: 11, defense: 4 },
  spider: { hp: 30, attack: 7, defense: 1 },
  vampire: { hp: 65, attack: 12, defense: 3 },
  demon: { hp: 100, attack: 15, defense: 4 },
  golem: { hp: 145, attack: 17, defense: 9 },
  boss: { hp: 520, attack: 24, defense: 7 },
});

export const BOSS_TIERS = Object.freeze({
  10: { hp: 900, attack: 20 },
  20: { hp: 1600, attack: 27 },
  30: { hp: 2600, attack: 34 },
  40: { hp: 4200, attack: 42 },
  50: { hp: 6500, attack: 50 },
});

export function roomHpScale(room) {
  const value = Math.max(1, Math.min(50, Math.floor(room)));
  if (value <= 2) return 1 + (value - 1) * 0.04;
  if (value <= 5) return 1.1 + (value - 3) * 0.06;
  if (value <= 9) return 1.28 + (value - 6) * 0.07;
  if (value === 10) return 1;
  if (value <= 19) return 1.5 + (value - 11) * 0.05;
  if (value === 20) return 1;
  if (value <= 29) return 1.9 + (value - 21) * 0.05;
  if (value === 30) return 1;
  if (value <= 39) return 2.25 + (value - 31) * 0.045;
  if (value === 40) return 1;
  if (value <= 49) return 2.4 + (value - 41) * 0.04;
  return 1;
}

export function roomAttackScale(room) {
  return 1 + Math.max(0, Math.max(1, Math.min(50, Math.floor(room))) - 1) * 0.012;
}

export function chapterScales(chapter) {
  const value = Math.max(1, Math.floor(chapter));
  const boundedSteps = Math.min(5, value - 1);
  const overflow = Math.max(0, value - 6);
  return {
    hp: 1 + boundedSteps * 0.12 + overflow * 0.08,
    attack: 1 + boundedSteps * 0.08 + overflow * 0.06,
    bossHp: 1 + boundedSteps * 0.12 + overflow * 0.08,
  };
}

function arrowDamage(playerAttack, enemyDefense) {
  return Math.max(1, Math.round(playerAttack - enemyDefense * 0.5));
}

function hitsToKill(enemyType, room, playerAttack, chapter = 1, elite = false) {
  const base = COMBAT_BASE[enemyType];
  const scales = chapterScales(chapter);
  const hp = Math.round(base.hp * roomHpScale(room) * scales.hp * (elite ? 1.3 : 1));
  const defense = base.defense + (elite ? 3 : 0);
  return Math.ceil(hp / arrowDamage(playerAttack, defense));
}

function hitsToSurvive(enemyType, room, playerHp, playerDefense = 0, chapter = 1, elite = false) {
  const base = COMBAT_BASE[enemyType];
  const scales = chapterScales(chapter);
  const attack = Math.round(base.attack * roomAttackScale(room) * scales.attack * (elite ? 1.1 : 1));
  return Math.ceil(playerHp / Math.max(1, attack - playerDefense));
}

function bossSeconds(room, playerAttack, cooldownSeconds, chapter = 1) {
  const tier = BOSS_TIERS[room];
  const scales = chapterScales(chapter);
  const hp = Math.round(tier.hp * scales.bossHp);
  const damage = arrowDamage(playerAttack, COMBAT_BASE.boss.defense);
  return Math.round(Math.ceil(hp / damage) * cooldownSeconds * 10) / 10;
}

export function simulateCentralCombatBalance() {
  const normalSamples = [
    { label: 'room-1-slime', hits: hitsToKill('slime', 1, 10) },
    { label: 'room-9-orc', hits: hitsToKill('orc', 9, 16) },
    { label: 'room-19-vampire', hits: hitsToKill('vampire', 19, 22) },
    { label: 'room-29-demon', hits: hitsToKill('demon', 29, 26) },
    { label: 'room-39-demon', hits: hitsToKill('demon', 39, 29) },
    { label: 'room-49-vampire', hits: hitsToKill('vampire', 49, 32) },
    { label: 'room-49-golem', hits: hitsToKill('golem', 49, 32) },
  ];
  const eliteSamples = [
    { label: 'room-19-vampire-elite', hits: hitsToKill('vampire', 19, 22, 1, true) },
    { label: 'room-39-demon-elite', hits: hitsToKill('demon', 39, 29, 1, true) },
  ];
  const survivalSamples = [
    { label: 'room-9-orc', hits: hitsToSurvive('orc', 9, 120) },
    { label: 'room-29-demon', hits: hitsToSurvive('demon', 29, 160, 2) },
    { label: 'room-49-golem', hits: hitsToSurvive('golem', 49, 200, 3) },
  ];
  const bossSamples = [
    { room: 10, seconds: bossSeconds(10, 18, 0.6) },
    { room: 20, seconds: bossSeconds(20, 24, 0.55) },
    { room: 30, seconds: bossSeconds(30, 29, 0.5) },
    { room: 40, seconds: bossSeconds(40, 34, 0.48) },
    { room: 50, seconds: bossSeconds(50, 40, 0.45) },
  ];
  return {
    scenario: 'central-combat-balance',
    normalSamples,
    eliteSamples,
    survivalSamples,
    bossSamples,
    chapterProfiles: [1, 2, 3, 4, 5, 6, 8, 10].map(chapter => ({ chapter, ...chapterScales(chapter) })),
    eliteRules: { hp: 1.3, attack: 1.1, speed: 1.04, affixes: ['bulwark', 'berserker', 'swift'] },
  };
}

const direct = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (direct) console.log(JSON.stringify(simulateCentralCombatBalance(), null, 2));

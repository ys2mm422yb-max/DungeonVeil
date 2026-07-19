#!/usr/bin/env node

const BUILDS = Object.freeze({
  starter: { attack: 15, critChance: 0.05, critDamage: 1.5, maxHp: 168, defense: 0, range: 560, attackSpeed: 0 },
  attack: { attack: 33, critChance: 0.05, critDamage: 1.5, maxHp: 230, defense: 5, range: 592, attackSpeed: 0.05 },
  critical: { attack: 29, critChance: 0.14, critDamage: 1.68, maxHp: 206, defense: 5, range: 565, attackSpeed: 0.18 },
  range: { attack: 24, critChance: 0.05, critDamage: 1.5, maxHp: 206, defense: 5, range: 670, attackSpeed: 0 },
  tank: { attack: 24, critChance: 0.05, critDamage: 1.5, maxHp: 222, defense: 11, range: 592, attackSpeed: 0.05 },
  hybrid: { attack: 30, critChance: 0.105, critDamage: 1.5, maxHp: 225, defense: 5, range: 592, attackSpeed: 0.11 },
  maximum: { attack: 42, critChance: 0.15, critDamage: 1.68, maxHp: 246, defense: 11, range: 670, attackSpeed: 0.18 },
});

const RELICS = Object.freeze({
  none: { attackFactor: 1, hpFactor: 1, speedBonus: 0, runeReduction: 0, reviveHealth: 0 },
  markedClaw: { attackFactor: 1, hpFactor: 1, speedBonus: 0.14 * (2.5 / 7.5), runeReduction: 0, reviveHealth: 0 },
  guardianCrown: { attackFactor: 1.12, hpFactor: 1, speedBonus: 0, runeReduction: 0, reviveHealth: 0 },
  runeShard: { attackFactor: 1, hpFactor: 1, speedBonus: 0, runeReduction: 0.18, reviveHealth: 0 },
  worldCore: { attackFactor: 1.04, hpFactor: 1.07, speedBonus: 0, runeReduction: 0, reviveHealth: 0 },
  veilHeart: { attackFactor: 1, hpFactor: 1, speedBonus: 0, runeReduction: 0, reviveHealth: 0.25 },
});

const GIFTS = Object.freeze({
  none: { attackFlat: 0, hpFlat: 0, quickDraw: 1, arrows: 1, followUpFactor: 1 },
  balanced: { attackFlat: 4, hpFlat: 16, quickDraw: 1.16, arrows: 2.64, followUpFactor: 1.08 },
  maximum: { attackFlat: 6, hpFlat: 24, quickDraw: 1.42, arrows: 3.46, followUpFactor: 1.13 },
});

const DUO = Object.freeze({
  normalHp: 1.72, eliteHp: 1.92, bossHp: 2.18, enemyAttack: 1.16,
  spawnFactor: 1.20, mobileEnemyCap: 12, bossSupportCount: 2,
  disconnectHpFactor: 0.78, disconnectAttackFactor: 0.92,
});

const LOADOUT_ORIENTATIONS = Object.freeze([
  { profile: 'none', orientation: 'symmetric', players: [['none', 'none'], ['none', 'none']] },
  { profile: 'balanced', orientation: 'forward', players: [['worldCore', 'balanced'], ['runeShard', 'balanced']] },
  { profile: 'balanced', orientation: 'reverse', players: [['runeShard', 'balanced'], ['worldCore', 'balanced']] },
  { profile: 'resilience', orientation: 'forward', players: [['veilHeart', 'balanced'], ['runeShard', 'balanced']] },
  { profile: 'resilience', orientation: 'reverse', players: [['runeShard', 'balanced'], ['veilHeart', 'balanced']] },
  { profile: 'offense', orientation: 'forward', players: [['guardianCrown', 'maximum'], ['markedClaw', 'maximum']] },
  { profile: 'offense', orientation: 'reverse', players: [['markedClaw', 'maximum'], ['guardianCrown', 'maximum']] },
  { profile: 'maximum', orientation: 'symmetric', players: [['guardianCrown', 'maximum'], ['guardianCrown', 'maximum']] },
]);

const CHECKPOINTS = Object.freeze([
  { chapter: 1, room: 1 }, { chapter: 1, room: 9 }, { chapter: 1, room: 10 },
  { chapter: 3, room: 19 }, { chapter: 3, room: 20 },
  { chapter: 5, room: 29 }, { chapter: 5, room: 30 },
  { chapter: 8, room: 39 }, { chapter: 8, room: 40 },
  { chapter: 10, room: 49 }, { chapter: 10, room: 50 },
]);

const BOSS_TARGETS = Object.freeze({
  10: { hp: 920, attack: 21 }, 20: { hp: 1750, attack: 29 },
  30: { hp: 2850, attack: 38 }, 40: { hp: 4300, attack: 49 },
  50: { hp: 6500, attack: 61 },
});
const SUPPORT = Object.freeze({
  goblin: { hp: 34, attack: 6, rangedShare: 0.12 }, skeleton: { hp: 52, attack: 8, rangedShare: 0.42 },
  orc: { hp: 92, attack: 12, rangedShare: 0.12 }, spider: { hp: 38, attack: 7, rangedShare: 0.12 },
  vampire: { hp: 82, attack: 14, rangedShare: 0.42 }, demon: { hp: 128, attack: 18, rangedShare: 0.42 },
  golem: { hp: 190, attack: 20, rangedShare: 0.12 },
});

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
function mitigation(defense, cap = 0.52) {
  return Math.min(cap, Math.max(0, defense) / (Math.max(0, defense) + 32));
}
function chapterProfile(chapter) {
  const profiles = [
    [1.00, 1.00, 1.00], [1.13, 1.09, 1.16], [1.27, 1.18, 1.34], [1.43, 1.28, 1.56], [1.62, 1.39, 1.80],
    [1.83, 1.51, 2.05], [2.05, 1.64, 2.32], [2.28, 1.78, 2.62], [2.52, 1.93, 2.94], [2.78, 2.09, 3.28],
  ];
  const [hpScale, attackScale, bossHpScale] = profiles[Math.max(0, Math.min(9, chapter - 1))];
  return { hpScale, attackScale, bossHpScale };
}
function roomScale(room) {
  if (room <= 9) return { hp: 1 + (room - 1) * 0.018, attack: 1 + (room - 1) * 0.008 };
  if (room <= 19) return { hp: 1.18 + (room - 10) * 0.024, attack: 1.08 + (room - 10) * 0.011 };
  if (room <= 29) return { hp: 1.42 + (room - 20) * 0.028, attack: 1.20 + (room - 20) * 0.013 };
  if (room <= 39) return { hp: 1.72 + (room - 30) * 0.032, attack: 1.34 + (room - 30) * 0.015 };
  return { hp: 2.06 + (room - 40) * 0.038, attack: 1.50 + (room - 40) * 0.017 };
}
function supportTypes(room) {
  if (room <= 10) return ['goblin', 'skeleton'];
  if (room <= 20) return ['orc', 'spider'];
  if (room <= 30) return ['vampire', 'skeleton'];
  if (room <= 40) return ['demon', 'vampire'];
  return ['golem', 'demon'];
}
function encounterProfile(chapter, room) {
  const chapterScale = chapterProfile(chapter);
  const roomMultiplier = roomScale(room);
  const boss = BOSS_TARGETS[room];
  if (boss) {
    return {
      type: 'boss', baseCount: 1, enemyHp: boss.hp * chapterScale.bossHpScale,
      enemyAttack: boss.attack * chapterScale.attackScale, attacksPerSecond: 0.72 + room / 250,
      meleeShare: room >= 40 ? 0.58 : 0.68, runeShare: room >= 30 ? 0.20 : 0.08,
      pressure: 1.08 + room / 220, chapterScale, roomMultiplier,
    };
  }
  const band = Math.floor((room - 1) / 10);
  return {
    type: band >= 3 ? 'elite-pack' : band >= 1 ? 'mixed-pack' : 'normal-pack',
    baseCount: Math.min(10, 3 + band + Math.floor((room % 10) / 3)),
    enemyHp: (92 + band * 42) * chapterScale.hpScale * roomMultiplier.hp,
    enemyAttack: (11 + band * 4) * chapterScale.attackScale * roomMultiplier.attack,
    attacksPerSecond: 0.54 + band * 0.06, meleeShare: Math.max(0.45, 0.75 - band * 0.06),
    runeShare: band >= 2 ? 0.12 : 0, pressure: 0.78 + band * 0.11 + room / 500,
    chapterScale, roomMultiplier,
  };
}
function playerProfile(buildName, relicName, giftName) {
  const build = BUILDS[buildName];
  const relic = RELICS[relicName];
  const gifts = GIFTS[giftName];
  const attack = (build.attack + gifts.attackFlat) * relic.attackFactor;
  const hp = (build.maxHp + gifts.hpFlat) * relic.hpFactor;
  const expectedCrit = 1 + build.critChance * (build.critDamage - 1);
  const speedMultiplier = Math.min(1.75, (1 + build.attackSpeed + relic.speedBonus) * gifts.quickDraw);
  const attackCooldownMs = Math.max(125, 270 / speedMultiplier);
  const attacksPerSecond = 1000 / attackCooldownMs;
  const projectileRate = attacksPerSecond * gifts.arrows;
  const rangeUptime = Math.min(1, 0.82 + Math.max(0, build.range - 560) / 620);
  return {
    build: buildName, relic: relicName, gifts: giftName, attack, hp,
    defense: build.defense, range: build.range, runeReduction: relic.runeReduction,
    reviveHealth: relic.reviveHealth, attackCooldownMs,
    effectiveDps: attack * expectedCrit * attacksPerSecond * gifts.followUpFactor * rangeUptime,
    projectileRate,
  };
}
function duoEncounter(checkpoint) {
  const encounter = encounterProfile(checkpoint.chapter, checkpoint.room);
  if (encounter.type === 'boss') {
    const support = supportTypes(checkpoint.room).slice(0, DUO.bossSupportCount);
    const supportHp = support.reduce((sum, type) => (
      sum + SUPPORT[type].hp * encounter.chapterScale.hpScale * encounter.roomMultiplier.hp * DUO.normalHp
    ), 0);
    const supportAttackBudget = support.reduce((sum, type) => {
      const scale = encounter.chapterScale.hpScale * encounter.roomMultiplier.hp;
      const attackScale = 1 + Math.max(0, scale - 1) * 0.62;
      return sum + SUPPORT[type].attack * attackScale * 0.60;
    }, 0);
    return {
      ...encounter, enemyCount: 1 + support.length, supportCount: support.length,
      totalEnemyHp: encounter.enemyHp * DUO.bossHp + supportHp,
      enemyAttackBudget: (encounter.enemyAttack * encounter.attacksPerSecond + supportAttackBudget) * DUO.enemyAttack,
      enemyProjectileLoad: Math.min(12, 4.2 + support.reduce((sum, type) => sum + 0.60 * SUPPORT[type].rangedShare, 0)),
    };
  }
  const enemyCount = Math.min(DUO.mobileEnemyCap, Math.max(encounter.baseCount, Math.ceil(encounter.baseCount * DUO.spawnFactor)));
  const hpMultiplier = encounter.type === 'elite-pack' ? DUO.eliteHp : DUO.normalHp;
  return {
    ...encounter, enemyCount, supportCount: Math.max(0, enemyCount - encounter.baseCount),
    totalEnemyHp: encounter.enemyHp * enemyCount * hpMultiplier,
    enemyAttackBudget: encounter.enemyAttack * encounter.attacksPerSecond * enemyCount * DUO.enemyAttack,
    enemyProjectileLoad: Math.min(12, enemyCount * encounter.attacksPerSecond * (1 - encounter.meleeShare)),
  };
}
function soloTtk(player, encounter) {
  return encounter.enemyHp * encounter.baseCount / Math.max(1, player.effectiveDps);
}
function simulateScenario(buildPair, loadout, checkpoint, connectivity, survivorIndex = null) {
  const encounter = duoEncounter(checkpoint);
  const players = buildPair.map((buildName, index) => {
    const [relicName, giftName] = loadout.players[index];
    return playerProfile(buildName, relicName, giftName);
  });
  const disconnected = connectivity === 'disconnected';
  const activePlayers = disconnected ? [players[survivorIndex]] : players;
  const totalEnemyHp = encounter.totalEnemyHp * (disconnected ? DUO.disconnectHpFactor : 1);
  const enemyAttackBudget = encounter.enemyAttackBudget * (disconnected ? DUO.disconnectAttackFactor : 1);
  const totalDps = activePlayers.reduce((sum, player) => sum + player.effectiveDps, 0);
  const ttkSeconds = totalEnemyHp / Math.max(1, totalDps);
  const localProjectileLoad = disconnected
    ? activePlayers[0].projectileRate + encounter.enemyProjectileLoad
    : Math.max(...players.map(player => player.projectileRate))
      + Math.min(...players.map(player => player.projectileRate)) * 0.35
      + encounter.enemyProjectileLoad;
  const damageReceived = activePlayers.map(player => {
    const defenseCap = encounter.type === 'boss' ? 0.44 : 0.52;
    const defenseFactor = 1 - mitigation(player.defense, defenseCap);
    const runeFactor = 1 - encounter.runeShare * player.runeReduction;
    const rangeAvoidance = 1 - Math.min(0.24, Math.max(0, player.range - 560) / 460) * encounter.meleeShare;
    const aggroShare = disconnected ? 1 : 0.56;
    return enemyAttackBudget * encounter.pressure * 0.18 * defenseFactor * runeFactor * rangeAvoidance * aggroShare * ttkSeconds;
  });
  const averageRange = activePlayers.reduce((sum, player) => sum + player.range, 0) / activePlayers.length;
  const mobileControlScore = Math.max(0, Math.min(1,
    1.1 - localProjectileLoad / 50 - Math.max(0, encounter.enemyCount - 8) * 0.035
      + Math.min(0.12, Math.max(0, averageRange - 560) / 900),
  ));
  const soloBaselines = players.map(player => soloTtk(player, encounter));
  const pairDps = players.reduce((sum, value) => sum + value.effectiveDps, 0);
  const contributionShares = players.map(player => player.effectiveDps / pairDps);
  return {
    pair: [...buildPair], loadout: loadout.profile, orientation: loadout.orientation,
    chapter: checkpoint.chapter, room: checkpoint.room, encounterType: encounter.type,
    connectivity, survivorIndex, enemyCount: encounter.enemyCount, supportCount: encounter.supportCount,
    totalEnemyHp: Math.round(totalEnemyHp), totalDps: round(totalDps), ttkSeconds: round(ttkSeconds),
    soloBaselines: soloBaselines.map(value => round(value)), contributionShares: contributionShares.map(value => round(value)),
    attackCooldownMs: activePlayers.map(player => Math.round(player.attackCooldownMs)),
    localProjectileLoad: round(localProjectileLoad), mobileControlScore: round(mobileControlScore),
    damageReceived: damageReceived.map(value => Math.round(value)),
    effectiveHealth: activePlayers.map(player => Math.round(player.hp * (1 + player.reviveHealth))),
    disconnectHpFactor: disconnected ? DUO.disconnectHpFactor : 1,
    disconnectAttackFactor: disconnected ? DUO.disconnectAttackFactor : 1,
  };
}
function buildPairs() {
  const names = Object.keys(BUILDS);
  const pairs = [];
  for (let first = 0; first < names.length; first++) {
    for (let second = first; second < names.length; second++) pairs.push([names[first], names[second]]);
  }
  return pairs;
}

export function simulateDuoCombatMatrixV4() {
  const pairs = buildPairs();
  const rows = [];
  for (const pair of pairs) {
    for (const loadout of LOADOUT_ORIENTATIONS) {
      for (const checkpoint of CHECKPOINTS) {
        rows.push(simulateScenario(pair, loadout, checkpoint, 'connected'));
        rows.push(simulateScenario(pair, loadout, checkpoint, 'disconnected', 0));
        rows.push(simulateScenario(pair, loadout, checkpoint, 'disconnected', 1));
      }
    }
  }
  return {
    buildCount: Object.keys(BUILDS).length,
    pairCount: pairs.length,
    loadoutProfileCount: new Set(LOADOUT_ORIENTATIONS.map(value => value.profile)).size,
    loadoutOrientationCount: LOADOUT_ORIENTATIONS.length,
    checkpointCount: CHECKPOINTS.length,
    scenarioCount: rows.length,
    rows,
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const report = simulateDuoCombatMatrixV4();
  console.log(JSON.stringify({
    buildCount: report.buildCount,
    pairCount: report.pairCount,
    loadoutProfileCount: report.loadoutProfileCount,
    loadoutOrientationCount: report.loadoutOrientationCount,
    checkpointCount: report.checkpointCount,
    scenarioCount: report.scenarioCount,
    maximumLocalProjectileLoad: Math.max(...report.rows.map(row => row.localProjectileLoad)),
    minimumMobileControlScore: Math.min(...report.rows.map(row => row.mobileControlScore)),
  }, null, 2));
}

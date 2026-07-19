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

const GIFT_PROFILES = Object.freeze({
  none: { attackFlat: 0, hpFlat: 0, quickDraw: 1, arrows: 1, followUpFactor: 1 },
  balanced: { attackFlat: 4, hpFlat: 16, quickDraw: 1.16, arrows: 2.64, followUpFactor: 1.08 },
  maximum: { attackFlat: 6, hpFlat: 24, quickDraw: 1.42, arrows: 3.46, followUpFactor: 1.13 },
});

const CHECKPOINTS = Object.freeze([
  { chapter: 1, room: 1 },
  { chapter: 1, room: 10 },
  { chapter: 3, room: 20 },
  { chapter: 5, room: 30 },
  { chapter: 8, room: 40 },
  { chapter: 10, room: 50 },
]);

const BOSS_TARGETS = Object.freeze({
  10: { hp: 920, attack: 21 },
  20: { hp: 1750, attack: 29 },
  30: { hp: 2850, attack: 38 },
  40: { hp: 4300, attack: 49 },
  50: { hp: 6500, attack: 61 },
});

function chapterProfile(chapter) {
  const profiles = [
    [1.00, 1.00, 1.00], [1.13, 1.09, 1.16], [1.27, 1.18, 1.34], [1.43, 1.28, 1.56], [1.62, 1.39, 1.80],
    [1.83, 1.51, 2.05], [2.05, 1.64, 2.32], [2.28, 1.78, 2.62], [2.52, 1.93, 2.94], [2.78, 2.09, 3.28],
  ];
  if (chapter <= 10) {
    const [hpScale, attackScale, bossHpScale] = profiles[Math.max(0, chapter - 1)];
    return { hpScale, attackScale, bossHpScale };
  }
  const overflow = chapter - 10;
  const damped = Math.log2(overflow + 1);
  return { hpScale: 2.78 + damped * 0.20, attackScale: 2.09 + damped * 0.12, bossHpScale: 3.28 + damped * 0.28 };
}
function roomScale(room) {
  if (room <= 9) return { hp: 1 + (room - 1) * 0.018, attack: 1 + (room - 1) * 0.008 };
  if (room <= 19) return { hp: 1.18 + (room - 10) * 0.024, attack: 1.08 + (room - 10) * 0.011 };
  if (room <= 29) return { hp: 1.42 + (room - 20) * 0.028, attack: 1.20 + (room - 20) * 0.013 };
  if (room <= 39) return { hp: 1.72 + (room - 30) * 0.032, attack: 1.34 + (room - 30) * 0.015 };
  return { hp: 2.06 + (room - 40) * 0.038, attack: 1.50 + (room - 40) * 0.017 };
}
function mitigation(defense, cap = 0.52) {
  return Math.min(cap, Math.max(0, defense) / (Math.max(0, defense) + 32));
}
function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
function bossRoom(room) {
  return BOSS_TARGETS[room] ? room : null;
}
function encounterProfile(chapter, room) {
  const chapterScale = chapterProfile(chapter);
  const roomMultiplier = roomScale(room);
  const boss = bossRoom(room);
  if (boss) {
    const target = BOSS_TARGETS[boss];
    return {
      type: 'boss', count: 1,
      enemyHp: target.hp * chapterScale.bossHpScale,
      enemyAttack: target.attack * chapterScale.attackScale,
      attacksPerSecond: 0.72 + room / 250,
      meleeShare: room >= 40 ? 0.58 : 0.68,
      runeShare: room >= 30 ? 0.20 : 0.08,
      pressure: 1.08 + room / 220,
    };
  }
  const band = Math.floor((room - 1) / 10);
  return {
    type: band >= 3 ? 'elite-pack' : band >= 1 ? 'mixed-pack' : 'normal-pack',
    count: Math.min(10, 3 + band + Math.floor((room % 10) / 3)),
    enemyHp: (92 + band * 42) * chapterScale.hpScale * roomMultiplier.hp,
    enemyAttack: (11 + band * 4) * chapterScale.attackScale * roomMultiplier.attack,
    attacksPerSecond: 0.54 + band * 0.06,
    meleeShare: Math.max(0.45, 0.75 - band * 0.06),
    runeShare: band >= 2 ? 0.12 : 0,
    pressure: 0.78 + band * 0.11 + room / 500,
  };
}

function simulateEncounter(buildName, relicName, giftName, checkpoint) {
  const build = BUILDS[buildName];
  const relic = RELICS[relicName];
  const gifts = GIFT_PROFILES[giftName];
  const encounter = encounterProfile(checkpoint.chapter, checkpoint.room);
  const attack = (build.attack + gifts.attackFlat) * relic.attackFactor;
  const hp = (build.maxHp + gifts.hpFlat) * relic.hpFactor;
  const expectedCrit = 1 + build.critChance * (build.critDamage - 1);
  const totalSpeedMultiplier = Math.min(1.75, (1 + build.attackSpeed + relic.speedBonus) * gifts.quickDraw);
  const attackCooldownMs = Math.max(125, 270 / totalSpeedMultiplier);
  const attacksPerSecond = 1000 / attackCooldownMs;
  const projectileRate = attacksPerSecond * gifts.arrows;
  const rangeUptime = Math.min(1, 0.82 + Math.max(0, build.range - 560) / 620);
  const effectiveDps = attack * expectedCrit * attacksPerSecond * gifts.followUpFactor * rangeUptime;
  const totalEnemyHp = encounter.enemyHp * encounter.count;
  const ttkSeconds = totalEnemyHp / Math.max(1, effectiveDps);
  const hitsRequired = Math.max(encounter.count, Math.ceil(totalEnemyHp / Math.max(1, attack * expectedCrit)));
  const defenseCap = encounter.type === 'boss' ? 0.44 : 0.52;
  const defenseFactor = 1 - mitigation(build.defense, defenseCap);
  const runeFactor = 1 - encounter.runeShare * relic.runeReduction;
  const rangeAvoidance = 1 - Math.min(0.24, Math.max(0, build.range - 560) / 460) * encounter.meleeShare;
  const incomingDps = encounter.enemyAttack * encounter.attacksPerSecond * encounter.count * encounter.pressure * defenseFactor * runeFactor * rangeAvoidance * 0.18;
  const damageReceived = Math.max(1, incomingDps * ttkSeconds);
  const effectiveHealth = hp * (1 + relic.reviveHealth);
  const healingNeeded = Math.max(0, damageReceived - effectiveHealth * 0.72);
  const roomDurationSeconds = ttkSeconds + Math.min(18, encounter.count * 0.85 + checkpoint.room * 0.04);
  const projectileLoad = projectileRate + Math.min(12, encounter.count * encounter.attacksPerSecond * (1 - encounter.meleeShare));
  const mobileControlScore = Math.max(0, Math.min(1,
    1.08 - projectileLoad / 34 - Math.max(0, encounter.count - 8) * 0.035
    - Math.max(0, incomingDps / Math.max(1, hp) - 0.18) * 0.7
    + Math.min(0.12, Math.max(0, build.range - 560) / 900),
  ));

  return {
    build: buildName, relic: relicName, gifts: giftName,
    chapter: checkpoint.chapter, room: checkpoint.room,
    encounterType: encounter.type, enemyCount: encounter.count,
    effectiveDps: round(effectiveDps), ttkSeconds: round(ttkSeconds), hitsRequired,
    damageDealt: Math.round(totalEnemyHp), damageReceived: Math.round(damageReceived),
    healingNeeded: Math.round(healingNeeded), incomingDps: round(incomingDps),
    projectileRate: round(projectileRate), totalProjectileLoad: round(projectileLoad),
    attackCooldownMs: Math.round(attackCooldownMs), mitigation: round(mitigation(build.defense, defenseCap)),
    mobileControlScore: round(mobileControlScore), roomDurationSeconds: round(roomDurationSeconds),
    survivesWithoutHealing: damageReceived < effectiveHealth,
  };
}

export function simulateSoloCombatMatrixV4() {
  const rows = [];
  for (const build of Object.keys(BUILDS)) {
    for (const relic of Object.keys(RELICS)) {
      for (const gifts of Object.keys(GIFT_PROFILES)) {
        for (const checkpoint of CHECKPOINTS) rows.push(simulateEncounter(build, relic, gifts, checkpoint));
      }
    }
  }
  const byBuild = Object.fromEntries(Object.keys(BUILDS).map(build => {
    const buildRows = rows.filter(row => row.build === build);
    return [build, {
      scenarios: buildRows.length,
      minimumTtkSeconds: Math.min(...buildRows.map(row => row.ttkSeconds)),
      maximumTtkSeconds: Math.max(...buildRows.map(row => row.ttkSeconds)),
      maximumProjectileRate: Math.max(...buildRows.map(row => row.projectileRate)),
      minimumMobileControlScore: Math.min(...buildRows.map(row => row.mobileControlScore)),
      averageRoomDurationSeconds: round(buildRows.reduce((sum, row) => sum + row.roomDurationSeconds, 0) / buildRows.length),
      healingRequiredScenarios: buildRows.filter(row => row.healingNeeded > 0).length,
    }];
  }));
  return {
    buildCount: Object.keys(BUILDS).length,
    relicProfiles: Object.keys(RELICS),
    giftProfiles: Object.keys(GIFT_PROFILES),
    checkpoints: CHECKPOINTS,
    scenarioCount: rows.length,
    rows,
    byBuild,
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(JSON.stringify(simulateSoloCombatMatrixV4(), null, 2));
}

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

const DUO_PROFILES = Object.freeze([
  { id: 'baseline', gifts: 'none', relicA: 'none', relicB: 'none' },
  { id: 'balanced-offense', gifts: 'balanced', relicA: 'worldCore', relicB: 'worldCore' },
  { id: 'balanced-defense', gifts: 'balanced', relicA: 'runeShard', relicB: 'veilHeart' },
  { id: 'maximum-offense', gifts: 'maximum', relicA: 'guardianCrown', relicB: 'guardianCrown' },
  { id: 'maximum-speed', gifts: 'maximum', relicA: 'markedClaw', relicB: 'markedClaw' },
]);

const CHECKPOINTS = Object.freeze([
  { chapter: 1, room: 1 }, { chapter: 1, room: 9 }, { chapter: 1, room: 10 },
  { chapter: 3, room: 19 }, { chapter: 3, room: 20 },
  { chapter: 5, room: 29 }, { chapter: 5, room: 30 },
  { chapter: 8, room: 39 }, { chapter: 8, room: 40 },
  { chapter: 10, room: 49 }, { chapter: 10, room: 50 },
]);

const BOSS_TARGETS = Object.freeze({
  10: { hp: 920, attack: 21, supportHp: [34, 52], supportAttack: [6, 8] },
  20: { hp: 1750, attack: 29, supportHp: [92, 38], supportAttack: [12, 7] },
  30: { hp: 2850, attack: 38, supportHp: [82, 52], supportAttack: [14, 8] },
  40: { hp: 4300, attack: 49, supportHp: [128, 82], supportAttack: [18, 14] },
  50: { hp: 6500, attack: 61, supportHp: [190, 128], supportAttack: [20, 18] },
});

const DUO = Object.freeze({
  normalHp: 1.72,
  eliteHp: 1.92,
  bossHp: 2.18,
  enemyAttack: 1.16,
  spawnFactor: 1.20,
  mobileEnemyCap: 12,
  bossSupportCount: 2,
  disconnectHpFactor: 0.78,
  disconnectAttackFactor: 0.92,
});

function chapterProfile(chapter) {
  const profiles = [
    [1.00, 1.00, 1.00, 0.00], [1.13, 1.09, 1.16, 0.04], [1.27, 1.18, 1.34, 0.08],
    [1.43, 1.28, 1.56, 0.13], [1.62, 1.39, 1.80, 0.18], [1.83, 1.51, 2.05, 0.23],
    [2.05, 1.64, 2.32, 0.28], [2.28, 1.78, 2.62, 0.33], [2.52, 1.93, 2.94, 0.38],
    [2.78, 2.09, 3.28, 0.43],
  ];
  const [hpScale, attackScale, bossHpScale, eliteShare] = profiles[Math.max(0, Math.min(9, chapter - 1))];
  return { hpScale, attackScale, bossHpScale, eliteShare };
}

function roomScale(room) {
  if (room <= 9) return { hp: 1 + (room - 1) * 0.018, attack: 1 + (room - 1) * 0.008 };
  if (room <= 19) return { hp: 1.18 + (room - 10) * 0.024, attack: 1.08 + (room - 10) * 0.011 };
  if (room <= 29) return { hp: 1.42 + (room - 20) * 0.028, attack: 1.20 + (room - 20) * 0.013 };
  if (room <= 39) return { hp: 1.72 + (room - 30) * 0.032, attack: 1.34 + (room - 30) * 0.015 };
  return { hp: 2.06 + (room - 40) * 0.038, attack: 1.50 + (room - 40) * 0.017 };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mitigation(defense, cap) {
  return Math.min(cap, Math.max(0, defense) / (Math.max(0, defense) + 32));
}

function encounterProfile(chapter, room) {
  const chapterScale = chapterProfile(chapter);
  const roomMultiplier = roomScale(room);
  const boss = BOSS_TARGETS[room];
  if (boss) {
    const supportHp = boss.supportHp.reduce((sum, hp) => sum + hp, 0)
      * chapterScale.hpScale * roomMultiplier.hp * DUO.normalHp;
    const supportAttack = boss.supportAttack.reduce((sum, attack) => sum + attack, 0)
      * chapterScale.attackScale * roomMultiplier.attack * DUO.enemyAttack;
    return {
      type: 'boss',
      count: 1 + DUO.bossSupportCount,
      totalHp: boss.hp * chapterScale.bossHpScale * DUO.bossHp + supportHp,
      totalAttack: boss.attack * chapterScale.attackScale * DUO.enemyAttack + supportAttack,
      attacksPerSecond: 0.72 + room / 250,
      meleeShare: room >= 40 ? 0.58 : 0.68,
      runeShare: room >= 30 ? 0.20 : 0.08,
      pressure: 1.08 + room / 220,
    };
  }

  const band = Math.floor((room - 1) / 10);
  const soloCount = Math.min(10, 3 + band + Math.floor((room % 10) / 3));
  const count = Math.min(DUO.mobileEnemyCap, Math.max(soloCount, Math.ceil(soloCount * DUO.spawnFactor)));
  const hpMultiplier = DUO.normalHp * (1 - chapterScale.eliteShare) + DUO.eliteHp * chapterScale.eliteShare;
  return {
    type: band >= 3 ? 'elite-pack' : band >= 1 ? 'mixed-pack' : 'normal-pack',
    count,
    totalHp: (92 + band * 42) * chapterScale.hpScale * roomMultiplier.hp * hpMultiplier * count,
    totalAttack: (11 + band * 4) * chapterScale.attackScale * roomMultiplier.attack * DUO.enemyAttack * count,
    attacksPerSecond: 0.54 + band * 0.06,
    meleeShare: Math.max(0.45, 0.75 - band * 0.06),
    runeShare: band >= 2 ? 0.12 : 0,
    pressure: 0.78 + band * 0.11 + room / 500,
  };
}

function soloHpReference(chapter, room) {
  const chapterScale = chapterProfile(chapter);
  const roomMultiplier = roomScale(room);
  const boss = BOSS_TARGETS[room];
  if (boss) return boss.hp * chapterScale.bossHpScale;
  const band = Math.floor((room - 1) / 10);
  const count = Math.min(10, 3 + band + Math.floor((room % 10) / 3));
  return (92 + band * 42) * chapterScale.hpScale * roomMultiplier.hp * count;
}

function playerProfile(buildName, relicName, giftName, encounter) {
  const build = BUILDS[buildName];
  const relic = RELICS[relicName];
  const gifts = GIFT_PROFILES[giftName];
  const attack = (build.attack + gifts.attackFlat) * relic.attackFactor;
  const expectedCrit = 1 + build.critChance * (build.critDamage - 1);
  const totalSpeedMultiplier = Math.min(1.75, (1 + build.attackSpeed + relic.speedBonus) * gifts.quickDraw);
  const attackCooldownSeconds = Math.max(0.125, 0.270 / totalSpeedMultiplier);
  const attacksPerSecond = 1 / attackCooldownSeconds;
  const projectileRate = attacksPerSecond * gifts.arrows;
  const rangeUptime = Math.min(1, 0.82 + Math.max(0, build.range - 560) / 620);
  const effectiveDps = attack * expectedCrit * attacksPerSecond * gifts.followUpFactor * rangeUptime;
  const defenseCap = encounter.type === 'boss' ? 0.44 : 0.52;
  const defenseMitigation = mitigation(build.defense, defenseCap);
  const runeFactor = 1 - encounter.runeShare * relic.runeReduction;
  const rangeAvoidance = 1 - Math.min(0.24, Math.max(0, build.range - 560) / 460) * encounter.meleeShare;
  const effectiveHealth = (build.maxHp + gifts.hpFlat) * relic.hpFactor * (1 + relic.reviveHealth);
  return {
    effectiveDps,
    effectiveHealth,
    attackCooldownSeconds,
    projectileRate,
    incomingFactor: (1 - defenseMitigation) * runeFactor * rangeAvoidance,
    defenseMitigation,
  };
}

function simulatePair(buildA, buildB, profile, checkpoint) {
  const encounter = encounterProfile(checkpoint.chapter, checkpoint.room);
  const playerA = playerProfile(buildA, profile.relicA, profile.gifts, encounter);
  const playerB = playerProfile(buildB, profile.relicB, profile.gifts, encounter);
  const duoDps = playerA.effectiveDps + playerB.effectiveDps;
  const duoTtkSeconds = encounter.totalHp / Math.max(1, duoDps);
  const soloHp = soloHpReference(checkpoint.chapter, checkpoint.room);
  const soloPacingReferenceSeconds = soloHp / Math.max(1, duoDps / 2);
  const pacingRatio = duoTtkSeconds / soloPacingReferenceSeconds;
  const rawIncomingDps = encounter.totalAttack * encounter.attacksPerSecond * encounter.pressure * 0.18;
  const incomingDpsA = rawIncomingDps * 0.55 * playerA.incomingFactor;
  const incomingDpsB = rawIncomingDps * 0.45 * playerB.incomingFactor;
  const damageA = incomingDpsA * duoTtkSeconds;
  const damageB = incomingDpsB * duoTtkSeconds;
  const healingNeeded = Math.max(0, damageA - playerA.effectiveHealth * 0.72)
    + Math.max(0, damageB - playerB.effectiveHealth * 0.72);
  const enemyProjectileRate = Math.min(18, encounter.count * encounter.attacksPerSecond * (1 - encounter.meleeShare));
  const totalProjectileLoad = playerA.projectileRate + playerB.projectileRate + enemyProjectileRate;
  const mobileControlScore = clamp(
    1.12 - totalProjectileLoad / 64 - Math.max(0, encounter.count - 10) * 0.04,
    0,
    1,
  );

  const fallbackHp = encounter.totalHp * DUO.disconnectHpFactor;
  const fallbackIncomingDpsA = rawIncomingDps * DUO.disconnectAttackFactor * playerA.incomingFactor;
  const fallbackIncomingDpsB = rawIncomingDps * DUO.disconnectAttackFactor * playerB.incomingFactor;
  const fallbackTtkA = fallbackHp / Math.max(1, playerA.effectiveDps);
  const fallbackTtkB = fallbackHp / Math.max(1, playerB.effectiveDps);
  const fallbackSoloTtkA = soloHp / Math.max(1, playerA.effectiveDps);
  const fallbackSoloTtkB = soloHp / Math.max(1, playerB.effectiveDps);

  return {
    pair: `${buildA}+${buildB}`,
    buildA,
    buildB,
    profile: profile.id,
    chapter: checkpoint.chapter,
    room: checkpoint.room,
    encounterType: encounter.type,
    enemyCount: encounter.count,
    totalEnemyHp: Math.round(encounter.totalHp),
    duoDps: round(duoDps),
    duoTtkSeconds: round(duoTtkSeconds),
    soloPacingReferenceSeconds: round(soloPacingReferenceSeconds),
    pacingRatio: round(pacingRatio),
    incomingDps: round(incomingDpsA + incomingDpsB),
    healingNeeded: Math.round(healingNeeded),
    maxPlayerProjectileRate: round(Math.max(playerA.projectileRate, playerB.projectileRate)),
    totalProjectileLoad: round(totalProjectileLoad),
    mobileControlScore: round(mobileControlScore),
    minimumAttackCooldownMs: Math.round(Math.min(playerA.attackCooldownSeconds, playerB.attackCooldownSeconds) * 1000),
    maximumMitigation: round(Math.max(playerA.defenseMitigation, playerB.defenseMitigation)),
    disconnectA: {
      ttkSeconds: round(fallbackTtkA),
      soloPacingRatio: round(fallbackTtkA / fallbackSoloTtkA),
      incomingDps: round(fallbackIncomingDpsA),
      healingNeeded: Math.round(Math.max(0, fallbackIncomingDpsA * fallbackTtkA - playerA.effectiveHealth * 0.72)),
    },
    disconnectB: {
      ttkSeconds: round(fallbackTtkB),
      soloPacingRatio: round(fallbackTtkB / fallbackSoloTtkB),
      incomingDps: round(fallbackIncomingDpsB),
      healingNeeded: Math.round(Math.max(0, fallbackIncomingDpsB * fallbackTtkB - playerB.effectiveHealth * 0.72)),
    },
  };
}

export function simulateDuoCombatMatrixV4() {
  const buildNames = Object.keys(BUILDS);
  const pairs = [];
  for (let first = 0; first < buildNames.length; first++) {
    for (let second = first; second < buildNames.length; second++) {
      pairs.push([buildNames[first], buildNames[second]]);
    }
  }

  const rows = [];
  for (const [buildA, buildB] of pairs) {
    for (const profile of DUO_PROFILES) {
      for (const checkpoint of CHECKPOINTS) rows.push(simulatePair(buildA, buildB, profile, checkpoint));
    }
  }

  const byProfile = Object.fromEntries(DUO_PROFILES.map(profile => {
    const profileRows = rows.filter(row => row.profile === profile.id);
    return [profile.id, {
      scenarios: profileRows.length,
      minimumTtkSeconds: Math.min(...profileRows.map(row => row.duoTtkSeconds)),
      maximumTtkSeconds: Math.max(...profileRows.map(row => row.duoTtkSeconds)),
      minimumPacingRatio: Math.min(...profileRows.map(row => row.pacingRatio)),
      maximumPacingRatio: Math.max(...profileRows.map(row => row.pacingRatio)),
      maximumProjectileLoad: Math.max(...profileRows.map(row => row.totalProjectileLoad)),
      minimumMobileControlScore: Math.min(...profileRows.map(row => row.mobileControlScore)),
    }];
  }));

  return {
    buildCount: buildNames.length,
    pairCount: pairs.length,
    profileCount: DUO_PROFILES.length,
    checkpoints: CHECKPOINTS,
    scenarioCount: rows.length,
    duoBalance: DUO,
    rows,
    byProfile,
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(JSON.stringify(simulateDuoCombatMatrixV4(), null, 2));
}

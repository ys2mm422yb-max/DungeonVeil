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
  none: { attackFactor: 1, hpFactor: 1, speedBonus: 0, reviveHealth: 0 },
  markedClaw: { attackFactor: 1, hpFactor: 1, speedBonus: 0.14 * (2.5 / 7.5), reviveHealth: 0 },
  guardianCrown: { attackFactor: 1.12, hpFactor: 1, speedBonus: 0, reviveHealth: 0 },
  runeShard: { attackFactor: 1, hpFactor: 1, speedBonus: 0, reviveHealth: 0 },
  worldCore: { attackFactor: 1.04, hpFactor: 1.07, speedBonus: 0, reviveHealth: 0 },
  veilHeart: { attackFactor: 1, hpFactor: 1, speedBonus: 0, reviveHealth: 0.25 },
});
const GIFTS = Object.freeze({
  none: { attackFlat: 0, hpFlat: 0, quickDraw: 1, arrows: 1, followUpFactor: 1 },
  balanced: { attackFlat: 4, hpFlat: 16, quickDraw: 1.16, arrows: 2.64, followUpFactor: 1.08 },
  maximum: { attackFlat: 6, hpFlat: 24, quickDraw: 1.42, arrows: 3.46, followUpFactor: 1.13 },
});
const BOSS = Object.freeze({
  health: 118000,
  timeLimitSeconds: 150,
  fireBreathDamage: 34,
  clawDamage: 27,
  slamDamage: 42,
  armorMitigationCap: 0.40,
});
const ATTACK_TIMING = Object.freeze({
  initialDelaySeconds: 1.35,
  breathWindupSeconds: 0.76,
  breathCooldownSeconds: 3.10,
  clawWindupSeconds: 0.42,
  clawGapSeconds: 0.98,
  slamWindupSeconds: 0.62,
  slamGapSeconds: 1.42,
});
const DISTANCE_PROFILES = Object.freeze(['ranged', 'mixed', 'melee']);
const EVASION_PROFILES = Object.freeze({
  expert: { breath: 0.04, claw: 0.03, slam: 0.04 },
  steady: { breath: 0.10, claw: 0.07, slam: 0.08 },
  rough: { breath: 0.20, claw: 0.14, slam: 0.17 },
});

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
function mitigation(defense) {
  return Math.min(BOSS.armorMitigationCap, Math.max(0, defense) / (Math.max(0, defense) + 32));
}
function playerProfile(buildName, relicName, giftName) {
  const build = BUILDS[buildName];
  const relic = RELICS[relicName];
  const gifts = GIFTS[giftName];
  const attack = (build.attack + gifts.attackFlat) * relic.attackFactor;
  const expectedCrit = 1 + build.critChance * (build.critDamage - 1);
  const totalSpeedMultiplier = Math.min(1.75, (1 + build.attackSpeed + relic.speedBonus) * gifts.quickDraw);
  const attackCooldownMs = Math.max(125, 270 / totalSpeedMultiplier);
  const attacksPerSecond = 1000 / attackCooldownMs;
  const rangeUptime = Math.min(1, 0.82 + Math.max(0, build.range - 560) / 620);
  const effectiveDps = attack * expectedCrit * attacksPerSecond * gifts.followUpFactor * rangeUptime;
  const effectiveHealth = (build.maxHp + gifts.hpFlat) * relic.hpFactor * (1 + relic.reviveHealth);
  return {
    build: buildName,
    relic: relicName,
    gifts: giftName,
    effectiveDps,
    effectiveHealth,
    defense: build.defense,
    mitigation: mitigation(build.defense),
    attackCooldownMs,
    projectileRate: attacksPerSecond * gifts.arrows,
  };
}
function farForAttack(profile, attackIndex) {
  if (profile === 'ranged') return true;
  if (profile === 'melee') return false;
  return attackIndex % 3 === 0;
}
function attackSchedule(profile) {
  let time = ATTACK_TIMING.initialDelaySeconds;
  let lastAttack = 'slam';
  let attackIndex = 0;
  const counts = { breath: 0, claw: 0, slam: 0 };
  while (time < BOSS.timeLimitSeconds) {
    const far = farForAttack(profile, attackIndex);
    const kind = far && lastAttack !== 'breath' ? 'breath' : lastAttack === 'claw' ? 'slam' : 'claw';
    counts[kind] += 1;
    const windup = kind === 'breath'
      ? ATTACK_TIMING.breathWindupSeconds
      : kind === 'claw'
        ? ATTACK_TIMING.clawWindupSeconds
        : ATTACK_TIMING.slamWindupSeconds;
    const gap = kind === 'breath'
      ? ATTACK_TIMING.breathCooldownSeconds
      : kind === 'claw'
        ? ATTACK_TIMING.clawGapSeconds
        : ATTACK_TIMING.slamGapSeconds;
    time += windup + gap;
    lastAttack = kind;
    attackIndex += 1;
  }
  return counts;
}
function incomingDamage(player, schedule, evasion) {
  const raw = schedule.breath * evasion.breath * BOSS.fireBreathDamage
    + schedule.claw * evasion.claw * BOSS.clawDamage
    + schedule.slam * evasion.slam * BOSS.slamDamage;
  return raw * (1 - player.mitigation);
}
function simulateScenario(buildName, relicName, giftName, distanceProfile, evasionName) {
  const player = playerProfile(buildName, relicName, giftName);
  const schedule = attackSchedule(distanceProfile);
  const evasion = EVASION_PROFILES[evasionName];
  const submittedDamage = Math.min(BOSS.health, player.effectiveDps * BOSS.timeLimitSeconds);
  const received = incomingDamage(player, schedule, evasion);
  return {
    build: buildName,
    relic: relicName,
    gifts: giftName,
    distanceProfile,
    evasion: evasionName,
    attackCounts: schedule,
    effectiveDps: round(player.effectiveDps),
    submittedDamage: Math.round(submittedDamage),
    bossRemainingHp: Math.round(BOSS.health - submittedDamage),
    bossShare: round(submittedDamage / BOSS.health),
    incomingDamage: round(received),
    effectiveHealth: round(player.effectiveHealth),
    survives: received < player.effectiveHealth,
    mitigation: round(player.mitigation),
    attackCooldownMs: Math.round(player.attackCooldownMs),
    projectileRate: round(player.projectileRate),
  };
}

export function simulateWorldBossCombatMatrixV4() {
  const rows = [];
  for (const build of Object.keys(BUILDS)) {
    for (const relic of Object.keys(RELICS)) {
      for (const gifts of Object.keys(GIFTS)) {
        for (const distance of DISTANCE_PROFILES) {
          for (const evasion of Object.keys(EVASION_PROFILES)) rows.push(simulateScenario(build, relic, gifts, distance, evasion));
        }
      }
    }
  }
  return {
    buildCount: Object.keys(BUILDS).length,
    relicCount: Object.keys(RELICS).length,
    giftCount: Object.keys(GIFTS).length,
    distanceProfileCount: DISTANCE_PROFILES.length,
    evasionProfileCount: Object.keys(EVASION_PROFILES).length,
    scenarioCount: rows.length,
    attackSchedules: Object.fromEntries(DISTANCE_PROFILES.map(profile => [profile, attackSchedule(profile)])),
    rows,
  };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const report = simulateWorldBossCombatMatrixV4();
  console.log(JSON.stringify({
    buildCount: report.buildCount,
    relicCount: report.relicCount,
    giftCount: report.giftCount,
    distanceProfileCount: report.distanceProfileCount,
    evasionProfileCount: report.evasionProfileCount,
    scenarioCount: report.scenarioCount,
    attackSchedules: report.attackSchedules,
    minimumDamage: Math.min(...report.rows.map(row => row.submittedDamage)),
    maximumDamage: Math.max(...report.rows.map(row => row.submittedDamage)),
    maximumProjectileRate: Math.max(...report.rows.map(row => row.projectileRate)),
  }, null, 2));
}

#!/usr/bin/env node

const BUILDS = Object.freeze({
  starter: { attack: 15, critChance: 0.05, critDamage: 1.5, hp: 168, defense: 0, range: 560, attackSpeed: 0 },
  attack: { attack: 33, critChance: 0.05, critDamage: 1.5, hp: 230, defense: 5, range: 592, attackSpeed: 0.05 },
  critical: { attack: 29, critChance: 0.14, critDamage: 1.68, hp: 206, defense: 5, range: 565, attackSpeed: 0.18 },
  range: { attack: 24, critChance: 0.05, critDamage: 1.5, hp: 206, defense: 5, range: 670, attackSpeed: 0 },
  tank: { attack: 24, critChance: 0.05, critDamage: 1.5, hp: 222, defense: 11, range: 592, attackSpeed: 0.05 },
  hybrid: { attack: 30, critChance: 0.105, critDamage: 1.5, hp: 225, defense: 5, range: 592, attackSpeed: 0.11 },
  maximum: { attack: 42, critChance: 0.15, critDamage: 1.68, hp: 246, defense: 11, range: 670, attackSpeed: 0.18 },
});
const RELICS = Object.freeze({
  none: { attack: 1, hp: 1, speed: 0, reduction: 0 },
  offensive: { attack: 1.12, hp: 1, speed: 0.14 * (2.5 / 7.5), reduction: 0 },
  defensive: { attack: 1, hp: 1.07, speed: 0, reduction: 0.18 },
});
const GIFTS = Object.freeze({
  none: { attackFlat: 0, hpFlat: 0, quickDraw: 1, arrows: 1, followUp: 1 },
  balanced: { attackFlat: 4, hpFlat: 16, quickDraw: 1.16, arrows: 2.64, followUp: 1.08 },
  maximum: { attackFlat: 6, hpFlat: 24, quickDraw: 1.42, arrows: 3.46, followUp: 1.13 },
});
const BOSS = Object.freeze({ health: 118000, timeLimit: 150, fireBreath: 34, claw: 27, slam: 42, armorCap: 0.40, season: 'equipment-v4-s1' });
const MIN_COOLDOWN = 125;
const BOSS_HIT_UPTIME = 0.035;
const mitigation = defense => Math.min(BOSS.armorCap, Math.max(0, defense) / (Math.max(0, defense) + 32));
function simulate(buildName, relicName, giftName) {
  const build = BUILDS[buildName];
  const relic = RELICS[relicName];
  const gifts = GIFTS[giftName];
  const speed = Math.min(0.75, build.attackSpeed + relic.speed);
  const cooldown = Math.max(MIN_COOLDOWN, 270 / ((1 + speed) * gifts.quickDraw));
  const expectedCrit = 1 + build.critChance * (build.critDamage - 1);
  const rangeUptime = Math.min(0.96, 0.76 + Math.max(0, build.range - 560) / 500);
  const effectiveArrows = 1 + Math.max(0, gifts.arrows - 1) * 0.55;
  const dps = (build.attack + gifts.attackFlat) * relic.attack * expectedCrit * (1000 / cooldown) * effectiveArrows * gifts.followUp * rangeUptime;
  const clearSeconds = BOSS.health / Math.max(1, dps);
  const damage = Math.min(BOSS.health, dps * BOSS.timeLimit);
  const weightedAttack = BOSS.fireBreath * 0.42 + BOSS.claw * 0.38 + BOSS.slam * 0.20;
  const damageTaken = weightedAttack * (1 - mitigation(build.defense)) * (1 - relic.reduction * 0.4) * BOSS_HIT_UPTIME * Math.min(BOSS.timeLimit, clearSeconds);
  return {
    build: buildName, relic: relicName, gifts: giftName, dps, clearSeconds, damage,
    damagePercent: damage / BOSS.health, cooldown, mitigation: mitigation(build.defense),
    damageTaken, effectiveHp: (build.hp + gifts.hpFlat) * relic.hp,
    survives: damageTaken < (build.hp + gifts.hpFlat) * relic.hp,
    victory: clearSeconds <= BOSS.timeLimit,
  };
}
export function simulateWorldBossCombatMatrixV4() {
  const rows = [];
  for (const build of Object.keys(BUILDS)) for (const relic of Object.keys(RELICS)) for (const gifts of Object.keys(GIFTS)) rows.push(simulate(build, relic, gifts));
  return { builds: Object.keys(BUILDS), relics: Object.keys(RELICS), gifts: Object.keys(GIFTS), scenarioCount: rows.length, rows, boss: BOSS };
}
if (import.meta.url === new URL(`file://${process.argv[1]}`).href) console.log(JSON.stringify(simulateWorldBossCombatMatrixV4(), null, 2));

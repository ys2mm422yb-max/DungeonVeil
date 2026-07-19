#!/usr/bin/env node

const BUILDS = Object.freeze({
  starter: { attack: 15, critChance: 0.05, critDamage: 1.5, hp: 168, defense: 0, attackSpeed: 0 },
  attack: { attack: 33, critChance: 0.05, critDamage: 1.5, hp: 230, defense: 5, attackSpeed: 0.05 },
  critical: { attack: 29, critChance: 0.14, critDamage: 1.68, hp: 206, defense: 5, attackSpeed: 0.18 },
  range: { attack: 24, critChance: 0.05, critDamage: 1.5, hp: 206, defense: 5, attackSpeed: 0 },
  tank: { attack: 24, critChance: 0.05, critDamage: 1.5, hp: 222, defense: 11, attackSpeed: 0.05 },
  hybrid: { attack: 30, critChance: 0.105, critDamage: 1.5, hp: 225, defense: 5, attackSpeed: 0.11 },
  maximum: { attack: 42, critChance: 0.15, critDamage: 1.68, hp: 246, defense: 11, attackSpeed: 0.18 },
});

const RELICS = Object.freeze({
  none: { attack: 1, hp: 1, speed: 0, reduction: 0 },
  offensive: { attack: 1.12, hp: 1, speed: 0.14 * (2.5 / 7.5), reduction: 0 },
  defensive: { attack: 1, hp: 1.07, speed: 0, reduction: 0.18 },
});

const TEAMS = Object.freeze({
  weakWeak: ['starter', 'starter'],
  weakStrong: ['starter', 'maximum'],
  mediumMedium: ['hybrid', 'hybrid'],
  strongStrong: ['maximum', 'maximum'],
  tankTank: ['tank', 'tank'],
  criticalCritical: ['critical', 'critical'],
  speedSpeed: ['critical', 'hybrid'],
  attackRange: ['attack', 'range'],
  tankCritical: ['tank', 'critical'],
});

const CHECKPOINTS = Object.freeze([
  { chapter: 1, room: 10, soloHp: 920, attack: 21 },
  { chapter: 3, room: 20, soloHp: 1750 * 1.34, attack: 29 * 1.18 },
  { chapter: 5, room: 30, soloHp: 2850 * 1.80, attack: 38 * 1.39 },
  { chapter: 8, room: 40, soloHp: 4300 * 2.62, attack: 49 * 1.78 },
  { chapter: 10, room: 50, soloHp: 6500 * 3.28, attack: 61 * 2.09 },
]);

const DUO = Object.freeze({ normalHp: 1.72, eliteHp: 1.92, bossHp: 2.18, enemyAttack: 1.16, spawnFactor: 1.20, mobileEnemyCap: 12, disconnectHpFactor: 0.78, disconnectAttackFactor: 0.92 });
const BASE_COOLDOWN = 270;
const MIN_COOLDOWN = 125;
const BOSS_HIT_UPTIME = 0.025;
const DISCONNECT_HIT_UPTIME = 0.018;

function mitigation(defense, cap = 0.44) {
  return Math.min(cap, Math.max(0, defense) / (Math.max(0, defense) + 32));
}
function playerProfile(buildName, relicName) {
  const build = BUILDS[buildName];
  const relic = RELICS[relicName];
  const speed = Math.min(0.75, build.attackSpeed + relic.speed);
  const cooldown = Math.max(MIN_COOLDOWN, BASE_COOLDOWN / (1 + speed));
  const expectedCrit = 1 + build.critChance * (build.critDamage - 1);
  return {
    dps: build.attack * relic.attack * expectedCrit * (1000 / cooldown),
    hp: build.hp * relic.hp,
    mitigation: mitigation(build.defense),
    reduction: relic.reduction,
    cooldown,
  };
}
function simulate(teamName, relicA, relicB, checkpoint) {
  const [buildA, buildB] = TEAMS[teamName];
  const a = playerProfile(buildA, relicA);
  const b = playerProfile(buildB, relicB);
  const teamworkUptime = buildA === 'range' || buildB === 'range' ? 0.94 : 0.92;
  const teamDps = (a.dps + b.dps) * teamworkUptime;
  const duoHp = checkpoint.soloHp * DUO.bossHp;
  const ttk = duoHp / teamDps;
  const averageMitigation = (a.mitigation + b.mitigation) / 2;
  const averageReduction = (a.reduction + b.reduction) / 2;
  const incomingPerSecond = checkpoint.attack * DUO.enemyAttack * (1 - averageMitigation) * (1 - averageReduction * 0.4) * BOSS_HIT_UPTIME;
  const sharedEffectiveHp = a.hp + b.hp;
  const damageTaken = incomingPerSecond * ttk;
  const reviveAllowance = Math.min(sharedEffectiveHp * 0.55, Math.max(a.hp, b.hp) * 0.8);
  const effectiveTeamHealth = sharedEffectiveHp + reviveAllowance;
  const disconnectHp = duoHp * DUO.disconnectHpFactor;
  const survivor = a.dps >= b.dps ? a : b;
  const disconnectTtk = disconnectHp / Math.max(1, survivor.dps * 0.88);
  const disconnectIncoming = checkpoint.attack * DUO.enemyAttack * DUO.disconnectAttackFactor * (1 - survivor.mitigation) * (1 - survivor.reduction * 0.4) * DISCONNECT_HIT_UPTIME;
  return {
    team: teamName, builds: [buildA, buildB], relics: [relicA, relicB], chapter: checkpoint.chapter, room: checkpoint.room,
    teamDps, ttk, damageTaken, effectiveTeamHealth, survives: damageTaken < effectiveTeamHealth * 1.35,
    disconnectTtk, disconnectDamage: disconnectIncoming * disconnectTtk,
    survivorHp: survivor.hp, cooldownMin: Math.min(a.cooldown, b.cooldown),
  };
}

export function simulateDuoCombatMatrixV4() {
  const relicPairs = [['none', 'none'], ['offensive', 'offensive'], ['defensive', 'defensive'], ['offensive', 'defensive']];
  const rows = [];
  for (const team of Object.keys(TEAMS)) {
    for (const [relicA, relicB] of relicPairs) {
      for (const checkpoint of CHECKPOINTS) rows.push(simulate(team, relicA, relicB, checkpoint));
    }
  }
  return { teams: Object.keys(TEAMS), checkpoints: CHECKPOINTS, relicPairs, scenarioCount: rows.length, rows, constants: DUO, hitUptime: { boss: BOSS_HIT_UPTIME, disconnect: DISCONNECT_HIT_UPTIME } };
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) console.log(JSON.stringify(simulateDuoCombatMatrixV4(), null, 2));

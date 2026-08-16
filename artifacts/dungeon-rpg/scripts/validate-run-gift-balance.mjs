import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [skills, controller, runEngine, fusionEffects, translations] = await Promise.all([
  read('../src/game/runSkills.ts'),
  read('../src/game/giftUpgradeController.ts'),
  read('../src/game/runEngine.ts'),
  read('../src/game/runFusionEffects.ts'),
  read('../src/i18n/translations.ts'),
]);

const failures = [];
const requireContract = (ok, message) => {
  if (!ok) failures.push(message);
};

const gainMatch = skills.match(/RUN_ATTACK_GAINS\s*=\s*Object\.freeze\(\[([^\]]+)\]/);
const attackGains = gainMatch
  ? gainMatch[1].split(',').map(value => Number(value.trim())).filter(Number.isFinite)
  : [];

requireContract(
  attackGains.length === 4 && attackGains.every((value, index) => value === [0, 2, 2, 2][index]),
  'Attack must use the bounded [0, 2, 2, 2] authoritative rank-gain schedule',
);
requireContract(
  controller.includes('RUN_ATTACK_GAINS') && controller.includes("choice === 'attack') player.attack += RUN_ATTACK_GAINS[rank] ?? 0"),
  'giftUpgradeController must consume the authoritative Attack gain schedule',
);
requireContract(
  skills.includes("rankTextDe: ['+2 Angriff', '+2 Angriff · stärkerer Einschlag', '+2 Angriff · maximaler Einschlag']") &&
    skills.includes("rankTextEn: ['+2 attack', '+2 attack · heavier impact', '+2 attack · maximum impact']"),
  'Attack rank copy must match the +2/+2/+2 runtime progression in DE and EN',
);
requireContract(
  translations.includes("attack: '+2 Attack'") && translations.includes("attack: '+2 Angriff'"),
  'legacy Attack summaries must match authoritative rank-I +2 Attack',
);

const cooldownMatch = runEngine.match(/const cooldownFactors = \[([^\]]+)\]/);
const cooldownFactors = cooldownMatch
  ? cooldownMatch[1].split(',').map(value => Number(value.trim())).filter(Number.isFinite)
  : [];
requireContract(
  cooldownFactors.length === 4 && cooldownFactors.every((value, index) => Math.abs(value - [1, 0.84, 0.70, 0.58][index]) < 1e-9),
  'Quick Draw cooldown factors changed outside the focused balance contract',
);
requireContract(
  fusionEffects.includes('const ARROW_STORM_EXTRA_ARROW_MULTIPLIER = 0.9;') &&
    fusionEffects.includes('const VEIL_CHAIN_FOLLOW_UP_MULTIPLIER = 1.1;') &&
    fusionEffects.includes('const ELEMENTAL_STORM_DAMAGE_MULTIPLIER = 0.35;'),
  'fusion identity changed outside the focused Attack-vs-Quick-Draw rebalance',
);

const baseAttack = 10;
const baseCooldown = 270;
const defenses = [0, 4, 9];
const targetCounts = [1, 2, 4];
const auxiliaries = ['none', 'multishot', 'piercing', 'ricochet', 'elementalStorm'];

const arrowDamage = (attack, defense, multiplier = 1) =>
  Math.max(1, Math.round((attack - defense * 0.5) * multiplier));

function volleyDamage(attack, defense, targets, auxiliary) {
  const primary = arrowDamage(attack, defense);
  let total = primary;
  const followupTargets = Math.min(Math.max(0, targets - 1), 3);

  if (auxiliary === 'multishot') {
    total += followupTargets * arrowDamage(attack, defense, 0.82);
  } else if (auxiliary === 'piercing') {
    total += followupTargets * Math.max(1, Math.round(primary * 0.80));
  } else if (auxiliary === 'ricochet') {
    total += followupTargets * Math.max(1, Math.round(primary * 0.75));
  } else if (auxiliary === 'elementalStorm') {
    total += followupTargets * Math.round(attack * 0.35) / 5;
  }

  return total;
}

if (attackGains.length === 4 && cooldownFactors.length === 4) {
  let attack = baseAttack;
  const ratiosByRank = [];

  for (let rank = 1; rank <= 3; rank += 1) {
    attack += attackGains[rank];
    const ratios = [];

    for (const defense of defenses) {
      for (const targets of targetCounts) {
        for (const auxiliary of auxiliaries) {
          const attackDps = volleyDamage(attack, defense, targets, auxiliary) / baseCooldown;
          const quickDrawDps = volleyDamage(baseAttack, defense, targets, auxiliary) / (baseCooldown * cooldownFactors[rank]);
          ratios.push({ defense, targets, auxiliary, ratio: attackDps / quickDrawDps });
        }
      }
    }

    ratiosByRank.push(ratios);
    const worst = Math.max(...ratios.map(entry => entry.ratio));
    const bestForQuickDraw = Math.min(...ratios.map(entry => entry.ratio));
    const armoredSingle = ratios.find(entry => entry.defense === 9 && entry.targets === 1 && entry.auxiliary === 'none')?.ratio ?? 0;

    requireContract(worst <= 1.35, `Attack rank ${rank} still exceeds the bounded 1.35x equal-rank Quick Draw ceiling (${worst.toFixed(3)}x)`);
    requireContract(bestForQuickDraw < 0.99, `Quick Draw rank ${rank} has no real cadence/multi-target case where it beats equal-rank Attack`);
    requireContract(armoredSingle > 1.05, `Attack rank ${rank} lost its intended high-defense raw-hit niche (${armoredSingle.toFixed(3)}x)`);
  }

  requireContract(
    ratiosByRank.every(ratios => ratios.some(entry => entry.ratio < 1) && ratios.some(entry => entry.ratio > 1)),
    'Attack and Quick Draw must remain a real per-rank tradeoff instead of one option strictly dominating the matrix',
  );
}

if (failures.length) {
  console.error(`Run-gift balance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Run-gift balance audit passed: Attack and Quick Draw retain distinct armor-vs-cadence niches across 1/2/4-target and fusion-sensitive damage paths without strict equal-rank dominance.');

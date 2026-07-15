import { readFile } from 'node:fs/promises';

const [policy, identity, main] = await Promise.all([
  readFile(new URL('../src/game/darkwoodMageProjectilePolicy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/enemyRegionalIdentity.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [main.includes("import './game/darkwoodMageProjectilePolicy';") && !main.includes("import './game/darkwoodMageCombatPolicy';"), 'new darkwood mage projectile policy is not installed exclusively'],
  [policy.includes('DARKWOOD_WINDUP_MS = 520') && policy.includes('DARKWOOD_ATTACK_CYCLE_MS = 1900'), 'readable wind-up or attack cycle is missing'],
  [policy.includes('DARKWOOD_PROJECTILE_MIN_MS = 420') && policy.includes('DARKWOOD_PROJECTILE_MAX_MS = 680'), 'visible projectile travel window is missing'],
  [policy.includes("type: 'beam'") && policy.includes('width: 12') && policy.includes('width: 5'), 'layered arcane projectile is missing'],
  [policy.includes('impactAt: time + travelMs') && policy.includes('resolveProjectileImpact') && policy.includes('missDistance > DARKWOOD_IMPACT_RADIUS'), 'damage is not delayed until a dodgeable visible impact'],
  [policy.includes('darkwood-mage-target-') && policy.includes('darkwood-mage-warning-'), 'caster and target telegraphs are missing'],
  [identity.includes("if (type === 'vampire') return skeleton('mage', 'mage');"), 'darkwood caster does not use the dedicated mage model'],
  [policy.includes('shotPathBlocked(fromX, fromY, targetX, targetY') && policy.includes('distance > DARKWOOD_RANGE * 1.05'), 'range and line-of-sight safety are missing'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Darkwood mage projectile audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Darkwood mage projectile audit passed: dedicated mage identity, visible flight time, delayed impact and dodgeable damage are active.');
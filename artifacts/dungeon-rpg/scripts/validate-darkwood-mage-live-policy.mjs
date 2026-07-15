import { readFile } from 'node:fs/promises';

const [policy, main] = await Promise.all([
  readFile(new URL('../src/game/darkwoodMageCombatPolicy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
]);

const checks = [
  [main.includes("import './game/darkwoodMageCombatPolicy';"), 'darkwood mage policy is not installed at startup'],
  [policy.includes('const DARKWOOD_RANGE = 50;'), 'darkwood mage attack range is not capped at 50'],
  [policy.includes('const DARKWOOD_WINDUP_MS = 420;'), 'darkwood mage wind-up is not readable'],
  [policy.includes('const DARKWOOD_ATTACK_CYCLE_MS = 1540;'), 'darkwood mage attack cycle is still too fast'],
  [policy.includes('const DARKWOOD_DAMAGE_SCALE = 0.62;'), 'darkwood mage damage reduction is missing'],
  [policy.includes('darkwood-mage-warning-') && policy.includes('darkwood-mage-shot-'), 'darkwood mage warning or projectile is missing'],
  [policy.includes("enemy.state = 'chase'") && policy.includes('this.enemyWindups.delete(enemy.id)'), 'out-of-range mages can still land remote attacks'],
  [policy.includes('distance > DARKWOOD_RANGE * 1.04'), 'escape during wind-up is not respected'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Darkwood mage live policy audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Darkwood mage live policy audit passed: short range, readable warning/projectile, fair wind-up, slower cycle and reduced damage are active.');

import { readFile } from 'node:fs/promises';

const [engine, skills, translations] = await Promise.all([
  readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/runSkills.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/i18n/translations.ts', import.meta.url), 'utf8'),
]);

const checks = [
  [engine.includes('isDarkwoodMage(enemy: Enemy)') && engine.includes("role === 'mage'"), 'darkwood mage detection is missing'],
  [engine.includes('Math.min(plan.attackRange, 50)') && engine.includes('Math.max(1120'), 'darkwood mage range/cooldown tuning is missing'],
  [engine.includes('damageScale: darkwoodMage ? 0.62 : 1'), 'darkwood mage damage reduction is missing'],
  [engine.includes("projectileElement: darkwoodMage ? 'arcane' : undefined") && engine.includes('darkwood-mage-shot'), 'darkwood mage attacks remain visually invisible'],
  [engine.includes('allowedRangeScale = windup.projectileElement ? 1.04 : 1.18'), 'ranged attack escape tolerance is still too generous'],
  [skills.includes("'+16 % Angriffsgeschwindigkeit'") && skills.includes("'+42 % Angriffsgeschwindigkeit'"), 'Schnellzug rank text is still unclear'],
  [translations.includes('SCHNELLZUG · Höhere Angriffsgeschwindigkeit'), 'Schnellzug summary text is still unclear'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Darkwood mage balance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Darkwood mage balance audit passed: visible projectile, shorter range, lower damage, longer cooldown and clear Schnellzug wording.');

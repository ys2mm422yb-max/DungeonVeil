import { readFile } from 'node:fs/promises';

const [config, smoke, visualAudit, packageJson, checkWorkflow, ciWorkflow] = await Promise.all([
  readFile(new URL('../playwright.regression.config.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/full-game-smoke.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/visual-audit.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/dungeon-rpg-check.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/dungeon-rpg-ci.yml', import.meta.url), 'utf8'),
]);

const requiredProjects = ['iphone-webkit', 'android-chromium', 'ipad-landscape-webkit', 'desktop-chromium'];
const requiredFlows = [
  'main-menu-profile-badge',
  'Höchstes Kapitel',
  'Höchster Raum',
  'Inventar',
  'Nachrichten aus dem Schleier',
  'permission denied',
  'Gefährten im Schleier',
  'Gilde gründen',
  'Das nächste Weltereignis',
  'Aufträge',
  'Kodex',
  'hobbyloser Typ',
  'run-hud',
  'run-joystick',
  'run-dash-control',
];
const requiredVisualMarkers = [
  "Array.from({ length: 50 }",
  "[1, 10, 20, 30, 40, 50]",
  'visual-room-',
  'visual-main-menu-',
  'visual-profile-',
  'visual-equipment-bow-',
  'visual-equipment-quiver-',
  'visual-equipment-armor-',
  'visual-equipment-relic-',
  'visual-equipment-companion-',
  'visual-codex-',
  'visual-quests-',
  'visual-mailbox-',
  'visual-friends-',
  'visual-guild-',
];

const failures = [];
for (const project of requiredProjects) {
  if (!config.includes(project)) failures.push(`missing browser project: ${project}`);
}
for (const flow of requiredFlows) {
  if (!smoke.includes(flow)) failures.push(`missing smoke flow marker: ${flow}`);
}
for (const marker of requiredVisualMarkers) {
  if (!visualAudit.includes(marker)) failures.push(`missing visual audit marker: ${marker}`);
}
if (!config.includes('visual-audit')) failures.push('visual audit is not part of the browser regression matrix');
for (const command of ['audit:assets', 'audit:social', 'audit:rooms', 'typecheck', 'build']) {
  if (!packageJson.includes(`"${command}"`)) failures.push(`missing package command: ${command}`);
}
if (!checkWorkflow.includes('Room and collision audit')) failures.push('standard room/collision check is missing');
if (!ciWorkflow.includes('audit:assets') && !ciWorkflow.includes('Asset')) failures.push('standard CI asset validation is missing');
if (!smoke.includes('pageerror') || !smoke.includes('response.status() >= 400')) failures.push('runtime crash or HTTP failure monitoring is missing');
if (!smoke.includes('scrollWidth') || !smoke.includes('horizontal overflow')) failures.push('responsive overflow validation is missing');
if (!visualAudit.includes('pageerror') || !visualAudit.includes('WebGL.*lost')) failures.push('visual audit runtime monitoring is missing');

if (failures.length) {
  console.error(`Full-game regression scope audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Full-game regression scope audit passed: all major menu flows, 50 rooms, UI screenshot evidence, combat startup, cross-device layouts, runtime errors, assets and build checks are covered.');

import { readFile } from 'node:fs/promises';
import { simulateCentralCombatBalance } from './central-combat-balance-simulator.mjs';

const [balance, finale, overlay, entities] = await Promise.all([
  readFile(new URL('../src/game/runBalance.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/firstWardenFinale.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/FirstWardenOverlay.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/entities.ts', import.meta.url), 'utf8'),
]);

const report = simulateCentralCombatBalance();
const normalHits = Object.fromEntries(report.normalSamples.map(sample => [sample.label, sample.hits]));
const eliteHits = Object.fromEntries(report.eliteSamples.map(sample => [sample.label, sample.hits]));
const survivalHits = Object.fromEntries(report.survivalSamples.map(sample => [sample.label, sample.hits]));
const bossSeconds = Object.fromEntries(report.bossSamples.map(sample => [sample.room, sample.seconds]));

const checks = [
  [report.scenario === 'central-combat-balance', 'central combat simulator scenario is missing'],
  [balance.includes('base.hp * roomEnemyHpScale(room) * profile.enemyHpScale') && !balance.includes('enemy.maxHp * roomEnemyHpScale'), 'enemy HP is not assigned from one authoritative base curve'],
  [balance.includes('base.attack * roomEnemyAttackScale(room) * profile.attackScale') && !balance.includes('enemy.attack * eliteAttack'), 'enemy attack is still multiplied from already-scaled spawn values'],
  [balance.includes('enemyHpScale: 1 + boundedSteps * 0.12 + overflow * 0.08') && balance.includes('attackScale: 1 + boundedSteps * 0.08 + overflow * 0.06'), 'chapter HP or attack growth left the 12/8 then 8/6 percent contract'],
  [balance.includes('const eliteHp = enemy.isElite ? 1.3 : 1') && balance.includes('const eliteAttack = enemy.isElite ? 1.1 : 1') && balance.includes('const eliteSpeed = enemy.isElite ? 1.04 : 1'), 'elite multipliers are not 30% HP, 10% attack and 4% speed'],
  [entities.includes("export type EliteAffix = 'bulwark' | 'berserker' | 'swift';") && balance.includes("['bulwark', 'berserker', 'swift']"), 'elite affixes are not explicit and deterministic'],
  [balance.includes("enemy.eliteAffix === 'bulwark' ? 3 : 0") && balance.includes("enemy.eliteAffix === 'berserker' ? 1.08 : 1") && balance.includes("enemy.eliteAffix === 'swift' ? 1.08 : 1"), 'elite affixes do not have bounded single-axis effects'],
  [balance.includes('hp: 900, attack: 20') && balance.includes('hp: 1600, attack: 27') && balance.includes('hp: 2600, attack: 34') && balance.includes('hp: 4200, attack: 42') && balance.includes('hp: 6500, attack: 50'), 'boss tiers are not distinct across rooms 10/20/30/40/50'],
  [finale.includes('engine.state.floor !== 50') && !finale.includes('engine.state.floor !== 20'), 'chapter finale still fires in room 20 instead of room 50'],
  [overlay.includes('KAPITELBOSS · RAUM 50') && overlay.includes('KAPITEL ABGESCHLOSSEN'), 'chapter boss overlay does not identify room 50 and chapter completion'],
  [normalHits['room-1-slime'] >= 2 && normalHits['room-1-slime'] <= 3, 'starting enemies leave the 2-3 hit corridor'],
  [normalHits['room-9-orc'] >= 6 && normalHits['room-9-orc'] <= 9, 'early heavy enemies leave the 6-9 hit corridor'],
  [normalHits['room-19-vampire'] >= 5 && normalHits['room-19-vampire'] <= 8, 'mid-run enemies leave the 5-8 hit corridor'],
  [normalHits['room-29-demon'] >= 8 && normalHits['room-29-demon'] <= 11 && normalHits['room-39-demon'] >= 8 && normalHits['room-39-demon'] <= 11, 'late demons leave the 8-11 hit corridor'],
  [normalHits['room-49-vampire'] >= 5 && normalHits['room-49-vampire'] <= 8, 'late standard enemies leave the 5-8 hit corridor'],
  [normalHits['room-49-golem'] >= 12 && normalHits['room-49-golem'] <= 15, 'late golems leave the 12-15 heavy-enemy corridor'],
  [eliteHits['room-19-vampire-elite'] >= 8 && eliteHits['room-19-vampire-elite'] <= 11 && eliteHits['room-39-demon-elite'] >= 12 && eliteHits['room-39-demon-elite'] <= 15, 'elite time-to-kill leaves the intended heavy corridor'],
  [Object.values(survivalHits).every(hits => hits >= 8 && hits <= 10), 'representative normal enemies no longer allow 8-10 player hits'],
  [bossSeconds[10] >= 35 && bossSeconds[10] <= 45 && bossSeconds[20] >= 40 && bossSeconds[20] <= 50 && bossSeconds[30] >= 45 && bossSeconds[30] <= 55, 'early and middle boss durations leave their target corridors'],
  [bossSeconds[40] >= 60 && bossSeconds[40] <= 72 && bossSeconds[50] >= 75 && bossSeconds[50] <= 85, 'late boss durations leave their target corridors'],
  [report.chapterProfiles.at(-1).hp < 2 && report.chapterProfiles.at(-1).attack < 1.7, 'chapter 10 growth exceeds the moderated long-term ceiling'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Central combat balance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`Central combat balance audit passed: normal hits ${Object.values(normalHits).join('/')}, boss seconds ${Object.values(bossSeconds).join('/')}.`);

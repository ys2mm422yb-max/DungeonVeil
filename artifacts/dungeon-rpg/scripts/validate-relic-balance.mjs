import { readFile } from 'node:fs/promises';
import { simulateRelicBalance } from './relic-balance-simulator.mjs';

const [relics, retention, effects] = await Promise.all([
  readFile(new URL('../src/game/veilRelics.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/runRetention.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/runRelicEffects.ts', import.meta.url), 'utf8'),
]);

const report = simulateRelicBalance({ seed: 0x180b4a, samples: 20000 });
const collection = Object.values(report.collection);

const checks = [
  [relics.includes('export const HUNT_RELIC_PITY = 6;') && relics.includes('export const BOSS_RELIC_PITY = 8;'), 'relic pity limits are not fixed at six hunts and eight bosses'],
  [relics.includes('const unowned = pool.filter') && relics.includes('const candidates = unowned.length ? unowned : pool;'), 'unowned relics are not preferred before duplicates'],
  [relics.includes('GUARDIAN_CROWN_MAX_STACKS = 5') && relics.includes('4 % Angriff') && relics.includes('maximal fünf Stapel'), 'Guardian Crown description or stack cap is not five times four percent'],
  [retention.includes("const huntCap = relic === 'ash-eye' ? 4 : 3;") && retention.includes('state.huntsSpawned++'), 'chapter hunt caps are not three normally and four with Ash Eye'],
  [retention.includes("source === 'hunt' ? 0.12 : engine.state.floor === 50 ? 0.2 : 0.1"), 'relic drop chances are not 12% hunt, 10% boss and 20% room 50'],
  [retention.includes('rollVeilRelicDrop(source, chance)'), 'active relic awards do not use persistent pity and unowned-first selection'],
  [retention.includes('state.clawKills % 5 !== 0') && retention.includes('time + 3000'), 'Marked Claw is not limited to every fifth kill for three seconds'],
  [retention.includes('guardianCrownStacksForCurrentRun') && retention.includes('advanceGuardianCrownForCurrentRun') && retention.includes('stacks}/5'), 'Guardian Crown does not persist and display its bounded run stacks'],
  [effects.includes('player.attackCooldown * 0.82') && !effects.includes('player.attackCooldown * 0.78'), 'Marked Claw attack-speed bonus is not 18%'],
  [effects.includes('Math.ceil(originalDamage * 0.75)') && effects.includes('number.value = `-${reducedDamage}`') && !effects.includes('value: `+${restored}`'), 'Depth Rune Shard still presents post-hit healing instead of 25% mitigation'],
  [effects.includes('player.maxHp * 0.1') && effects.includes('player.attack * 1.06'), 'World Core is not balanced at 10% health and 6% attack'],
  [report.crownMaxAttackBonus === 0.2, 'Guardian Crown exceeds the 20% run ceiling'],
  [collection.every(result => result.median >= 4 && result.median <= 5), 'a relic source leaves the four-to-five chapter median collection corridor'],
  [collection.every(result => result.p90 <= 6), 'a relic source exceeds the six-chapter p90 collection ceiling'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Relic balance audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`Relic balance audit passed: hunt median ${report.collection.hunt.median}, boss median ${report.collection.boss.median}, p90 ceiling ${Math.max(...collection.map(result => result.p90))}.`);

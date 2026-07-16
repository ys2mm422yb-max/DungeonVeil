import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [gates, targeting, collection, runtime, relics, retention, balance, effects] = await Promise.all([
  read('../src/game/equipmentChapterGates.ts'),
  read('../src/game/equipmentTargeting.ts'),
  read('../src/game/equipmentCollection.ts'),
  read('../src/game/equipmentRuntimeBalance.ts'),
  read('../src/game/veilRelics.ts'),
  read('../src/game/runRetention.ts'),
  read('../src/game/runBalance.ts'),
  read('../src/game/runEffectSystems.ts'),
]);

const unlockValues = [...gates.matchAll(/'[^']+':\s*(\d+)/g)].map(match => Number(match[1]));
const checks = [
  [Math.max(...unlockValues) === 10 && unlockValues.some(value => value >= 8), 'equipment unlocks do not extend through chapter ten'],
  [collection.includes('MAX_LEVEL_DUPLICATE_DUST') && collection.includes('existing.level >= 5'), 'max-level duplicate conversion is missing'],
  [runtime.includes('EQUIPMENT_SKILL_SETS') && runtime.includes("count >= 3 ? 3 : count >= 2 ? 2"), 'equipment set skill ranks are not active'],
  [targeting.includes('EQUIPMENT_SOURCE_MARK_COST = 3') && targeting.includes('WISH_PITY_MISSES = 2'), 'equipment marks or pity changed unexpectedly'],
  [relics.includes('RELIC_PITY_MISSES = 4') && relics.includes('const unowned = pool.filter'), 'relic pity or unowned-first selection is missing'],
  [relics.includes('current >= 5') && relics.includes('current + 1'), 'Guardian Crown is not capped at five stacks'],
  [retention.includes('const maxHunts = Math.min(5, 3 +') && retention.includes('engine.state.floor - state.lastHuntFloor < 7'), 'chapter hunt caps or spacing are missing'],
  [retention.includes('state.clawKillChain % 5 === 0'), 'Marked Claw still triggers on every kill'],
  [runtime.includes("equippedVeilRelic() === 'depth-rune-shard'") && runtime.includes('rawDamage * 0.75'), 'Rune Shard is not reducing final rune damage'],
  [balance.includes('legacySpawnScale') && balance.includes('baseHp = Math.max(1, enemy.maxHp / spawnScale)'), 'legacy spawn scaling is not normalized before central balance'],
  [balance.includes("ELITE_AFFIXES") && balance.includes('updateMenders') && balance.includes('queueVolatileDeaths'), 'elite affix mechanics are incomplete'],
  [effects.includes('engine.state.floor !== 50') && effects.includes('engine.state.floor === 50'), 'final boss phase is not owned by room fifty'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Final balance integration audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Final balance integration audit passed: long-term equipment, relic, hunt, elite and room-50 contracts are active.');

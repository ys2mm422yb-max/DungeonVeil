import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [redesign, gates, targeting, collection, runtime, relics, retention, balance, effects] = await Promise.all([
  read('../src/game/equipmentRedesign.ts'),
  read('../src/game/equipmentChapterGates.ts'),
  read('../src/game/equipmentTargeting.ts'),
  read('../src/game/equipmentCollection.ts'),
  read('../src/game/equipmentRuntimeBalance.ts'),
  read('../src/game/veilRelics.ts'),
  read('../src/game/runRetention.ts'),
  read('../src/game/runBalance.ts'),
  read('../src/game/runEffectSystems.ts'),
]);

const activeIds = [...redesign.matchAll(/^\s*'([^']+)':\s*\{/gm)].map(match => match[1]);
const checks = [
  [activeIds.length === 10, 'active equipment catalog is not exactly ten items'],
  [redesign.includes('unlockChapter: 10') && redesign.includes("'warden-bow'"), 'late equipment unlocks do not extend through chapter ten'],
  [gates.includes('ACTIVE_EQUIPMENT[id].unlockChapter') && gates.includes('isActiveEquipmentId(id)'), 'chapter gates are not sourced from the active catalog'],
  [collection.includes('MAX_LEVEL_DUPLICATE_DUST') && collection.includes('existing.level >= 5'), 'max-level duplicate conversion is missing'],
  [!runtime.includes('EQUIPMENT_SKILL_SETS') && runtime.includes('installCriticalHitRuntime'), 'normal equipment still grants set skills or critical runtime is missing'],
  [targeting.includes('WISH_PITY_MISSES = 7') && targeting.includes('CHAPTER_WISH_PITY_MISSES = 9'), 'long-term wish pity is not active'],
  [targeting.includes("rarity === 'common' ? 8 : rarity === 'rare' ? 11 : 15"), 'rarity-based source-mark costs are missing'],
  [relics.includes('RELIC_PITY_BY_SOURCE') && relics.includes('RELIC_UNOWNED_PREFERENCE = 0.65'), 'relic pity or bounded unowned preference is missing'],
  [relics.includes('current >= 4') && relics.includes('stack: 4'), 'Guardian Crown is not capped at four stacks'],
  [retention.includes('const maxHunts = Math.min(5, 3 +') && retention.includes('engine.state.floor - state.lastHuntFloor < 7'), 'chapter hunt caps or spacing are missing'],
  [retention.includes('state.clawKillChain % 7 === 0'), 'Marked Claw trigger cadence is not the redesigned seven-kill contract'],
  [runtime.includes('mitigatedIncomingDamage') && runtime.includes("equippedVeilRelic() === 'depth-rune-shard'"), 'Rune Shard is not reducing damage before final defense mitigation'],
  [balance.includes('legacySpawnScale') && balance.includes('baseHp = Math.max(1, enemy.maxHp / spawnScale)'), 'legacy spawn scaling is not normalized before central balance'],
  [balance.includes('ELITE_AFFIXES') && balance.includes('updateMenders') && balance.includes('queueVolatileDeaths'), 'elite affix mechanics are incomplete'],
  [effects.includes('engine.state.floor !== 50') && effects.includes('engine.state.floor === 50'), 'final boss phase is not owned by room fifty'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Final balance integration audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Final balance integration audit passed: ten-item roles, long-term grind, bounded relics, elite systems and room-50 ownership are active.');

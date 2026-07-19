import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [redesign, gates, targeting, collection, runtime, playerRuntime, combat, relics, retention, balance, overlay, effects] = await Promise.all([
  read('../src/game/equipmentRedesign.ts'),
  read('../src/game/equipmentChapterGates.ts'),
  read('../src/game/equipmentTargeting.ts'),
  read('../src/game/equipmentCollection.ts'),
  read('../src/game/equipmentRuntimeBalance.ts'),
  read('../src/game/equipmentPlayerRuntimeV4.ts'),
  read('../src/game/equipmentCombatV4.ts'),
  read('../src/game/veilRelics.ts'),
  read('../src/game/runRetention.ts'),
  read('../src/game/runBalance.ts'),
  read('../src/game/combatBalanceOverlayV4.ts'),
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
  [playerRuntime.includes('Math.floor(kills / 7)') && playerRuntime.includes('state.clawUntil = time + 2500'), 'Marked Claw seven-kill cadence is not active'],
  [playerRuntime.includes("equippedVeilRelic() === 'depth-rune-shard' ? 0.82 : 1") && playerRuntime.indexOf('rawDamage * runeFactor') < playerRuntime.indexOf('defenseMitigation(player.defense'), 'Rune Shard is not reducing damage before final defense mitigation'],
  [combat.includes('safeDefense / (safeDefense + 32)') && combat.includes('cap = 0.52'), 'diminishing defense or cap is missing'],
  [balance.includes('legacySpawnScale') && balance.includes('baseHp = Math.max(1, enemy.maxHp / spawnScale)'), 'legacy spawn scaling is not normalized before central balance'],
  [balance.includes('ELITE_AFFIXES') && balance.includes('updateMenders') && balance.includes('queueVolatileDeaths'), 'elite affix mechanics are incomplete'],
  [overlay.includes('applyCombatBalanceV4Overlay') && overlay.includes('chapterCombatProfileV4') && overlay.includes('roomCombatScaleV4'), 'V4 room and chapter overlay is not active'],
  [effects.includes('engine.state.floor !== 50') && effects.includes('engine.state.floor === 50'), 'final boss phase is not owned by room fifty'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Final balance integration audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Final V4 balance integration audit passed: ten-item roles, grind, bounded relics, criticals, defense, elites and room/chapter ownership are active.');

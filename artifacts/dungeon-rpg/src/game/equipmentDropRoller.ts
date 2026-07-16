import { equipmentUnlockedForCurrentProgress } from './equipmentChapterGates';
import {
  EQUIPMENT,
  loadMetaProgression,
  type EquipmentDefinition,
  type EquipmentDropSource,
  type MetaProgression,
  type PendingEquipmentDrop,
} from './metaProgression';
import type { EquipmentDropRule } from './equipmentDropBalance';

function availableDrops(meta: MetaProgression, source: EquipmentDropSource): EquipmentDefinition[] {
  return Object.values(EQUIPMENT).filter(item => (
    item.dropSource === source
    && item.unlockRank <= meta.rank
    && equipmentUnlockedForCurrentProgress(item.id)
  ));
}

function chooseFromPool(meta: MetaProgression, pool: EquipmentDefinition[]): PendingEquipmentDrop | null {
  if (!pool.length) return null;
  const unowned = pool.filter(candidate => !meta.owned[candidate.id]);
  const candidates = unowned.length ? unowned : pool;
  const item = candidates[Math.floor(Math.random() * candidates.length)];
  return { item: item.id, duplicate: Boolean(meta.owned[item.id]), source: item.dropSource, rarity: item.rarity };
}

function choosePrimaryWithFallback(meta: MetaProgression, sources: readonly EquipmentDropSource[]): PendingEquipmentDrop | null {
  for (const source of sources) {
    const drop = chooseFromPool(meta, availableDrops(meta, source));
    if (drop) return drop;
  }
  return null;
}

function chooseWildcard(meta: MetaProgression, sources: readonly EquipmentDropSource[]): PendingEquipmentDrop | null {
  const pool = sources.flatMap(source => availableDrops(meta, source));
  return chooseFromPool(meta, pool);
}

export function rollBalancedEquipmentDrop(rule: Pick<EquipmentDropRule, 'chance' | 'sources' | 'mode'>): PendingEquipmentDrop | null {
  if (!rule.sources.length || Math.random() > rule.chance) return null;
  const meta = loadMetaProgression();
  return rule.mode === 'wildcard'
    ? chooseWildcard(meta, rule.sources)
    : choosePrimaryWithFallback(meta, rule.sources);
}

export function rollBalancedSourceDrop(source: EquipmentDropSource, chance = 1): PendingEquipmentDrop | null {
  return rollBalancedEquipmentDrop({ chance, sources: [source], mode: 'primary-fallback' });
}

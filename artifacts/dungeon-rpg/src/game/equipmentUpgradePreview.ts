import { isActiveEquipmentId, equipmentStatsAtLevel } from './equipmentCore';
import type { EquipmentId, MetaProgression } from './metaProgression';

export type EquipmentUpgradePreviewKey =
  | 'attackFlat'
  | 'maxHp'
  | 'defense'
  | 'attackRange'
  | 'attackSpeedPercent'
  | 'critChance'
  | 'critDamage';

export type EquipmentUpgradePreviewRow = {
  key: EquipmentUpgradePreviewKey;
  current: number;
  next: number;
  delta: number;
  format: 'flat' | 'percent';
};

function percent(value: number) {
  return Math.round(value * 1000) / 10;
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

export function equipmentUpgradePreview(
  id: EquipmentId,
  meta: MetaProgression,
): EquipmentUpgradePreviewRow[] {
  if (!isActiveEquipmentId(id)) return [];
  const level = meta.owned[id]?.level ?? 0;
  if (level <= 0 || level >= 5) return [];

  const current = equipmentStatsAtLevel(id, level);
  const next = equipmentStatsAtLevel(id, level + 1);
  const candidates: EquipmentUpgradePreviewRow[] = [
    { key: 'attackFlat', current: current.attackFlat, next: next.attackFlat, delta: next.attackFlat - current.attackFlat, format: 'flat' },
    { key: 'maxHp', current: current.maxHp, next: next.maxHp, delta: next.maxHp - current.maxHp, format: 'flat' },
    { key: 'defense', current: current.defense, next: next.defense, delta: next.defense - current.defense, format: 'flat' },
    { key: 'attackRange', current: current.attackRange, next: next.attackRange, delta: next.attackRange - current.attackRange, format: 'flat' },
    { key: 'attackSpeedPercent', current: percent(current.attackSpeedPercent), next: percent(next.attackSpeedPercent), delta: percent(next.attackSpeedPercent - current.attackSpeedPercent), format: 'percent' },
    { key: 'critChance', current: percent(current.critChance), next: percent(next.critChance), delta: percent(next.critChance - current.critChance), format: 'percent' },
    { key: 'critDamage', current: percent(current.critDamage), next: percent(next.critDamage), delta: percent(next.critDamage - current.critDamage), format: 'percent' },
  ];

  return candidates
    .map(row => ({ ...row, current: rounded(row.current), next: rounded(row.next), delta: rounded(row.delta) }))
    .filter(row => Math.abs(row.delta) >= 0.05);
}

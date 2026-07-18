import {
  EQUIPMENT,
  equipmentCombatModifiers,
  type EquipmentCombatModifiers,
  type EquipmentId,
  type MetaProgression,
} from './metaProgression';

export type EquipmentUpgradePreviewKey =
  | 'attackFlat'
  | 'attackPercent'
  | 'maxHp'
  | 'defense'
  | 'speedPercent'
  | 'attackRange'
  | 'attackSpeedPercent'
  | 'dodgeSpeedPercent';

export type EquipmentUpgradePreviewRow = {
  key: EquipmentUpgradePreviewKey;
  current: number;
  next: number;
  delta: number;
  format: 'flat' | 'percent';
};

function cloneMetaAtLevel(meta: MetaProgression, id: EquipmentId, level: number): MetaProgression {
  const copy = structuredClone(meta);
  const item = EQUIPMENT[id];
  copy.equipped[item.slot] = id;
  copy.owned[id] = {
    level: Math.max(1, Math.min(5, Math.floor(level))),
    copies: copy.owned[id]?.copies ?? 0,
  };
  return copy;
}

function percent(value: number) {
  return Math.round(value * 1000) / 10;
}

function attackSpeedPercent(modifiers: EquipmentCombatModifiers) {
  return percent(1 - modifiers.attackCooldownMultiplier);
}

function dodgeSpeedPercent(modifiers: EquipmentCombatModifiers) {
  return percent(1 - modifiers.dodgeCooldownMultiplier);
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

export function equipmentUpgradePreview(
  id: EquipmentId,
  meta: MetaProgression,
): EquipmentUpgradePreviewRow[] {
  const level = meta.owned[id]?.level ?? 0;
  if (level <= 0 || level >= 5) return [];

  const current = equipmentCombatModifiers(cloneMetaAtLevel(meta, id, level));
  const next = equipmentCombatModifiers(cloneMetaAtLevel(meta, id, level + 1));
  const candidates: EquipmentUpgradePreviewRow[] = [
    { key: 'attackFlat', current: current.attackFlat, next: next.attackFlat, delta: next.attackFlat - current.attackFlat, format: 'flat' },
    { key: 'attackPercent', current: percent(current.attackPercent), next: percent(next.attackPercent), delta: percent(next.attackPercent - current.attackPercent), format: 'percent' },
    { key: 'maxHp', current: current.maxHp, next: next.maxHp, delta: next.maxHp - current.maxHp, format: 'flat' },
    { key: 'defense', current: current.defense, next: next.defense, delta: next.defense - current.defense, format: 'flat' },
    { key: 'speedPercent', current: percent(current.speedPercent), next: percent(next.speedPercent), delta: percent(next.speedPercent - current.speedPercent), format: 'percent' },
    { key: 'attackRange', current: current.attackRange, next: next.attackRange, delta: next.attackRange - current.attackRange, format: 'flat' },
    { key: 'attackSpeedPercent', current: attackSpeedPercent(current), next: attackSpeedPercent(next), delta: attackSpeedPercent(next) - attackSpeedPercent(current), format: 'percent' },
    { key: 'dodgeSpeedPercent', current: dodgeSpeedPercent(current), next: dodgeSpeedPercent(next), delta: dodgeSpeedPercent(next) - dodgeSpeedPercent(current), format: 'percent' },
  ];

  return candidates
    .map(row => ({ ...row, current: rounded(row.current), next: rounded(row.next), delta: rounded(row.delta) }))
    .filter(row => Math.abs(row.delta) >= 0.05);
}

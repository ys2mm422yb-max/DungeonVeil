import type { CompanionRoleV4 } from './companionReserveV4';
import {
  COMPANION_COLLECTION_EVENT,
  COMPANION_COLLECTION_STORAGE_KEY,
  COMPANION_DEFINITIONS_V5,
  activeCompanionV5,
  companionForOwnerV5,
  loadCompanionCollectionV5,
  selectCompanionV5,
} from './companionCollectionV5';

// Legacy names stay exported while callers migrate to the collection contract.
export const COMPANION_SELECTION_STORAGE_KEY = COMPANION_COLLECTION_STORAGE_KEY;
export const COMPANION_SELECTION_EVENT = COMPANION_COLLECTION_EVENT;

export const COMPANION_ROLE_ORDER_V4: readonly CompanionRoleV4[] = Object.freeze([
  'single-target',
  'critical-support',
  'shield',
  'loot-comfort',
  'distraction',
]);

export const COMPANION_ROLE_COPY_V4: Readonly<Record<CompanionRoleV4, Readonly<{
  de: string;
  en: string;
  bonusDe: string;
  bonusEn: string;
}>>> = Object.freeze(Object.fromEntries(COMPANION_ROLE_ORDER_V4.map(role => {
  const definition = COMPANION_DEFINITIONS_V5[role];
  return [role, {
    de: `${definition.nameDe} · ${definition.titleDe}`,
    en: `${definition.nameEn} · ${definition.titleEn}`,
    bonusDe: definition.bonusDe,
    bonusEn: definition.bonusEn,
  }];
})) as Record<CompanionRoleV4, Readonly<{ de: string; en: string; bonusDe: string; bonusEn: string }>>);

export function isCompanionRoleV4(value: unknown): value is CompanionRoleV4 {
  return COMPANION_ROLE_ORDER_V4.includes(value as CompanionRoleV4);
}

export function loadCompanionRoleV4(): CompanionRoleV4 {
  return activeCompanionV5()?.id ?? 'single-target';
}

export function saveCompanionRoleV4(role: CompanionRoleV4): CompanionRoleV4 {
  const before = activeCompanionV5()?.id ?? 'single-target';
  if (!isCompanionRoleV4(role)) return before;
  const state = selectCompanionV5(role);
  return state.activeId ?? before;
}

export function nextCompanionRoleV4(role: CompanionRoleV4): CompanionRoleV4 {
  const unlocked = COMPANION_ROLE_ORDER_V4.filter(candidate => Boolean(loadCompanionCollectionV5().companions[candidate]));
  if (unlocked.length < 2) return role;
  const index = Math.max(0, unlocked.indexOf(role));
  return unlocked[(index + 1) % unlocked.length];
}

export function companionRoleForOwnerV4(ownerId: string): CompanionRoleV4 {
  return companionForOwnerV5(ownerId).id;
}

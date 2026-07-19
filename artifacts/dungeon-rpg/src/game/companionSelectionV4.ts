import type { CompanionRoleV4 } from './companionReserveV4';

export const COMPANION_SELECTION_STORAGE_KEY = 'dungeon-veil-companion-v4';
export const COMPANION_SELECTION_EVENT = 'dungeon-veil-companion-selection-v4';

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
}>>> = Object.freeze({
  'single-target': { de: 'Schleierjäger', en: 'Veil Hunter', bonusDe: 'Gezielter Zusatztreffer', bonusEn: 'Focused bonus strike' },
  'critical-support': { de: 'Klingenfunke', en: 'Blade Spark', bonusDe: 'Unterstützt kritische Treffer', bonusEn: 'Supports critical strikes' },
  shield: { de: 'Wächterecho', en: 'Guardian Echo', bonusDe: 'Begrenzt schweren Schaden', bonusEn: 'Softens heavy damage' },
  'loot-comfort': { de: 'Sammlergeist', en: 'Gathering Spirit', bonusDe: 'Zieht Beute sanft heran', bonusEn: 'Gently pulls loot closer' },
  distraction: { de: 'Irrlichtläufer', en: 'Wisp Runner', bonusDe: 'Lenkt Gegner kurz ab', bonusEn: 'Briefly distracts enemies' },
});

type StoredCompanionSelectionV4 = Readonly<{
  version: 1;
  role: CompanionRoleV4;
  updatedAt: number;
}>;

export function isCompanionRoleV4(value: unknown): value is CompanionRoleV4 {
  return COMPANION_ROLE_ORDER_V4.includes(value as CompanionRoleV4);
}

export function loadCompanionRoleV4(): CompanionRoleV4 {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMPANION_SELECTION_STORAGE_KEY) ?? '{}') as Partial<StoredCompanionSelectionV4>;
    return isCompanionRoleV4(parsed.role) ? parsed.role : 'single-target';
  } catch {
    return 'single-target';
  }
}

export function saveCompanionRoleV4(role: CompanionRoleV4): CompanionRoleV4 {
  const normalized = isCompanionRoleV4(role) ? role : 'single-target';
  try {
    localStorage.setItem(COMPANION_SELECTION_STORAGE_KEY, JSON.stringify({ version: 1, role: normalized, updatedAt: Date.now() } satisfies StoredCompanionSelectionV4));
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(COMPANION_SELECTION_EVENT, { detail: { role: normalized } }));
  return normalized;
}

export function nextCompanionRoleV4(role: CompanionRoleV4): CompanionRoleV4 {
  const index = COMPANION_ROLE_ORDER_V4.indexOf(role);
  return COMPANION_ROLE_ORDER_V4[(index + 1) % COMPANION_ROLE_ORDER_V4.length];
}

export function companionRoleForOwnerV4(ownerId: string): CompanionRoleV4 {
  let hash = 2166136261;
  for (let index = 0; index < ownerId.length; index++) {
    hash ^= ownerId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return COMPANION_ROLE_ORDER_V4[(hash >>> 0) % COMPANION_ROLE_ORDER_V4.length];
}

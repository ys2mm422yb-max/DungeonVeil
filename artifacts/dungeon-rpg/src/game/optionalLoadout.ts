export const OPTIONAL_LOADOUT_STORAGE_KEY = 'dungeon-veil-optional-loadout-v1';
export const OPTIONAL_LOADOUT_EVENT = 'dungeon-veil-optional-loadout-changed';

export type OptionalLoadoutState = Readonly<{
  version: 1;
  quiverEquipped: boolean;
  updatedAt: number;
}>;

const DEFAULT_STATE: OptionalLoadoutState = Object.freeze({
  version: 1,
  quiverEquipped: true,
  updatedAt: 0,
});

function normalizeState(value: unknown): OptionalLoadoutState {
  const raw = value && typeof value === 'object' ? value as Partial<OptionalLoadoutState> : {};
  return Object.freeze({
    version: 1,
    quiverEquipped: raw.quiverEquipped !== false,
    updatedAt: Math.max(0, Number(raw.updatedAt) || 0),
  });
}

export function loadOptionalLoadout(): OptionalLoadoutState {
  if (typeof localStorage === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(OPTIONAL_LOADOUT_STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveOptionalLoadout(state: OptionalLoadoutState): OptionalLoadoutState {
  const normalized = normalizeState({ ...state, version: 1, updatedAt: Date.now() });
  try { localStorage.setItem(OPTIONAL_LOADOUT_STORAGE_KEY, JSON.stringify(normalized)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPTIONAL_LOADOUT_EVENT, { detail: normalized }));
  return normalized;
}

export function setQuiverEquipped(equipped: boolean): OptionalLoadoutState {
  return saveOptionalLoadout({ ...loadOptionalLoadout(), quiverEquipped: equipped, updatedAt: Date.now() });
}

export function isQuiverEquipped(): boolean {
  return loadOptionalLoadout().quiverEquipped;
}

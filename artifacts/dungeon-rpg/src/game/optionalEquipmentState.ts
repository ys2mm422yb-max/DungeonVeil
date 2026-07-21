export type OptionalEquipmentSlot = 'quiver';

export type OptionalEquipmentState = Readonly<{
  version: 1;
  equipped: Record<OptionalEquipmentSlot, boolean>;
}>;

const STORAGE_KEY = 'dungeon-veil-optional-equipment-v1';
export const OPTIONAL_EQUIPMENT_EVENT = 'dungeon-veil-optional-equipment-changed';

const DEFAULT_STATE: OptionalEquipmentState = Object.freeze({
  version: 1,
  equipped: Object.freeze({ quiver: true }),
});

function normalize(raw: unknown): OptionalEquipmentState {
  const value = raw && typeof raw === 'object' ? raw as Partial<OptionalEquipmentState> : {};
  return Object.freeze({
    version: 1,
    equipped: Object.freeze({
      quiver: value.equipped?.quiver !== false,
    }),
  });
}

export function loadOptionalEquipmentState(): OptionalEquipmentState {
  if (typeof localStorage === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function isOptionalEquipmentSlotEquipped(slot: OptionalEquipmentSlot): boolean {
  return loadOptionalEquipmentState().equipped[slot];
}

export function setOptionalEquipmentSlotEquipped(slot: OptionalEquipmentSlot, equipped: boolean): OptionalEquipmentState {
  const current = loadOptionalEquipmentState();
  const next = normalize({
    ...current,
    equipped: { ...current.equipped, [slot]: Boolean(equipped) },
  });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPTIONAL_EQUIPMENT_EVENT, { detail: next }));
  return next;
}

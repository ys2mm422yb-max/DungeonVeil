import type { EquipmentId } from './metaProgression';
import type { VeilRelicId } from './veilRelics';

const STORAGE_KEY = 'dungeon-veil-seen-unlocks-v1';
export const NEW_CONTENT_EVENT = 'dungeon-veil-new-content-changed';

type SeenUnlocks = {
  version: 1;
  initialized: boolean;
  equipment: EquipmentId[];
  relics: VeilRelicId[];
};

function emit(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NEW_CONTENT_EVENT));
}

function read(): SeenUnlocks {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SeenUnlocks>;
    return {
      version: 1,
      initialized: parsed.initialized === true,
      equipment: Array.isArray(parsed.equipment) ? parsed.equipment.filter(value => typeof value === 'string') as EquipmentId[] : [],
      relics: Array.isArray(parsed.relics) ? parsed.relics.filter(value => typeof value === 'string') as VeilRelicId[] : [],
    };
  } catch {
    return { version: 1, initialized: false, equipment: [], relics: [] };
  }
}

function write(state: SeenUnlocks): SeenUnlocks {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  emit();
  return state;
}

export function initializeSeenUnlocks(equipment: EquipmentId[], relics: VeilRelicId[]): SeenUnlocks {
  const state = read();
  if (state.initialized) return state;
  return write({ version: 1, initialized: true, equipment: [...new Set(equipment)], relics: [...new Set(relics)] });
}

export function unseenEquipmentIds(owned: EquipmentId[]): EquipmentId[] {
  const state = read();
  if (!state.initialized) return [];
  const seen = new Set(state.equipment);
  return owned.filter(id => !seen.has(id));
}

export function unseenRelicIds(owned: VeilRelicId[]): VeilRelicId[] {
  const state = read();
  if (!state.initialized) return [];
  const seen = new Set(state.relics);
  return owned.filter(id => !seen.has(id));
}

export function markEquipmentSeen(id: EquipmentId): void {
  const state = read();
  if (state.equipment.includes(id)) return;
  write({ ...state, initialized: true, equipment: [...state.equipment, id] });
}

export function markRelicSeen(id: VeilRelicId): void {
  const state = read();
  if (state.relics.includes(id)) return;
  write({ ...state, initialized: true, relics: [...state.relics, id] });
}

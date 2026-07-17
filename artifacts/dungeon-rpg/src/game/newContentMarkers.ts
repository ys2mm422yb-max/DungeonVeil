import type { EquipmentId } from './metaProgression';
import type { VeilRelicId } from './veilRelics';

const STORAGE_KEY = 'dungeon-veil-seen-unlocks-v1';
const MARKER_VERSION = 2;
export const NEW_CONTENT_EVENT = 'dungeon-veil-new-content-changed';

type SeenUnlocks = {
  version: 2;
  initialized: boolean;
  equipment: EquipmentId[];
  relics: VeilRelicId[];
  announcedEquipment: EquipmentId[];
  announcedRelics: VeilRelicId[];
};

type ReadResult = {
  state: SeenUnlocks;
  legacy: boolean;
};

function emit(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NEW_CONTENT_EVENT));
}

function uniqueIds<T extends string>(value: unknown): T[] {
  return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string'))] as T[] : [];
}

function read(): ReadResult {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SeenUnlocks> & { version?: number };
    const initialized = parsed.initialized === true;
    const equipment = uniqueIds<EquipmentId>(parsed.equipment);
    const relics = uniqueIds<VeilRelicId>(parsed.relics);
    const currentVersion = parsed.version === MARKER_VERSION;
    return {
      legacy: initialized && !currentVersion,
      state: {
        version: MARKER_VERSION,
        initialized,
        equipment,
        relics,
        announcedEquipment: currentVersion ? uniqueIds<EquipmentId>(parsed.announcedEquipment) : [],
        announcedRelics: currentVersion ? uniqueIds<VeilRelicId>(parsed.announcedRelics) : [],
      },
    };
  } catch {
    return {
      legacy: false,
      state: { version: MARKER_VERSION, initialized: false, equipment: [], relics: [], announcedEquipment: [], announcedRelics: [] },
    };
  }
}

function write(state: SeenUnlocks): SeenUnlocks {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  emit();
  return state;
}

export function initializeSeenUnlocks(equipment: EquipmentId[], relics: VeilRelicId[]): SeenUnlocks {
  const { state, legacy } = read();
  const currentEquipment = [...new Set(equipment)];
  const currentRelics = [...new Set(relics)];
  if (!state.initialized) {
    return write({
      version: MARKER_VERSION,
      initialized: true,
      equipment: currentEquipment,
      relics: currentRelics,
      announcedEquipment: currentEquipment,
      announcedRelics: currentRelics,
    });
  }
  if (legacy) {
    return write({
      ...state,
      version: MARKER_VERSION,
      initialized: true,
      announcedEquipment: [...new Set([...state.equipment, ...currentEquipment])],
      announcedRelics: [...new Set([...state.relics, ...currentRelics])],
    });
  }
  return state;
}

export function unseenEquipmentIds(owned: EquipmentId[]): EquipmentId[] {
  const { state } = read();
  if (!state.initialized) return [];
  const seen = new Set(state.equipment);
  return owned.filter(id => !seen.has(id));
}

export function unseenRelicIds(owned: VeilRelicId[]): VeilRelicId[] {
  const { state } = read();
  if (!state.initialized) return [];
  const seen = new Set(state.relics);
  return owned.filter(id => !seen.has(id));
}

export function unannouncedEquipmentIds(owned: EquipmentId[]): EquipmentId[] {
  const { state } = read();
  if (!state.initialized) return [];
  const announced = new Set(state.announcedEquipment);
  return owned.filter(id => !announced.has(id));
}

export function unannouncedRelicIds(owned: VeilRelicId[]): VeilRelicId[] {
  const { state } = read();
  if (!state.initialized) return [];
  const announced = new Set(state.announcedRelics);
  return owned.filter(id => !announced.has(id));
}

export function markEquipmentAnnounced(id: EquipmentId): void {
  const { state } = read();
  if (state.announcedEquipment.includes(id)) return;
  write({ ...state, initialized: true, announcedEquipment: [...state.announcedEquipment, id] });
}

export function markRelicAnnounced(id: VeilRelicId): void {
  const { state } = read();
  if (state.announcedRelics.includes(id)) return;
  write({ ...state, initialized: true, announcedRelics: [...state.announcedRelics, id] });
}

export function markEquipmentSeen(id: EquipmentId): void {
  const { state } = read();
  if (state.equipment.includes(id) && state.announcedEquipment.includes(id)) return;
  write({
    ...state,
    initialized: true,
    equipment: state.equipment.includes(id) ? state.equipment : [...state.equipment, id],
    announcedEquipment: state.announcedEquipment.includes(id) ? state.announcedEquipment : [...state.announcedEquipment, id],
  });
}

export function markRelicSeen(id: VeilRelicId): void {
  const { state } = read();
  if (state.relics.includes(id) && state.announcedRelics.includes(id)) return;
  write({
    ...state,
    initialized: true,
    relics: state.relics.includes(id) ? state.relics : [...state.relics, id],
    announcedRelics: state.announcedRelics.includes(id) ? state.announcedRelics : [...state.announcedRelics, id],
  });
}

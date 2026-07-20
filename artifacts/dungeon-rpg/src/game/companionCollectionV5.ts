import type { CompanionRoleV4 } from './companionReserveV4';
import { loadMetaProgression, saveMetaProgression } from './metaProgression';
import { loadPlayerProfile } from './playerProfile';

export type CompanionSpeciesV5 = 'veil-lynx' | 'ember-raven' | 'rune-sentinel' | 'lantern-wisp' | 'dusk-drake';

export type CompanionDefinitionV5 = Readonly<{
  id: CompanionRoleV4;
  species: CompanionSpeciesV5;
  nameDe: string;
  nameEn: string;
  titleDe: string;
  titleEn: string;
  bonusDe: string;
  bonusEn: string;
  unlockChapter: number;
  accent: string;
  accentHex: number;
  glyph: string;
}>;

export type CompanionProgressV5 = Readonly<{
  level: number;
  unlockedAt: number;
}>;

export type CompanionCollectionStateV5 = Readonly<{
  version: 1;
  activeId: CompanionRoleV4 | null;
  companions: Partial<Record<CompanionRoleV4, CompanionProgressV5>>;
  updatedAt: number;
}>;

export const COMPANION_COLLECTION_STORAGE_KEY = 'dungeon-veil-companion-collection-v5';
export const COMPANION_COLLECTION_EVENT = 'dungeon-veil-companion-collection-v5';
export const COMPANION_MAX_LEVEL_V5 = 5;
export const COMPANION_UPGRADE_COSTS_V5 = Object.freeze([0, 150, 350, 700, 1200] as const);

export const COMPANION_DEFINITIONS_V5: Readonly<Record<CompanionRoleV4, CompanionDefinitionV5>> = Object.freeze({
  'single-target': {
    id: 'single-target', species: 'veil-lynx', nameDe: 'Nyra', nameEn: 'Nyra',
    titleDe: 'Schleierluchs', titleEn: 'Veil Lynx', bonusDe: 'Springt sichtbar auf ein Einzelziel und zerreißt dessen Deckung.', bonusEn: 'Pounces visibly on one target and tears through its guard.',
    unlockChapter: 2, accent: '#78ddff', accentHex: 0x78ddff, glyph: '⌁',
  },
  'critical-support': {
    id: 'critical-support', species: 'ember-raven', nameDe: 'Khar', nameEn: 'Khar',
    titleDe: 'Aschenrabe', titleEn: 'Ember Raven', bonusDe: 'Markiert Ziele mit glühenden Federn und verstärkt kritische Treffer.', bonusEn: 'Marks targets with burning feathers and strengthens critical hits.',
    unlockChapter: 4, accent: '#ffbf68', accentHex: 0xffbf68, glyph: '✦',
  },
  shield: {
    id: 'shield', species: 'rune-sentinel', nameDe: 'Orum', nameEn: 'Orum',
    titleDe: 'Runenwächter', titleEn: 'Rune Sentinel', bonusDe: 'Stampft in den Boden und errichtet nach schweren Treffern einen Schutzimpuls.', bonusEn: 'Slams the ground and raises a guard pulse after heavy hits.',
    unlockChapter: 6, accent: '#74e0a0', accentHex: 0x74e0a0, glyph: '◇',
  },
  'loot-comfort': {
    id: 'loot-comfort', species: 'lantern-wisp', nameDe: 'Luma', nameEn: 'Luma',
    titleDe: 'Laternengeist', titleEn: 'Lantern Wisp', bonusDe: 'Schießt Schleierfunken und zieht Beute kontrolliert zu dir.', bonusEn: 'Fires veil sparks and pulls loot toward you.',
    unlockChapter: 8, accent: '#f2d06d', accentHex: 0xf2d06d, glyph: '◈',
  },
  distraction: {
    id: 'distraction', species: 'dusk-drake', nameDe: 'Veyr', nameEn: 'Veyr',
    titleDe: 'Dämmerdrache', titleEn: 'Dusk Drake', bonusDe: 'Speit violettes Schleierfeuer und bremst getroffene Gegner.', bonusEn: 'Breathes violet veilfire and slows struck enemies.',
    unlockChapter: 10, accent: '#b58cff', accentHex: 0xb58cff, glyph: '◎',
  },
});

const ROLE_ORDER = Object.freeze(Object.keys(COMPANION_DEFINITIONS_V5) as CompanionRoleV4[]);
const DEFAULT_STATE: CompanionCollectionStateV5 = Object.freeze({ version: 1, activeId: null, companions: {}, updatedAt: 0 });

function validRole(value: unknown): value is CompanionRoleV4 {
  return typeof value === 'string' && ROLE_ORDER.includes(value as CompanionRoleV4);
}

function clampLevel(value: unknown) {
  return Math.max(1, Math.min(COMPANION_MAX_LEVEL_V5, Math.floor(Number(value) || 1)));
}

function normalizeState(raw: any): CompanionCollectionStateV5 {
  const companions: Partial<Record<CompanionRoleV4, CompanionProgressV5>> = {};
  for (const role of ROLE_ORDER) {
    const entry = raw?.companions?.[role];
    if (!entry) continue;
    companions[role] = Object.freeze({
      level: clampLevel(entry.level),
      unlockedAt: Math.max(0, Number(entry.unlockedAt) || Date.now()),
    });
  }
  const activeId = validRole(raw?.activeId) && companions[raw.activeId] ? raw.activeId : null;
  return Object.freeze({
    version: 1,
    activeId,
    companions,
    updatedAt: Math.max(0, Number(raw?.updatedAt) || 0),
  });
}

export function loadCompanionCollectionV5(): CompanionCollectionStateV5 {
  if (typeof localStorage === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(COMPANION_COLLECTION_STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveCompanionCollectionV5(state: CompanionCollectionStateV5): CompanionCollectionStateV5 {
  const normalized = normalizeState({ ...state, version: 1, updatedAt: Date.now() });
  try { localStorage.setItem(COMPANION_COLLECTION_STORAGE_KEY, JSON.stringify(normalized)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(COMPANION_COLLECTION_EVENT, { detail: normalized }));
  return normalized;
}

export function highestReachedChapterV5() {
  try { return Math.max(1, Math.floor(loadPlayerProfile().stats.highestChapter || 1)); }
  catch { return 1; }
}

export function companionCanBeFoundV5(id: CompanionRoleV4, highestChapter = highestReachedChapterV5()) {
  return highestChapter >= COMPANION_DEFINITIONS_V5[id].unlockChapter;
}

export function unlockCompanionV5(id: CompanionRoleV4) {
  const state = loadCompanionCollectionV5();
  if (state.companions[id] || !companionCanBeFoundV5(id)) return state;
  const companions = { ...state.companions, [id]: { level: 1, unlockedAt: Date.now() } };
  return saveCompanionCollectionV5({
    version: 1,
    activeId: state.activeId ?? id,
    companions,
    updatedAt: Date.now(),
  });
}

export function selectCompanionV5(id: CompanionRoleV4) {
  const state = loadCompanionCollectionV5();
  if (!state.companions[id]) return state;
  return saveCompanionCollectionV5({ ...state, activeId: id, updatedAt: Date.now() });
}

export function activeCompanionV5() {
  const state = loadCompanionCollectionV5();
  return state.activeId && state.companions[state.activeId] ? {
    id: state.activeId,
    level: state.companions[state.activeId]!.level,
    definition: COMPANION_DEFINITIONS_V5[state.activeId],
  } : null;
}

export function companionLevelV5(id: CompanionRoleV4) {
  return loadCompanionCollectionV5().companions[id]?.level ?? 0;
}

export function nextCompanionUpgradeCostV5(id: CompanionRoleV4) {
  const level = companionLevelV5(id);
  if (level < 1 || level >= COMPANION_MAX_LEVEL_V5) return null;
  return COMPANION_UPGRADE_COSTS_V5[level] ?? null;
}

export function upgradeCompanionV5(id: CompanionRoleV4) {
  const state = loadCompanionCollectionV5();
  const progress = state.companions[id];
  if (!progress || progress.level >= COMPANION_MAX_LEVEL_V5) return { ok: false, reason: 'locked' as const, state };
  const cost = COMPANION_UPGRADE_COSTS_V5[progress.level];
  const meta = loadMetaProgression();
  if (meta.dust < cost) return { ok: false, reason: 'dust' as const, cost, state };
  meta.dust -= cost;
  saveMetaProgression(meta);
  const companions = { ...state.companions, [id]: { ...progress, level: progress.level + 1 } };
  return { ok: true, cost, state: saveCompanionCollectionV5({ ...state, companions, updatedAt: Date.now() }) };
}

export function companionEffectivePowerV5(id: CompanionRoleV4, level: number) {
  const normalizedLevel = clampLevel(level);
  const ranges: Readonly<Record<CompanionRoleV4, readonly [number, number]>> = {
    'single-target': [0.08, 0.12],
    'critical-support': [0.07, 0.10],
    shield: [0.07, 0.10],
    'loot-comfort': [0.05, 0.08],
    distraction: [0.05, 0.08],
  };
  const [minimum, maximum] = ranges[id];
  return minimum + (maximum - minimum) * ((normalizedLevel - 1) / (COMPANION_MAX_LEVEL_V5 - 1));
}

export function companionAttackIntervalV5(level: number) {
  return Math.max(1_250, 1_850 - (clampLevel(level) - 1) * 120);
}

export function companionForOwnerV5(ownerId: string) {
  let hash = 2166136261;
  for (let index = 0; index < ownerId.length; index += 1) {
    hash ^= ownerId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const id = ROLE_ORDER[(hash >>> 0) % ROLE_ORDER.length];
  const level = 1 + ((hash >>> 8) % COMPANION_MAX_LEVEL_V5);
  return { id, level, definition: COMPANION_DEFINITIONS_V5[id] };
}

export type VeilRelicId = 'ash-eye' | 'marked-claw' | 'night-hunt-sigil' | 'veil-heart' | 'broken-guardian-crown' | 'depth-rune-shard' | 'world-core';

export type VeilRelicDefinition = {
  id: VeilRelicId;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  source: 'hunt' | 'boss' | 'worldboss';
  accent: string;
};

export const VEIL_RELICS: Record<VeilRelicId, VeilRelicDefinition> = {
  'ash-eye': { id: 'ash-eye', nameDe: 'Auge des Aschenjägers', nameEn: "Ash Hunter's Eye", descriptionDe: 'Spürt Jagd-Gegner früher auf und ermöglicht höchstens eine zusätzliche Jagd pro Kapitel.', descriptionEn: 'Detects hunt enemies earlier and allows at most one additional hunt per chapter.', source: 'hunt', accent: '#e6a94a' },
  'marked-claw': { id: 'marked-claw', nameDe: 'Gezeichnete Kralle', nameEn: 'Marked Claw', descriptionDe: 'Jeder siebte Kill gewährt 2,5 Sekunden lang 14 % schnelleres Schießen. Das gemeinsame Angriffstempo-Cap bleibt bestehen.', descriptionEn: 'Every seventh kill grants 14% faster shooting for 2.5 seconds. The shared attack-speed cap still applies.', source: 'hunt', accent: '#e15e4e' },
  'night-hunt-sigil': { id: 'night-hunt-sigil', nameDe: 'Siegel der Nachtjagd', nameEn: 'Night Hunt Sigil', descriptionDe: 'Jagd-Gegner gewähren 50 % mehr Schleierstaub.', descriptionEn: 'Hunt enemies grant 50% more Veil Dust.', source: 'hunt', accent: '#9c74e8' },
  'veil-heart': { id: 'veil-heart', nameDe: 'Herz des Schleiers', nameEn: 'Heart of the Veil', descriptionDe: 'Verhindert einmal pro Run tödlichen Schaden und stellt 25 % Leben wieder her.', descriptionEn: 'Prevents lethal damage once per run and restores 25% health.', source: 'boss', accent: '#c786ff' },
  'broken-guardian-crown': { id: 'broken-guardian-crown', nameDe: 'Krone des gebrochenen Wächters', nameEn: 'Crown of the Broken Guardian', descriptionDe: 'Boss-Kills gewähren je 3 % Angriff, maximal vier Stapel beziehungsweise 12 % pro Run.', descriptionEn: 'Boss kills grant 3% attack each, up to four stacks or 12% per run.', source: 'boss', accent: '#e6c16f' },
  'depth-rune-shard': { id: 'depth-rune-shard', nameDe: 'Runensplitter der Tiefe', nameEn: 'Depth Rune Shard', descriptionDe: 'Runensturm-Schaden wird vor Rüstungsberechnung um 18 % reduziert.', descriptionEn: 'Rune storm damage is reduced by 18% before armor mitigation.', source: 'boss', accent: '#7dbfff' },
  'world-core': { id: 'world-core', nameDe: 'Weltenkern', nameEn: 'World Core', descriptionDe: 'Zu Beginn jedes Runs: +4 % Angriff und +7 % maximales Leben.', descriptionEn: 'At the start of every run: +4% attack and +7% maximum health.', source: 'worldboss', accent: '#ff8b4a' },
};

const RELIC_KEY = 'dungeon-veil-relics-v2';
const LEGACY_RELIC_KEY = 'dungeon-veil-relics-v1';
const META_KEY = 'dungeon-veil-meta';
export const RELIC_PITY_MISSES = 10;
export const RELIC_PITY_BY_SOURCE = Object.freeze({ hunt: 9, boss: 11 });
export const RELIC_UNOWNED_PREFERENCE = 0.65;
export const RELIC_DROP_CHANCE_BY_SOURCE = Object.freeze({ hunt: 0.06, boss: 0.08 });

export type VeilRelicProfile = {
  version: 2;
  owned: VeilRelicId[];
  equipped: VeilRelicId | null;
  consumedHeartRuns: string[];
  activatedWorldCoreRuns: string[];
  relicMisses: { hunt: number; boss: number };
  crownRunStacks: Record<string, number>;
};

const DEFAULT_PROFILE: VeilRelicProfile = {
  version: 2,
  owned: [], equipped: null, consumedHeartRuns: [], activatedWorldCoreRuns: [],
  relicMisses: { hunt: 0, boss: 0 }, crownRunStacks: {},
};

function isRelicId(value: unknown): value is VeilRelicId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(VEIL_RELICS, value);
}
function safeCount(value: unknown, cap = 999): number {
  return Math.max(0, Math.min(cap, Math.floor(Number(value) || 0)));
}
function normalizeCrownStacks(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key.length > 0).slice(-30).map(([key, stack]) => [key, safeCount(stack, 4)]));
}

export function loadVeilRelicProfile(): VeilRelicProfile {
  try {
    const raw = localStorage.getItem(RELIC_KEY) ?? localStorage.getItem(LEGACY_RELIC_KEY);
    if (!raw) return structuredClone(DEFAULT_PROFILE);
    const parsed = JSON.parse(raw) as Partial<VeilRelicProfile>;
    const owned = Array.isArray(parsed.owned) ? [...new Set(parsed.owned.filter(isRelicId))] : [];
    const profile: VeilRelicProfile = {
      version: 2,
      owned,
      equipped: isRelicId(parsed.equipped) && owned.includes(parsed.equipped) ? parsed.equipped : null,
      consumedHeartRuns: Array.isArray(parsed.consumedHeartRuns) ? parsed.consumedHeartRuns.filter((value): value is string => typeof value === 'string').slice(-30) : [],
      activatedWorldCoreRuns: Array.isArray(parsed.activatedWorldCoreRuns) ? parsed.activatedWorldCoreRuns.filter((value): value is string => typeof value === 'string').slice(-30) : [],
      relicMisses: {
        hunt: safeCount(parsed.relicMisses?.hunt, RELIC_PITY_BY_SOURCE.hunt),
        boss: safeCount(parsed.relicMisses?.boss, RELIC_PITY_BY_SOURCE.boss),
      },
      crownRunStacks: normalizeCrownStacks(parsed.crownRunStacks),
    };
    if (parsed.version !== 2) saveVeilRelicProfile(profile);
    return profile;
  } catch { return structuredClone(DEFAULT_PROFILE); }
}

function saveVeilRelicProfile(profile: VeilRelicProfile): VeilRelicProfile {
  const normalized: VeilRelicProfile = {
    version: 2,
    owned: [...new Set(profile.owned.filter(isRelicId))],
    equipped: isRelicId(profile.equipped) && profile.owned.includes(profile.equipped) ? profile.equipped : null,
    consumedHeartRuns: profile.consumedHeartRuns.slice(-30),
    activatedWorldCoreRuns: profile.activatedWorldCoreRuns.slice(-30),
    relicMisses: {
      hunt: safeCount(profile.relicMisses.hunt, RELIC_PITY_BY_SOURCE.hunt),
      boss: safeCount(profile.relicMisses.boss, RELIC_PITY_BY_SOURCE.boss),
    },
    crownRunStacks: normalizeCrownStacks(profile.crownRunStacks),
  };
  localStorage.setItem(RELIC_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('dungeon-veil-relic-changed', { detail: normalized }));
  return normalized;
}

export function unlockVeilRelic(id: VeilRelicId) {
  const profile = loadVeilRelicProfile();
  const newUnlock = !profile.owned.includes(id);
  if (newUnlock) profile.owned.push(id);
  if (!profile.equipped) profile.equipped = id;
  return { profile: saveVeilRelicProfile(profile), newUnlock };
}
export function equipVeilRelic(id: VeilRelicId) {
  const profile = loadVeilRelicProfile();
  if (!profile.owned.includes(id)) return profile;
  profile.equipped = id;
  return saveVeilRelicProfile(profile);
}
export function equippedVeilRelic() { return loadVeilRelicProfile().equipped; }
export function hasEquippedVeilRelic(id: VeilRelicId) { return equippedVeilRelic() === id; }

function currentRunId(): string {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as { currentRunId?: unknown };
    return typeof parsed.currentRunId === 'string' ? parsed.currentRunId : '';
  } catch { return ''; }
}
export function activateWorldCoreForCurrentRun(): boolean {
  if (!hasEquippedVeilRelic('world-core')) return false;
  const runId = currentRunId(); if (!runId) return false;
  const profile = loadVeilRelicProfile();
  if (profile.activatedWorldCoreRuns.includes(runId)) return false;
  profile.activatedWorldCoreRuns.push(runId); saveVeilRelicProfile(profile); return true;
}
export function consumeVeilHeartForCurrentRun(): boolean {
  if (!hasEquippedVeilRelic('veil-heart')) return false;
  const runId = currentRunId(); if (!runId) return false;
  const profile = loadVeilRelicProfile();
  if (profile.consumedHeartRuns.includes(runId)) return false;
  profile.consumedHeartRuns.push(runId); saveVeilRelicProfile(profile); return true;
}
export function advanceGuardianCrownForCurrentRun() {
  if (!hasEquippedVeilRelic('broken-guardian-crown')) return { stack: 0, gained: false };
  const runId = currentRunId(); if (!runId) return { stack: 0, gained: false };
  const profile = loadVeilRelicProfile();
  const current = safeCount(profile.crownRunStacks[runId], 4);
  if (current >= 4) return { stack: 4, gained: false };
  profile.crownRunStacks[runId] = current + 1;
  saveVeilRelicProfile(profile);
  return { stack: current + 1, gained: true };
}

export const HUNT_RELIC_POOL: VeilRelicId[] = ['ash-eye', 'marked-claw', 'night-hunt-sigil'];
export const BOSS_RELIC_POOL: VeilRelicId[] = ['veil-heart', 'broken-guardian-crown', 'depth-rune-shard'];

export function rollVeilRelicDrop(source: 'hunt' | 'boss', chance: number, random: () => number = Math.random): VeilRelicId | null {
  const profile = loadVeilRelicProfile();
  const pity = RELIC_PITY_BY_SOURCE[source];
  const forced = profile.relicMisses[source] >= pity;
  const effectiveChance = Math.min(RELIC_DROP_CHANCE_BY_SOURCE[source], Math.max(0, Math.min(1, Number(chance) || 0)));
  if (!forced && random() > effectiveChance) {
    profile.relicMisses[source]++;
    saveVeilRelicProfile(profile);
    return null;
  }
  profile.relicMisses[source] = 0;
  const pool = source === 'hunt' ? HUNT_RELIC_POOL : BOSS_RELIC_POOL;
  const unowned = pool.filter(id => !profile.owned.includes(id));
  const candidates = unowned.length > 0 && random() < RELIC_UNOWNED_PREFERENCE ? unowned : pool;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length));
  saveVeilRelicProfile(profile);
  return candidates[index] ?? null;
}

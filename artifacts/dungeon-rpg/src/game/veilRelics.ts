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
  'marked-claw': { id: 'marked-claw', nameDe: 'Gezeichnete Kralle', nameEn: 'Marked Claw', descriptionDe: 'Jeder fünfte Kill gewährt 3 Sekunden lang 18 % schnelleres Schießen.', descriptionEn: 'Every fifth kill grants 18% faster shooting for 3 seconds.', source: 'hunt', accent: '#e15e4e' },
  'night-hunt-sigil': { id: 'night-hunt-sigil', nameDe: 'Siegel der Nachtjagd', nameEn: 'Night Hunt Sigil', descriptionDe: 'Jagd-Gegner gewähren 50 % mehr Schleierstaub.', descriptionEn: 'Hunt enemies grant 50% more Veil Dust.', source: 'hunt', accent: '#9c74e8' },
  'veil-heart': { id: 'veil-heart', nameDe: 'Herz des Schleiers', nameEn: 'Heart of the Veil', descriptionDe: 'Verhindert einmal pro Run tödlichen Schaden und stellt 30 % Leben wieder her.', descriptionEn: 'Prevents lethal damage once per run and restores 30% health.', source: 'boss', accent: '#c786ff' },
  'broken-guardian-crown': { id: 'broken-guardian-crown', nameDe: 'Krone des gebrochenen Wächters', nameEn: 'Crown of the Broken Guardian', descriptionDe: 'Boss-Kills gewähren je 4 % Angriff, maximal fünf Stapel pro Run.', descriptionEn: 'Boss kills grant 4% attack each, up to five stacks per run.', source: 'boss', accent: '#e6c16f' },
  'depth-rune-shard': { id: 'depth-rune-shard', nameDe: 'Runensplitter der Tiefe', nameEn: 'Depth Rune Shard', descriptionDe: 'Runensturm-Schaden wird vor dem Treffer um 25 % reduziert.', descriptionEn: 'Rune storm damage is reduced by 25% before the hit.', source: 'boss', accent: '#7dbfff' },
  'world-core': { id: 'world-core', nameDe: 'Weltenkern', nameEn: 'World Core', descriptionDe: 'Zu Beginn jedes Runs: +6 % Angriff und +10 % maximales Leben.', descriptionEn: 'At the start of every run: +6% attack and +10% maximum health.', source: 'worldboss', accent: '#ff8b4a' },
};

const RELIC_KEY = 'dungeon-veil-relics-v1';
const META_KEY = 'dungeon-veil-meta';
export const RELIC_PITY_MISSES = 4;

export type VeilRelicProfile = {
  owned: VeilRelicId[];
  equipped: VeilRelicId | null;
  consumedHeartRuns: string[];
  activatedWorldCoreRuns: string[];
  relicMisses: { hunt: number; boss: number };
  crownRunStacks: Record<string, number>;
};

const DEFAULT_PROFILE: VeilRelicProfile = {
  owned: [],
  equipped: null,
  consumedHeartRuns: [],
  activatedWorldCoreRuns: [],
  relicMisses: { hunt: 0, boss: 0 },
  crownRunStacks: {},
};

function isRelicId(value: unknown): value is VeilRelicId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(VEIL_RELICS, value);
}

function safeCount(value: unknown, cap = 999): number {
  return Math.max(0, Math.min(cap, Math.floor(Number(value) || 0)));
}

function normalizeCrownStacks(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => typeof key === 'string' && key.length > 0)
    .slice(-30)
    .map(([key, stack]) => [key, safeCount(stack, 5)] as const);
  return Object.fromEntries(entries);
}

export function loadVeilRelicProfile(): VeilRelicProfile {
  try {
    const raw = localStorage.getItem(RELIC_KEY);
    if (!raw) return structuredClone(DEFAULT_PROFILE);
    const parsed = JSON.parse(raw) as Partial<VeilRelicProfile>;
    const owned = Array.isArray(parsed.owned) ? [...new Set(parsed.owned.filter(isRelicId))] : [];
    const equipped = isRelicId(parsed.equipped) && owned.includes(parsed.equipped) ? parsed.equipped : null;
    return {
      owned,
      equipped,
      consumedHeartRuns: Array.isArray(parsed.consumedHeartRuns) ? parsed.consumedHeartRuns.filter(value => typeof value === 'string').slice(-30) : [],
      activatedWorldCoreRuns: Array.isArray(parsed.activatedWorldCoreRuns) ? parsed.activatedWorldCoreRuns.filter(value => typeof value === 'string').slice(-30) : [],
      relicMisses: {
        hunt: safeCount(parsed.relicMisses?.hunt, RELIC_PITY_MISSES),
        boss: safeCount(parsed.relicMisses?.boss, RELIC_PITY_MISSES),
      },
      crownRunStacks: normalizeCrownStacks(parsed.crownRunStacks),
    };
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}

function saveVeilRelicProfile(profile: VeilRelicProfile): VeilRelicProfile {
  const crownEntries = Object.entries(profile.crownRunStacks).slice(-30);
  const normalized: VeilRelicProfile = {
    ...profile,
    consumedHeartRuns: profile.consumedHeartRuns.slice(-30),
    activatedWorldCoreRuns: profile.activatedWorldCoreRuns.slice(-30),
    relicMisses: {
      hunt: safeCount(profile.relicMisses.hunt, RELIC_PITY_MISSES),
      boss: safeCount(profile.relicMisses.boss, RELIC_PITY_MISSES),
    },
    crownRunStacks: Object.fromEntries(crownEntries.map(([key, stack]) => [key, safeCount(stack, 5)])),
  };
  localStorage.setItem(RELIC_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('dungeon-veil-relic-changed', { detail: normalized }));
  return normalized;
}

export function unlockVeilRelic(id: VeilRelicId): { profile: VeilRelicProfile; newUnlock: boolean } {
  const profile = loadVeilRelicProfile();
  const newUnlock = !profile.owned.includes(id);
  if (newUnlock) profile.owned.push(id);
  if (!profile.equipped) profile.equipped = id;
  return { profile: saveVeilRelicProfile(profile), newUnlock };
}

export function equipVeilRelic(id: VeilRelicId): VeilRelicProfile {
  const profile = loadVeilRelicProfile();
  if (!profile.owned.includes(id)) return profile;
  profile.equipped = id;
  return saveVeilRelicProfile(profile);
}

export function equippedVeilRelic(): VeilRelicId | null {
  return loadVeilRelicProfile().equipped;
}

export function hasEquippedVeilRelic(id: VeilRelicId): boolean {
  return equippedVeilRelic() === id;
}

function currentRunId(): string {
  try {
    const raw = localStorage.getItem(META_KEY);
    const parsed = raw ? JSON.parse(raw) as { currentRunId?: unknown } : null;
    return typeof parsed?.currentRunId === 'string' ? parsed.currentRunId : '';
  } catch {
    return '';
  }
}

export function activateWorldCoreForCurrentRun(): boolean {
  if (!hasEquippedVeilRelic('world-core')) return false;
  const runId = currentRunId();
  if (!runId) return false;
  const profile = loadVeilRelicProfile();
  if (profile.activatedWorldCoreRuns.includes(runId)) return false;
  profile.activatedWorldCoreRuns.push(runId);
  saveVeilRelicProfile(profile);
  return true;
}

export function consumeVeilHeartForCurrentRun(): boolean {
  if (!hasEquippedVeilRelic('veil-heart')) return false;
  const runId = currentRunId();
  if (!runId) return false;
  const profile = loadVeilRelicProfile();
  if (profile.consumedHeartRuns.includes(runId)) return false;
  profile.consumedHeartRuns.push(runId);
  saveVeilRelicProfile(profile);
  return true;
}

export function advanceGuardianCrownForCurrentRun(): { stack: number; gained: boolean } {
  if (!hasEquippedVeilRelic('broken-guardian-crown')) return { stack: 0, gained: false };
  const runId = currentRunId();
  if (!runId) return { stack: 0, gained: false };
  const profile = loadVeilRelicProfile();
  const current = safeCount(profile.crownRunStacks[runId], 5);
  if (current >= 5) return { stack: 5, gained: false };
  profile.crownRunStacks[runId] = current + 1;
  saveVeilRelicProfile(profile);
  return { stack: current + 1, gained: true };
}

export const HUNT_RELIC_POOL: VeilRelicId[] = ['ash-eye', 'marked-claw', 'night-hunt-sigil'];
export const BOSS_RELIC_POOL: VeilRelicId[] = ['veil-heart', 'broken-guardian-crown', 'depth-rune-shard'];

export function rollVeilRelicDrop(source: 'hunt' | 'boss', chance: number, random: () => number = Math.random): VeilRelicId | null {
  const profile = loadVeilRelicProfile();
  const safeChance = Math.max(0, Math.min(1, Number(chance) || 0));
  const forced = profile.relicMisses[source] >= RELIC_PITY_MISSES;
  if (!forced && random() > safeChance) {
    profile.relicMisses[source]++;
    saveVeilRelicProfile(profile);
    return null;
  }

  profile.relicMisses[source] = 0;
  const pool = source === 'hunt' ? HUNT_RELIC_POOL : BOSS_RELIC_POOL;
  const unowned = pool.filter(id => !profile.owned.includes(id));
  const candidates = unowned.length ? unowned : pool;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length));
  saveVeilRelicProfile(profile);
  return candidates[index] ?? null;
}

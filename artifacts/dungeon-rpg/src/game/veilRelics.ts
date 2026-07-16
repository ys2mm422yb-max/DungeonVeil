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
  'ash-eye': { id: 'ash-eye', nameDe: 'Auge des Aschenjägers', nameEn: "Ash Hunter's Eye", descriptionDe: 'Erlaubt eine zusätzliche Jagd pro Kapitel und spürt Jagd-Gegner früher auf.', descriptionEn: 'Allows one additional hunt per chapter and detects hunt enemies earlier.', source: 'hunt', accent: '#e6a94a' },
  'marked-claw': { id: 'marked-claw', nameDe: 'Gezeichnete Kralle', nameEn: 'Marked Claw', descriptionDe: 'Nach jedem fünften Kill 3 Sekunden lang 18 % schneller schießen.', descriptionEn: 'After every fifth kill, shoot 18% faster for 3 seconds.', source: 'hunt', accent: '#e15e4e' },
  'night-hunt-sigil': { id: 'night-hunt-sigil', nameDe: 'Siegel der Nachtjagd', nameEn: 'Night Hunt Sigil', descriptionDe: 'Jagd-Gegner gewähren 50 % mehr Schleierstaub.', descriptionEn: 'Hunt enemies grant 50% more Veil Dust.', source: 'hunt', accent: '#9c74e8' },
  'veil-heart': { id: 'veil-heart', nameDe: 'Herz des Schleiers', nameEn: 'Heart of the Veil', descriptionDe: 'Verhindert einmal pro Run tödlichen Schaden und stellt 30 % Leben wieder her.', descriptionEn: 'Prevents lethal damage once per run and restores 30% health.', source: 'boss', accent: '#c786ff' },
  'broken-guardian-crown': { id: 'broken-guardian-crown', nameDe: 'Krone des gebrochenen Wächters', nameEn: 'Crown of the Broken Guardian', descriptionDe: 'Boss-Kills gewähren je 4 % Angriff, maximal fünf Stapel pro Run.', descriptionEn: 'Boss kills grant 4% attack each, up to five stacks per run.', source: 'boss', accent: '#e6c16f' },
  'depth-rune-shard': { id: 'depth-rune-shard', nameDe: 'Runensplitter der Tiefe', nameEn: 'Depth Rune Shard', descriptionDe: 'Runensturm-Schaden wird vor dem Treffer um 25 % reduziert.', descriptionEn: 'Rune storm damage is reduced by 25% before the hit.', source: 'boss', accent: '#7dbfff' },
  'world-core': { id: 'world-core', nameDe: 'Weltenkern', nameEn: 'World Core', descriptionDe: 'Zu Beginn jedes Runs: +6 % Angriff und +10 % maximales Leben.', descriptionEn: 'At the start of every run: +6% attack and +10% maximum health.', source: 'worldboss', accent: '#ff8b4a' },
};

const RELIC_KEY = 'dungeon-veil-relics-v1';
const META_KEY = 'dungeon-veil-meta';

export const HUNT_RELIC_PITY = 6;
export const BOSS_RELIC_PITY = 8;
export const GUARDIAN_CROWN_MAX_STACKS = 5;

export type VeilRelicProfile = {
  owned: VeilRelicId[];
  equipped: VeilRelicId | null;
  consumedHeartRuns: string[];
  activatedWorldCoreRuns: string[];
  huntPity: number;
  bossPity: number;
  crownRunId: string;
  crownStacks: number;
};

const DEFAULT_PROFILE: VeilRelicProfile = {
  owned: [],
  equipped: null,
  consumedHeartRuns: [],
  activatedWorldCoreRuns: [],
  huntPity: 0,
  bossPity: 0,
  crownRunId: '',
  crownStacks: 0,
};

function isRelicId(value: unknown): value is VeilRelicId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(VEIL_RELICS, value);
}

function safeCounter(value: unknown, max: number): number {
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
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
      huntPity: safeCounter(parsed.huntPity, HUNT_RELIC_PITY),
      bossPity: safeCounter(parsed.bossPity, BOSS_RELIC_PITY),
      crownRunId: typeof parsed.crownRunId === 'string' ? parsed.crownRunId : '',
      crownStacks: safeCounter(parsed.crownStacks, GUARDIAN_CROWN_MAX_STACKS),
    };
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}

function saveVeilRelicProfile(profile: VeilRelicProfile): VeilRelicProfile {
  localStorage.setItem(RELIC_KEY, JSON.stringify({
    ...profile,
    consumedHeartRuns: profile.consumedHeartRuns.slice(-30),
    activatedWorldCoreRuns: profile.activatedWorldCoreRuns.slice(-30),
    huntPity: safeCounter(profile.huntPity, HUNT_RELIC_PITY),
    bossPity: safeCounter(profile.bossPity, BOSS_RELIC_PITY),
    crownStacks: safeCounter(profile.crownStacks, GUARDIAN_CROWN_MAX_STACKS),
  }));
  window.dispatchEvent(new CustomEvent('dungeon-veil-relic-changed', { detail: profile }));
  return profile;
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

export const HUNT_RELIC_POOL: VeilRelicId[] = ['ash-eye', 'marked-claw', 'night-hunt-sigil'];
export const BOSS_RELIC_POOL: VeilRelicId[] = ['veil-heart', 'broken-guardian-crown', 'depth-rune-shard'];

export function rollVeilRelicDrop(source: 'hunt' | 'boss', chance: number): VeilRelicId | null {
  const profile = loadVeilRelicProfile();
  const pityKey = source === 'hunt' ? 'huntPity' : 'bossPity';
  const pityLimit = source === 'hunt' ? HUNT_RELIC_PITY : BOSS_RELIC_PITY;
  const guaranteed = profile[pityKey] >= pityLimit - 1;
  if (!guaranteed && Math.random() > Math.max(0, Math.min(1, chance))) {
    profile[pityKey] = Math.min(pityLimit, profile[pityKey] + 1);
    saveVeilRelicProfile(profile);
    return null;
  }

  profile[pityKey] = 0;
  const pool = source === 'hunt' ? HUNT_RELIC_POOL : BOSS_RELIC_POOL;
  const unowned = pool.filter(id => !profile.owned.includes(id));
  const candidates = unowned.length ? unowned : pool;
  const id = candidates[Math.floor(Math.random() * candidates.length)] as VeilRelicId;
  saveVeilRelicProfile(profile);
  return id;
}

function crownProfileForCurrentRun(): { profile: VeilRelicProfile; runId: string } {
  const profile = loadVeilRelicProfile();
  const runId = currentRunId();
  if (profile.crownRunId !== runId) {
    profile.crownRunId = runId;
    profile.crownStacks = 0;
    saveVeilRelicProfile(profile);
  }
  return { profile, runId };
}

export function guardianCrownStacksForCurrentRun(): number {
  if (!hasEquippedVeilRelic('broken-guardian-crown')) return 0;
  return crownProfileForCurrentRun().profile.crownStacks;
}

export function advanceGuardianCrownForCurrentRun(): number {
  if (!hasEquippedVeilRelic('broken-guardian-crown')) return 0;
  const { profile, runId } = crownProfileForCurrentRun();
  if (!runId || profile.crownStacks >= GUARDIAN_CROWN_MAX_STACKS) return profile.crownStacks;
  profile.crownStacks++;
  saveVeilRelicProfile(profile);
  return profile.crownStacks;
}

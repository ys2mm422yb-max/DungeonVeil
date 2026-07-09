export type VeilRelicId = 'ash-eye' | 'marked-claw' | 'night-hunt-sigil' | 'veil-heart' | 'broken-guardian-crown' | 'depth-rune-shard';

export type VeilRelicDefinition = {
  id: VeilRelicId;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  source: 'hunt' | 'room20';
  accent: string;
};

export const VEIL_RELICS: Record<VeilRelicId, VeilRelicDefinition> = {
  'ash-eye': { id: 'ash-eye', nameDe: 'Auge des Aschenjägers', nameEn: "Ash Hunter's Eye", descriptionDe: 'Spürt Jagd-Gegner früher auf und erhöht ihre Erscheinungschance.', descriptionEn: 'Detects hunt enemies earlier and increases their appearance chance.', source: 'hunt', accent: '#e6a94a' },
  'marked-claw': { id: 'marked-claw', nameDe: 'Gezeichnete Kralle', nameEn: 'Marked Claw', descriptionDe: 'Nach jedem Kill 2,5 Sekunden lang 22 % schneller schießen.', descriptionEn: 'After every kill, shoot 22% faster for 2.5 seconds.', source: 'hunt', accent: '#e15e4e' },
  'night-hunt-sigil': { id: 'night-hunt-sigil', nameDe: 'Siegel der Nachtjagd', nameEn: 'Night Hunt Sigil', descriptionDe: 'Jagd-Gegner gewähren 50 % mehr Schleier-Siegel.', descriptionEn: 'Hunt enemies grant 50% more Veil Sigils.', source: 'hunt', accent: '#9c74e8' },
  'veil-heart': { id: 'veil-heart', nameDe: 'Herz des Schleiers', nameEn: 'Heart of the Veil', descriptionDe: 'Verhindert einmal pro Run tödlichen Schaden und stellt 30 % Leben wieder her.', descriptionEn: 'Prevents lethal damage once per run and restores 30% health.', source: 'room20', accent: '#c786ff' },
  'broken-guardian-crown': { id: 'broken-guardian-crown', nameDe: 'Krone des gebrochenen Wächters', nameEn: 'Crown of the Broken Guardian', descriptionDe: 'Nach einem Boss-Kill erhältst du für den restlichen Run 10 % mehr Angriff.', descriptionEn: 'After a boss kill, gain 10% attack for the rest of the run.', source: 'room20', accent: '#e6c16f' },
  'depth-rune-shard': { id: 'depth-rune-shard', nameDe: 'Runensplitter der Tiefe', nameEn: 'Depth Rune Shard', descriptionDe: 'Runensturm-Markierungen erscheinen 0,25 Sekunden früher.', descriptionEn: 'Rune storm warnings appear 0.25 seconds earlier.', source: 'room20', accent: '#7dbfff' },
};

const RELIC_KEY = 'dungeon-veil-relics-v1';
const META_KEY = 'dungeon-veil-meta';

type VeilRelicProfile = {
  owned: VeilRelicId[];
  equipped: VeilRelicId | null;
  consumedHeartRuns: string[];
};

const DEFAULT_PROFILE: VeilRelicProfile = { owned: [], equipped: null, consumedHeartRuns: [] };

function isRelicId(value: unknown): value is VeilRelicId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(VEIL_RELICS, value);
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
    };
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}

function saveVeilRelicProfile(profile: VeilRelicProfile): VeilRelicProfile {
  localStorage.setItem(RELIC_KEY, JSON.stringify({ ...profile, consumedHeartRuns: profile.consumedHeartRuns.slice(-30) }));
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
export const ROOM_TWENTY_RELIC_POOL: VeilRelicId[] = ['veil-heart', 'broken-guardian-crown', 'depth-rune-shard'];

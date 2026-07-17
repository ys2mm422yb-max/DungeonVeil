import { DAILY_ROTATION_VERSION, dailyTaskIdsForDate, nextDailyResetAt, type DailyMetric, type DailyTaskId } from './dailyQuests';
import { loadRetentionProfile, type RetentionProfile } from './runRetention';

const STORAGE_KEY = 'dungeon-veil-retention-v2';
const LEGACY_STORAGE_KEY = 'dungeon-veil-retention-v1';
const RETENTION_EVENT = 'dungeon-veil-retention-update';

let installed = false;
let resetTimer = 0;

function localDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyDailyProgress(): Record<DailyMetric, number> {
  return { rooms: 0, kills: 0, hunts: 0, fireKills: 0, frostKills: 0, highHpRooms: 0, bossKills: 0, deepestRoom: 0, rankTwoGifts: 0, relicFinds: 0 };
}

function sameTaskIds(left: DailyTaskId[], right: DailyTaskId[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function ensureDailyQuestRotation(): RetentionProfile {
  const today = localDateKey();
  const expected = dailyTaskIdsForDate(today);
  const profile = loadRetentionProfile();
  let storedDate = '';
  let storedRaw = '';
  try {
    storedRaw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? '';
    const stored = storedRaw ? JSON.parse(storedRaw) as { daily?: { date?: unknown } } : {};
    storedDate = typeof stored.daily?.date === 'string' ? stored.daily.date : '';
  } catch {}

  const daily = profile.daily as RetentionProfile['daily'] & { rotationVersion?: number };
  const dateChanged = storedDate !== today;
  const rotationChanged = daily.rotationVersion !== DAILY_ROTATION_VERSION || !sameTaskIds(daily.selected, expected);

  daily.date = today;
  daily.rotationVersion = DAILY_ROTATION_VERSION;
  daily.selected = expected;
  if (dateChanged) {
    daily.progress = emptyDailyProgress();
    daily.claimed = [];
  } else {
    daily.claimed = daily.claimed.filter(id => expected.includes(id));
  }

  const nextRaw = JSON.stringify(profile);
  if (dateChanged || rotationChanged || storedRaw !== nextRaw) {
    try { localStorage.setItem(STORAGE_KEY, nextRaw); } catch {}
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(RETENTION_EVENT, { detail: profile }));
  }
  return profile;
}

function scheduleReset(): void {
  window.clearTimeout(resetTimer);
  const delay = Math.max(250, nextDailyResetAt() - Date.now() + 150);
  resetTimer = window.setTimeout(() => {
    ensureDailyQuestRotation();
    scheduleReset();
  }, delay);
}

function refreshVisibleRotation(): void {
  if (document.visibilityState !== 'visible') return;
  ensureDailyQuestRotation();
  scheduleReset();
}

export function installDailyQuestRotationRuntime(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;
  ensureDailyQuestRotation();
  scheduleReset();
  window.addEventListener('focus', refreshVisibleRotation);
  window.addEventListener('pageshow', refreshVisibleRotation);
  document.addEventListener('visibilitychange', refreshVisibleRotation);
}

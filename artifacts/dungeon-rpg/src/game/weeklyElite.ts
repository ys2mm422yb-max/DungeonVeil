import type { PlayerProfileStats } from './playerProfile';

export type WeeklyEliteMetric = 'enemiesDefeated' | 'roomsCleared' | 'bossesDefeated' | 'totalDamage' | 'runsStarted' | 'questsCompleted';
export type WeeklyEliteRewardKind = 'title' | 'card' | 'avatar';

export type WeeklyEliteQuest = {
  id: string;
  metric: WeeklyEliteMetric;
  target: number;
  titleDe: string;
  titleEn: string;
  descriptionDe: string;
  descriptionEn: string;
  reward: { kind: WeeklyEliteRewardKind; id: string; nameDe: string; nameEn: string };
};

export type WeeklyEliteState = {
  version: 1;
  weekKey: string;
  baseline: Pick<PlayerProfileStats, WeeklyEliteMetric>;
  claimedQuestIds: string[];
  ownedRewardIds: string[];
  eliteMarks: number;
};

const STORAGE_KEY = 'dungeon-veil-weekly-elite-v1';
export const WEEKLY_ELITE_EVENT = 'dungeon-veil-weekly-elite-changed';

const QUEST_POOL: WeeklyEliteQuest[] = [
  { id: 'enemy-hunt', metric: 'enemiesDefeated', target: 400, titleDe: 'Jagd ohne Ende', titleEn: 'Endless Hunt', descriptionDe: 'Besiege in dieser Woche 400 Gegner.', descriptionEn: 'Defeat 400 enemies this week.', reward: { kind: 'title', id: 'weekly-breaker', nameDe: 'Wochenbrecher', nameEn: 'Weekbreaker' } },
  { id: 'room-march', metric: 'roomsCleared', target: 65, titleDe: 'Marsch durch den Schleier', titleEn: 'March Through the Veil', descriptionDe: 'Schließe in dieser Woche 65 Räume ab.', descriptionEn: 'Clear 65 rooms this week.', reward: { kind: 'card', id: 'rift-seal', nameDe: 'Riss-Siegel', nameEn: 'Rift Seal' } },
  { id: 'boss-purge', metric: 'bossesDefeated', target: 8, titleDe: 'Wächtersturz', titleEn: 'Wardenfall', descriptionDe: 'Besiege in dieser Woche 8 Bosse.', descriptionEn: 'Defeat 8 bosses this week.', reward: { kind: 'avatar', id: 'night-watch', nameDe: 'Nachtwache', nameEn: 'Night Watch' } },
  { id: 'damage-trial', metric: 'totalDamage', target: 30000, titleDe: 'Zorn des Schleiers', titleEn: 'Wrath of the Veil', descriptionDe: 'Verursache in dieser Woche 30.000 Schaden.', descriptionEn: 'Deal 30,000 damage this week.', reward: { kind: 'title', id: 'veil-executioner', nameDe: 'Schleierhenker', nameEn: 'Veil Executioner' } },
  { id: 'run-veteran', metric: 'runsStarted', target: 10, titleDe: 'Kein Zurück', titleEn: 'No Turning Back', descriptionDe: 'Starte in dieser Woche 10 echte Runs.', descriptionEn: 'Start 10 real runs this week.', reward: { kind: 'card', id: 'iron-veil', nameDe: 'Eiserner Schleier', nameEn: 'Iron Veil' } },
  { id: 'contract-master', metric: 'questsCompleted', target: 12, titleDe: 'Elite-Verträge', titleEn: 'Elite Contracts', descriptionDe: 'Schließe in dieser Woche 12 Aufträge ab.', descriptionEn: 'Complete 12 quests this week.', reward: { kind: 'avatar', id: 'arcane-eye', nameDe: 'Arkanes Auge', nameEn: 'Arcane Eye' } },
];

function number(value: unknown): number { return Math.max(0, Math.floor(Number(value) || 0)); }
function mondayKey(date = new Date()): string {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay() || 7;
  local.setDate(local.getDate() - day + 1);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}
function baselineFrom(stats: PlayerProfileStats): WeeklyEliteState['baseline'] {
  return { enemiesDefeated: number(stats.enemiesDefeated), roomsCleared: number(stats.roomsCleared), bossesDefeated: number(stats.bossesDefeated), totalDamage: number(stats.totalDamage), runsStarted: number(stats.runsStarted), questsCompleted: number(stats.questsCompleted) };
}
function defaultState(stats: PlayerProfileStats, ownedRewardIds: string[] = [], eliteMarks = 0): WeeklyEliteState {
  return { version: 1, weekKey: mondayKey(), baseline: baselineFrom(stats), claimedQuestIds: [], ownedRewardIds: [...new Set(ownedRewardIds.filter(value => typeof value === 'string'))], eliteMarks: number(eliteMarks) };
}
function readStored(stats: PlayerProfileStats): WeeklyEliteState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState(stats);
    const parsed = JSON.parse(raw) as Partial<WeeklyEliteState>;
    const owned = Array.isArray(parsed.ownedRewardIds) ? parsed.ownedRewardIds.filter(value => typeof value === 'string') : [];
    if (parsed.weekKey !== mondayKey()) return defaultState(stats, owned, number(parsed.eliteMarks));
    return {
      version: 1,
      weekKey: mondayKey(),
      baseline: {
        enemiesDefeated: number(parsed.baseline?.enemiesDefeated), roomsCleared: number(parsed.baseline?.roomsCleared), bossesDefeated: number(parsed.baseline?.bossesDefeated), totalDamage: number(parsed.baseline?.totalDamage), runsStarted: number(parsed.baseline?.runsStarted), questsCompleted: number(parsed.baseline?.questsCompleted),
      },
      claimedQuestIds: Array.isArray(parsed.claimedQuestIds) ? parsed.claimedQuestIds.filter(value => typeof value === 'string') : [],
      ownedRewardIds: owned,
      eliteMarks: number(parsed.eliteMarks),
    };
  } catch { return defaultState(stats); }
}
function persist(state: WeeklyEliteState): WeeklyEliteState {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(WEEKLY_ELITE_EVENT, { detail: state }));
  return state;
}
function weekSeed(weekKey: string): number { return [...weekKey].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 2166136261); }

export function weeklyEliteQuests(weekKey = mondayKey()): WeeklyEliteQuest[] {
  const seed = weekSeed(weekKey);
  const first = seed % QUEST_POOL.length;
  const second = (first + 2 + (seed % 2)) % QUEST_POOL.length;
  const third = (first + 4 + (seed % 3)) % QUEST_POOL.length;
  const indices: number[] = [];
  for (const index of [first, second, third, ...QUEST_POOL.map((_, offset) => (first + offset) % QUEST_POOL.length)]) {
    if (!indices.includes(index)) indices.push(index);
    if (indices.length === 3) break;
  }
  return indices.map(index => QUEST_POOL[index]);
}

export function loadWeeklyEliteState(stats: PlayerProfileStats): WeeklyEliteState {
  const state = readStored(stats);
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw || JSON.parse(raw).weekKey !== state.weekKey) persist(state); } catch { persist(state); }
  return state;
}
export function weeklyEliteProgress(quest: WeeklyEliteQuest, stats: PlayerProfileStats, state = loadWeeklyEliteState(stats)): number { return Math.max(0, number(stats[quest.metric]) - number(state.baseline[quest.metric])); }
export function claimWeeklyEliteQuest(questId: string, stats: PlayerProfileStats): WeeklyEliteState {
  const state = loadWeeklyEliteState(stats);
  const quest = weeklyEliteQuests(state.weekKey).find(candidate => candidate.id === questId);
  if (!quest || state.claimedQuestIds.includes(quest.id) || weeklyEliteProgress(quest, stats, state) < quest.target) return state;
  state.claimedQuestIds.push(quest.id);
  state.ownedRewardIds = [...new Set([...state.ownedRewardIds, quest.reward.id])];
  state.eliteMarks += 1;
  return persist(state);
}
export function weeklyEliteRewardOwned(rewardId: string): boolean {
  try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<WeeklyEliteState>; return Array.isArray(parsed.ownedRewardIds) && parsed.ownedRewardIds.includes(rewardId); } catch { return false; }
}
export function weeklyEliteTimeLabel(language: 'de' | 'en'): string {
  const now = new Date();
  const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = nextMonday.getDay() || 7;
  nextMonday.setDate(nextMonday.getDate() + (8 - day));
  nextMonday.setHours(0, 0, 0, 0);
  const remaining = Math.max(0, nextMonday.getTime() - now.getTime());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  return language === 'de' ? `${days} T. ${hours} Std.` : `${days}d ${hours}h`;
}

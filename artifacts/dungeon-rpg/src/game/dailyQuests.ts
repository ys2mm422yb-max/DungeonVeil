export type DailyMetric = 'rooms' | 'kills' | 'hunts' | 'fireKills' | 'frostKills' | 'highHpRooms' | 'bossKills' | 'deepestRoom' | 'rankTwoGifts' | 'relicFinds';

export type DailyTaskId =
  | 'rooms-15'
  | 'kills-80'
  | 'hunts-2'
  | 'fire-20'
  | 'frost-20'
  | 'healthy-4'
  | 'boss-1'
  | 'depth-12'
  | 'gifts-3'
  | 'relic-1'
  | 'rooms-25-gold'
  | 'hunts-3-gold'
  | 'depth-18-gold';

export type DailyTask = {
  id: DailyTaskId;
  metric: DailyMetric;
  title: string;
  description: string;
  target: number;
  reward: number;
  gold?: boolean;
};

export const DAILY_ROTATION_VERSION = 2;

export const DAILY_TASK_POOL: DailyTask[] = [
  { id: 'rooms-15', metric: 'rooms', title: 'Tiefer hinab', description: 'Schließe 15 Räume ab', target: 15, reward: 22 },
  { id: 'kills-80', metric: 'kills', title: 'Schleierbrecher', description: 'Besiege 80 Gegner', target: 80, reward: 34 },
  { id: 'hunts-2', metric: 'hunts', title: 'Gezeichnete Beute', description: 'Besiege 2 Jagd-Gegner', target: 2, reward: 52 },
  { id: 'fire-20', metric: 'fireKills', title: 'Ascheregen', description: 'Besiege 20 brennende Gegner', target: 20, reward: 36 },
  { id: 'frost-20', metric: 'frostKills', title: 'Kalter Schnitt', description: 'Besiege 20 gefrorene Gegner', target: 20, reward: 36 },
  { id: 'healthy-4', metric: 'highHpRooms', title: 'Ungebrochen', description: 'Beende 4 Räume mit mindestens 80 % Leben', target: 4, reward: 30 },
  { id: 'boss-1', metric: 'bossKills', title: 'Wächtersturz', description: 'Besiege einen Wächter', target: 1, reward: 48 },
  { id: 'depth-12', metric: 'deepestRoom', title: 'Kein Blick zurück', description: 'Erreiche Raum 12', target: 12, reward: 32 },
  { id: 'gifts-3', metric: 'rankTwoGifts', title: 'Verdichtete Gabe', description: 'Erreiche bei 3 verschiedenen Gaben mindestens Stufe II', target: 3, reward: 40 },
  { id: 'relic-1', metric: 'relicFinds', title: 'Schleierfund', description: 'Finde ein seltenes Relikt', target: 1, reward: 58 },
  { id: 'rooms-25-gold', metric: 'rooms', title: 'Goldener Abstieg', description: 'Schließe 25 Räume ab', target: 25, reward: 72, gold: true },
  { id: 'hunts-3-gold', metric: 'hunts', title: 'Der Jäger wird gejagt', description: 'Besiege 3 Jagd-Gegner', target: 3, reward: 90, gold: true },
  { id: 'depth-18-gold', metric: 'deepestRoom', title: 'Vor dem ersten Wächter', description: 'Erreiche Raum 18', target: 18, reward: 82, gold: true },
];

function hashDate(dateKey: string): number {
  let hash = 2166136261;
  for (let index = 0; index < dateKey.length; index++) {
    hash ^= dateKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededOrder<T extends { id: string }>(items: T[], seed: number): T[] {
  return [...items].sort((a, b) => {
    const score = (id: string) => {
      let value = seed;
      for (let index = 0; index < id.length; index++) value = Math.imul(value ^ id.charCodeAt(index), 16777619) >>> 0;
      return value;
    };
    return score(a.id) - score(b.id);
  });
}

export function dailyTaskIdsForDate(dateKey: string): DailyTaskId[] {
  const seed = hashDate(dateKey);
  const standard = seededOrder(DAILY_TASK_POOL.filter(task => !task.gold), seed);
  const gold = seededOrder(DAILY_TASK_POOL.filter(task => task.gold), seed ^ 0x9e3779b9);
  return [standard[0].id, standard[1].id, gold[0].id];
}

export function nextDailyResetAt(now = new Date()): number {
  const reset = new Date(now);
  reset.setHours(24, 0, 0, 0);
  return reset.getTime();
}

export function dailyTimeLabel(language: 'de' | 'en', now = Date.now()): string {
  const remaining = Math.max(0, nextDailyResetAt(new Date(now)) - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor(totalSeconds % 3600 / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${language === 'de' ? 'Neu in' : 'New in'} ${hours}:${minutes}:${seconds}`;
}

export function taskById(id: DailyTaskId): DailyTask {
  return DAILY_TASK_POOL.find(task => task.id === id) ?? DAILY_TASK_POOL[0];
}

export function tasksForDate(dateKey: string): DailyTask[] {
  return dailyTaskIdsForDate(dateKey).map(taskById);
}

import type { GameEngine } from './runEngine';

export type WeeklyRiftId = 'blood-week' | 'frozen-veil' | 'empty-veil';

export type WeeklyRiftDefinition = {
  id: WeeklyRiftId;
  nameDe: string;
  nameEn: string;
  ruleDe: string;
  ruleEn: string;
  accent: string;
};

export const WEEKLY_RIFTS: WeeklyRiftDefinition[] = [
  { id: 'blood-week', nameDe: 'Woche des Blutes', nameEn: 'Week of Blood', ruleDe: 'Heilung halbiert · Angriff +20 %', ruleEn: 'Healing halved · Attack +20%', accent: '#d85a5a' },
  { id: 'frozen-veil', nameDe: 'Gefrorener Schleier', nameEn: 'Frozen Veil', ruleDe: 'Bewegung -12 % · Frostpfeile stärker', ruleEn: 'Movement -12% · Frost arrows empowered', accent: '#77dfff' },
  { id: 'empty-veil', nameDe: 'Leerer Schleier', nameEn: 'Empty Veil', ruleDe: 'Weniger Gaben · seltene Drops häufiger', ruleEn: 'Fewer gifts · rare drops more common', accent: '#aa83ff' },
];

function startOfWeek(date = new Date()): Date {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day);
  return result;
}

function weekIndex(date = new Date()): number {
  return Math.floor(startOfWeek(date).getTime() / 604_800_000);
}

export function currentWeeklyRift(date = new Date()): WeeklyRiftDefinition {
  return WEEKLY_RIFTS[Math.abs(weekIndex(date)) % WEEKLY_RIFTS.length];
}

export function nextWeeklyRiftReset(date = new Date()): Date {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 7);
  return next;
}

export function applyWeeklyRiftToEngine(engine: GameEngine, rift = currentWeeklyRift()): void {
  const player = engine.state.player;
  if (rift.id === 'blood-week') {
    player.attack = Math.round(player.attack * 1.2);
  } else if (rift.id === 'frozen-veil') {
    player.speed = Math.round(player.speed * 0.88);
    engine.state.runSkills.iceArrow = Math.max(1, engine.state.runSkills.iceArrow ?? 0);
  }
  engine.saveNow(`weekly-rift:${rift.id}`);
}

import type { WorldBossEvent } from './supabaseOnline';

export type WorldBossKey = 'ash-king' | 'veil-dragon' | 'deep-warden';

export type WorldBossRotationProfile = {
  key: WorldBossKey;
  name: { de: string; en: string };
  title: { de: string; en: string };
  mechanicSummary: { de: string; en: string };
  nextName: { de: string; en: string };
  theme: 'ash' | 'veil' | 'depth';
  combat: {
    healthMultiplier: number;
    moveSpeed: number;
    clawMultiplier: number;
    breathMultiplier: number;
    slamMultiplier: number;
    defense: number;
    startDelayMs: number;
  };
};

const PROFILES: Record<WorldBossKey, WorldBossRotationProfile> = {
  'ash-king': {
    key: 'ash-king',
    name: { de: 'Der Aschenkönig', en: 'The Ash King' },
    title: { de: 'König der verbrannten Krone', en: 'King of the Burned Crown' },
    mechanicSummary: {
      de: 'Brandzonen, Flächendruck und klar markierte sichere Bereiche.',
      en: 'Burning zones, area pressure, and clearly marked safe spaces.',
    },
    nextName: { de: 'Der Schleierdrache', en: 'The Veil Dragon' },
    theme: 'ash',
    combat: { healthMultiplier: 1, moveSpeed: 44, clawMultiplier: 1, breathMultiplier: 1.08, slamMultiplier: 1.12, defense: 6, startDelayMs: 700 },
  },
  'veil-dragon': {
    key: 'veil-dragon',
    name: { de: 'Der Schleierdrache', en: 'The Veil Dragon' },
    title: { de: 'Drache zwischen den Welten', en: 'Dragon Between Worlds' },
    mechanicSummary: {
      de: 'Dreifacher Schleieratem, Zielmarken und schnelle Positionswechsel.',
      en: 'Triple veil breath, target marks, and fast position changes.',
    },
    nextName: { de: 'Der Tiefenwächter', en: 'The Deep Warden' },
    theme: 'veil',
    combat: { healthMultiplier: 1.15, moveSpeed: 58, clawMultiplier: 1.18, breathMultiplier: 1.28, slamMultiplier: 0.92, defense: 5, startDelayMs: 520 },
  },
  'deep-warden': {
    key: 'deep-warden',
    name: { de: 'Der Tiefenwächter', en: 'The Deep Warden' },
    title: { de: 'Wächter der versunkenen Schwelle', en: 'Warden of the Sunken Threshold' },
    mechanicSummary: {
      de: 'Hohe Rüstung, defensive Phasen und kontrollierter Zusatzgegnerdruck.',
      en: 'Heavy armor, defensive phases, and controlled add pressure.',
    },
    nextName: { de: 'Der Aschenkönig', en: 'The Ash King' },
    theme: 'depth',
    combat: { healthMultiplier: 1.3, moveSpeed: 34, clawMultiplier: 0.9, breathMultiplier: 0.82, slamMultiplier: 1.42, defense: 12, startDelayMs: 900 },
  },
};

function inferredKey(event: WorldBossEvent): WorldBossKey {
  const raw = String((event as WorldBossEvent & { boss_key?: string }).boss_key ?? event.slug ?? '').toLowerCase();
  if (raw.includes('veil-dragon') || raw.includes('schleier')) return 'veil-dragon';
  if (raw.includes('deep-warden') || raw.includes('tiefen')) return 'deep-warden';
  return 'ash-king';
}

export function worldBossRotationProfile(event: WorldBossEvent): WorldBossRotationProfile {
  return PROFILES[inferredKey(event)];
}

export function localizedWorldBossName(event: WorldBossEvent, language: 'de' | 'en'): string {
  return worldBossRotationProfile(event).name[language];
}

export function worldBossThemeClasses(theme: WorldBossRotationProfile['theme']): string {
  if (theme === 'veil') return 'border-violet-300/24 bg-violet-500/10 text-violet-50';
  if (theme === 'depth') return 'border-cyan-300/24 bg-cyan-500/10 text-cyan-50';
  return 'border-orange-300/24 bg-orange-500/10 text-orange-50';
}

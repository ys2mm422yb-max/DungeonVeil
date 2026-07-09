import type { GameEngine } from './runEngine';
import type { Enemy } from './entities';
import { isBossRoom } from './chapterRun';

const STORAGE_KEY = 'dungeon-veil-retention-v1';

export type DailyTaskId = 'rooms' | 'kills' | 'hunt';

export type DailyTask = {
  id: DailyTaskId;
  title: string;
  description: string;
  target: number;
  reward: number;
};

export type RetentionProfile = {
  sigils: number;
  daily: {
    date: string;
    rooms: number;
    kills: number;
    hunts: number;
    claimed: DailyTaskId[];
  };
  codex: {
    enemies: string[];
    bosses: string[];
    hunts: string[];
    relics: string[];
  };
};

type HuntEnemy = Enemy & {
  isHuntTarget?: boolean;
  huntName?: string;
  huntReward?: number;
};

export type RunRetentionState = {
  roomKey: string;
  roomClearKey: string;
  processedDeaths: Set<string>;
  huntTargetId: string;
  roomsSinceHunt: number;
  lastAuraAt: number;
};

const HUNT_NAMES = [
  'Aschenjäger',
  'Der Runenlose',
  'Nachtklaue',
  'Knochenrufer',
  'Veyra die Verlorene',
  'Schleierhetzer',
];

const ROOM_TWENTY_RELICS = [
  'Herz des Schleiers',
  'Krone des gebrochenen Wächters',
  'Runensplitter der Tiefe',
];

export const DAILY_TASKS: DailyTask[] = [
  { id: 'rooms', title: 'Tiefer hinab', description: 'Schließe 6 Räume ab', target: 6, reward: 12 },
  { id: 'kills', title: 'Schleierbrecher', description: 'Besiege 30 Gegner', target: 30, reward: 16 },
  { id: 'hunt', title: 'Gezeichnete Beute', description: 'Besiege 1 Jagd-Gegner', target: 1, reward: 28 },
];

function localDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyProfile(): RetentionProfile {
  return {
    sigils: 0,
    daily: { date: localDateKey(), rooms: 0, kills: 0, hunts: 0, claimed: [] },
    codex: { enemies: [], bosses: [], hunts: [], relics: [] },
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function loadRetentionProfile(): RetentionProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<RetentionProfile> : {};
    const fallback = emptyProfile();
    const profile: RetentionProfile = {
      sigils: Math.max(0, Number(parsed.sigils ?? 0)),
      daily: {
        date: parsed.daily?.date ?? fallback.daily.date,
        rooms: Math.max(0, Number(parsed.daily?.rooms ?? 0)),
        kills: Math.max(0, Number(parsed.daily?.kills ?? 0)),
        hunts: Math.max(0, Number(parsed.daily?.hunts ?? 0)),
        claimed: Array.isArray(parsed.daily?.claimed) ? parsed.daily!.claimed.filter((id): id is DailyTaskId => id === 'rooms' || id === 'kills' || id === 'hunt') : [],
      },
      codex: {
        enemies: unique(parsed.codex?.enemies ?? []),
        bosses: unique(parsed.codex?.bosses ?? []),
        hunts: unique(parsed.codex?.hunts ?? []),
        relics: unique(parsed.codex?.relics ?? []),
      },
    };
    if (profile.daily.date !== localDateKey()) profile.daily = fallback.daily;
    return profile;
  } catch {
    return emptyProfile();
  }
}

function notifyProfile(profile: RetentionProfile): void {
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-update', { detail: profile }));
}

function saveProfile(profile: RetentionProfile): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
  notifyProfile(profile);
}

function toast(title: string, text: string, tone: 'hunt' | 'daily' | 'relic' = 'daily'): void {
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title, text, tone } }));
}

function dailyProgress(profile: RetentionProfile, id: DailyTaskId): number {
  if (id === 'rooms') return profile.daily.rooms;
  if (id === 'kills') return profile.daily.kills;
  return profile.daily.hunts;
}

function claimCompletedDailies(profile: RetentionProfile): void {
  for (const task of DAILY_TASKS) {
    if (profile.daily.claimed.includes(task.id) || dailyProgress(profile, task.id) < task.target) continue;
    profile.daily.claimed.push(task.id);
    profile.sigils += task.reward;
    toast('TAGESAUFTRAG ERFÜLLT', `${task.title} · +${task.reward} Schleier-Siegel`, 'daily');
  }
}

function mutateProfile(mutator: (profile: RetentionProfile) => void): RetentionProfile {
  const profile = loadRetentionProfile();
  mutator(profile);
  profile.codex.enemies = unique(profile.codex.enemies);
  profile.codex.bosses = unique(profile.codex.bosses);
  profile.codex.hunts = unique(profile.codex.hunts);
  profile.codex.relics = unique(profile.codex.relics);
  claimCompletedDailies(profile);
  saveProfile(profile);
  return profile;
}

export function createRunRetentionState(): RunRetentionState {
  return {
    roomKey: '',
    roomClearKey: '',
    processedDeaths: new Set<string>(),
    huntTargetId: '',
    roomsSinceHunt: 0,
    lastAuraAt: 0,
  };
}

function markDiscoveries(engine: GameEngine): void {
  const enemyTypes = engine.state.enemies.map(enemy => enemy.enemyType);
  if (!enemyTypes.length) return;
  mutateProfile(profile => { profile.codex.enemies.push(...enemyTypes); });
}

function spawnHuntTarget(engine: GameEngine, state: RunRetentionState): void {
  if (engine.state.floor < 8 || isBossRoom(engine.state.floor)) return;
  const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead) as HuntEnemy[];
  if (!living.length) return;

  const chance = Math.min(0.18 + state.roomsSinceHunt * 0.09, 0.72);
  if (Math.random() > chance) {
    state.roomsSinceHunt++;
    return;
  }

  const target = [...living].sort((a, b) => b.maxHp - a.maxHp)[0];
  const name = HUNT_NAMES[Math.floor(Math.random() * HUNT_NAMES.length)];
  target.isHuntTarget = true;
  target.huntName = name;
  target.huntReward = 25;
  target.maxHp = Math.max(target.maxHp + 80, Math.round(target.maxHp * 3.1));
  target.hp = target.maxHp;
  target.attack = Math.max(target.attack + 5, Math.round(target.attack * 1.5));
  target.speed *= 1.12;
  target.color = '#d9a94b';
  state.huntTargetId = target.id;
  state.roomsSinceHunt = 0;

  const x = target.x + target.width / 2;
  const y = target.y + target.height / 2;
  engine.state.effects.push({ id: `hunt-spawn-${Date.now()}`, x, y, radius: 0, maxRadius: 120, color: '#f4c45f', lifeTime: 0, maxLifeTime: 850, type: 'circle', element: 'arcane' });
  engine.state.damageNumbers.push({ id: `hunt-name-${Date.now()}`, x, y: target.y - 18, value: `JAGD: ${name.toUpperCase()}`, color: '#ffd775', lifeTime: 0, maxLifeTime: 2200, scale: 1.15 });
  toast('JAGDZEICHEN ERKANNT', `${name} lauert in Raum ${engine.state.floor}`, 'hunt');
}

function handleRoomEntry(engine: GameEngine, state: RunRetentionState): void {
  const roomKey = `${engine.state.chapter}:${engine.state.floor}`;
  if (roomKey === state.roomKey) return;
  state.roomKey = roomKey;
  state.roomClearKey = '';
  state.huntTargetId = '';
  markDiscoveries(engine);
  spawnHuntTarget(engine, state);
}

function pulseHuntAura(engine: GameEngine, state: RunRetentionState, time: number): void {
  if (!state.huntTargetId || time - state.lastAuraAt < 850) return;
  const target = engine.state.enemies.find(enemy => enemy.id === state.huntTargetId && enemy.hp > 0 && !enemy.isDead) as HuntEnemy | undefined;
  if (!target) return;
  state.lastAuraAt = time;
  engine.state.effects.push({
    id: `hunt-aura-${time}`,
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
    radius: 12,
    maxRadius: 48,
    color: '#f1b94f',
    lifeTime: 0,
    maxLifeTime: 700,
    type: 'circle',
    element: 'arcane',
  });
}

function maybeRareRelic(source: 'hunt' | 'room20'): void {
  const chance = source === 'hunt' ? 0.18 : 0.02;
  if (Math.random() > chance) return;
  const pool = source === 'hunt' ? ['Auge des Aschenjägers', 'Gezeichnete Kralle', 'Siegel der Nachtjagd'] : ROOM_TWENTY_RELICS;
  const relic = pool[Math.floor(Math.random() * pool.length)];
  mutateProfile(profile => {
    profile.codex.relics.push(relic);
    profile.sigils += source === 'hunt' ? 18 : 60;
  });
  toast('SELTENER FUND', `${relic} wurde dem Kodex hinzugefügt`, 'relic');
}

function processDeaths(engine: GameEngine, state: RunRetentionState): void {
  for (const enemy of engine.state.enemies as HuntEnemy[]) {
    if (!enemy.isDead || state.processedDeaths.has(enemy.id)) continue;
    state.processedDeaths.add(enemy.id);
    const isHunt = enemy.isHuntTarget || enemy.id === state.huntTargetId;
    const huntName = enemy.huntName ?? 'Gezeichnete Beute';

    mutateProfile(profile => {
      profile.daily.kills++;
      profile.codex.enemies.push(enemy.enemyType);
      if (enemy.enemyType === 'boss') profile.codex.bosses.push(`${engine.state.chapter}:${engine.state.floor}`);
      if (isHunt) {
        profile.daily.hunts++;
        profile.sigils += enemy.huntReward ?? 25;
        profile.codex.hunts.push(huntName);
      }
    });

    if (isHunt) {
      toast('JAGD ABGESCHLOSSEN', `${huntName} besiegt · +${enemy.huntReward ?? 25} Schleier-Siegel`, 'hunt');
      maybeRareRelic('hunt');
      state.huntTargetId = '';
    }
  }
}

function processRoomClear(engine: GameEngine, state: RunRetentionState): void {
  if (!engine.state.roomClearReady) return;
  const clearKey = `${engine.state.chapter}:${engine.state.floor}:${engine.state.roomClearAt}`;
  if (clearKey === state.roomClearKey) return;
  state.roomClearKey = clearKey;
  mutateProfile(profile => { profile.daily.rooms++; });
  if (engine.state.floor === 20) maybeRareRelic('room20');
}

export function updateRunRetentionSystems(engine: GameEngine, state: RunRetentionState, time: number): void {
  handleRoomEntry(engine, state);
  processDeaths(engine, state);
  processRoomClear(engine, state);
  pulseHuntAura(engine, state, time);
}

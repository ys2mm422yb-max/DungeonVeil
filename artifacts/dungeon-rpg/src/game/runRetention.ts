import type { GameEngine } from './runEngine';
import { isBossRoom } from './chapterRun';
import {
  HUNT_RELIC_POOL,
  ROOM_TWENTY_RELIC_POOL,
  VEIL_RELICS,
  equippedVeilRelic,
  unlockVeilRelic,
  type VeilRelicId,
} from './veilRelics';

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
  const relic = equippedVeilRelic();
  const minimumFloor = relic === 'ash-eye' ? 6 : 8;
  if (engine.state.floor < minimumFloor || isBossRoom(engine.state.floor)) return;
  const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  if (!living.length) return;

  const relicBonus = relic === 'ash-eye' ? 0.16 : 0;
  const chance = Math.min(0.18 + relicBonus + state.roomsSinceHunt * 0.09, relic === 'ash-eye' ? 0.88 : 0.72);
  if (Math.random() > chance) {
    state.roomsSinceHunt++;
    return;
  }

  const target = [...living].sort((a, b) => b.maxHp - a.maxHp)[0];
  const name = HUNT_NAMES[Math.floor(Math.random() * HUNT_NAMES.length)];
  target.isHuntTarget = true;
  target.huntName = name;
  target.huntReward = 25;
  target.huntVisualVariant = Math.floor(Math.random() * 3);
  target.maxHp = Math.max(target.maxHp + 80, Math.round(target.maxHp * 3.1));
  target.hp = target.maxHp;
  target.attack = Math.max(target.attack + 5, Math.round(target.attack * 1.5));
  target.speed *= 1.12;
  target.color = '#d9a94b';
  state.huntTargetId = target.id;
  state.roomsSinceHunt = 0;

  const x = target.x + target.width / 2;
  const y = target.y + target.height / 2;
  engine.state.effects.push({ id: `hunt-spawn-outer-${Date.now()}`, x, y, radius: 0, maxRadius: 170, color: '#f4c45f', lifeTime: 0, maxLifeTime: 1150, type: 'circle', element: 'arcane' });
  engine.state.effects.push({ id: `hunt-spawn-inner-${Date.now()}`, x, y, radius: 0, maxRadius: 92, color: '#fff0a6', lifeTime: 0, maxLifeTime: 680, type: 'circle', element: 'arcane' });
  engine.state.damageNumbers.push({ id: `hunt-name-${Date.now()}`, x, y: target.y - 28, value: `JAGD: ${name.toUpperCase()}`, color: '#ffd775', lifeTime: 0, maxLifeTime: 2500, scale: 1.38 });
  toast(relic === 'ash-eye' ? 'DAS ASCHEAUGE REAGIERT' : 'JAGDZEICHEN ERKANNT', `${name} lauert in Raum ${engine.state.floor}`, 'hunt');
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
  if (!state.huntTargetId || time - state.lastAuraAt < 620) return;
  const target = engine.state.enemies.find(enemy => enemy.id === state.huntTargetId && enemy.hp > 0 && !enemy.isDead);
  if (!target) return;
  state.lastAuraAt = time;
  engine.state.effects.push({
    id: `hunt-aura-${time}`,
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
    radius: 12,
    maxRadius: 58,
    color: target.huntVisualVariant === 1 ? '#d692ff' : target.huntVisualVariant === 2 ? '#ff7558' : '#f1b94f',
    lifeTime: 0,
    maxLifeTime: 620,
    type: 'circle',
    element: 'arcane',
  });
}

function maybeRareRelic(source: 'hunt' | 'room20'): void {
  const chance = source === 'hunt' ? 0.18 : 0.02;
  if (Math.random() > chance) return;
  const pool = source === 'hunt' ? HUNT_RELIC_POOL : ROOM_TWENTY_RELIC_POOL;
  const relicId = pool[Math.floor(Math.random() * pool.length)] as VeilRelicId;
  const relic = VEIL_RELICS[relicId];
  const result = unlockVeilRelic(relicId);
  mutateProfile(profile => {
    profile.codex.relics.push(relic.nameDe);
    profile.sigils += source === 'hunt' ? 18 : 60;
  });
  toast(result.newUnlock ? 'SELTENES RELIKT' : 'RELIKT-DUPLIKAT', result.newUnlock ? `${relic.nameDe} freigeschaltet` : `${relic.nameDe} erneut gefunden · Bonus-Siegel erhalten`, 'relic');
}

function processDeaths(engine: GameEngine, state: RunRetentionState, time: number): void {
  for (const enemy of engine.state.enemies) {
    if (!enemy.isDead || state.processedDeaths.has(enemy.id)) continue;
    state.processedDeaths.add(enemy.id);
    const isHunt = enemy.isHuntTarget || enemy.id === state.huntTargetId;
    const huntName = enemy.huntName ?? 'Gezeichnete Beute';
    const activeRelic = equippedVeilRelic();
    const huntReward = Math.round((enemy.huntReward ?? 25) * (activeRelic === 'night-hunt-sigil' ? 1.5 : 1));

    mutateProfile(profile => {
      profile.daily.kills++;
      profile.codex.enemies.push(enemy.enemyType);
      if (enemy.enemyType === 'boss') profile.codex.bosses.push(`${engine.state.chapter}:${engine.state.floor}`);
      if (isHunt) {
        profile.daily.hunts++;
        profile.sigils += huntReward;
        profile.codex.hunts.push(huntName);
      }
    });

    if (activeRelic === 'marked-claw') {
      engine.state.player.relicAttackSpeedUntil = time + 2500;
      engine.state.effects.push({ id: `claw-rush-${time}`, x: engine.state.player.x + 16, y: engine.state.player.y + 16, radius: 0, maxRadius: 54, color: '#e15e4e', lifeTime: 0, maxLifeTime: 420, type: 'circle', element: 'fire' });
    }

    if (enemy.enemyType === 'boss' && activeRelic === 'broken-guardian-crown') {
      engine.state.player.attack = Math.max(engine.state.player.attack + 1, Math.round(engine.state.player.attack * 1.1));
      toast('DIE KRONE ERWACHT', '+10 % Angriff für den restlichen Run', 'relic');
    }

    if (isHunt) {
      toast('JAGD ABGESCHLOSSEN', `${huntName} besiegt · +${huntReward} Schleier-Siegel`, 'hunt');
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
  processDeaths(engine, state, time);
  processRoomClear(engine, state);
  pulseHuntAura(engine, state, time);
}

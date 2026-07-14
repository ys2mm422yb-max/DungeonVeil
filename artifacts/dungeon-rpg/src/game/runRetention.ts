import type { GameEngine } from './runEngine';
import { recordPlayerProfileQuestCompleted } from './playerProfile';
import { isBossRoom } from './chapterRun';
import { dailyTaskIdsForDate, taskById, tasksForDate, type DailyMetric, type DailyTaskId } from './dailyQuests';
import { activeWeeklyRiftId } from './weeklyRiftRun';
import {
  HUNT_RELIC_POOL,
  ROOM_TWENTY_RELIC_POOL,
  VEIL_RELICS,
  equippedVeilRelic,
  unlockVeilRelic,
  type VeilRelicId,
} from './veilRelics';

const STORAGE_KEY = 'dungeon-veil-retention-v2';
const LEGACY_STORAGE_KEY = 'dungeon-veil-retention-v1';
type DailyProgress = Record<DailyMetric, number>;
type PendingRelicDrop = { relicId: VeilRelicId; roomKey: string; source: 'hunt' | 'room20' };

export type RetentionProfile = {
  sigils: number;
  daily: { date: string; selected: DailyTaskId[]; progress: DailyProgress; claimed: DailyTaskId[] };
  codex: { enemies: string[]; bosses: string[]; hunts: string[]; relics: string[] };
};

export type RunRetentionState = {
  roomKey: string;
  roomClearKey: string;
  processedDeaths: Set<string>;
  huntTargetId: string;
  roomsSinceHunt: number;
  lastAuraAt: number;
  pendingRelics: Map<string, PendingRelicDrop>;
};

const HUNT_NAMES = ['Aschenjäger', 'Der Runenlose', 'Nachtklaue', 'Knochenrufer', 'Veyra die Verlorene', 'Schleierhetzer'];

function localDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyProgress(): DailyProgress {
  return { rooms: 0, kills: 0, hunts: 0, fireKills: 0, frostKills: 0, highHpRooms: 0, bossKills: 0, deepestRoom: 0, rankTwoGifts: 0, relicFinds: 0 };
}

function emptyProfile(): RetentionProfile {
  const date = localDateKey();
  return { sigils: 0, daily: { date, selected: dailyTaskIdsForDate(date), progress: emptyProgress(), claimed: [] }, codex: { enemies: [], bosses: [], hunts: [], relics: [] } };
}

function unique(values: string[]): string[] { return [...new Set(values)]; }
function safeNumber(value: unknown): number { return Math.max(0, Number(value ?? 0) || 0); }

export function loadRetentionProfile(): RetentionProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as any : {};
    const fallback = emptyProfile();
    const date = typeof parsed.daily?.date === 'string' ? parsed.daily.date : fallback.daily.date;
    const legacyProgress = { ...emptyProgress(), rooms: safeNumber(parsed.daily?.rooms), kills: safeNumber(parsed.daily?.kills), hunts: safeNumber(parsed.daily?.hunts) };
    const sourceProgress = parsed.daily?.progress ?? legacyProgress;
    const progress = emptyProgress();
    (Object.keys(progress) as DailyMetric[]).forEach(metric => { progress[metric] = safeNumber(sourceProgress?.[metric]); });
    const selected = Array.isArray(parsed.daily?.selected)
      ? parsed.daily.selected.filter((id: unknown): id is DailyTaskId => typeof id === 'string' && taskById(id as DailyTaskId).id === id)
      : dailyTaskIdsForDate(date);
    const claimed = Array.isArray(parsed.daily?.claimed)
      ? parsed.daily.claimed.filter((id: unknown): id is DailyTaskId => typeof id === 'string' && selected.includes(id as DailyTaskId))
      : [];
    const profile: RetentionProfile = {
      sigils: safeNumber(parsed.sigils),
      daily: { date, selected: selected.length === 3 ? selected : dailyTaskIdsForDate(date), progress, claimed },
      codex: {
        enemies: unique(Array.isArray(parsed.codex?.enemies) ? parsed.codex.enemies : []),
        bosses: unique(Array.isArray(parsed.codex?.bosses) ? parsed.codex.bosses : []),
        hunts: unique(Array.isArray(parsed.codex?.hunts) ? parsed.codex.hunts : []),
        relics: unique(Array.isArray(parsed.codex?.relics) ? parsed.codex.relics : []),
      },
    };
    if (profile.daily.date !== localDateKey()) return { ...profile, daily: emptyProfile().daily };
    return profile;
  } catch { return emptyProfile(); }
}

export function currentDailyTasks(profile = loadRetentionProfile()) { return profile.daily.selected.map(taskById); }
export function dailyProgressForTask(profile: RetentionProfile, taskId: DailyTaskId): number {
  const task = taskById(taskId);
  return Math.min(task.target, profile.daily.progress[task.metric] ?? 0);
}

function notifyProfile(profile: RetentionProfile): void { window.dispatchEvent(new CustomEvent('dungeon-veil-retention-update', { detail: profile })); }
function saveProfile(profile: RetentionProfile): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {} notifyProfile(profile); }
function toast(title: string, text: string, tone: 'hunt' | 'daily' | 'relic' = 'daily'): void { window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title, text, tone } })); }

function claimCompletedDailies(profile: RetentionProfile): void {
  for (const task of currentDailyTasks(profile)) {
    if (profile.daily.claimed.includes(task.id) || dailyProgressForTask(profile, task.id) < task.target) continue;
    profile.daily.claimed.push(task.id);
    profile.sigils += task.reward;
    recordPlayerProfileQuestCompleted();
    toast(task.gold ? 'GOLD-AUFTRAG ERFÜLLT' : 'TAGESAUFTRAG ERFÜLLT', `${task.title} · +${task.reward} Schleier-Siegel`, task.gold ? 'relic' : 'daily');
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
  return { roomKey: '', roomClearKey: '', processedDeaths: new Set<string>(), huntTargetId: '', roomsSinceHunt: 0, lastAuraAt: 0, pendingRelics: new Map() };
}

function markDiscoveries(engine: GameEngine): void {
  const enemyTypes = engine.state.enemies.map(enemy => enemy.enemyType);
  if (enemyTypes.length) mutateProfile(profile => { profile.codex.enemies.push(...enemyTypes); });
}

function updateRunDailyMetrics(engine: GameEngine): void {
  const rankTwoGifts = Object.entries(engine.state.runSkills).filter(([key, rank]) => key !== 'heal' && (rank ?? 0) >= 2).length;
  mutateProfile(profile => {
    profile.daily.progress.deepestRoom = Math.max(profile.daily.progress.deepestRoom, engine.state.floor);
    profile.daily.progress.rankTwoGifts = Math.max(profile.daily.progress.rankTwoGifts, rankTwoGifts);
  });
}

function spawnHuntTarget(engine: GameEngine, state: RunRetentionState): void {
  const relic = equippedVeilRelic();
  const minimumFloor = relic === 'ash-eye' ? 6 : 8;
  if (engine.state.floor < minimumFloor || isBossRoom(engine.state.floor)) return;
  const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  if (!living.length) return;
  const riftBonus = activeWeeklyRiftId() === 'empty-veil' ? 0.4 : 0;
  const relicBonus = relic === 'ash-eye' ? 0.16 : 0;
  const chance = Math.min(0.18 + riftBonus + relicBonus + state.roomsSinceHunt * 0.09, activeWeeklyRiftId() === 'empty-veil' ? 0.96 : relic === 'ash-eye' ? 0.88 : 0.72);
  if (Math.random() > chance) { state.roomsSinceHunt++; return; }

  const target = [...living].sort((a, b) => b.maxHp - a.maxHp)[0];
  const name = HUNT_NAMES[Math.floor(Math.random() * HUNT_NAMES.length)];
  const visualVariant = Math.floor(Math.random() * 3);
  target.id = `${target.id}-hunt-${visualVariant}`;
  target.isHuntTarget = true;
  target.huntName = name;
  target.huntReward = 25;
  target.huntVisualVariant = visualVariant;
  target.width = Math.round(target.width * 1.16);
  target.height = Math.round(target.height * 1.16);
  target.maxHp = Math.max(target.maxHp + 80, Math.round(target.maxHp * 3.1));
  target.hp = target.maxHp;
  target.attack = Math.max(target.attack + 5, Math.round(target.attack * 1.5));
  target.speed *= 1.12;
  target.color = visualVariant === 1 ? '#c984ef' : visualVariant === 2 ? '#ed7656' : '#d9a94b';
  state.huntTargetId = target.id;
  state.roomsSinceHunt = 0;
  const x = target.x + target.width / 2;
  const y = target.y + target.height / 2;
  engine.state.effects.push({ id: `hunt-spawn-outer-${Date.now()}`, x, y, radius: 0, maxRadius: 170, color: target.color, lifeTime: 0, maxLifeTime: 1150, type: 'circle', element: 'arcane' });
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
  updateRunDailyMetrics(engine);
  spawnHuntTarget(engine, state);
}

function pulseHuntAura(engine: GameEngine, state: RunRetentionState, time: number): void {
  if (!state.huntTargetId || time - state.lastAuraAt < 620) return;
  const target = engine.state.enemies.find(enemy => enemy.id === state.huntTargetId && enemy.hp > 0 && !enemy.isDead);
  if (!target) return;
  state.lastAuraAt = time;
  engine.state.effects.push({ id: `hunt-aura-${time}`, x: target.x + target.width / 2, y: target.y + target.height / 2, radius: 12, maxRadius: 58, color: target.huntVisualVariant === 1 ? '#d692ff' : target.huntVisualVariant === 2 ? '#ff7558' : '#f1b94f', lifeTime: 0, maxLifeTime: 620, type: 'circle', element: 'arcane' });
}

function spawnRareRelicDrop(engine: GameEngine, state: RunRetentionState, source: 'hunt' | 'room20', x: number, y: number): void {
  const riftBonus = activeWeeklyRiftId() === 'empty-veil' ? (source === 'hunt' ? 0.12 : 0.04) : 0;
  const chance = (source === 'hunt' ? 0.18 : 0.02) + riftBonus;
  if (Math.random() > chance) return;
  const pool = source === 'hunt' ? HUNT_RELIC_POOL : ROOM_TWENTY_RELIC_POOL;
  const relicId = pool[Math.floor(Math.random() * pool.length)] as VeilRelicId;
  const itemId = `relic-drop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  engine.state.items.push({ id: itemId, type: 'item', itemType: 'relic', relicId, value: 0, x: x - 10, y: y - 10, width: 20, height: 20, vx: 0, vy: 0, color: VEIL_RELICS[relicId].accent, spawnTime: performance.now() });
  state.pendingRelics.set(itemId, { relicId, roomKey: `${engine.state.chapter}:${engine.state.floor}`, source });
  toast('SELTENE BEUTE', 'Ein Schleier-Relikt liegt im Raum. Berühre es, um es zu bergen.', 'relic');
}

function processPendingRelicPickups(engine: GameEngine, state: RunRetentionState): void {
  const roomKey = `${engine.state.chapter}:${engine.state.floor}`;
  for (const [itemId, pending] of state.pendingRelics) {
    if (engine.state.items.some(item => item.id === itemId)) continue;
    state.pendingRelics.delete(itemId);
    if (pending.roomKey !== roomKey) continue;
    const relic = VEIL_RELICS[pending.relicId];
    const result = unlockVeilRelic(pending.relicId);
    mutateProfile(profile => {
      profile.codex.relics.push(relic.nameDe);
      profile.daily.progress.relicFinds++;
      profile.sigils += pending.source === 'hunt' ? 18 : 60;
    });
    toast(result.newUnlock ? 'RELIKT GEBORGEN' : 'RELIKT-DUPLIKAT', result.newUnlock ? `${relic.nameDe} freigeschaltet` : `${relic.nameDe} erneut gefunden · Bonus-Siegel erhalten`, 'relic');
  }
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
      profile.daily.progress.kills++;
      if ((enemy.burnUntil ?? 0) > enemy.deathTime) profile.daily.progress.fireKills++;
      if ((enemy.frostUntil ?? 0) > enemy.deathTime) profile.daily.progress.frostKills++;
      profile.codex.enemies.push(enemy.enemyType);
      if (enemy.enemyType === 'boss') { profile.daily.progress.bossKills++; profile.codex.bosses.push(`${engine.state.chapter}:${engine.state.floor}`); }
      if (isHunt) { profile.daily.progress.hunts++; profile.sigils += huntReward; profile.codex.hunts.push(huntName); }
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
      spawnRareRelicDrop(engine, state, 'hunt', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      state.huntTargetId = '';
    }
  }
}

function processRoomClear(engine: GameEngine, state: RunRetentionState): void {
  if (!engine.state.roomClearReady) return;
  const clearKey = `${engine.state.chapter}:${engine.state.floor}:${engine.state.roomClearAt}`;
  if (clearKey === state.roomClearKey) return;
  state.roomClearKey = clearKey;
  mutateProfile(profile => {
    profile.daily.progress.rooms++;
    if (engine.state.player.hp / Math.max(1, engine.state.player.maxHp) >= 0.8) profile.daily.progress.highHpRooms++;
    profile.daily.progress.deepestRoom = Math.max(profile.daily.progress.deepestRoom, engine.state.floor);
  });
  if (engine.state.floor === 20) spawnRareRelicDrop(engine, state, 'room20', engine.state.map.width * 20, engine.state.map.height * 20);
}

export function updateRunRetentionSystems(engine: GameEngine, state: RunRetentionState, time: number): void {
  processPendingRelicPickups(engine, state);
  handleRoomEntry(engine, state);
  processDeaths(engine, state, time);
  processRoomClear(engine, state);
  pulseHuntAura(engine, state, time);
}

export { tasksForDate };

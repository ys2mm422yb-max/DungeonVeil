import { loadMetaProgression, saveMetaProgression, type MetaProgression } from './metaProgression';

const STORAGE_KEY = 'dungeon-veil-player-name-change-v1';
export const PLAYER_NAME_CHANGE_EVENT = 'dungeon-veil-player-name-change-state';
export const PLAYER_NAME_CHANGE_GOLD_COST = 5_000;

type PlayerNameChangeEntry = {
  completedChanges: number;
};

type PlayerNameChangeState = {
  version: 1;
  users: Record<string, PlayerNameChangeEntry>;
};

export type PlayerNameChangeQuote = {
  completedChanges: number;
  cost: number;
  free: boolean;
  affordable: boolean;
  gold: number;
};

function defaultState(): PlayerNameChangeState {
  return { version: 1, users: {} };
}

function normalizeUserId(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

function normalizeState(value: unknown): PlayerNameChangeState {
  if (!value || typeof value !== 'object') return defaultState();
  const raw = value as { users?: unknown };
  const users: PlayerNameChangeState['users'] = {};
  if (raw.users && typeof raw.users === 'object') {
    for (const [userId, entry] of Object.entries(raw.users as Record<string, unknown>)) {
      const id = normalizeUserId(userId);
      if (!id || !entry || typeof entry !== 'object') continue;
      const completedChanges = Math.max(0, Math.floor(Number((entry as { completedChanges?: unknown }).completedChanges) || 0));
      users[id] = { completedChanges };
    }
  }
  return { version: 1, users };
}

function loadState(): PlayerNameChangeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

function emitChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PLAYER_NAME_CHANGE_EVENT));
}

function quoteFromValues(completedChanges: number, cost: number, meta: MetaProgression): PlayerNameChangeQuote {
  const normalizedCost = cost > 0 ? PLAYER_NAME_CHANGE_GOLD_COST : 0;
  return {
    completedChanges: Math.max(0, Math.floor(completedChanges)),
    cost: normalizedCost,
    free: normalizedCost === 0,
    affordable: meta.gold >= normalizedCost,
    gold: meta.gold,
  };
}

export function playerNameChangeQuote(userId: string, meta: MetaProgression = loadMetaProgression()): PlayerNameChangeQuote {
  const id = normalizeUserId(userId);
  const completedChanges = id ? loadState().users[id]?.completedChanges ?? 0 : 0;
  const cost = completedChanges === 0 ? 0 : PLAYER_NAME_CHANGE_GOLD_COST;
  return quoteFromValues(completedChanges, cost, meta);
}

export function playerNameChangeQuoteFromServer(
  completedChanges: number,
  nextChangeCost: number,
  meta: MetaProgression = loadMetaProgression(),
): PlayerNameChangeQuote {
  return quoteFromValues(completedChanges, nextChangeCost, meta);
}

export function commitPlayerNameChange(userId: string): PlayerNameChangeQuote {
  const id = normalizeUserId(userId);
  if (!id) throw new Error('Ungültiges Online-Konto');

  const previousStateRaw = localStorage.getItem(STORAGE_KEY);
  const state = loadState();
  const meta = loadMetaProgression();
  const quote = playerNameChangeQuote(id, meta);
  if (!quote.affordable) throw new Error(`Nicht genug Gold. Benötigt: ${quote.cost}`);

  const previousGold = meta.gold;
  state.users[id] = { completedChanges: quote.completedChanges + 1 };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (quote.cost > 0) {
      meta.gold -= quote.cost;
      saveMetaProgression(meta);
    }
    emitChange();
    return playerNameChangeQuote(id, meta);
  } catch (error) {
    try {
      if (previousStateRaw === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, previousStateRaw);
      if (meta.gold !== previousGold) {
        meta.gold = previousGold;
        saveMetaProgression(meta);
      }
    } catch {}
    throw error;
  }
}

export function commitServerPlayerNameChange(
  userId: string,
  completedChanges: number,
  chargedGold: number,
): PlayerNameChangeQuote {
  const id = normalizeUserId(userId);
  if (!id) throw new Error('Ungültiges Online-Konto');
  const targetCompleted = Math.max(0, Math.floor(Number(completedChanges) || 0));
  const charge = Number(chargedGold) === PLAYER_NAME_CHANGE_GOLD_COST ? PLAYER_NAME_CHANGE_GOLD_COST : 0;
  const previousStateRaw = localStorage.getItem(STORAGE_KEY);
  const state = loadState();
  const currentCompleted = state.users[id]?.completedChanges ?? 0;
  const meta = loadMetaProgression();

  if (currentCompleted >= targetCompleted) {
    return playerNameChangeQuoteFromServer(currentCompleted, currentCompleted === 0 ? 0 : PLAYER_NAME_CHANGE_GOLD_COST, meta);
  }
  if (meta.gold < charge) throw new Error(`Nicht genug Gold. Benötigt: ${charge}`);

  const previousGold = meta.gold;
  state.users[id] = { completedChanges: targetCompleted };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (charge > 0) {
      meta.gold -= charge;
      saveMetaProgression(meta);
    }
    emitChange();
    return playerNameChangeQuoteFromServer(targetCompleted, targetCompleted === 0 ? 0 : PLAYER_NAME_CHANGE_GOLD_COST, meta);
  } catch (error) {
    try {
      if (previousStateRaw === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, previousStateRaw);
      if (meta.gold !== previousGold) {
        meta.gold = previousGold;
        saveMetaProgression(meta);
      }
    } catch {}
    throw error;
  }
}

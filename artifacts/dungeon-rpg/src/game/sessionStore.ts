export const SESSION_AUTOSAVE_MS = 30000;

export interface SaveableGameEngine {
  state?: {
    inDungeon?: boolean;
    status?: string;
    roomClearReady?: boolean;
    enemies?: Array<{ hp?: number; isDead?: boolean }>;
  };
  saveNow: (reason?: string) => boolean;
}

export function saveEngineSession(engine: SaveableGameEngine, reason?: string): boolean {
  try {
    const state = engine.state;
    const activeCombat = state?.status === 'playing'
      && !state.roomClearReady
      && Boolean(state.enemies?.some(enemy => Number(enemy.hp ?? 0) > 0 && !enemy.isDead));
    if (activeCombat) return false;
    return engine.saveNow(reason ?? (state?.inDungeon ? 'dungeon-session' : 'session'));
  } catch (error) {
    console.error('Dungeon Veil session save failed', error);
    return false;
  }
}

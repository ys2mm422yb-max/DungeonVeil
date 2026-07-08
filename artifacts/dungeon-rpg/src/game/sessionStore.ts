export const SESSION_AUTOSAVE_MS = 30000;

export interface SaveableGameEngine {
  state?: { inDungeon?: boolean };
  saveNow: (reason?: string) => boolean;
}

export function saveEngineSession(engine: SaveableGameEngine): boolean {
  try {
    if (engine.state?.inDungeon) return true;
    return engine.saveNow('session');
  } catch (error) {
    console.error('Dungeon Veil session save failed', error);
    return false;
  }
}

export const SESSION_AUTOSAVE_MS = 30000;

export interface SaveableGameEngine {
  saveNow: (reason?: string) => boolean;
}

export function saveEngineSession(engine: SaveableGameEngine): boolean {
  try {
    return engine.saveNow('session');
  } catch (error) {
    console.error('Dungeon Veil session save failed', error);
    return false;
  }
}

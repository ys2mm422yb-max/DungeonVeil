export const SESSION_AUTOSAVE_MS = 30000;
export const ACTIVE_RUN_SESSION_KEY = 'dungeon-veil-active-run-session';

export interface SaveableGameEngine {
  state?: { inDungeon?: boolean };
  saveNow: (reason?: string) => boolean;
}

function activeBrowserRun(): boolean {
  if (typeof sessionStorage === 'undefined') return true;
  try { return sessionStorage.getItem(ACTIVE_RUN_SESSION_KEY) === '1'; }
  catch { return true; }
}

export function saveEngineSession(engine: SaveableGameEngine): boolean {
  try {
    if (!activeBrowserRun()) return false;
    return engine.saveNow(engine.state?.inDungeon ? 'dungeon-session' : 'session');
  } catch (error) {
    console.error('Dungeon Veil session save failed', error);
    return false;
  }
}

import { GameEngine } from './engine';

export const SESSION_AUTOSAVE_MS = 30000;

export function saveEngineSession(engine: GameEngine): boolean {
  try {
    const saveable = engine as unknown as { doSave: () => void };
    saveable.doSave();
    return true;
  } catch (error) {
    console.error('Dungeon Veil session save failed', error);
    return false;
  }
}

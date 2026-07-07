import { useEffect } from 'react';
import { GameEngine } from '../game/engine';
import { SESSION_AUTOSAVE_MS, saveEngineSession } from '../game/sessionStore';

export function GameSessionBridge({ getEngine, active }: { getEngine: () => GameEngine | null; active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const save = () => {
      const engine = getEngine();
      if (engine && engine.state.player.playerName !== 'Hero') saveEngineSession(engine);
    };
    const timer = window.setInterval(save, SESSION_AUTOSAVE_MS);
    const hide = () => { if (document.hidden) save(); };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [active]);
  return null;
}

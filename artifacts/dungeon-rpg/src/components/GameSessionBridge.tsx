import { useEffect } from 'react';
import { saveEngineSession } from '../game/sessionStore';

type SessionEngine = {
  state: { player: { playerName: string } };
  saveNow: (reason?: string) => boolean;
};

export function GameSessionBridge({ getEngine, active }: { getEngine: () => SessionEngine | null; active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const save = () => {
      const engine = getEngine();
      if (engine && engine.state.player.playerName !== 'Hero') saveEngineSession(engine);
    };
    const hide = () => { if (document.hidden) save(); };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [active, getEngine]);
  return null;
}

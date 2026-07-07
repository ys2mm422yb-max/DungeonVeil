import { useEffect } from 'react';
import { GameEngine } from '../game/engine';
import { SESSION_AUTOSAVE_MS, saveEngineSession } from '../game/sessionStore';

export function GameSessionBridge({ getEngine, active }: { getEngine: () => GameEngine | null; active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const save = () => { const engine = getEngine(); if (engine && engine.state.player.playerName !== 'Hero') saveEngineSession(engine); };
    const interval = window.setInterval(save, SESSION_AUTOSAVE_MS);
    const hidden = () => { if (document.hidden) save(); };
    const runtimeError = (event: ErrorEvent) => console.error('Dungeon Veil runtime error', event.error ?? event.message);
    const rejection = (event: PromiseRejectionEvent) => console.error('Dungeon Veil unhandled rejection', event.reason);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('error', runtimeError);
    window.addEventListener('unhandledrejection', rejection);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('error', runtimeError);
      window.removeEventListener('unhandledrejection', rejection);
    };
  }, [active, getEngine]);
  return null;
}

import { useEffect } from 'react';
import { saveEngineSession } from '../game/sessionStore';
import type { GameEngine } from '../game/runEngine';
import { createRunEffectSystemState, updateRunEffectSystems } from '../game/runEffectSystems';

export function GameSessionBridge({ getEngine, active }: { getEngine: () => GameEngine | null; active: boolean }) {
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

  useEffect(() => {
    if (!active) return;
    const system = createRunEffectSystemState();
    let frame = 0;
    const update = (time: number) => {
      const engine = getEngine();
      if (engine?.state.status === 'playing') updateRunEffectSystems(engine, system, time);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [active, getEngine]);

  return null;
}

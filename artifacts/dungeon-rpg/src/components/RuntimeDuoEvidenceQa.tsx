import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CombatStage } from './CombatStage';
import { GameSessionBridge } from './GameSessionBridge';
import { HUD } from './HUD';
import { GameEngine, type GameState } from '../game/runEngine';
import type { CoopPlayerPresence } from '../game/coopRealtimePresence';
import { attachRuntimeEvidenceEngine } from '../game/runtimeEvidenceBridge';
import { LanguageProvider } from '../i18n/LanguageContext';

function cloneState(engine: GameEngine): GameState {
  return {
    ...engine.state,
    player: { ...engine.state.player, facing: { ...engine.state.player.facing } },
    enemies: engine.state.enemies.map(enemy => ({ ...enemy })),
    items: engine.state.items.map(item => ({ ...item })),
    damageNumbers: engine.state.damageNumbers.map(number => ({ ...number })),
    particles: engine.state.particles.map(particle => ({ ...particle })),
    effects: engine.state.effects.map(effect => ({ ...effect })),
  };
}

function RuntimeDuoEvidenceScene() {
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) engineRef.current = new GameEngine();
  const [state, setState] = useState<GameState>(() => cloneState(engineRef.current!));

  useEffect(() => {
    document.documentElement.dataset.dungeonVeilRunMode = 'duo';
    const engine = engineRef.current!;
    engine.onStateChange = () => setState(cloneState(engine));
    engine.startNewGame('Duo Host', 'archer');
    engine.state.player.hp = 9_999;
    engine.state.player.maxHp = 9_999;
    engine.state.player.attack = 50_000;
    engine.state.player.defense = 5_000;
    attachRuntimeEvidenceEngine(engine);
    setState(cloneState(engine));

    let frame = 0;
    const tick = (time: number) => {
      const buildState = document.documentElement.dataset.dungeonVeilRoomBuildState;
      const rendererState = document.documentElement.dataset.dungeonVeilRendererState;
      if ((!buildState || buildState === 'ready') && rendererState !== 'recovering' && rendererState !== 'lost') {
        engine.update(time);
      } else {
        engine.lastTime = time;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.dataset.dungeonVeilRunMode = 'solo';
    };
  }, []);

  const remotePlayer = useMemo<CoopPlayerPresence>(() => ({
    version: 1,
    lobbyId: 'runtime-evidence-lobby',
    runSeed: 424242,
    userId: 'runtime-evidence-guest',
    displayName: 'Duo Gefährte',
    chapter: state.chapter,
    room: state.floor,
    x: state.player.x + 72,
    y: state.player.y + 42,
    facingX: state.player.facing.x,
    facingY: state.player.facing.y,
    state: state.player.state === 'dodging' ? 'dodging' : state.player.state === 'moving' ? 'moving' : state.player.lastAttackTime > 0 ? 'attack' : 'idle',
    lifeState: 'alive',
    revivesUsed: 0,
    downedUntil: 0,
    hp: state.player.maxHp,
    maxHp: state.player.maxHp,
    defense: state.player.defense,
    lastAttackTime: state.player.lastAttackTime,
    lastDodgeTime: state.player.lastDodgeTime,
    sequence: 1,
    sentAt: Date.now(),
    receivedAt: Date.now(),
  }), [state]);

  return <div className="fixed inset-0 overflow-hidden bg-black" data-testid="runtime-duo-evidence-qa">
    <GameSessionBridge getEngine={() => engineRef.current} active />
    <CombatStage gameState={state} remotePlayer={remotePlayer} />
    <HUD gameState={state} onPause={() => {}} />
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan-200/25 bg-black/72 px-4 py-2 text-[8px] font-black tracking-[.18em] text-cyan-100">DUO RUNTIME EVIDENCE · ROOM {state.floor}/50</div>
  </div>;
}

export function RuntimeDuoEvidenceQa() {
  return <LanguageProvider>
    <RuntimeDuoEvidenceScene />
  </LanguageProvider>;
}

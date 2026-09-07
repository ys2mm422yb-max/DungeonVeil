import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CombatStage } from './CombatStage';
import { CoopTeamDefeatOverlay } from './CoopRunRealtimeBridge';
import { GameSessionBridge } from './GameSessionBridge';
import { HUD } from './HUD';
import { GameEngine, type GameState } from '../game/runEngine';
import type { CoopPlayerPresence } from '../game/coopRealtimePresence';
import { attachRuntimeEvidenceEngine } from '../game/runtimeEvidenceBridge';
import { LanguageProvider } from '../i18n/LanguageContext';

type DuoLifecyclePhase = 'alive' | 'downed' | 'revived' | 'fallen' | 'team-defeat';

const DUO_LIFECYCLE_SEQUENCE: DuoLifecyclePhase[] = ['alive', 'downed', 'revived', 'fallen', 'team-defeat'];

function nextLifecyclePhase(current: DuoLifecyclePhase): DuoLifecyclePhase {
  switch (current) {
    case 'alive': return 'downed';
    case 'downed': return 'revived';
    case 'revived': return 'fallen';
    case 'fallen': return 'team-defeat';
    case 'team-defeat': return 'team-defeat';
  }
}

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
  const lifecycleEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get('duoLifecycle') === '1',
    [],
  );
  const [lifecyclePhase, setLifecyclePhase] = useState<DuoLifecyclePhase>('alive');
  const [lifecycleStarted, setLifecycleStarted] = useState(false);

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

  const remotePlayer = useMemo<CoopPlayerPresence>(() => {
    const lifeState = lifecyclePhase === 'downed'
      ? 'downed'
      : lifecyclePhase === 'fallen' || lifecyclePhase === 'team-defeat'
        ? 'fallen'
        : 'alive';
    const maxHp = state.player.maxHp;
    return {
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
      state: lifeState === 'alive'
        ? state.player.state === 'dodging'
          ? 'dodging'
          : state.player.state === 'moving'
            ? 'moving'
            : state.player.lastAttackTime > 0
              ? 'attack'
              : 'idle'
        : 'idle',
      lifeState,
      revivesUsed: lifecyclePhase === 'fallen' || lifecyclePhase === 'team-defeat' ? 1 : 0,
      downedUntil: lifeState === 'downed' ? Date.now() + 10_000 : 0,
      hp: lifeState === 'alive' ? (lifecyclePhase === 'revived' ? Math.ceil(maxHp * 0.45) : maxHp) : 0,
      maxHp,
      defense: state.player.defense,
      lastAttackTime: state.player.lastAttackTime,
      lastDodgeTime: state.player.lastDodgeTime,
      sequence: DUO_LIFECYCLE_SEQUENCE.indexOf(lifecyclePhase) + 1,
      sentAt: Date.now(),
      receivedAt: Date.now(),
    };
  }, [lifecyclePhase, state]);

  return <div
    className="fixed inset-0 overflow-hidden bg-black"
    data-testid="runtime-duo-evidence-qa"
    data-lifecycle-phase={lifecyclePhase}
  >
    <GameSessionBridge getEngine={() => engineRef.current} active />
    <CombatStage gameState={state} remotePlayer={remotePlayer} />
    <HUD gameState={state} onPause={() => {}} />
    {lifecycleEnabled && !lifecycleStarted && <button
      type="button"
      data-testid="runtime-duo-lifecycle-start"
      onClick={() => { setLifecyclePhase('alive'); setLifecycleStarted(true); }}
      className="pointer-events-auto absolute left-1/2 top-4 z-[95] -translate-x-1/2 rounded-xl border border-cyan-200/40 bg-black/80 px-4 py-3 text-[9px] font-black uppercase tracking-[.16em] text-cyan-50"
    >START DUO LIFECYCLE</button>}
    {lifecycleEnabled && lifecycleStarted && lifecyclePhase !== 'team-defeat' && <button
      type="button"
      data-testid="runtime-duo-lifecycle-advance"
      onClick={() => setLifecyclePhase(current => nextLifecyclePhase(current))}
      className="pointer-events-auto absolute right-4 top-4 z-[95] rounded-xl border border-cyan-200/40 bg-black/80 px-3 py-2 text-[8px] font-black uppercase tracking-[.14em] text-cyan-50"
    >ADVANCE DUO LIFECYCLE</button>}
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan-200/25 bg-black/72 px-4 py-2 text-[8px] font-black tracking-[.18em] text-cyan-100">
      DUO RUNTIME EVIDENCE · {lifecyclePhase.toUpperCase()} · ROOM {state.floor}/50
    </div>
    {lifecycleEnabled && lifecyclePhase === 'team-defeat' && <CoopTeamDefeatOverlay
      role="host"
      restartBusy={false}
      onRestart={() => {}}
      testId="runtime-duo-team-game-over"
    />}
  </div>;
}

export function RuntimeDuoEvidenceQa() {
  return <LanguageProvider>
    <RuntimeDuoEvidenceScene />
  </LanguageProvider>;
}

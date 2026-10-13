import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CombatStage } from './CombatStage';
import {
  CoopAuthorityRuntimeBridge,
  type CoopAuthorityRuntimeBridgeHandle,
} from './CoopAuthorityRuntimeBridge';
import { GameSessionBridge } from './GameSessionBridge';
import { HUD } from './HUD';
import { GameEngine, type GameState } from '../game/runEngine';
import type { CoopPlayerPresence, CoopRealtimeStatus } from '../game/coopRealtimePresence';
import { attachRuntimeEvidenceEngine } from '../game/runtimeEvidenceBridge';
import {
  RUNTIME_DUO_AUTHORITY_CONTEXT,
  RuntimeDuoAuthorityFixture,
  type RuntimeDuoAuthoritySnapshot,
} from '../game/runtimeDuoAuthorityFixture';
import { LanguageProvider } from '../i18n/LanguageContext';

declare global {
  interface Window {
    __dungeonVeilDuoAuthorityEvidence?: {
      preparePartnerDowned: () => void;
      preparePartnerSecondDeath: () => void;
      prepareTeamDefeat: () => void;
      interruptNextRead: () => void;
      rejectNextSubmitAsStale: () => void;
      interruptNextActorSession: () => void;
      refreshActorSession: () => void;
      movePartnerOutOfReviveRange: () => void;
      movePartnerIntoReviveRange: () => void;
      exitAuthorityAttempt: () => Promise<void>;
      probeInvalidatedAttempt: () => Promise<Readonly<{ readRejected: boolean; submitRejected: boolean }>>;
      prepareHostTelegraph: () => void;
      clearHostTelegraph: () => void;
      setUserPaused: (paused: boolean) => void;
      snapshot: () => RuntimeDuoAuthoritySnapshot;
      engineStatus: () => GameState['status'];
      authorityPresentation: () => readonly Readonly<{ id: string; lifeTime: number; maxLifeTime: number }>[];
    };
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
  const authorityBridgeRef = useRef<CoopAuthorityRuntimeBridgeHandle | null>(null);
  const fixtureRef = useRef<RuntimeDuoAuthorityFixture | null>(null);
  if (!engineRef.current) engineRef.current = new GameEngine();
  if (!fixtureRef.current) fixtureRef.current = new RuntimeDuoAuthorityFixture();
  const engine = engineRef.current;
  const fixture = fixtureRef.current;
  const [state, setState] = useState<GameState>(() => cloneState(engine));
  const [remotePlayer, setRemotePlayer] = useState<CoopPlayerPresence | null>(null);
  const [status, setStatus] = useState<CoopRealtimeStatus>('offline');
  const lifecycleEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get('duoLifecycle') === '1',
    [],
  );

  useEffect(() => {
    document.documentElement.dataset.dungeonVeilRunMode = 'duo';
    engine.onStateChange = () => setState(cloneState(engine));
    engine.startNewGame('Duo Host', 'archer');
    attachRuntimeEvidenceEngine(engine);
    setState(cloneState(engine));
    window.__dungeonVeilDuoAuthorityEvidence = {
      preparePartnerDowned: () => fixture.preparePartnerDowned(),
      preparePartnerSecondDeath: () => fixture.preparePartnerSecondDeath(),
      prepareTeamDefeat: () => fixture.prepareTeamDefeat(),
      interruptNextRead: () => fixture.interruptNextRead(),
      rejectNextSubmitAsStale: () => fixture.rejectNextSubmitAsStale(),
      interruptNextActorSession: () => fixture.interruptNextActorSession(),
      refreshActorSession: () => fixture.refreshActorSession(),
      movePartnerOutOfReviveRange: () => fixture.movePartnerOutOfReviveRange(),
      movePartnerIntoReviveRange: () => fixture.movePartnerIntoReviveRange(),
      exitAuthorityAttempt: async () => {
        const bridge = authorityBridgeRef.current;
        if (!bridge) throw new Error('Mounted Duo authority bridge is unavailable');
        await bridge.exitAuthorityAttempt();
      },
      probeInvalidatedAttempt: () => fixture.probeInvalidatedAttempt(),
      prepareHostTelegraph: () => fixture.prepareHostTelegraph(),
      clearHostTelegraph: () => fixture.clearHostTelegraph(),
      setUserPaused: paused => {
        engine.state.status = paused ? 'paused' : 'playing';
        engine.onStateChange({ ...engine.state });
      },
      snapshot: () => fixture.snapshot(),
      engineStatus: () => engine.state.status,
      authorityPresentation: () => engine.state.effects
        .filter(effect => effect.id.startsWith('authority-telegraph-'))
        .map(effect => Object.freeze({ id: effect.id, lifeTime: effect.lifeTime, maxLifeTime: effect.maxLifeTime })),
    };
    let frame = 0;
    const tick = (time: number) => {
      engine.update(time);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      delete window.__dungeonVeilDuoAuthorityEvidence;
      document.documentElement.dataset.dungeonVeilRunMode = 'solo';
    };
  }, [engine, fixture]);

  const authority = fixture.snapshot().state;
  const canonicalPartner = authority.actors.find(actor => actor.actorId === fixture.partnerId);
  const lifecyclePhase = authority.lifecycle === 'team-defeated'
    ? 'team-defeat'
    : canonicalPartner?.lifeState === 'fallen'
      ? 'fallen'
      : canonicalPartner?.lifeState === 'downed'
        ? 'downed'
        : canonicalPartner?.revivesUsed === 1
          ? 'revived'
          : 'alive';

  return <div
    className="fixed inset-0 overflow-hidden bg-black"
    data-testid="runtime-duo-evidence-qa"
    data-lifecycle-phase={lifecyclePhase}
    data-authority-lifecycle={authority.lifecycle}
    data-connection-status={status}
  >
    <GameSessionBridge getEngine={() => engineRef.current} active />
    <CombatStage gameState={state} remotePlayer={remotePlayer} />
    <HUD gameState={state} onPause={() => window.__dungeonVeilDuoAuthorityEvidence?.setUserPaused(true)} />
    <CoopAuthorityRuntimeBridge
      ref={authorityBridgeRef}
      active
      context={RUNTIME_DUO_AUTHORITY_CONTEXT}
      getEngine={() => engineRef.current}
      onRemotePlayer={setRemotePlayer}
      onStatus={setStatus}
      transport={fixture}
      tickMs={100}
    />
    {lifecycleEnabled && lifecyclePhase === 'alive' && <button
      type="button"
      data-testid="runtime-duo-lifecycle-start"
      onClick={() => fixture.preparePartnerDowned()}
      className="pointer-events-auto absolute left-1/2 top-4 z-[95] -translate-x-1/2 rounded-xl border border-cyan-200/40 bg-black/80 px-4 py-3 text-[9px] font-black uppercase tracking-[.16em] text-cyan-50"
    >START AUTHORITY LIFECYCLE</button>}
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan-200/25 bg-black/72 px-4 py-2 text-[8px] font-black tracking-[.18em] text-cyan-100">
      DUO AUTHORITY · {lifecyclePhase.toUpperCase()} · ROOM {state.floor}/50
    </div>
  </div>;
}

export function RuntimeDuoEvidenceQa() {
  return <LanguageProvider>
    <RuntimeDuoEvidenceScene />
  </LanguageProvider>;
}

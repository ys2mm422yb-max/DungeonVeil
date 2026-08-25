import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RunGameState } from '../game/runEngine';
import { getLatestSpectatorCompanion, subscribeSpectatorCompanion } from '../game/socialSpectatorOnline';
import { useLanguage } from '../i18n/LanguageContext';
import { GameCanvasKayKit3D } from './GameCanvasKayKit3D';
import { CompanionScene3D } from './CompanionScene3D';
import { PLAYER_DEATH_EVENT } from './kaykitPlayer3D';

type ViewportBox = { width: number; height: number; left: number; top: number };
const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';
const SPECTATOR_QA_RECONNECT_EVENT = 'dungeon-veil-spectator-qa-reconnect-v1';

function readViewport(): ViewportBox {
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, Math.round(viewport?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(viewport?.height ?? window.innerHeight)),
    left: Math.round(viewport?.offsetLeft ?? 0),
    top: Math.round(viewport?.offsetTop ?? 0),
  };
}

function readSpectatorDead(state: RunGameState): boolean {
  const qaDeath = new URLSearchParams(window.location.search).get('death') === '1';
  return qaDeath || state.player.hp <= 0 || state.status === 'gameover';
}

export function SpectatorPlaybackStage({ stableState }: { stableState: RunGameState }) {
  const { language } = useLanguage();
  const [viewport, setViewport] = useState<ViewportBox>(() => readViewport());
  const [spectatorDead, setSpectatorDead] = useState(() => readSpectatorDead(stableState));
  const companion = useSyncExternalStore(subscribeSpectatorCompanion, getLatestSpectatorCompanion, () => null);
  const streamRef = useRef('');
  const roomRef = useRef('');
  const lastActionSequenceRef = useRef(0);
  const [lastActionSequence, setLastActionSequence] = useState(0);
  const [actionDispatchCount, setActionDispatchCount] = useState(0);
  const [reconnectEpoch, setReconnectEpoch] = useState(0);

  useEffect(() => {
    let frame = 0;
    const updateViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport(readViewport()));
    };
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = readSpectatorDead(stableState);
    setSpectatorDead(previous);
    const observeDeathState = () => {
      const next = readSpectatorDead(stableState);
      if (next !== previous) {
        previous = next;
        setSpectatorDead(next);
      }
      frame = window.requestAnimationFrame(observeDeathState);
    };
    frame = window.requestAnimationFrame(observeDeathState);
    return () => window.cancelAnimationFrame(frame);
  }, [stableState]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(PLAYER_DEATH_EVENT, { detail: { dead: spectatorDead } }));
    return () => {
      if (spectatorDead) window.dispatchEvent(new CustomEvent(PLAYER_DEATH_EVENT, { detail: { dead: false } }));
    };
  }, [spectatorDead]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('qa') !== 'spectator') return;
    const reconnect = () => {
      streamRef.current = '';
      roomRef.current = '';
      setReconnectEpoch(epoch => epoch + 1);
    };
    window.addEventListener(SPECTATOR_QA_RECONNECT_EVENT, reconnect);
    return () => window.removeEventListener(SPECTATOR_QA_RECONNECT_EVENT, reconnect);
  }, []);

  useEffect(() => {
    if (!companion?.identity) return;
    const streamChanged = streamRef.current !== companion.streamId;
    const roomChanged = roomRef.current !== companion.roomKey;
    if (streamChanged || roomChanged) {
      streamRef.current = companion.streamId;
      roomRef.current = companion.roomKey;
      const highWaterSequence = companion.actions.reduce((maximum, action) => Math.max(maximum, action.sequence), 0);
      lastActionSequenceRef.current = highWaterSequence;
      setLastActionSequence(highWaterSequence);
      setActionDispatchCount(0);
      return;
    }
    for (const action of companion.actions) {
      if (action.sequence <= lastActionSequenceRef.current) continue;
      window.dispatchEvent(new CustomEvent(COMPANION_ACTION_EVENT, {
        detail: {
          ownerPlayerId: 'player',
          role: action.role,
          level: action.level,
          kind: action.kind,
          targetId: action.targetId,
          at: action.at,
          spectatorPlayback: true,
          spectatorSequence: action.sequence,
        },
      }));
      lastActionSequenceRef.current = action.sequence;
      setLastActionSequence(action.sequence);
      setActionDispatchCount(count => count + 1);
    }
  }, [companion, reconnectEpoch]);

  return <div
    data-testid="spectator-playback-stage"
    data-render-contract="single-stable-three-state-with-companion"
    data-spectator-death-state={spectatorDead ? 'active' : 'idle'}
    className="fixed overflow-hidden bg-black"
    style={{ left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height }}
  >
    <GameCanvasKayKit3D gameState={stableState} />
    <CompanionScene3D gameState={stableState} localCompanion={companion?.identity ?? null} />
    {spectatorDead && <div data-testid="spectator-death-overlay" className="pointer-events-none absolute inset-x-0 top-[14%] z-[72] mx-auto w-[min(86vw,380px)] rounded-2xl border border-red-200/25 bg-black/82 px-5 py-4 text-center shadow-2xl backdrop-blur-md">
      <div className="text-[9px] font-black uppercase tracking-[.24em] text-red-200/55">{language === 'de' ? 'ZUSCHAUERANSICHT' : 'SPECTATOR VIEW'}</div>
      <div className="mt-1 font-serif text-2xl text-red-50">{language === 'de' ? 'SPIELER GEFALLEN' : 'PLAYER FALLEN'}</div>
      <div className="mt-2 text-[10px] leading-relaxed text-red-100/62">{language === 'de' ? 'Du beobachtest den gefallenen Spieler. Der Kampfzustand der übrigen Welt läuft weiter.' : 'You are watching a fallen player. The rest of the combat world continues.'}</div>
    </div>}
    <span
      className="hidden"
      aria-hidden="true"
      data-testid="spectator-companion-contract"
      data-visible-cap="1"
      data-shared-renderer="true"
      data-model-source="procedural-distinct-companion-v5"
      data-companion-source={companion?.identity ? 'leader-snapshot' : 'none'}
      data-companion-id={companion?.identity?.role ?? ''}
      data-action-dedup="monotonic-sequence-high-water"
      data-last-action-sequence={lastActionSequence}
      data-action-dispatch-count={actionDispatchCount}
      data-reconnect-epoch={reconnectEpoch}
      data-stream-id={companion?.streamId ?? ''}
      data-room-key={companion?.roomKey ?? ''}
    />
  </div>;
}

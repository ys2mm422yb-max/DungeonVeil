import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RunGameState } from '../game/runEngine';
import { getLatestSpectatorCompanion, subscribeSpectatorCompanion } from '../game/socialSpectatorOnline';
import { GameCanvasKayKit3D } from './GameCanvasKayKit3D';
import { CompanionScene3D } from './CompanionScene3D';

type ViewportBox = { width: number; height: number; left: number; top: number };
const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';

function readViewport(): ViewportBox {
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, Math.round(viewport?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(viewport?.height ?? window.innerHeight)),
    left: Math.round(viewport?.offsetLeft ?? 0),
    top: Math.round(viewport?.offsetTop ?? 0),
  };
}

export function SpectatorPlaybackStage({ stableState }: { stableState: RunGameState }) {
  const [viewport, setViewport] = useState<ViewportBox>(() => readViewport());
  const companion = useSyncExternalStore(subscribeSpectatorCompanion, getLatestSpectatorCompanion, () => null);
  const streamRef = useRef('');
  const roomRef = useRef('');
  const lastActionSequenceRef = useRef(0);
  const [lastActionSequence, setLastActionSequence] = useState(0);
  const [actionDispatchCount, setActionDispatchCount] = useState(0);

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
  }, [companion]);

  return <div
    data-testid="spectator-playback-stage"
    data-render-contract="single-stable-three-state-with-companion"
    className="fixed overflow-hidden bg-black"
    style={{ left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height }}
  >
    <GameCanvasKayKit3D gameState={stableState} />
    <CompanionScene3D gameState={stableState} localCompanion={companion?.identity ?? null} />
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
      data-stream-id={companion?.streamId ?? ''}
      data-room-key={companion?.roomKey ?? ''}
    />
  </div>;
}

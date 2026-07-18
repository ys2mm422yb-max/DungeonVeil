import { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/runEngine';
import type { DuoRunContext } from '../game/coopRunMode';
import {
  CoopRealtimePresenceClient,
  remotePresenceIsFresh,
  type CoopPlayerPresence,
  type CoopRealtimeStatus,
} from '../game/coopRealtimePresence';

const PUBLISH_MS = 100;
const STALE_CHECK_MS = 500;

type Props = {
  active: boolean;
  context: DuoRunContext | null;
  getEngine: () => GameEngine | null;
  onRemotePlayer: (presence: CoopPlayerPresence | null) => void;
  onStatus: (status: CoopRealtimeStatus) => void;
};

export function CoopRunRealtimeBridge({ active, context, getEngine, onRemotePlayer, onStatus }: Props) {
  const getEngineRef = useRef(getEngine);
  const onRemotePlayerRef = useRef(onRemotePlayer);
  const onStatusRef = useRef(onStatus);
  const latestRemoteRef = useRef<CoopPlayerPresence | null>(null);
  getEngineRef.current = getEngine;
  onRemotePlayerRef.current = onRemotePlayer;
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!active || !context) {
      latestRemoteRef.current = null;
      onRemotePlayerRef.current(null);
      onStatusRef.current('offline');
      return;
    }

    let client: CoopRealtimePresenceClient;
    try {
      client = new CoopRealtimePresenceClient({
        context,
        onRemotePresence: presence => {
          latestRemoteRef.current = presence;
          onRemotePlayerRef.current(presence);
        },
        onPeerLeft: userId => {
          if (latestRemoteRef.current?.userId !== userId) return;
          latestRemoteRef.current = null;
          onRemotePlayerRef.current(null);
        },
        onStatus: status => onStatusRef.current(status),
      });
    } catch (error) {
      console.error('Duo realtime bridge could not start', error);
      onStatusRef.current('offline');
      return;
    }

    client.connect();
    const publish = window.setInterval(() => {
      const engine = getEngineRef.current();
      if (!engine || engine.state.status === 'gameover') return;
      const player = engine.state.player;
      const networkState: CoopPlayerPresence['state'] = player.state === 'attacking'
        ? 'attack'
        : player.state === 'moving' || player.state === 'dodging'
          ? player.state
          : 'idle';
      client.publish({
        displayName: player.playerName || 'Mitspieler',
        chapter: engine.state.chapter,
        room: engine.state.floor,
        x: player.x,
        y: player.y,
        facingX: player.facing.x,
        facingY: player.facing.y,
        state: networkState,
        lastAttackTime: player.lastAttackTime,
        lastDodgeTime: player.lastDodgeTime,
      });
    }, PUBLISH_MS);

    const staleCheck = window.setInterval(() => {
      if (remotePresenceIsFresh(latestRemoteRef.current)) return;
      if (!latestRemoteRef.current) return;
      latestRemoteRef.current = null;
      onRemotePlayerRef.current(null);
    }, STALE_CHECK_MS);

    return () => {
      window.clearInterval(publish);
      window.clearInterval(staleCheck);
      client.close();
      latestRemoteRef.current = null;
      onRemotePlayerRef.current(null);
      onStatusRef.current('offline');
    };
  }, [active, context?.lobbyId, context?.runSeed, context?.role]);

  return null;
}

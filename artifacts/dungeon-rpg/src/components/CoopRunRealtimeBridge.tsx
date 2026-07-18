import { useEffect, useRef } from 'react';
import type { Enemy, Player, VisualEffect } from '../game/entities';
import type { GameEngine } from '../game/runEngine';
import type { DuoRunContext } from '../game/coopRunMode';
import {
  applyCoopEnemySnapshot,
  createCoopEnemySnapshot,
  validateCoopEnemyHitIntent,
  type CoopEnemyHitIntent,
  type CoopEnemySnapshot,
  type CoopPlayerDamageEvent,
} from '../game/coopEnemyAuthority';
import {
  CoopRealtimePresenceClient,
  remotePresenceIsFresh,
  type CoopPlayerPresence,
  type CoopRealtimeStatus,
} from '../game/coopRealtimePresence';

const PUBLISH_MS = 100;
const ENEMY_PUBLISH_MS = 100;
const STALE_CHECK_MS = 500;

type Props = {
  active: boolean;
  context: DuoRunContext | null;
  getEngine: () => GameEngine | null;
  onRemotePlayer: (presence: CoopPlayerPresence | null) => void;
  onStatus: (status: CoopRealtimeStatus) => void;
};

type EngineInternals = {
  updateEnemies: (dt: number, time: number) => void;
  updateRoomFlow: (time: number) => void;
  damageEnemy: (
    enemy: Enemy,
    damage: number,
    time: number,
    fromX: number,
    fromY: number,
    element: VisualEffect['element'],
    scale?: number,
  ) => void;
  applyElementStatus: (enemy: Enemy, element: VisualEffect['element'], time: number) => void;
};

function asInternals(engine: GameEngine): EngineInternals {
  return engine as unknown as EngineInternals;
}

function minimumEnemyDistance(enemies: Enemy[], x: number, y: number): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.isDead) continue;
    const distance = Math.hypot(enemy.x + enemy.width / 2 - x, enemy.y + enemy.height / 2 - y);
    minimum = Math.min(minimum, distance);
  }
  return minimum;
}

function remotePlayerProxy(local: Player, remote: CoopPlayerPresence, time: number): Player {
  const state: Player['state'] = remote.state === 'attack'
    ? 'attacking'
    : remote.state === 'dodging'
      ? 'dodging'
      : remote.state;
  return {
    ...local,
    id: `coop-remote-${remote.userId}`,
    playerName: remote.displayName,
    x: remote.x,
    y: remote.y,
    hp: Math.max(1, remote.hp),
    maxHp: Math.max(1, remote.maxHp),
    defense: remote.defense,
    state,
    facing: { x: remote.facingX, y: remote.facingY },
    invincibleUntil: remote.state === 'dodging' ? time + 140 : 0,
    lastAttackTime: remote.lastAttackTime,
    lastDodgeTime: remote.lastDodgeTime,
  };
}

function installGuestEnemyAuthority(engine: GameEngine, client: CoopRealtimePresenceClient) {
  const internals = asInternals(engine);
  const originalUpdateEnemies = internals.updateEnemies;
  const originalUpdateRoomFlow = internals.updateRoomFlow;
  const originalDamageEnemy = internals.damageEnemy;
  const originalApplyElementStatus = internals.applyElementStatus;

  internals.updateEnemies = () => {};
  internals.updateRoomFlow = () => {};
  internals.damageEnemy = (enemy, damage, time, fromX, fromY, element, scale = 1) => {
    const hp = enemy.hp;
    const isDead = enemy.isDead;
    const state = enemy.state;
    originalDamageEnemy.call(engine, enemy, damage, time, fromX, fromY, element, scale);
    enemy.hp = hp;
    enemy.isDead = isDead;
    enemy.state = state;
    const player = engine.state.player;
    client.publishEnemyHitIntent({
      chapter: engine.state.chapter,
      room: engine.state.floor,
      targetId: enemy.id,
      damage,
      element: element ?? 'normal',
      playerX: player.x + 16,
      playerY: player.y + 16,
    });
  };
  internals.applyElementStatus = () => {};

  return () => {
    internals.updateEnemies = originalUpdateEnemies;
    internals.updateRoomFlow = originalUpdateRoomFlow;
    internals.damageEnemy = originalDamageEnemy;
    internals.applyElementStatus = originalApplyElementStatus;
  };
}

function installHostRemoteTargeting(
  engine: GameEngine,
  client: CoopRealtimePresenceClient,
  remoteRef: { current: CoopPlayerPresence | null },
) {
  const internals = asInternals(engine);
  const originalUpdateEnemies = internals.updateEnemies;

  internals.updateEnemies = (dt, time) => {
    const remote = remoteRef.current;
    const local = engine.state.player;
    const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
    const remoteUsable = remotePresenceIsFresh(remote)
      && remote?.chapter === engine.state.chapter
      && remote.room === engine.state.floor
      && remote.hp > 0
      && living.length > 0;
    if (!remoteUsable || !remote) {
      originalUpdateEnemies.call(engine, dt, time);
      return;
    }

    const localDistance = minimumEnemyDistance(living, local.x + 16, local.y + 16);
    const remoteDistance = minimumEnemyDistance(living, remote.x + 16, remote.y + 16);
    if (remoteDistance + 36 >= localDistance) {
      originalUpdateEnemies.call(engine, dt, time);
      return;
    }

    const proxy = remotePlayerProxy(local, remote, time);
    const hpBefore = proxy.hp;
    engine.state.player = proxy;
    try {
      originalUpdateEnemies.call(engine, dt, time);
    } finally {
      engine.state.player = local;
    }
    const damage = Math.max(0, Math.round(hpBefore - proxy.hp));
    if (damage > 0) {
      client.publishPlayerDamage({
        targetUserId: remote.userId,
        chapter: engine.state.chapter,
        room: engine.state.floor,
        damage,
      });
    }
  };

  return () => {
    internals.updateEnemies = originalUpdateEnemies;
  };
}

function applyGuestDamage(engine: GameEngine, event: CoopPlayerDamageEvent) {
  if (engine.state.status !== 'playing' || event.chapter !== engine.state.chapter || event.room !== engine.state.floor) return;
  const player = engine.state.player;
  player.hp = Math.max(0, player.hp - event.damage);
  player.lastHitTime = performance.now();
  engine.state.damageNumbers.push({
    id: `coop-hit-${event.sequence}-${event.sentAt}`,
    x: player.x + 16,
    y: player.y - 8,
    value: `-${event.damage}`,
    color: '#e34b43',
    lifeTime: 0,
    maxLifeTime: 800,
    scale: 1.15,
  });
  engine.onStateChange({ ...engine.state });
}

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
        onEnemySnapshot: (snapshot: CoopEnemySnapshot) => {
          const engine = getEngineRef.current();
          if (!engine || context.role !== 'guest') return;
          applyCoopEnemySnapshot(engine.state, snapshot);
        },
        onEnemyHitIntent: (intent: CoopEnemyHitIntent) => {
          const engine = getEngineRef.current();
          if (!engine || context.role !== 'host' || engine.state.status !== 'playing') return;
          const accepted = validateCoopEnemyHitIntent(intent, engine.state, latestRemoteRef.current);
          if (!accepted) return;
          const internals = asInternals(engine);
          const remote = latestRemoteRef.current;
          const time = performance.now();
          internals.damageEnemy.call(
            engine,
            accepted.enemy,
            accepted.damage,
            time,
            (remote?.x ?? accepted.enemy.x) + 16,
            (remote?.y ?? accepted.enemy.y) + 16,
            accepted.element,
            1,
          );
          internals.applyElementStatus.call(engine, accepted.enemy, accepted.element, time);
        },
        onPlayerDamage: event => {
          const engine = getEngineRef.current();
          if (!engine || context.role !== 'guest') return;
          applyGuestDamage(engine, event);
        },
      });
    } catch (error) {
      console.error('Duo realtime bridge could not start', error);
      onStatusRef.current('offline');
      return;
    }

    const engine = getEngineRef.current();
    const restoreAuthority = engine
      ? context.role === 'guest'
        ? installGuestEnemyAuthority(engine, client)
        : installHostRemoteTargeting(engine, client, latestRemoteRef)
      : () => {};

    client.connect();
    const publish = window.setInterval(() => {
      const liveEngine = getEngineRef.current();
      if (!liveEngine || liveEngine.state.status === 'gameover') return;
      const player = liveEngine.state.player;
      const networkState: CoopPlayerPresence['state'] = player.state === 'attacking'
        ? 'attack'
        : player.state === 'moving' || player.state === 'dodging'
          ? player.state
          : 'idle';
      client.publish({
        displayName: player.playerName || 'Mitspieler',
        chapter: liveEngine.state.chapter,
        room: liveEngine.state.floor,
        x: player.x,
        y: player.y,
        facingX: player.facing.x,
        facingY: player.facing.y,
        state: networkState,
        hp: player.hp,
        maxHp: player.maxHp,
        defense: player.defense,
        lastAttackTime: player.lastAttackTime,
        lastDodgeTime: player.lastDodgeTime,
      });
    }, PUBLISH_MS);

    const publishEnemies = window.setInterval(() => {
      const liveEngine = getEngineRef.current();
      if (!liveEngine || context.role !== 'host' || liveEngine.state.status === 'gameover') return;
      const snapshot = createCoopEnemySnapshot(context, client.localUserId, liveEngine.state, 0);
      client.publishEnemySnapshot({
        chapter: snapshot.chapter,
        room: snapshot.room,
        roomClearReady: snapshot.roomClearReady,
        enemies: snapshot.enemies,
      });
    }, ENEMY_PUBLISH_MS);

    const staleCheck = window.setInterval(() => {
      if (remotePresenceIsFresh(latestRemoteRef.current)) return;
      if (!latestRemoteRef.current) return;
      latestRemoteRef.current = null;
      onRemotePlayerRef.current(null);
    }, STALE_CHECK_MS);

    return () => {
      window.clearInterval(publish);
      window.clearInterval(publishEnemies);
      window.clearInterval(staleCheck);
      restoreAuthority();
      client.close();
      latestRemoteRef.current = null;
      onRemotePlayerRef.current(null);
      onStatusRef.current('offline');
    };
  }, [active, context?.lobbyId, context?.runSeed, context?.role]);

  return null;
}

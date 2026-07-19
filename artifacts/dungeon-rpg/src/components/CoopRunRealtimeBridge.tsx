import { useEffect, useRef, useState } from 'react';
import type { Enemy, Player, VisualEffect } from '../game/entities';
import { TILE_SIZE, TileType } from '../game/dungeon';
import type { GameEngine, RunGameState } from '../game/runEngine';
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
  COOP_DOWNED_DURATION_MS,
  COOP_MAX_REVIVES_PER_ROOM,
  COOP_REVIVE_HOLD_MS,
  COOP_REVIVE_INVULNERABLE_MS,
  canCoopRevive,
  coopDownedUntil,
  coopNextRoom,
  coopReviveHp,
  coopRoomRespawnHp,
  coopTeamIsDefeated,
  type CoopLifeState,
  type CoopReviveParticipant,
} from '../game/coopLifeCycle';
import {
  CoopRealtimePresenceClient,
  remotePresenceIsFresh,
  type CoopPlayerPresence,
  type CoopRealtimeStatus,
} from '../game/coopRealtimePresence';
import { COOP_RUN_RESTART_EVENT, restartCoopRunAttempt } from '../game/coopRunPersistenceOnline';

const PUBLISH_MS = 100;
const ENEMY_PUBLISH_MS = 100;
const STALE_CHECK_MS = 500;
const LIFE_TICK_MS = 100;

type Props = {
  active: boolean;
  context: DuoRunContext | null;
  getEngine: () => GameEngine | null;
  onRemotePlayer: (presence: CoopPlayerPresence | null) => void;
  onStatus: (status: CoopRealtimeStatus) => void;
};

type EngineInternals = {
  updatePlayer: (dt: number, time: number) => void;
  updateEnemies: (dt: number, time: number) => void;
  updateRoomFlow: (time: number) => void;
  nextRoom: () => void;
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

function clearEngineInput(engine: GameEngine) {
  engine.input.joyX = 0;
  engine.input.joyY = 0;
  engine.input.attack = false;
  engine.input.skill = false;
  engine.input.dodge = false;
  engine.input.interact = false;
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

function localParticipant(engine: GameEngine, userId: string, lifeState: CoopLifeState, revivesUsed: number): CoopReviveParticipant {
  return {
    userId,
    chapter: engine.state.chapter,
    room: engine.state.floor,
    x: engine.state.player.x + 16,
    y: engine.state.player.y + 16,
    lifeState,
    revivesUsed,
  };
}

function remoteParticipant(remote: CoopPlayerPresence): CoopReviveParticipant {
  return {
    userId: remote.userId,
    chapter: remote.chapter,
    room: remote.room,
    x: remote.x + 16,
    y: remote.y + 16,
    lifeState: remote.lifeState,
    revivesUsed: remote.revivesUsed,
  };
}

function playerAtExit(state: RunGameState, x = state.player.x, y = state.player.y): boolean {
  const tileX = Math.floor((x + 16) / TILE_SIZE);
  const tileY = Math.floor((y + 16) / TILE_SIZE);
  return state.map.tiles[tileY]?.[tileX] === TileType.STAIRS_DOWN;
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
  localLifeRef: { current: CoopLifeState },
) {
  const internals = asInternals(engine);
  const originalUpdateEnemies = internals.updateEnemies;

  internals.updateEnemies = (dt, time) => {
    const remote = remoteRef.current;
    const local = engine.state.player;
    const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
    const remoteUsable = Boolean(
      remote
      && remotePresenceIsFresh(remote)
      && remote.chapter === engine.state.chapter
      && remote.room === engine.state.floor
      && remote.lifeState === 'alive'
      && remote.hp > 0
      && living.length > 0,
    );
    if (!remoteUsable || !remote) {
      originalUpdateEnemies.call(engine, dt, time);
      return;
    }

    const localDistance = minimumEnemyDistance(living, local.x + 16, local.y + 16);
    const remoteDistance = minimumEnemyDistance(living, remote.x + 16, remote.y + 16);
    const targetRemote = localLifeRef.current !== 'alive' || remoteDistance + 36 < localDistance;
    if (!targetRemote) {
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

function installDuoLifeCycle(
  engine: GameEngine,
  localLifeRef: { current: CoopLifeState },
  teamGameOverRef: { current: boolean },
  onDowned: () => void,
) {
  const internals = asInternals(engine);
  const originalUpdatePlayer = internals.updatePlayer;
  const originalUpdate = engine.update;
  const originalOnStateChange = engine.onStateChange;

  internals.updatePlayer = (dt, time) => {
    if (localLifeRef.current !== 'alive' || teamGameOverRef.current) {
      clearEngineInput(engine);
      engine.state.player.state = 'dead';
      return;
    }
    originalUpdatePlayer.call(engine, dt, time);
  };

  engine.onStateChange = state => {
    if (state.status === 'gameover' || localLifeRef.current !== 'alive' || teamGameOverRef.current) {
      if (state.status === 'gameover' && localLifeRef.current === 'alive' && !teamGameOverRef.current) onDowned();
      const visibleState: RunGameState = {
        ...state,
        status: 'playing',
        player: { ...state.player, hp: 0, state: 'dead' },
      };
      originalOnStateChange(visibleState);
      return;
    }
    originalOnStateChange(state);
  };

  engine.update = timestamp => {
    if (localLifeRef.current !== 'alive' || teamGameOverRef.current) {
      const player = engine.state.player;
      player.hp = 1;
      player.invincibleUntil = Number.POSITIVE_INFINITY;
      originalUpdate.call(engine, timestamp);
      player.hp = 0;
      player.state = 'dead';
      engine.state.status = 'playing';
      return;
    }
    originalUpdate.call(engine, timestamp);
    if (engine.state.status === 'gameover') {
      engine.state.status = 'playing';
      engine.state.player.hp = 0;
      engine.state.player.state = 'dead';
      onDowned();
      originalOnStateChange({ ...engine.state, player: { ...engine.state.player } });
    }
  };

  return () => {
    internals.updatePlayer = originalUpdatePlayer;
    engine.update = originalUpdate;
    engine.onStateChange = originalOnStateChange;
  };
}

function applyGuestDamage(
  engine: GameEngine,
  event: CoopPlayerDamageEvent,
  localLifeRef: { current: CoopLifeState },
  teamGameOverRef: { current: boolean },
) {
  if (localLifeRef.current !== 'alive' || teamGameOverRef.current) return;
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
  const clientRef = useRef<CoopRealtimePresenceClient | null>(null);
  const localLifeRef = useRef<CoopLifeState>('alive');
  const revivesUsedRef = useRef(0);
  const downedUntilRef = useRef(0);
  const teamGameOverRef = useRef(false);
  const roomKeyRef = useRef('');
  const roomAdvanceRequestRef = useRef('');
  const reviveIntervalRef = useRef<number | null>(null);
  const [remotePresence, setRemotePresence] = useState<CoopPlayerPresence | null>(null);
  const [localLifeState, setLocalLifeState] = useState<CoopLifeState>('alive');
  const [downedRemainingMs, setDownedRemainingMs] = useState(0);
  const [teamGameOver, setTeamGameOver] = useState(false);
  const [reviveProgress, setReviveProgress] = useState(0);
  const [restartBusy, setRestartBusy] = useState(false);
  getEngineRef.current = getEngine;
  onRemotePlayerRef.current = onRemotePlayer;
  onStatusRef.current = onStatus;

  const setLife = (state: CoopLifeState, downedUntil = 0) => {
    localLifeRef.current = state;
    downedUntilRef.current = state === 'downed' ? downedUntil : 0;
    setLocalLifeState(state);
    setDownedRemainingMs(state === 'downed' ? Math.max(0, downedUntil - Date.now()) : 0);
  };

  const setTeamDefeated = (defeated: boolean) => {
    teamGameOverRef.current = defeated;
    setTeamGameOver(defeated);
  };

  const reviveLocal = (engine: GameEngine, fromRoomTransition = false) => {
    const player = engine.state.player;
    if (fromRoomTransition) revivesUsedRef.current = 0;
    else revivesUsedRef.current = Math.min(COOP_MAX_REVIVES_PER_ROOM, revivesUsedRef.current + 1);
    player.hp = fromRoomTransition ? coopRoomRespawnHp(player.maxHp) : coopReviveHp(player.maxHp);
    player.state = 'idle';
    player.invincibleUntil = performance.now() + COOP_REVIVE_INVULNERABLE_MS;
    engine.state.status = 'playing';
    setLife('alive');
    engine.onStateChange({ ...engine.state, player: { ...player } });
  };

  const resetTeamRun = (engine: GameEngine) => {
    const name = engine.state.player.playerName || 'Waldläufer';
    engine.startNewGame(name, 'archer');
    revivesUsedRef.current = 0;
    roomKeyRef.current = `${engine.state.chapter}:${engine.state.floor}`;
    roomAdvanceRequestRef.current = '';
    setTeamDefeated(false);
    setLife('alive');
  };

  const stopReviveHold = () => {
    if (reviveIntervalRef.current !== null) window.clearInterval(reviveIntervalRef.current);
    reviveIntervalRef.current = null;
    setReviveProgress(0);
  };

  const canReviveCurrentRemote = () => {
    const engine = getEngineRef.current();
    const client = clientRef.current;
    const remote = latestRemoteRef.current;
    if (!engine || !client || !remote || teamGameOverRef.current) return false;
    return canCoopRevive(
      localParticipant(engine, client.localUserId, localLifeRef.current, revivesUsedRef.current),
      remoteParticipant(remote),
    );
  };

  const startReviveHold = () => {
    if (!canReviveCurrentRemote()) return;
    stopReviveHold();
    const startedAt = Date.now();
    reviveIntervalRef.current = window.setInterval(() => {
      if (!canReviveCurrentRemote()) {
        stopReviveHold();
        return;
      }
      const progress = Math.min(1, (Date.now() - startedAt) / COOP_REVIVE_HOLD_MS);
      setReviveProgress(progress);
      if (progress < 1) return;
      const engine = getEngineRef.current();
      const client = clientRef.current;
      const remote = latestRemoteRef.current;
      stopReviveHold();
      if (!engine || !client || !remote || !context) return;
      if (context.role === 'host') client.publishReviveConfirm(remote.userId, engine.state.chapter, engine.state.floor);
      else client.publishReviveRequest(remote.userId, engine.state.chapter, engine.state.floor);
    }, 50);
  };

  const restartTeam = async () => {
    if (!context || context.role !== 'host' || !teamGameOverRef.current || restartBusy) return;
    const engine = getEngineRef.current();
    const client = clientRef.current;
    if (!engine || !client) return;
    setRestartBusy(true);
    try {
      await restartCoopRunAttempt();
      resetTeamRun(engine);
      window.dispatchEvent(new Event(COOP_RUN_RESTART_EVENT));
      client.publishTeamRetry(engine.state.chapter, engine.state.floor);
    } catch (error) {
      console.error('Duo run attempt could not restart', error);
    } finally {
      setRestartBusy(false);
    }
  };

  useEffect(() => {
    if (!active || !context) {
      stopReviveHold();
      clientRef.current = null;
      latestRemoteRef.current = null;
      setRemotePresence(null);
      onRemotePlayerRef.current(null);
      onStatusRef.current('offline');
      revivesUsedRef.current = 0;
      roomKeyRef.current = '';
      roomAdvanceRequestRef.current = '';
      setTeamDefeated(false);
      setLife('alive');
      return;
    }

    const enterDowned = () => {
      if (localLifeRef.current !== 'alive' || teamGameOverRef.current) return;
      const engine = getEngineRef.current();
      if (!engine) return;
      clearEngineInput(engine);
      engine.state.player.hp = 0;
      engine.state.player.state = 'dead';
      if (revivesUsedRef.current >= COOP_MAX_REVIVES_PER_ROOM) setLife('fallen');
      else setLife('downed', coopDownedUntil());
    };

    const beginRoom = (engine: GameEngine) => {
      revivesUsedRef.current = 0;
      roomKeyRef.current = `${engine.state.chapter}:${engine.state.floor}`;
      roomAdvanceRequestRef.current = '';
      if (localLifeRef.current !== 'alive') reviveLocal(engine, true);
    };

    const advanceGuestForSnapshot = (engine: GameEngine, snapshot: CoopEnemySnapshot) => {
      if (snapshot.chapter === engine.state.chapter && snapshot.room === engine.state.floor) return true;
      const next = coopNextRoom(engine.state.floor, engine.state.chapter);
      if (snapshot.chapter !== next.chapter || snapshot.room !== next.room) return false;
      engine.state.enemies = [];
      engine.state.roomClearReady = true;
      engine.state.status = 'playing';
      asInternals(engine).nextRoom.call(engine);
      beginRoom(engine);
      return snapshot.chapter === engine.state.chapter && snapshot.room === engine.state.floor;
    };

    let client: CoopRealtimePresenceClient;
    try {
      client = new CoopRealtimePresenceClient({
        context,
        onRemotePresence: presence => {
          latestRemoteRef.current = presence;
          setRemotePresence(presence);
          onRemotePlayerRef.current(presence);
        },
        onPeerLeft: userId => {
          if (latestRemoteRef.current?.userId !== userId) return;
          latestRemoteRef.current = null;
          setRemotePresence(null);
          onRemotePlayerRef.current(null);
          stopReviveHold();
        },
        onStatus: status => onStatusRef.current(status),
        onEnemySnapshot: snapshot => {
          const engine = getEngineRef.current();
          if (!engine || context.role !== 'guest') return;
          if (!advanceGuestForSnapshot(engine, snapshot)) return;
          applyCoopEnemySnapshot(engine.state, snapshot);
        },
        onEnemyHitIntent: (intent: CoopEnemyHitIntent) => {
          const engine = getEngineRef.current();
          if (!engine || context.role !== 'host' || engine.state.status !== 'playing' || teamGameOverRef.current) return;
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
          applyGuestDamage(engine, event, localLifeRef, teamGameOverRef);
        },
        onReviveRequest: event => {
          const engine = getEngineRef.current();
          const remote = latestRemoteRef.current;
          if (!engine || context.role !== 'host' || event.targetUserId !== client.localUserId || !remote) return;
          const valid = canCoopRevive(
            remoteParticipant(remote),
            localParticipant(engine, client.localUserId, localLifeRef.current, revivesUsedRef.current),
          );
          if (valid) reviveLocal(engine);
        },
        onReviveConfirm: event => {
          const engine = getEngineRef.current();
          if (!engine || context.role !== 'guest' || event.targetUserId !== client.localUserId) return;
          if (event.chapter !== engine.state.chapter || event.room !== engine.state.floor || localLifeRef.current !== 'downed') return;
          reviveLocal(engine);
        },
        onTeamGameOver: event => {
          const engine = getEngineRef.current();
          if (!engine || context.role !== 'guest') return;
          if (event.chapter === engine.state.chapter && event.room === engine.state.floor) setTeamDefeated(true);
        },
        onTeamRetry: () => {
          const engine = getEngineRef.current();
          if (!engine || context.role !== 'guest') return;
          resetTeamRun(engine);
          window.dispatchEvent(new Event(COOP_RUN_RESTART_EVENT));
        },
        onRoomAdvanceRequest: event => {
          const engine = getEngineRef.current();
          const remote = latestRemoteRef.current;
          if (!engine || context.role !== 'host' || !remote || event.userId !== remote.userId) return;
          if (event.chapter !== engine.state.chapter || event.room !== engine.state.floor) return;
          if (!engine.state.roomClearReady || engine.state.enemies.length > 0 || !playerAtExit(engine.state, remote.x, remote.y)) return;
          asInternals(engine).nextRoom.call(engine);
          beginRoom(engine);
        },
      });
    } catch (error) {
      console.error('Duo realtime bridge could not start', error);
      onStatusRef.current('offline');
      return;
    }

    clientRef.current = client;
    const engine = getEngineRef.current();
    if (engine) roomKeyRef.current = `${engine.state.chapter}:${engine.state.floor}`;
    const restoreAuthority = engine
      ? context.role === 'guest'
        ? installGuestEnemyAuthority(engine, client)
        : installHostRemoteTargeting(engine, client, latestRemoteRef, localLifeRef)
      : () => {};
    const restoreLifeCycle = engine
      ? installDuoLifeCycle(engine, localLifeRef, teamGameOverRef, enterDowned)
      : () => {};

    client.connect();
    const publish = window.setInterval(() => {
      const liveEngine = getEngineRef.current();
      if (!liveEngine) return;
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
        lifeState: localLifeRef.current,
        revivesUsed: revivesUsedRef.current,
        downedUntil: downedUntilRef.current,
        hp: localLifeRef.current === 'alive' ? player.hp : 0,
        maxHp: player.maxHp,
        defense: player.defense,
        lastAttackTime: player.lastAttackTime,
        lastDodgeTime: player.lastDodgeTime,
      });
    }, PUBLISH_MS);

    const publishEnemies = window.setInterval(() => {
      const liveEngine = getEngineRef.current();
      if (!liveEngine || context.role !== 'host' || teamGameOverRef.current) return;
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
      setRemotePresence(null);
      onRemotePlayerRef.current(null);
      stopReviveHold();
    }, STALE_CHECK_MS);

    const lifeTick = window.setInterval(() => {
      const liveEngine = getEngineRef.current();
      if (!liveEngine) return;
      if (localLifeRef.current === 'downed') {
        const remaining = Math.max(0, downedUntilRef.current - Date.now());
        setDownedRemainingMs(remaining);
        if (remaining <= 0) setLife('fallen');
      }

      const roomKey = `${liveEngine.state.chapter}:${liveEngine.state.floor}`;
      if (roomKeyRef.current && roomKeyRef.current !== roomKey) beginRoom(liveEngine);
      else if (!roomKeyRef.current) roomKeyRef.current = roomKey;

      const remote = latestRemoteRef.current;
      if (context.role === 'host' && remotePresenceIsFresh(remote) && coopTeamIsDefeated(localLifeRef.current, remote?.lifeState ?? null)) {
        if (!teamGameOverRef.current) {
          setTeamDefeated(true);
          client.publishTeamGameOver(liveEngine.state.chapter, liveEngine.state.floor);
        }
      }

      if (context.role === 'guest'
        && localLifeRef.current === 'alive'
        && liveEngine.state.roomClearReady
        && liveEngine.state.enemies.length === 0
        && playerAtExit(liveEngine.state)) {
        const requestKey = `${liveEngine.state.chapter}:${liveEngine.state.floor}`;
        if (roomAdvanceRequestRef.current !== requestKey) {
          roomAdvanceRequestRef.current = requestKey;
          client.publishRoomAdvanceRequest(liveEngine.state.chapter, liveEngine.state.floor);
        }
      }
    }, LIFE_TICK_MS);

    return () => {
      window.clearInterval(publish);
      window.clearInterval(publishEnemies);
      window.clearInterval(staleCheck);
      window.clearInterval(lifeTick);
      stopReviveHold();
      restoreLifeCycle();
      restoreAuthority();
      client.close();
      clientRef.current = null;
      latestRemoteRef.current = null;
      setRemotePresence(null);
      onRemotePlayerRef.current(null);
      onStatusRef.current('offline');
    };
  }, [active, context?.lobbyId, context?.runSeed, context?.role]);

  const canReviveRemote = Boolean(remotePresence && canReviveCurrentRemote());
  const downedSeconds = Math.max(0, Math.ceil(downedRemainingMs / 1000));

  return <>
    {active && context && localLifeState !== 'alive' && !teamGameOver && <div data-testid="coop-local-life-state" data-life-state={localLifeState} className="pointer-events-none absolute left-1/2 top-[18%] z-[70] w-[min(86vw,360px)] -translate-x-1/2 rounded-2xl border border-red-200/25 bg-black/82 px-5 py-4 text-center shadow-2xl backdrop-blur-md">
      <div className="font-serif text-xl text-red-100">{localLifeState === 'downed' ? 'NIEDERGESCHLAGEN · DOWNED' : 'GEFALLEN · FALLEN'}</div>
      <div className="mt-2 text-[9px] font-black uppercase tracking-[.18em] text-red-100/65">{localLifeState === 'downed' ? `${downedSeconds}s · Mitspieler kann dich wiederbeleben` : 'Mitspieler muss den Raum beenden'}</div>
    </div>}

    {active && context && canReviveRemote && !teamGameOver && <button
      type="button"
      data-testid="coop-revive-control"
      onPointerDown={startReviveHold}
      onPointerUp={stopReviveHold}
      onPointerCancel={stopReviveHold}
      onPointerLeave={stopReviveHold}
      className="pointer-events-auto absolute bottom-[max(104px,calc(env(safe-area-inset-bottom)+92px))] left-1/2 z-[75] w-[min(78vw,300px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-cyan-100/35 bg-cyan-950/88 px-5 py-4 text-center text-[10px] font-black uppercase tracking-[.18em] text-cyan-50 shadow-[0_14px_44px_rgba(0,0,0,.48)] backdrop-blur-md"
    >
      <span className="relative z-10">WIEDERBELEBEN HALTEN · HOLD TO REVIVE</span>
      <span className="absolute inset-y-0 left-0 bg-cyan-300/22" style={{ width: `${Math.round(reviveProgress * 100)}%` }} />
    </button>}

    {active && context && teamGameOver && <div data-testid="coop-team-game-over" className="pointer-events-auto absolute inset-0 z-[90] flex items-center justify-center bg-black/78 px-5 backdrop-blur-sm">
      <div className="w-[min(88vw,420px)] rounded-3xl border border-red-200/25 bg-[#130d12]/96 p-7 text-center shadow-2xl">
        <div className="text-[9px] font-black uppercase tracking-[.28em] text-red-200/55">DUO-RUN</div>
        <div className="mt-2 font-serif text-3xl text-red-50">BEIDE GEFALLEN</div>
        <div className="mt-3 text-[10px] leading-relaxed text-red-100/62">Der gemeinsame Run ist beendet. Nur der Host kann beide Spieler zusammen neu starten.</div>
        {context.role === 'host' ? <button type="button" data-testid="coop-team-retry" disabled={restartBusy} onClick={() => void restartTeam()} className="mt-6 min-h-12 w-full rounded-xl border border-amber-200/35 bg-amber-300/16 px-4 py-3 text-[10px] font-black uppercase tracking-[.2em] text-amber-50 disabled:opacity-45">{restartBusy ? 'NEUER VERSUCH WIRD GESICHERT…' : 'GEMEINSAM NEU STARTEN'}</button> : <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[9px] font-black uppercase tracking-[.18em] text-white/55">WARTE AUF DEN HOST</div>}
      </div>
    </div>}
  </>;
}

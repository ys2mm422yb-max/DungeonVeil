import { useEffect, useRef, useState } from 'react';
import { TILE_SIZE, TileType } from '../game/dungeon';
import type { Enemy } from '../game/entities';
import type { GameEngine } from '../game/runEngine';
import type { DuoRunContext } from '../game/coopRunMode';
import type { CoopPlayerPresence, CoopRealtimeStatus } from '../game/coopRealtimePresence';
import type { AuthorityActor, AuthorityEnemyState, CanonicalEncounterState } from '../game/duoEncounterAuthorityKernel';
import { AUTHORITY_DOWNED_TO_FALLEN_MS, AUTHORITY_REVIVE_HOLD_MS } from '../game/duoEncounterAuthorityKernel';
import { useLanguage } from '../i18n/LanguageContext';
import { currentOnlineSession } from '../game/supabaseOnline';
import {
  advanceDuoAuthorityEncounter,
  readMyDuoAuthorityState,
  restartDuoAuthorityAttempt,
  submitDuoAuthorityIntent,
  type DuoAuthorityBinding,
  type DuoAuthorityIntent,
} from '../game/duoAuthorityOnline';
import { COOP_ROOM_CLEAR_EVENT, COOP_RUN_RESTART_EVENT } from '../game/coopRunPersistenceOnline';
import { CoopTeamDefeatOverlay } from './CoopRunRealtimeBridge';

const AUTHORITY_TICK_MS = 250;
const REVIVE_RANGE = 72;
const ENEMY_COLORS: Record<string, string> = {
  slime: '#43c968', goblin: '#89a94b', skeleton: '#d1ccb0', orc: '#627c38', spider: '#342d42',
  vampire: '#9e304b', demon: '#c53827', golem: '#696985', boss: '#ff493a',
};

type Props = {
  active: boolean;
  context: DuoRunContext | null;
  getEngine: () => GameEngine | null;
  onRemotePlayer: (presence: CoopPlayerPresence | null) => void;
  onStatus: (status: CoopRealtimeStatus) => void;
};

type EngineInternals = { nextRoom: () => void };

function atExit(engine: GameEngine, actor: AuthorityActor): boolean {
  const tileX = Math.floor((actor.x + actor.width / 2) / TILE_SIZE);
  const tileY = Math.floor((actor.y + actor.height / 2) / TILE_SIZE);
  return engine.state.map.tiles[tileY]?.[tileX] === TileType.STAIRS_DOWN;
}

function enemyView(enemy: AuthorityEnemyState, previous?: Enemy): Enemy {
  const dead = enemy.hp <= 0;
  return {
    id: enemy.enemyId, type: 'enemy', enemyType: enemy.enemyType, x: enemy.x, y: enemy.y,
    width: enemy.width, height: enemy.height, vx: previous ? enemy.x - previous.x : 0,
    vy: previous ? enemy.y - previous.y : 0, hp: Math.max(0, enemy.hp), maxHp: enemy.maxHp,
    attack: enemy.attack, defense: enemy.defense, speed: enemy.speed,
    color: ENEMY_COLORS[enemy.enemyType] ?? '#d1ccb0',
    state: dead ? 'dead' : enemy.attackPhase === 'telegraph' ? 'attack' : 'chase',
    isDead: dead, targetX: enemy.x, targetY: enemy.y, nextAttackTime: enemy.nextAttackAtMs,
    flashUntil: 0, spawnTime: enemy.spawnedAtMs, lastAttackTime: enemy.telegraphStartedAtMs ?? 0,
    deathTime: dead ? performance.now() : 0,
  } as Enemy;
}

function remotePresence(context: DuoRunContext, state: CanonicalEncounterState, actor: AuthorityActor): CoopPlayerPresence {
  const now = Date.now();
  return {
    version: 1, lobbyId: context.lobbyId, runSeed: context.runSeed, userId: actor.actorId,
    displayName: 'Teammate', chapter: state.chapter, room: state.room, x: actor.x, y: actor.y,
    facingX: 0, facingY: 1, state: actor.lifeState === 'alive' ? 'moving' : 'idle',
    lifeState: actor.lifeState, revivesUsed: actor.revivesUsed,
    downedUntil: actor.lifeState === 'downed' && actor.downedAtMs ? actor.downedAtMs + 30_000 : 0,
    hp: actor.hp, maxHp: actor.maxHp, defense: actor.defense,
    lastAttackTime: actor.nextBasicHitAtMs, lastDodgeTime: actor.nextDodgeAtMs,
    sequence: state.version, sentAt: now, receivedAt: now,
  };
}

function revivePartnerInRange(state: CanonicalEncounterState, actor: AuthorityActor): AuthorityActor | null {
  const partner = state.actors.find(candidate => candidate.actorId !== actor.actorId && candidate.lifeState === 'downed');
  return partner && Math.hypot(partner.x - actor.x, partner.y - actor.y) <= REVIVE_RANGE ? partner : null;
}

function chooseIntent(engine: GameEngine, state: CanonicalEncounterState, actor: AuthorityActor): DuoAuthorityIntent {
  if (!state.startAcknowledgedByActor[actor.actorId]) return { kind: 'start-ack' };
  if (state.lifecycle !== 'running') return { kind: 'sync' };
  const partner = revivePartnerInRange(state, actor);
  if (partner && engine.input.interact) {
    return { kind: 'revive-hold', targetActorId: partner.actorId };
  }
  const magnitude = Math.hypot(engine.input.joyX, engine.input.joyY);
  if (engine.input.dodge) {
    const x = magnitude > 0.08 ? engine.input.joyX / magnitude : 0;
    const y = magnitude > 0.08 ? engine.input.joyY / magnitude : 1;
    return { kind: 'dodge', directionX: x, directionY: y };
  }
  if (magnitude > 0.08) return { kind: 'move', directionX: engine.input.joyX / magnitude, directionY: engine.input.joyY / magnitude };
  const target = state.enemies
    .filter(enemy => enemy.hp > 0)
    .sort((a, b) => Math.hypot(a.x - actor.x, a.y - actor.y) - Math.hypot(b.x - actor.x, b.y - actor.y))[0];
  if (target
      && Math.hypot(target.x + target.width / 2 - (actor.x + actor.width / 2), target.y + target.height / 2 - (actor.y + actor.height / 2)) <= actor.attackRange
      && (engine.input.attack || state.authorityNowMs >= actor.nextBasicHitAtMs)) {
    return { kind: 'basic-hit', targetEnemyId: target.enemyId };
  }
  return { kind: 'sync' };
}

function agePresentation(engine: GameEngine, timestamp: number): void {
  const elapsed = Math.max(0, Math.min(100, timestamp - engine.lastTime));
  engine.lastTime = timestamp;
  for (const number of engine.state.damageNumbers) number.lifeTime += elapsed;
  engine.state.damageNumbers = engine.state.damageNumbers.filter(number => number.lifeTime < number.maxLifeTime);
}

function project(engine: GameEngine, state: CanonicalEncounterState, localActor: AuthorityActor): void {
  const previous = new Map(engine.state.enemies.map(enemy => [enemy.id, enemy]));
  const player = engine.state.player;
  const previousPlayerHp = player.hp;
  player.x = localActor.x;
  player.y = localActor.y;
  player.hp = localActor.lifeState === 'alive' ? localActor.hp : 0;
  player.maxHp = localActor.maxHp;
  player.attack = localActor.attack;
  player.defense = localActor.defense;
  player.speed = localActor.speed;
  player.attackRange = localActor.attackRange;
  player.skillRange = localActor.skillRange;
  player.state = localActor.lifeState === 'alive' ? (Math.hypot(engine.input.joyX, engine.input.joyY) > 0.08 ? 'moving' : 'idle') : 'dead';
  if (localActor.hp < previousPlayerHp) {
    engine.state.damageNumbers.push({
      id: `authority-player-hit-${state.version}`, x: localActor.x + localActor.width / 2, y: localActor.y - 8,
      value: `-${Math.round(previousPlayerHp - localActor.hp)}`, color: '#e34b43', lifeTime: 0, maxLifeTime: 800, scale: 1.1,
    });
  }
  for (const canonical of state.enemies) {
    const prior = previous.get(canonical.enemyId);
    if (prior && canonical.hp < prior.hp) {
      engine.state.damageNumbers.push({
        id: `authority-enemy-hit-${canonical.enemyId}-${state.version}`,
        x: canonical.x + canonical.width / 2, y: canonical.y - 8,
        value: `-${Math.round(prior.hp - canonical.hp)}`, color: '#f1dfb4', lifeTime: 0, maxLifeTime: 700, scale: 1.1,
      });
    }
  }
  engine.state.enemies = state.enemies.filter(enemy => enemy.hp > 0).map(enemy => enemyView(enemy, previous.get(enemy.enemyId)));
  engine.state.effects = [
    ...engine.state.effects.filter(effect => !effect.id.startsWith('authority-telegraph-')),
    ...state.enemies.filter(enemy => enemy.hp > 0 && enemy.attackPhase === 'telegraph').map(enemy => ({
      id: `authority-telegraph-${enemy.telegraphKey}`,
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height / 2,
      radius: Math.max(0, Math.min(enemy.attackRange, enemy.attackRange * (state.authorityNowMs - (enemy.telegraphStartedAtMs ?? state.authorityNowMs)) / Math.max(1, (enemy.attackImpactAtMs ?? state.authorityNowMs) - (enemy.telegraphStartedAtMs ?? state.authorityNowMs)))),
      maxRadius: enemy.attackRange,
      color: enemy.attackElement === 'fire' ? '#ff633d' : enemy.attackElement === 'arcane' ? '#8c62ff' : '#e6c987',
      lifeTime: Math.max(0, state.authorityNowMs - (enemy.telegraphStartedAtMs ?? state.authorityNowMs)),
      maxLifeTime: Math.max(1, (enemy.attackImpactAtMs ?? state.authorityNowMs) - (enemy.telegraphStartedAtMs ?? state.authorityNowMs)),
      type: 'circle' as const,
      element: enemy.attackElement,
    })),
  ];
  if (engine.state.damageNumbers.length > 32) engine.state.damageNumbers.splice(0, engine.state.damageNumbers.length - 32);
  engine.state.roomClearReady = state.completed && state.lifecycle === 'completed' && engine.state.enemies.length === 0;
  if (engine.state.status !== 'paused') engine.state.status = 'playing';
  engine.state.camera.x = player.x + player.width / 2;
  engine.state.camera.y = player.y + player.height / 2;
  engine.onStateChange({ ...engine.state, player: { ...player }, enemies: [...engine.state.enemies] });
}

export function CoopAuthorityRuntimeBridge({ active, context, getEngine, onRemotePlayer, onStatus }: Props) {
  const { language } = useLanguage();
  const getEngineRef = useRef(getEngine);
  const clearEventRef = useRef('');
  const advanceRef = useRef('');
  const bindingRef = useRef<DuoAuthorityBinding | null>(null);
  const [teamDefeated, setTeamDefeated] = useState(false);
  const [restartBusy, setRestartBusy] = useState(false);
  const [localActor, setLocalActor] = useState<AuthorityActor | null>(null);
  const [reviveTarget, setReviveTarget] = useState<AuthorityActor | null>(null);
  const [authorityNowMs, setAuthorityNowMs] = useState(0);
  const [connectionPaused, setConnectionPaused] = useState(false);
  const pausedForConnectionRef = useRef(false);
  getEngineRef.current = getEngine;

  useEffect(() => {
    if (!active || !context) {
      bindingRef.current = null;
      onRemotePlayer(null);
      onStatus('offline');
      setTeamDefeated(false);
      setLocalActor(null);
      setReviveTarget(null);
      setConnectionPaused(false);
      return;
    }
    let stopped = false;
    let timer = 0;
    let inFlight = false;
    const engine = getEngineRef.current();
    const originalUpdate = engine?.update;
    if (engine) engine.update = timestamp => agePresentation(engine, timestamp);
    onStatus('connecting');

    const schedule = (delay = AUTHORITY_TICK_MS) => {
      if (!stopped) timer = window.setTimeout(() => void tick(), delay);
    };
    const tick = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const liveEngine = getEngineRef.current();
        const userId = currentOnlineSession()?.user.id;
        if (!liveEngine || !userId) throw new Error('Aktive Duo-Sitzung fehlt.');
        let authority = await readMyDuoAuthorityState(context.lobbyId, context.runSeed);
        bindingRef.current = authority.binding;
        let state = authority.state;
        if (!state) {
          const transition = await submitDuoAuthorityIntent(authority.binding, authority.encounterId, authority.stateVersion, 1, { kind: 'start-ack' });
          state = transition.state;
        } else if (!state.completed) {
          const actor = state.actors.find(candidate => candidate.actorId === userId);
          if (!actor) throw new Error('Aktiver Duo-Akteur fehlt im kanonischen Zustand.');
          const sequence = (state.lastClientSeqByActor[userId] ?? 0) + 1;
          const intent = chooseIntent(liveEngine, state, actor);
          const transition = await submitDuoAuthorityIntent(
            authority.binding, state.encounterId, state.version, sequence, intent,
          );
          if (intent.kind === 'dodge') liveEngine.input.dodge = false;
          if (intent.kind === 'basic-hit') liveEngine.input.attack = false;
          state = transition.state;
        }
        const actor = state.actors.find(candidate => candidate.actorId === userId);
        if (!actor) throw new Error('Duo-Akteur ist nicht an den Authority-Zustand gebunden.');
        if (liveEngine.state.chapter !== state.chapter || liveEngine.state.floor !== state.room) {
          const nextRoom = liveEngine.state.floor === 50 ? 1 : liveEngine.state.floor + 1;
          const nextChapter = liveEngine.state.floor === 50 ? liveEngine.state.chapter + 1 : liveEngine.state.chapter;
          if (state.room !== nextRoom || state.chapter !== nextChapter) throw new Error('Kanonischer Raumfortschritt ist nicht zusammenhängend.');
          liveEngine.state.enemies = [];
          liveEngine.state.roomClearReady = true;
          (liveEngine as unknown as EngineInternals).nextRoom.call(liveEngine);
        }
        project(liveEngine, state, actor);
        const partner = state.actors.find(candidate => candidate.actorId !== userId);
        setLocalActor(actor);
        setReviveTarget(revivePartnerInRange(state, actor));
        setAuthorityNowMs(state.authorityNowMs);
        onRemotePlayer(partner ? remotePresence(context, state, partner) : null);
        setTeamDefeated(state.lifecycle === 'team-defeated');
        setConnectionPaused(false);
        if (pausedForConnectionRef.current && liveEngine.state.status === 'paused') {
          pausedForConnectionRef.current = false;
          liveEngine.state.status = 'playing';
        }
        onStatus('connected');
        const clearKey = `${state.encounterId}:${state.version}`;
        if (state.completed && clearEventRef.current !== clearKey) {
          clearEventRef.current = clearKey;
          window.dispatchEvent(new Event(COOP_ROOM_CLEAR_EVENT));
        }
        if (state.completed && atExit(liveEngine, actor) && advanceRef.current !== state.encounterId) {
          advanceRef.current = state.encounterId;
          await advanceDuoAuthorityEncounter(authority.binding, state.encounterId);
        }
        schedule();
      } catch (error) {
        if (!stopped) {
          onStatus('reconnecting');
          const liveEngine = getEngineRef.current();
          if (liveEngine && liveEngine.state.status === 'playing') {
            liveEngine.state.status = 'paused';
            pausedForConnectionRef.current = true;
          }
          if (liveEngine) liveEngine.input.interact = false;
          setConnectionPaused(true);
          setReviveTarget(null);
          console.error('Duo authority reconciliation failed', error);
          schedule(500);
        }
      } finally {
        inFlight = false;
      }
    };
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      if (engine && originalUpdate) engine.update = originalUpdate;
      if (engine) engine.input.interact = false;
      onRemotePlayer(null);
      onStatus('offline');
    };
  }, [active, context?.lobbyId, context?.runSeed]);

  const restart = async () => {
    const binding = bindingRef.current;
    if (!binding || !context || context.role !== 'host' || restartBusy) return;
    setRestartBusy(true);
    try {
      await restartDuoAuthorityAttempt(binding);
      bindingRef.current = null;
      clearEventRef.current = '';
      advanceRef.current = '';
      setTeamDefeated(false);
      window.dispatchEvent(new Event(COOP_RUN_RESTART_EVENT));
    } finally {
      setRestartBusy(false);
    }
  };

  const setReviveHeld = (held: boolean) => {
    const engine = getEngineRef.current();
    if (engine) engine.input.interact = held;
  };

  const downedRemaining = localActor?.lifeState === 'downed' && localActor.downedAtMs !== null
    ? Math.max(0, AUTHORITY_DOWNED_TO_FALLEN_MS - (authorityNowMs - localActor.downedAtMs))
    : 0;
  const reviveProgress = reviveTarget && localActor?.reviveTargetActorId === reviveTarget.actorId && localActor.reviveStartedAtMs !== null
    ? Math.max(0, Math.min(1, (authorityNowMs - localActor.reviveStartedAtMs) / AUTHORITY_REVIVE_HOLD_MS))
    : 0;
  const copy = language === 'de' ? {
    paused: 'DUO-RUN PAUSIERT', disconnected: 'MITSTREITER GETRENNT', reconnecting: 'Wiederverbindung läuft. Kampf und Fortschritt bleiben eingefroren.',
    downed: 'NIEDERGESCHLAGEN', fallen: 'GEFALLEN', revive: 'WIEDERBELEBEN HALTEN',
  } : {
    paused: 'DUO RUN PAUSED', disconnected: 'TEAMMATE DISCONNECTED', reconnecting: 'Reconnecting. Combat and progress remain frozen.',
    downed: 'DOWNED', fallen: 'FALLEN', revive: 'HOLD TO REVIVE',
  };

  if (!active || !context) return null;
  return <>
    {connectionPaused && !teamDefeated && <div data-testid="coop-teammate-disconnected" className="pointer-events-auto absolute inset-0 z-[88] flex items-center justify-center bg-black/72 px-5 backdrop-blur-sm">
      <div className="w-[min(88vw,420px)] rounded-3xl border border-violet-200/25 bg-[#100d18]/96 p-7 text-center shadow-2xl"><div className="text-[9px] font-black tracking-[.28em] text-violet-200/55">{copy.paused}</div><div className="mt-2 font-serif text-2xl text-violet-50">{copy.disconnected}</div><div className="mt-3 text-[10px] text-violet-100/62">{copy.reconnecting}</div></div>
    </div>}
    {localActor && localActor.lifeState !== 'alive' && !teamDefeated && <div data-testid="coop-local-life-state" data-life-state={localActor.lifeState} className="pointer-events-none absolute left-1/2 top-[18%] z-[70] w-[min(86vw,360px)] -translate-x-1/2 rounded-2xl border border-red-200/25 bg-black/82 px-5 py-4 text-center shadow-2xl">
      <div className="font-serif text-xl text-red-100">{localActor.lifeState === 'downed' ? copy.downed : copy.fallen}</div>{localActor.lifeState === 'downed' && <div className="mt-2 text-[9px] font-black text-red-100/65">{Math.ceil(downedRemaining / 1000)}s</div>}
    </div>}
    {reviveTarget && !connectionPaused && !teamDefeated && <button type="button" data-testid="coop-revive-control" onPointerDown={() => setReviveHeld(true)} onPointerUp={() => setReviveHeld(false)} onPointerCancel={() => setReviveHeld(false)} onPointerLeave={() => setReviveHeld(false)} className="pointer-events-auto absolute bottom-[max(104px,calc(env(safe-area-inset-bottom)+92px))] left-1/2 z-[75] w-[min(78vw,300px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-cyan-100/35 bg-cyan-950/88 px-5 py-4 text-center text-[10px] font-black tracking-[.18em] text-cyan-50 shadow-2xl">
      <span className="relative z-10">{copy.revive}</span><span className="absolute inset-y-0 left-0 bg-cyan-300/22" style={{ width: `${Math.round(reviveProgress * 100)}%` }} />
    </button>}
    {teamDefeated && <CoopTeamDefeatOverlay role={context.role} restartBusy={restartBusy} onRestart={() => void restart()} />}
  </>;
}

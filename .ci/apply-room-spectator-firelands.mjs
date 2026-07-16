import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};
const patch = (file, before, after) => {
  const source = read(file);
  if (!source.includes(before)) throw new Error(`Patch anchor missing in ${file}: ${before.slice(0, 100)}`);
  write(file, source.replace(before, after));
};

write('artifacts/dungeon-rpg/src/components/GlobalLoadingLayer.tsx', `import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { preloadKayKitDungeonRoom } from './kaykitRoom3D';
import { preloadKayKitRoomTheme } from './kaykitRoomThemes3D';
import { preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { LoadingScreen } from './LoadingScreen';

type RoomTransition = { key: string; floor: number; startedAt: number };

const BOOT_LOADING_MIN_MS = 720;
const BOOT_LOADING_MAX_MS = 4_500;
const ROOM_LOADING_MIN_MS = 680;
const ROOM_LOADING_MAX_MS = 6_500;

function currentLanguage(): 'de' | 'en' {
  try { return localStorage.getItem('dungeon-veil-language') === 'de' ? 'de' : 'en'; }
  catch { return 'en'; }
}

function delay(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));
}

export function GlobalLoadingLayer() {
  const [booting, setBooting] = useState(true);
  const [roomTransition, setRoomTransition] = useState<RoomTransition | null>(null);
  const activeRef = useRef<RoomTransition | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const language = currentLanguage();

  useEffect(() => {
    let active = true;
    const fontsReady = typeof document !== 'undefined' && document.fonts?.ready
      ? document.fonts.ready.catch(() => undefined)
      : Promise.resolve();
    const coreAssets = Promise.allSettled([
      preloadKayKitOuterWorld(),
      preloadKayKitDungeonRoom(1),
      preloadKayKitRoomTheme(1),
    ]);
    const warmup = Promise.all([delay(BOOT_LOADING_MIN_MS), fontsReady, coreAssets]).then(() => undefined);
    void Promise.race([warmup, delay(BOOT_LOADING_MAX_MS)]).finally(() => {
      if (active) setBooting(false);
    });
    void warmup.catch(() => undefined);
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    const clearTimer = (ref: React.MutableRefObject<number | null>) => {
      if (ref.current !== null) window.clearTimeout(ref.current);
      ref.current = null;
    };
    const finish = (key?: string) => {
      const current = activeRef.current;
      if (!current || (key && key !== current.key)) return;
      clearTimer(hideTimerRef);
      const remaining = Math.max(0, ROOM_LOADING_MIN_MS - (performance.now() - current.startedAt));
      hideTimerRef.current = window.setTimeout(() => {
        if (activeRef.current?.key !== current.key) return;
        activeRef.current = null;
        setRoomTransition(null);
        delete document.documentElement.dataset.dungeonVeilRoomLoading;
        hideTimerRef.current = null;
        clearTimer(safetyTimerRef);
      }, remaining);
    };
    const handlePreparing = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; floor?: number }>).detail ?? {};
      const key = detail.key ?? `room-${detail.floor ?? 1}`;
      if (activeRef.current?.key === key) return;
      clearTimer(hideTimerRef);
      clearTimer(safetyTimerRef);
      const next = { key, floor: detail.floor ?? 1, startedAt: performance.now() };
      activeRef.current = next;
      setRoomTransition(next);
      document.documentElement.dataset.dungeonVeilRoomLoading = '1';
      safetyTimerRef.current = window.setTimeout(() => finish(key), ROOM_LOADING_MAX_MS);
    };
    const handleReady = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail ?? {};
      finish(detail.key);
    };

    window.addEventListener('dungeon-veil-room-preparing', handlePreparing);
    window.addEventListener('dungeon-veil-room-ready', handleReady);
    return () => {
      clearTimer(hideTimerRef);
      clearTimer(safetyTimerRef);
      activeRef.current = null;
      delete document.documentElement.dataset.dungeonVeilRoomLoading;
      window.removeEventListener('dungeon-veil-room-preparing', handlePreparing);
      window.removeEventListener('dungeon-veil-room-ready', handleReady);
    };
  }, []);

  if (booting) return <LoadingScreen variant="boot" language={language} testId="app-boot-loading-screen" />;
  if (roomTransition) {
    const boss = [10, 20, 30, 40, 50].includes(roomTransition.floor);
    return <LoadingScreen
      variant="run"
      language={language}
      testId="run-room-loading-screen"
      title={language === 'de' ? `RAUM ${roomTransition.floor} WIRD VORBEREITET` : `PREPARING ROOM ${roomTransition.floor}`}
      subtitle={language === 'de'
        ? `${boss ? 'Bossraum, ' : ''}Geometrie, Gegner, Kollisionen und Effekte werden vollständig geladen.`
        : `${boss ? 'Boss room: ' : ''}Loading geometry, enemies, collisions and effects completely.`}
    />;
  }
  return null;
}
`);

write('artifacts/dungeon-rpg/src/game/socialSpectatorOnline.ts', `import type { RunGameState } from './runEngine';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

const SPECTATING_ALLOWED_KEY = 'dungeon-veil-spectating-allowed-v1';
export const SPECTATOR_REFRESH_MS = 500;
export const SPECTATOR_STALE_MS = 12_000;

export type OnlineActivityState = 'menu' | 'run' | 'paused';

export type SpectatorSnapshot = {
  version: 1;
  emittedAt: number;
  state: RunGameState;
};

export type FriendSpectatorFeed = {
  activity_state: OnlineActivityState;
  chapter: number;
  room: number;
  updated_at: string;
  snapshot: SpectatorSnapshot | null;
};

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!currentOnlineSession()) throw new Error('Nicht angemeldet');
  return authenticatedSupabaseRest<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
}

export function loadSpectatingAllowed(): boolean {
  try { return localStorage.getItem(SPECTATING_ALLOWED_KEY) !== '0'; }
  catch { return true; }
}

export async function setSpectatingAllowed(allowed: boolean): Promise<boolean> {
  try { localStorage.setItem(SPECTATING_ALLOWED_KEY, allowed ? '1' : '0'); } catch {}
  if (!currentOnlineSession()) return allowed;
  return rpc<boolean>('set_spectating_allowed', { p_allowed: allowed });
}

export async function refreshSpectatingAllowed(): Promise<boolean> {
  if (!currentOnlineSession()) return loadSpectatingAllowed();
  const allowed = await rpc<boolean>('get_my_spectating_preference');
  try { localStorage.setItem(SPECTATING_ALLOWED_KEY, allowed ? '1' : '0'); } catch {}
  return allowed;
}

function cloneForNetwork<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function buildSpectatorSnapshot(state: RunGameState): SpectatorSnapshot {
  const safeState: RunGameState = {
    ...state,
    player: { ...state.player, playerName: '' },
    enemies: state.enemies.map(enemy => ({ ...enemy })),
    items: state.items.slice(-30).map(item => ({ ...item })),
    chests: state.chests.slice(-12).map(chest => ({ ...chest })),
    damageNumbers: state.damageNumbers.slice(-24).map(number => ({ ...number })),
    particles: state.particles.slice(-80).map(particle => ({ ...particle })),
    effects: state.effects.slice(-48).map(effect => ({ ...effect })),
    upgradeChoices: [],
    runSkills: {},
  };
  return { version: 1, emittedAt: Date.now(), state: cloneForNetwork(safeState) };
}

export async function publishSpectatorState(state: RunGameState): Promise<boolean> {
  if (!currentOnlineSession()) return false;
  const allowed = loadSpectatingAllowed();
  const activity: OnlineActivityState = state.status === 'paused' ? 'paused' : 'run';
  return rpc<boolean>('publish_spectator_snapshot', {
    p_activity_state: activity,
    p_chapter: state.chapter,
    p_room: state.floor,
    p_snapshot: allowed ? buildSpectatorSnapshot(state) : null,
  });
}

export async function publishMenuActivity(chapter = 1, room = 1): Promise<boolean> {
  if (!currentOnlineSession()) return false;
  return rpc<boolean>('publish_spectator_snapshot', {
    p_activity_state: 'menu',
    p_chapter: Math.max(1, chapter),
    p_room: Math.max(1, room),
    p_snapshot: null,
  });
}

export async function loadFriendSpectatorFeed(userId: string): Promise<FriendSpectatorFeed | null> {
  const rows = await rpc<FriendSpectatorFeed[]>('get_friend_spectator_snapshot', { p_user_id: userId });
  const feed = rows[0];
  if (!feed) return null;
  const snapshot = feed.snapshot?.version === 1 ? feed.snapshot : null;
  const updatedAt = new Date(feed.updated_at).getTime();
  const stale = !Number.isFinite(updatedAt) || Date.now() - updatedAt > SPECTATOR_STALE_MS;
  if ((feed.activity_state === 'run' || feed.activity_state === 'paused') && (!snapshot || stale)) {
    return { ...feed, snapshot: null };
  }
  return { ...feed, snapshot };
}
`);

write('artifacts/dungeon-rpg/src/components/SpectatorScreen.tsx', `import React, { useEffect, useRef, useState } from 'react';
import type { RunGameState } from '../game/runEngine';
import { loadFriendSpectatorFeed, SPECTATOR_REFRESH_MS, type FriendSpectatorFeed } from '../game/socialSpectatorOnline';
import { CombatStage } from './CombatStage';

const INTERPOLATION_MS = 460;
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

function interpolateState(previous: RunGameState, target: RunGameState, amount: number): RunGameState {
  if (previous.chapter !== target.chapter || previous.floor !== target.floor) return target;
  const oldEnemies = new Map(previous.enemies.map(enemy => [enemy.id, enemy]));
  return {
    ...target,
    player: {
      ...target.player,
      x: lerp(previous.player.x, target.player.x, amount),
      y: lerp(previous.player.y, target.player.y, amount),
    },
    camera: {
      x: lerp(previous.camera.x, target.camera.x, amount),
      y: lerp(previous.camera.y, target.camera.y, amount),
    },
    enemies: target.enemies.map(enemy => {
      const old = oldEnemies.get(enemy.id);
      return old ? { ...enemy, x: lerp(old.x, enemy.x, amount), y: lerp(old.y, enemy.y, amount) } : enemy;
    }),
  };
}

export function SpectatorScreen({ friendId, friendName, language, onClose }: {
  friendId: string;
  friendName: string;
  language: 'de' | 'en';
  onClose: () => void;
}) {
  const de = language === 'de';
  const hadFeedRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const displayRef = useRef<RunGameState | null>(null);
  const [feed, setFeed] = useState<FriendSpectatorFeed | null>(null);
  const [displayState, setDisplayState] = useState<RunGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.dataset.dungeonVeilSpectating = '1';
    return () => { delete document.documentElement.dataset.dungeonVeilSpectating; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const refresh = async () => {
      if (cancelled || busy) return;
      busy = true;
      try {
        const next = await loadFriendSpectatorFeed(friendId);
        if (cancelled) return;
        if (next) {
          hadFeedRef.current = true;
          setFeed(next);
          setError('');
        } else {
          setFeed(null);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!cancelled) setLoading(false);
        busy = false;
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), SPECTATOR_REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [friendId]);

  const targetState = feed?.snapshot?.state ?? null;
  useEffect(() => {
    if (!targetState) return;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    const from = displayRef.current ?? targetState;
    if (from.chapter !== targetState.chapter || from.floor !== targetState.floor) {
      displayRef.current = targetState;
      setDisplayState(targetState);
      return;
    }
    const startedAt = performance.now();
    const animate = (now: number) => {
      const amount = Math.min(1, Math.max(0, (now - startedAt) / INTERPOLATION_MS));
      const eased = 1 - Math.pow(1 - amount, 3);
      const next = interpolateState(from, targetState, eased);
      displayRef.current = next;
      setDisplayState(next);
      if (amount < 1) animationRef.current = requestAnimationFrame(animate);
      else animationRef.current = null;
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [targetState]);

  const gameState = displayState ?? targetState;
  const activity = feed?.activity_state;
  const dead = Boolean(targetState && (targetState.status === 'gameover' || targetState.player.hp <= 0));
  const paused = activity === 'paused' || targetState?.status === 'paused';
  const inMenu = activity === 'menu';
  const disconnected = !loading && activity === 'run' && !targetState;
  const unavailable = !loading && !feed && !hadFeedRef.current;
  const hp = Math.max(0, Math.round(targetState?.player.hp ?? gameState?.player.hp ?? 0));
  const maxHp = Math.max(1, Math.round(targetState?.player.maxHp ?? gameState?.player.maxHp ?? 1));
  const hpPercent = Math.max(0, Math.min(100, hp / maxHp * 100));
  const delayMs = feed?.snapshot ? Math.max(0, Date.now() - feed.snapshot.emittedAt) : 0;
  const status = dead
    ? (de ? 'SPIELER BESIEGT' : 'PLAYER DEFEATED')
    : paused
      ? (de ? 'SPIEL PAUSIERT' : 'GAME PAUSED')
      : inMenu
        ? (de ? 'SPIELER IM MENÜ' : 'PLAYER IN MENU')
        : disconnected
          ? (de ? 'VERBINDUNG UNTERBROCHEN' : 'CONNECTION INTERRUPTED')
          : unavailable
            ? (de ? 'ZUSCHAUEN NICHT VERFÜGBAR' : 'SPECTATING UNAVAILABLE')
            : '';

  return <div data-testid="spectator-screen" className="fixed inset-0 z-[220] overflow-hidden bg-black text-white">
    {gameState && <CombatStage gameState={gameState} />}
    {!gameState && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(67,41,102,.3),#050507_56%)]" />}

    <header className="pointer-events-none absolute inset-x-0 top-0 z-[240] flex items-start justify-between gap-2 bg-gradient-to-b from-black/92 via-black/58 to-transparent px-3 pb-12 pt-[max(10px,calc(env(safe-area-inset-top)+6px))]">
      <div className="min-w-0 max-w-[calc(100vw-68px)] rounded-2xl border border-violet-300/18 bg-black/72 px-3 py-2 backdrop-blur-lg">
        <div className="text-[7px] font-black uppercase tracking-[.24em] text-violet-200/55">{de ? 'LIVE ZUSCHAUEN' : 'LIVE SPECTATING'}</div>
        <div className="mt-1 truncate text-[13px] font-black text-white/90">{friendName}</div>
        <div className="mt-1 text-[7px] uppercase tracking-[.12em] text-white/42">{feed ? `${de ? 'Kapitel' : 'Chapter'} ${feed.chapter} · ${de ? 'Raum' : 'Room'} ${feed.room} · ${(delayMs / 1000).toFixed(1)} s` : (de ? 'Verbindung wird aufgebaut' : 'Connecting')}</div>
        {gameState && <div data-testid="spectator-health" className="mt-2">
          <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-[.12em]"><span className="text-white/38">{de ? 'LEBEN' : 'HEALTH'}</span><span className="text-white/72">{hp}/{maxHp}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full border border-white/10 bg-black/70"><div className="h-full rounded-full bg-red-500 transition-[width] duration-300" style={{ width: `${hpPercent}%` }} /></div>
        </div>}
      </div>
      <button type="button" aria-label={de ? 'Zuschauen beenden' : 'Stop spectating'} onClick={onClose} className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/16 bg-black/76 text-xl font-black text-white/80 backdrop-blur-lg active:scale-90">×</button>
    </header>

    {(loading || status || error) && <div className="absolute inset-x-3 bottom-[max(14px,env(safe-area-inset-bottom))] z-[240] rounded-2xl border border-white/12 bg-black/82 p-4 text-center backdrop-blur-xl">
      <div data-testid="spectator-status-message" className="text-[9px] font-black uppercase tracking-[.17em] text-violet-100">{loading ? (de ? 'LIVE-RUN WIRD GELADEN …' : 'LOADING LIVE RUN …') : status || (de ? 'VERBINDUNG WIRD WIEDERHERGESTELLT' : 'RECONNECTING')}</div>
      {error && <div className="mt-2 text-[8px] leading-relaxed text-red-200/70">{error}</div>}
      {(dead || inMenu || unavailable) && <button type="button" onClick={onClose} className="mt-3 rounded-xl border border-violet-300/20 bg-violet-500/12 px-5 py-2.5 text-[8px] font-black uppercase tracking-[.14em] text-violet-100 active:scale-[.98]">{de ? 'ZURÜCK' : 'BACK'}</button>}
    </div>}
  </div>;
}
`);

write('artifacts/dungeon-rpg/src/components/RunCameraRig.ts', `export const RUN_CAMERA = {
  fov: 50,
  height: 18.4,
  distance: 23.0,
  lookHeight: 0.66,
  followLerp: 0.11,
  minFollowX: -4.65,
  maxFollowX: 4.65,
  minFollowZ: -3.1,
  maxFollowZ: 5.65,
  clearMinFollowZ: -3.4,
  clearMaxFollowZ: 3.8,
  safeHalfX: 4.25,
  safeForwardZ: 4.4,
  safeRearZ: 5.8,
  playerCenterOffset: 0.4,
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function isTabletLandscape(aspect: number) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const coarsePointer = navigator.maxTouchPoints > 1 || window.matchMedia?.('(pointer: coarse)').matches;
  return coarsePointer && aspect >= 1.15 && width > height && Math.min(width, height) >= 650;
}

function isSpectatorViewport() {
  return typeof document !== 'undefined' && document.documentElement.dataset.dungeonVeilSpectating === '1';
}

function responsiveFrame(aspect: number) {
  if (isTabletLandscape(aspect)) return { height: 15.9, distance: 19.0, lookAhead: 2.15 };
  if (isSpectatorViewport() && aspect < 0.55) return { height: 23.8, distance: 28.6, lookAhead: 1.8 };
  if (isSpectatorViewport() && aspect < 0.72) return { height: 22.4, distance: 27.0, lookAhead: 2.0 };
  if (aspect < 0.55) return { height: 20.2, distance: 21.7, lookAhead: 2.35 };
  if (aspect < 0.68) return { height: 19.6, distance: 22.4, lookAhead: 2.55 };
  return { height: 19.0, distance: 22.8, lookAhead: 2.75 };
}

export function updateRunCamera(
  camera: any,
  cameraGoal: any,
  playerX: number,
  playerZ: number,
  roomClearReady = false,
) {
  const centeredPlayerX = playerX + RUN_CAMERA.playerCenterOffset;
  const centeredPlayerZ = playerZ + RUN_CAMERA.playerCenterOffset;
  const minZ = roomClearReady ? RUN_CAMERA.clearMinFollowZ : RUN_CAMERA.minFollowZ;
  const maxZ = roomClearReady ? RUN_CAMERA.clearMaxFollowZ : RUN_CAMERA.maxFollowZ;

  let focusX = clamp(centeredPlayerX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  let focusZ = clamp(centeredPlayerZ - 0.18, minZ, maxZ);

  const offsetX = centeredPlayerX - focusX;
  if (offsetX > RUN_CAMERA.safeHalfX) focusX += offsetX - RUN_CAMERA.safeHalfX;
  else if (offsetX < -RUN_CAMERA.safeHalfX) focusX += offsetX + RUN_CAMERA.safeHalfX;

  const offsetZ = centeredPlayerZ - focusZ;
  if (offsetZ > RUN_CAMERA.safeForwardZ) focusZ += offsetZ - RUN_CAMERA.safeForwardZ;
  else if (offsetZ < -RUN_CAMERA.safeRearZ) focusZ += offsetZ + RUN_CAMERA.safeRearZ;

  focusX = clamp(focusX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  focusZ = clamp(focusZ, minZ, maxZ);

  const frame = responsiveFrame(Number(camera.aspect) || 1);
  cameraGoal.set(focusX, frame.height, focusZ + frame.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(focusX, 0.9, focusZ - frame.lookAhead);
}
`);

write('artifacts/dungeon-rpg/src/components/firelandsTheme3D.ts', `function seeded(room: number, index: number, salt: number) {
  const value = Math.sin(room * 91.17 + index * 37.31 + salt * 17.73) * 43758.5453;
  return value - Math.floor(value);
}

export function buildFirelandsTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  root.name = `FirelandsTheme_${room}`;
  if (room < 41) return root;

  const progress = Math.max(0.1, Math.min(1, (room - 40) / 10));
  const lavaMaterial = new THREE.MeshStandardMaterial({
    color: 0xff5a18,
    emissive: 0xff2400,
    emissiveIntensity: 2.6 + progress * 2.4,
    roughness: 0.42,
    metalness: 0.08,
  });
  const hotMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb029,
    emissive: 0xff5a00,
    emissiveIntensity: 3.4 + progress * 2.2,
    roughness: 0.34,
  });
  const obsidianMaterial = new THREE.MeshStandardMaterial({ color: 0x211619, roughness: 0.94, metalness: 0.08 });
  const ashMaterial = new THREE.MeshStandardMaterial({ color: 0x49302a, roughness: 1 });

  const crackCount = 9 + Math.round(progress * 10);
  for (let index = 0; index < crackCount; index++) {
    let x = seeded(room, index, 1) * 9.4 - 4.7;
    let z = seeded(room, index, 2) * 11.4 - 5.7;
    if (Math.abs(x) < 1.05 && Math.abs(z) < 1.6) x += x < 0 ? -1.35 : 1.35;
    const length = 0.65 + seeded(room, index, 3) * 1.5;
    const width = 0.055 + seeded(room, index, 4) * 0.08;
    const crack = new THREE.Mesh(new THREE.BoxGeometry(length, 0.025, width), index % 3 === 0 ? hotMaterial : lavaMaterial);
    crack.position.set(x, 0.045, z);
    crack.rotation.y = seeded(room, index, 5) * Math.PI;
    crack.receiveShadow = false;
    root.add(crack);
  }

  const blockCount = 12 + Math.round(progress * 8);
  for (let index = 0; index < blockCount; index++) {
    const side = index % 4;
    const along = seeded(room, index, 6) * 9.5 - 4.75;
    const x = side < 2 ? along : (side === 2 ? -5.35 : 5.35);
    const z = side < 2 ? (side === 0 ? -6.15 : 6.15) : along * 1.15;
    const size = 0.32 + seeded(room, index, 7) * 0.38;
    const block = new THREE.Mesh(new THREE.BoxGeometry(size, 0.28 + size * 0.5, size), index % 5 === 0 ? ashMaterial : obsidianMaterial);
    block.position.set(x, block.geometry.parameters.height / 2, z);
    block.rotation.y = seeded(room, index, 8) * Math.PI;
    block.castShadow = true;
    block.receiveShadow = true;
    root.add(block);
  }

  if (room >= 47) {
    const outer = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.08 + progress * 0.04, 8, 72), lavaMaterial);
    outer.rotation.x = Math.PI / 2;
    outer.position.y = 0.045;
    outer.scale.z = 1.18;
    root.add(outer);
  }
  if (room === 50) {
    const bossRing = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.13, 10, 72), hotMaterial);
    bossRing.rotation.x = Math.PI / 2;
    bossRing.position.y = 0.055;
    root.add(bossRing);
  }

  const emberCount = 28 + Math.round(progress * 26);
  const positions = new Float32Array(emberCount * 3);
  for (let index = 0; index < emberCount; index++) {
    positions[index * 3] = seeded(room, index, 10) * 10.5 - 5.25;
    positions[index * 3 + 1] = 0.3 + seeded(room, index, 11) * 2.6;
    positions[index * 3 + 2] = seeded(room, index, 12) * 12.2 - 6.1;
  }
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const embers = new THREE.Points(emberGeometry, new THREE.PointsMaterial({ color: 0xff8a32, size: 0.055 + progress * 0.025, transparent: true, opacity: 0.78, depthWrite: false }));
  root.add(embers);

  const lightA = new THREE.PointLight(0xff4b16, 4.5 + progress * 3, 13, 2);
  lightA.position.set(-3.2, 1.4, -2.2);
  root.add(lightA);
  const lightB = new THREE.PointLight(0xff7a22, 3.5 + progress * 2.5, 12, 2);
  lightB.position.set(3.4, 1.1, 3.2);
  root.add(lightB);

  root.userData.ready = Promise.resolve();
  root.userData.dispose = () => root.traverse((node: any) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material: any) => material?.dispose?.());
    else node.material?.dispose?.();
  });
  return root;
}
`);

patch(
  'artifacts/dungeon-rpg/src/components/kaykitRoomThemes3D.ts',
  "import { buildRoomTwoCommandWatch } from './roomTwoCommandWatch3D';\n",
  "import { buildRoomTwoCommandWatch } from './roomTwoCommandWatch3D';\nimport { buildFirelandsTheme } from './firelandsTheme3D';\n",
);
patch(
  'artifacts/dungeon-rpg/src/components/kaykitRoomThemes3D.ts',
  "  if (room === 2) additions.push(buildRoomTwoCommandWatch(THREE));\n",
  "  if (room === 2) additions.push(buildRoomTwoCommandWatch(THREE));\n  if (room >= 41 && room <= 50) additions.push(buildFirelandsTheme(THREE, room));\n",
);

patch(
  'artifacts/dungeon-rpg/src/components/GameCanvasKayKit3D.tsx',
  "      root.add(ring);\n      root.scale.setScalar(enemy.enemyType === 'boss' ? 1.65 : enemy.isElite ? 1.16 : 1);",
  "      root.add(ring);\n      // Enemy visibility fallbacks keep the body visible, but the permanent floor\n      // rings looked like stale telegraphs and cluttered rooms 13+.\n      ring.visible = false;\n      root.scale.setScalar(enemy.enemyType === 'boss' ? 1.65 : enemy.isElite ? 1.16 : 1);",
);

patch(
  'artifacts/dungeon-rpg/src/components/GameSessionBridge.tsx',
  "import { currentOnlineSession } from '../game/supabaseOnline';",
  "import { currentOnlineSession, onlineSessionEventName } from '../game/supabaseOnline';",
);
patch(
  'artifacts/dungeon-rpg/src/components/GameSessionBridge.tsx',
  "  getEngineRef.current = getEngine;\n\n  useEffect(() => {",
  `  getEngineRef.current = getEngine;\n\n  useEffect(() => {\n    const stopInput = () => {\n      const engine = getEngineRef.current();\n      if (!engine) return;\n      engine.input = { joyX: 0, joyY: 0, attack: false, skill: false, dodge: false, interact: false };\n    };\n    window.addEventListener('dungeon-veil-room-preparing', stopInput);\n    return () => window.removeEventListener('dungeon-veil-room-preparing', stopInput);\n  }, []);\n\n  useEffect(() => {\n    let queued = false;\n    const sync = () => {\n      if (queued || !currentOnlineSession()) return;\n      queued = true;\n      queueMicrotask(() => {\n        queued = false;\n        void syncPublicProfileStats(loadPlayerProfile()).catch(() => {});\n      });\n    };\n    const sessionEvent = onlineSessionEventName();\n    window.addEventListener('dungeon-veil-meta-changed', sync);\n    window.addEventListener(sessionEvent, sync);\n    sync();\n    return () => {\n      window.removeEventListener('dungeon-veil-meta-changed', sync);\n      window.removeEventListener(sessionEvent, sync);\n    };\n  }, []);\n\n  useEffect(() => {`,
);

patch(
  'artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx',
  "import { SocialIdentityCard } from './SocialIdentityCard';",
  "import { SocialIdentityCard } from './SocialIdentityCard';\nimport { SpectatorScreen } from './SpectatorScreen';",
);
patch(
  'artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx',
  'const GUILD_CREATION_COST = 2500;',
  'const GUILD_CREATION_COST = 10000;',
);
patch(
  'artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx',
  "  const [error, setError] = useState('');\n",
  "  const [error, setError] = useState('');\n  const [spectatingMember, setSpectatingMember] = useState<{ id: string; name: string } | null>(null);\n",
);
patch(
  'artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx',
  "  return <div data-testid=\"guild-panel-shell\"",
  "  return <>\n  <div data-testid=\"guild-panel-shell\"",
);
patch(
  'artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx',
  "            />\n            <div data-testid=\"guild-member-presence\"",
  "            />\n            {online && member.user_id !== session?.user.id && <div className=\"mt-2 flex justify-end border-t border-white/7 pt-2\"><ActionButton label={de ? 'Live zuschauen' : 'Watch live'} onClick={() => setSpectatingMember({ id: member.user_id, name })} disabled={busy} primary compact /></div>}\n            <div data-testid=\"guild-member-presence\"",
);
patch(
  'artifacts/dungeon-rpg/src/components/GuildPanelMobile.tsx',
  "  </div>;\n}",
  "  </div>\n  {spectatingMember && <SpectatorScreen friendId={spectatingMember.id} friendName={spectatingMember.name} language={language} onClose={() => setSpectatingMember(null)} />}\n  </>;\n}",
);

patch(
  'artifacts/dungeon-rpg/src/game/socialProgressOnline.ts',
  "import type { PlayerProfileProgress } from './playerProfile';",
  "import type { PlayerProfileProgress } from './playerProfile';\nimport { EQUIPMENT, EQUIPMENT_SLOTS, loadMetaProgression, type EquipmentId, type EquipmentRarity, type EquipmentSlot } from './metaProgression';",
);
patch(
  'artifacts/dungeon-rpg/src/game/socialProgressOnline.ts',
  "export type SocialProfileCardData = SocialProfile & {",
  "export type PublicEquipmentItem = { slot: EquipmentSlot; id: EquipmentId; level: number; rarity: EquipmentRarity };\n\nexport type SocialProfileCardData = SocialProfile & {",
);
patch(
  'artifacts/dungeon-rpg/src/game/socialProgressOnline.ts',
  "  items_found: number;\n};",
  "  items_found: number;\n  equipped_items: PublicEquipmentItem[];\n};",
);
patch(
  'artifacts/dungeon-rpg/src/game/socialProgressOnline.ts',
  "export async function syncPublicProfileStats(profile: PlayerProfileProgress): Promise<boolean> {\n  if (!currentOnlineSession()) return false;\n  await rpc<Record<string, number>>('sync_public_profile_stats', {",
  "export async function syncPublicProfileStats(profile: PlayerProfileProgress): Promise<boolean> {\n  if (!currentOnlineSession()) return false;\n  const meta = loadMetaProgression();\n  const equippedItems = EQUIPMENT_SLOTS.map(slot => {\n    const id = meta.equipped[slot];\n    return { slot, id, level: Math.max(1, Math.min(5, meta.owned[id]?.level ?? 1)), rarity: EQUIPMENT[id].rarity };\n  });\n  await rpc<Record<string, unknown>>('sync_public_profile_stats', {",
);
patch(
  'artifacts/dungeon-rpg/src/game/socialProgressOnline.ts',
  "      itemsFound: profile.stats.itemsFound,\n",
  "      itemsFound: profile.stats.itemsFound,\n      equippedItems,\n",
);

patch(
  'artifacts/dungeon-rpg/src/components/PlayerProfileCard.tsx',
  "import type { CosmeticRarity } from '../game/playerProfile';",
  "import type { CosmeticRarity } from '../game/playerProfile';\nimport { EQUIPMENT, type EquipmentSlot } from '../game/metaProgression';",
);
patch(
  'artifacts/dungeon-rpg/src/components/PlayerProfileCard.tsx',
  "function activityLabel(profile: SocialProfileCardData, de: boolean) {",
  "function equipmentSlotLabel(slot: EquipmentSlot, de: boolean) {\n  if (slot === 'bow') return de ? 'Bogen' : 'Bow';\n  if (slot === 'quiver') return de ? 'Köcher' : 'Quiver';\n  if (slot === 'talisman') return de ? 'Talisman' : 'Talisman';\n  return de ? 'Rüstung' : 'Armor';\n}\nfunction activityLabel(profile: SocialProfileCardData, de: boolean) {",
);
patch(
  'artifacts/dungeon-rpg/src/components/PlayerProfileCard.tsx',
  "        <section data-testid=\"public-player-profile-worldboss\"",
  `        <section data-testid="public-player-profile-equipment" className="mt-3 rounded-2xl border border-cyan-300/10 bg-cyan-400/[.025] p-3">\n          <div className="text-[7px] font-black uppercase tracking-[.18em] text-cyan-100/46">{de ? 'AKTUELLE AUSRÜSTUNG' : 'CURRENT EQUIPMENT'}</div>\n          <div className="mt-2 grid grid-cols-2 gap-2">{(profile.equipped_items ?? []).map(item => {\n            const definition = EQUIPMENT[item.id];\n            if (!definition) return null;\n            return <div key={item.slot} className="min-w-0 rounded-xl border bg-black/25 p-2" style={{ borderColor: `${definition.accent}55` }}><div className="text-[6px] font-black uppercase tracking-[.12em] text-white/28">{equipmentSlotLabel(item.slot, de)}</div><div className="mt-1 truncate text-[8px] font-black" style={{ color: definition.accent }}>{de ? definition.nameDe : definition.nameEn}</div><div className="mt-1 text-[6px] uppercase text-white/42">{de ? `Stufe ${item.level}` : `Level ${item.level}`} · {item.rarity}</div></div>;\n          })}</div>\n          {!(profile.equipped_items ?? []).length && <div className="mt-2 text-[8px] text-white/32">{de ? 'Keine Ausrüstung veröffentlicht.' : 'No equipment published.'}</div>}\n        </section>\n\n        <section data-testid="public-player-profile-worldboss"`,
);

write('supabase/migrations/20260716230000_expand_spectating_and_public_equipment.sql', `create or replace function public.publish_spectator_snapshot(
  p_activity_state text,
  p_chapter integer,
  p_room integer,
  p_snapshot jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_state text := case when p_activity_state in ('menu', 'run', 'paused') then p_activity_state else 'menu' end;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_snapshot is not null and octet_length(p_snapshot::text) > 300000 then raise exception 'spectator snapshot too large'; end if;

  update public.profiles
  set activity_state = next_state,
      activity_chapter = greatest(1, least(999, coalesce(p_chapter, 1))),
      activity_room = greatest(1, least(50, coalesce(p_room, 1))),
      last_active_at = now(),
      updated_at = now()
  where id = auth.uid();

  if next_state in ('run', 'paused') and p_snapshot is not null then
    insert into public.spectator_snapshots(user_id, chapter, room, snapshot, updated_at)
    values (auth.uid(), greatest(1, coalesce(p_chapter, 1)), greatest(1, coalesce(p_room, 1)), p_snapshot, now())
    on conflict (user_id) do update
      set chapter = excluded.chapter,
          room = excluded.room,
          snapshot = excluded.snapshot,
          updated_at = now();
  else
    delete from public.spectator_snapshots where user_id = auth.uid();
  end if;

  return true;
end;
$$;

create or replace function public.get_friend_spectator_snapshot(p_user_id uuid)
returns table(
  activity_state text,
  chapter integer,
  room integer,
  updated_at timestamptz,
  snapshot jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_user_id is null or p_user_id = auth.uid() then raise exception 'other player required'; end if;
  if not exists (
    select 1 from public.friendships f
    where (f.user_id = auth.uid() and f.friend_user_id = p_user_id)
       or (f.user_id = p_user_id and f.friend_user_id = auth.uid())
  ) and not exists (
    select 1 from public.guild_members mine
    join public.guild_members theirs on theirs.guild_id = mine.guild_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  ) then raise exception 'friendship or shared guild required'; end if;

  return query
  select p.activity_state,
         p.activity_chapter,
         p.activity_room,
         coalesce(s.updated_at, p.updated_at),
         case when s.updated_at > now() - interval '12 seconds' then s.snapshot else null end
  from public.profiles p
  left join public.spectator_snapshots s on s.user_id = p.id
  where p.id = p_user_id and p.spectating_allowed
  limit 1;
end;
$$;

create or replace function public.sync_public_profile_stats(p_stats jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stats jsonb;
  next_stats jsonb;
  safe_stats jsonb := coalesce(p_stats, '{}'::jsonb);
  equipped_items jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select public_stats into current_stats from public.profiles where id = auth.uid() for update;
  current_stats := coalesce(current_stats, '{}'::jsonb);

  if jsonb_typeof(safe_stats->'equippedItems') = 'array' then
    select coalesce(jsonb_agg(value), '[]'::jsonb) into equipped_items
    from (select value from jsonb_array_elements(safe_stats->'equippedItems') limit 4) limited;
  else
    equipped_items := coalesce(current_stats->'equippedItems', '[]'::jsonb);
  end if;

  next_stats := jsonb_build_object(
    'highestChapter', greatest(coalesce((current_stats->>'highestChapter')::bigint, 1), coalesce((safe_stats->>'highestChapter')::bigint, 1)),
    'highestRoom', greatest(coalesce((current_stats->>'highestRoom')::bigint, 1), coalesce((safe_stats->>'highestRoom')::bigint, 1)),
    'roomsCleared', greatest(coalesce((current_stats->>'roomsCleared')::bigint, 0), coalesce((safe_stats->>'roomsCleared')::bigint, 0)),
    'enemiesDefeated', greatest(coalesce((current_stats->>'enemiesDefeated')::bigint, 0), coalesce((safe_stats->>'enemiesDefeated')::bigint, 0)),
    'bossesDefeated', greatest(coalesce((current_stats->>'bossesDefeated')::bigint, 0), coalesce((safe_stats->>'bossesDefeated')::bigint, 0)),
    'questsCompleted', greatest(coalesce((current_stats->>'questsCompleted')::bigint, 0), coalesce((safe_stats->>'questsCompleted')::bigint, 0)),
    'playTimeMs', greatest(coalesce((current_stats->>'playTimeMs')::bigint, 0), coalesce((safe_stats->>'playTimeMs')::bigint, 0)),
    'totalDamage', greatest(coalesce((current_stats->>'totalDamage')::bigint, 0), coalesce((safe_stats->>'totalDamage')::bigint, 0)),
    'itemsFound', greatest(coalesce((current_stats->>'itemsFound')::bigint, 0), coalesce((safe_stats->>'itemsFound')::bigint, 0)),
    'equippedItems', equipped_items
  );

  update public.profiles set public_stats = next_stats, updated_at = now() where id = auth.uid();
  return next_stats;
end;
$$;

drop function if exists public.get_social_profile_card(uuid);
create function public.get_social_profile_card(p_user_id uuid)
returns table(
  id uuid,
  display_name text,
  avatar_key text,
  friend_code text,
  current_chapter integer,
  current_rank integer,
  character_key text,
  last_active_at timestamptz,
  guild_name text,
  guild_tag text,
  joined_at timestamptz,
  account_level integer,
  lifetime_world_boss_damage bigint,
  world_boss_events integer,
  friend_count integer,
  achievement_keys text[],
  activity_state text,
  activity_chapter integer,
  activity_room integer,
  highest_chapter integer,
  highest_room integer,
  rooms_cleared bigint,
  enemies_defeated bigint,
  bosses_defeated bigint,
  quests_completed bigint,
  play_time_ms bigint,
  total_damage bigint,
  items_found bigint,
  equipped_items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_user_id is null then raise exception 'profile required'; end if;

  if p_user_id <> auth.uid()
    and not exists (
      select 1 from public.friendships f
      where (f.user_id = auth.uid() and f.friend_user_id = p_user_id)
         or (f.user_id = p_user_id and f.friend_user_id = auth.uid())
    )
    and not exists (
      select 1 from public.guild_members mine
      join public.guild_members theirs on theirs.guild_id = mine.guild_id
      where mine.user_id = auth.uid() and theirs.user_id = p_user_id
    )
  then raise exception 'profile not available'; end if;

  return query
  select p.id, p.display_name, p.avatar_key, p.friend_code, p.current_chapter, p.current_rank,
    p.character_key, p.last_active_at, g.name, g.tag, p.created_at,
    greatest(1, p.current_rank + greatest(0, p.current_chapter - 1) * 2),
    coalesce(wb.total_damage, 0)::bigint, coalesce(wb.events, 0)::integer, coalesce(fr.total, 0)::integer,
    array_remove(array[
      case when greatest(p.current_chapter, coalesce((p.public_stats->>'highestChapter')::integer, 1)) >= 2 then 'first_steps' end,
      case when greatest(p.current_chapter, coalesce((p.public_stats->>'highestChapter')::integer, 1)) >= 5 then 'veil_walker' end,
      case when coalesce(wb.total_damage, 0) >= 10000 then 'boss_hunter' end,
      case when g.id is not null then 'guild_bound' end,
      case when coalesce(fr.total, 0) >= 1 then 'companion' end
    ]::text[], null),
    p.activity_state, p.activity_chapter, p.activity_room,
    greatest(p.current_chapter, coalesce((p.public_stats->>'highestChapter')::integer, 1)),
    greatest(1, coalesce((p.public_stats->>'highestRoom')::integer, 1)),
    coalesce((p.public_stats->>'roomsCleared')::bigint, 0),
    coalesce((p.public_stats->>'enemiesDefeated')::bigint, 0),
    coalesce((p.public_stats->>'bossesDefeated')::bigint, 0),
    coalesce((p.public_stats->>'questsCompleted')::bigint, 0),
    coalesce((p.public_stats->>'playTimeMs')::bigint, 0),
    coalesce((p.public_stats->>'totalDamage')::bigint, 0),
    coalesce((p.public_stats->>'itemsFound')::bigint, 0),
    coalesce(p.public_stats->'equippedItems', '[]'::jsonb)
  from public.profiles p
  left join public.guild_members gm on gm.user_id = p.id
  left join public.guilds g on g.id = gm.guild_id
  left join lateral (
    select coalesce(sum(c.damage), 0)::bigint as total_damage,
           count(*) filter (where c.damage > 0)::integer as events
    from public.world_boss_contributions c where c.user_id = p.id
  ) wb on true
  left join lateral (
    select count(*)::integer as total from public.friendships f
    where f.user_id = p.id or f.friend_user_id = p.id
  ) fr on true
  where p.id = p_user_id
  limit 1;
end;
$$;

revoke all on function public.publish_spectator_snapshot(text, integer, integer, jsonb) from public, anon;
revoke all on function public.get_friend_spectator_snapshot(uuid) from public, anon;
revoke all on function public.sync_public_profile_stats(jsonb) from public, anon;
revoke all on function public.get_social_profile_card(uuid) from public, anon;
grant execute on function public.publish_spectator_snapshot(text, integer, integer, jsonb) to authenticated;
grant execute on function public.get_friend_spectator_snapshot(uuid) to authenticated;
grant execute on function public.sync_public_profile_stats(jsonb) to authenticated;
grant execute on function public.get_social_profile_card(uuid) to authenticated;
`);

write('artifacts/dungeon-rpg/scripts/validate-room-spectator-firelands.mjs', `import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const loading = read('src/components/GlobalLoadingLayer.tsx');
const spectator = read('src/components/SpectatorScreen.tsx');
const spectatorOnline = read('src/game/socialSpectatorOnline.ts');
const guild = read('src/components/GuildPanelMobile.tsx');
const camera = read('src/components/RunCameraRig.ts');
const renderer = read('src/components/GameCanvasKayKit3D.tsx');
const themes = read('src/components/kaykitRoomThemes3D.ts');
const firelands = read('src/components/firelandsTheme3D.ts');
const profile = read('src/components/PlayerProfileCard.tsx');
const social = read('src/game/socialProgressOnline.ts');
const migration = fs.readFileSync(new URL('../../../supabase/migrations/20260716230000_expand_spectating_and_public_equipment.sql', import.meta.url), 'utf8');

assert(loading.includes('ROOM_LOADING_MIN_MS = 680'), 'Room transitions need a visible minimum loading gate.');
assert(loading.includes('Geometrie, Gegner, Kollisionen und Effekte'), 'Loading copy must describe complete room readiness.');
assert(renderer.includes('ring.visible = false'), 'Permanent enemy safety rings must be hidden.');
assert(spectator.includes('spectator-health'), 'Spectator HUD must show player health.');
assert(spectator.includes('SPIELER BESIEGT') && spectator.includes('SPIEL PAUSIERT') && spectator.includes('SPIELER IM MENÜ'), 'Spectator terminal and activity states are missing.');
assert(spectatorOnline.includes('SPECTATOR_REFRESH_MS = 500'), 'Spectator refresh must be tightened.');
assert(guild.includes('GUILD_CREATION_COST = 10000'), 'Guild creation must cost 10,000 gold.');
assert(guild.includes('Live zuschauen') && guild.includes('<SpectatorScreen'), 'Guild members need a live spectate action.');
assert(camera.includes('dungeonVeilSpectating') && camera.includes('distance: 28.6'), 'Portrait spectator framing must pull back on iPhone.');
assert(themes.includes('room >= 41 && room <= 50') && firelands.includes('FirelandsTheme_'), 'Rooms 41-50 need the firelands theme.');
assert(profile.includes('public-player-profile-equipment') && social.includes('equippedItems'), 'Public profiles need current equipment.');
assert(migration.includes("next_state in ('run', 'paused')") && migration.includes('shared guild required'), 'Supabase spectator RPC must retain paused snapshots and allow guild members.');
assert(migration.includes('equipped_items jsonb'), 'Supabase profile RPC must expose current equipment.');

console.log('Requested room, spectator, guild and firelands pass validated.');
`);

const packagePath = 'artifacts/dungeon-rpg/package.json';
const packageJson = JSON.parse(read(packagePath));
packageJson.scripts['audit:requested-pass'] = 'node scripts/validate-room-spectator-firelands.mjs';
if (!packageJson.scripts['audit:loading'].includes('validate-room-spectator-firelands.mjs')) packageJson.scripts['audit:loading'] += ' && node scripts/validate-room-spectator-firelands.mjs';
if (!packageJson.scripts['audit:social'].includes('validate-room-spectator-firelands.mjs')) packageJson.scripts['audit:social'] += ' && node scripts/validate-room-spectator-firelands.mjs';
write(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log('Room loading, spectator, guild, profile and firelands changes applied.');

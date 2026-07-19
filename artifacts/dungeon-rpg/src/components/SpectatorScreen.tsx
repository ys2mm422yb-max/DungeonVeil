import React, { useEffect, useRef, useState } from 'react';
import type { RunGameState } from '../game/runEngine';
import { SpectatorSnapshotBuffer, type SpectatorInterpolationMetrics } from '../game/spectatorInterpolation';
import {
  heartbeatSpectatorViewer,
  leaveSpectatorViewer,
  loadFriendSpectatorFeed,
  SPECTATOR_POLL_MS,
  SPECTATOR_VIEWER_HEARTBEAT_MS,
  type FriendSpectatorFeed,
  type OnlineActivityState,
} from '../game/socialSpectatorOnline';
import { SpectatorPlaybackStage } from './SpectatorPlaybackStage';
import { SPECTATOR_RENDERER_EVENT } from './MainMenuDungeonScene';

const HUD_PAINT_MS = 250;
const PERFORMANCE_KEY = 'dungeon-veil-spectator-performance';

const EMPTY_METRICS: SpectatorInterpolationMetrics = {
  receivedSnapshots: 0,
  duplicateSnapshots: 0,
  outOfOrderSnapshots: 0,
  bufferDepth: 0,
  interpolationFrames: 0,
  extrapolationFrames: 0,
  heldFrames: 0,
  roomResets: 0,
  maxCorrectionPx: 0,
  clockOffsetMs: 0,
  latestPacketAgeMs: 0,
  mode: 'waiting',
};

const GIFT_LABELS: Record<string, readonly [string, string]> = {
  multishot: ['Mehrfachpfeil', 'Multishot'],
  ricochet: ['Abpraller', 'Ricochet'],
  fireArrow: ['Feuerpfeil', 'Fire Arrow'],
  iceArrow: ['Frostpfeil', 'Ice Arrow'],
  attackSpeed: ['Schnellzug', 'Quick Draw'],
  piercing: ['Durchbohren', 'Piercing'],
  elementalStorm: ['Elementsturm', 'Elemental Storm'],
  arrowStorm: ['Pfeilsturm', 'Arrow Storm'],
  veilChain: ['Schleierkette', 'Veil Chain'],
  attack: ['Angriff', 'Attack'],
  maxHp: ['Lebenskraft', 'Vitality'],
  speed: ['Bewegung', 'Movement'],
  defense: ['Verteidigung', 'Defense'],
  hunterBlessing: ['Jägersegen', 'Hunter Blessing'],
  vitalSpark: ['Lebensfunke', 'Vital Spark'],
};

type SpectatorHud = {
  feedPresent: boolean;
  hasSnapshot: boolean;
  activity: OnlineActivityState | null;
  chapter: number;
  room: number;
  hp: number;
  maxHp: number;
  status: RunGameState['status'] | null;
  runSkills: RunGameState['runSkills'];
  delayMs: number;
  metrics: SpectatorInterpolationMetrics;
};

const EMPTY_HUD: SpectatorHud = {
  feedPresent: false,
  hasSnapshot: false,
  activity: null,
  chapter: 1,
  room: 1,
  hp: 0,
  maxHp: 1,
  status: null,
  runSkills: {},
  delayMs: 0,
  metrics: EMPTY_METRICS,
};

export function SpectatorScreen({ friendId, friendName, language, onClose }: {
  friendId: string;
  friendName: string;
  language: 'de' | 'en';
  onClose: () => void;
}) {
  const de = language === 'de';
  const hadFeedRef = useRef(false);
  const feedRef = useRef<FriendSpectatorFeed | null>(null);
  const bufferRef = useRef(new SpectatorSnapshotBuffer());
  const stableStateRef = useRef<RunGameState | null>(null);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  const [stageState, setStageState] = useState<RunGameState | null>(null);
  const [hud, setHud] = useState<SpectatorHud>(EMPTY_HUD);
  const [loading, setLoading] = useState(true);
  const [rendererReady, setRendererReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.dataset.dungeonVeilSpectating = '1';
    window.dispatchEvent(new CustomEvent(SPECTATOR_RENDERER_EVENT, { detail: { active: true } }));
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setRendererReady(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.dispatchEvent(new CustomEvent(SPECTATOR_RENDERER_EVENT, { detail: { active: false } }));
      delete document.documentElement.dataset.dungeonVeilSpectating;
    };
  }, []);

  useEffect(() => {
    const heartbeat = () => { void heartbeatSpectatorViewer(friendId).catch(() => {}); };
    heartbeat();
    const interval = window.setInterval(heartbeat, SPECTATOR_VIEWER_HEARTBEAT_MS);
    return () => {
      window.clearInterval(interval);
      void leaveSpectatorViewer(friendId).catch(() => {});
    };
  }, [friendId]);

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    bufferRef.current.clear();
    feedRef.current = null;
    stableStateRef.current = null;
    setStageState(null);
    setHud(EMPTY_HUD);
    setLoading(true);

    const refresh = async () => {
      if (cancelled || busy) return;
      busy = true;
      try {
        const receivedAt = Date.now();
        const next = await loadFriendSpectatorFeed(friendId);
        if (cancelled) return;
        feedRef.current = next;
        if (next?.snapshot) {
          hadFeedRef.current = true;
          bufferRef.current.push(next.snapshot.emittedAt, next.snapshot.state, receivedAt);
          setError('');
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!cancelled) setLoading(false);
        busy = false;
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), SPECTATOR_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [friendId]);

  useEffect(() => {
    let frame = 0;
    let lastHudPaint = 0;
    const animate = (time: number) => {
      const now = Date.now();
      const sampled = bufferRef.current.sample(now);
      if (sampled && !stableStateRef.current) {
        stableStateRef.current = sampled;
        setStageState(sampled);
      }

      if (time - lastHudPaint >= HUD_PAINT_MS) {
        lastHudPaint = time;
        const feed = feedRef.current;
        const state = stableStateRef.current;
        const metrics = bufferRef.current.getMetrics();
        const nextHud: SpectatorHud = {
          feedPresent: Boolean(feed),
          hasSnapshot: Boolean(feed?.snapshot),
          activity: feed?.activity_state ?? null,
          chapter: feed?.chapter ?? state?.chapter ?? 1,
          room: feed?.room ?? state?.floor ?? 1,
          hp: Math.max(0, Math.round(state?.player.hp ?? 0)),
          maxHp: Math.max(1, Math.round(state?.player.maxHp ?? 1)),
          status: state?.status ?? null,
          runSkills: state?.runSkills ?? {},
          delayMs: feed?.snapshot ? Math.max(0, now - feed.snapshot.emittedAt) : 0,
          metrics,
        };
        setHud(nextHud);
        try {
          localStorage.setItem(PERFORMANCE_KEY, JSON.stringify({
            ...metrics,
            reactRenders: renderCountRef.current,
            hudPaintMs: HUD_PAINT_MS,
            pollMs: SPECTATOR_POLL_MS,
            rendererHandoff: document.documentElement.dataset.dungeonVeilSpectating === '1',
            at: now,
          }));
        } catch {}
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const dead = Boolean(hud.status === 'gameover' || hud.hp <= 0 && hud.hasSnapshot);
  const paused = hud.activity === 'paused' || hud.status === 'paused';
  const inMenu = hud.activity === 'menu';
  const disconnected = !loading && hud.activity === 'run' && !hud.hasSnapshot;
  const unavailable = !loading && !hud.feedPresent && !hadFeedRef.current;
  const hpPercent = Math.max(0, Math.min(100, hud.hp / hud.maxHp * 100));
  const gifts = Object.entries(hud.runSkills)
    .filter(([key, rank]) => key !== 'heal' && Number(rank) > 0)
    .map(([key, rank]) => ({ key, rank: Number(rank), label: GIFT_LABELS[key]?.[de ? 0 : 1] ?? key }))
    .slice(0, 12);
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
  const preparingRenderer = !rendererReady;

  return <div
    data-testid="spectator-screen"
    data-playback-mode={hud.metrics.mode}
    data-buffer-depth={hud.metrics.bufferDepth}
    data-react-renders={renderCountRef.current}
    data-interpolation-frames={hud.metrics.interpolationFrames}
    data-extrapolation-frames={hud.metrics.extrapolationFrames}
    data-renderer-handoff="exclusive"
    className="fixed inset-0 z-[220] overflow-hidden bg-black text-white"
  >
    {rendererReady && stageState && <SpectatorPlaybackStage stableState={stageState} />}
    {(!rendererReady || !stageState) && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(67,41,102,.3),#050507_56%)]" />}

    <header className="pointer-events-none absolute inset-x-0 top-0 z-[240] flex items-start justify-between gap-2 bg-gradient-to-b from-black/92 via-black/58 to-transparent px-3 pb-12 pt-[max(10px,calc(env(safe-area-inset-top)+6px))]">
      <div className="min-w-0 max-w-[calc(100vw-68px)] rounded-2xl border border-violet-300/18 bg-black/72 px-3 py-2 backdrop-blur-lg">
        <div className="text-[7px] font-black uppercase tracking-[.24em] text-violet-200/55">{de ? 'LIVE ZUSCHAUEN' : 'LIVE SPECTATING'}</div>
        <div className="mt-1 truncate text-[13px] font-black text-white/90">{friendName}</div>
        <div className="mt-1 text-[7px] uppercase tracking-[.12em] text-white/42">{hud.feedPresent ? `${de ? 'Kapitel' : 'Chapter'} ${hud.chapter} · ${de ? 'Raum' : 'Room'} ${hud.room} · ${(hud.delayMs / 1000).toFixed(1)} s` : (de ? 'Verbindung wird aufgebaut' : 'Connecting')}</div>
        {stageState && <div data-testid="spectator-health" className="mt-2">
          <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-[.12em]"><span className="text-white/38">{de ? 'LEBEN' : 'HEALTH'}</span><span className="text-white/72">{hud.hp}/{hud.maxHp}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full border border-white/10 bg-black/70"><div className="h-full rounded-full bg-red-500 transition-[width] duration-200" style={{ width: `${hpPercent}%` }} /></div>
        </div>}
        {gifts.length > 0 && <div data-testid="spectator-gifts" className="mt-2 border-t border-white/8 pt-2">
          <div className="mb-1 text-[6px] font-black uppercase tracking-[.16em] text-violet-100/45">{de ? 'GABEN' : 'GIFTS'}</div>
          <div className="flex max-w-[min(76vw,330px)] flex-wrap gap-1">{gifts.map(gift => <span key={gift.key} className="rounded-full border border-violet-300/15 bg-violet-500/10 px-2 py-1 text-[6px] font-black text-violet-50/78">{gift.label}{gift.rank > 1 ? ` ${gift.rank}` : ''}</span>)}</div>
        </div>}
      </div>
      <button type="button" aria-label={de ? 'Zuschauen beenden' : 'Stop spectating'} onClick={onClose} className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/16 bg-black/76 text-xl font-black text-white/80 backdrop-blur-lg active:scale-90">×</button>
    </header>

    {(preparingRenderer || loading || status || error) && <div className="absolute inset-x-3 bottom-[max(14px,env(safe-area-inset-bottom))] z-[240] rounded-2xl border border-white/12 bg-black/82 p-4 text-center backdrop-blur-xl">
      <div data-testid="spectator-status-message" className="text-[9px] font-black uppercase tracking-[.17em] text-violet-100">{preparingRenderer || loading ? (de ? 'LIVE-RUN WIRD GELADEN …' : 'LOADING LIVE RUN …') : status || (de ? 'VERBINDUNG WIRD WIEDERHERGESTELLT' : 'RECONNECTING')}</div>
      {error && <div className="mt-2 text-[8px] leading-relaxed text-red-200/70">{error}</div>}
      {(dead || inMenu || unavailable) && <button type="button" onClick={onClose} className="mt-3 rounded-xl border border-violet-300/20 bg-violet-500/12 px-5 py-2.5 text-[8px] font-black uppercase tracking-[.14em] text-violet-100 active:scale-[.98]">{de ? 'ZURÜCK' : 'BACK'}</button>}
    </div>}
  </div>;
}

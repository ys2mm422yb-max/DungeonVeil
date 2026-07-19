import React, { useEffect, useRef, useState } from 'react';
import type { RunGameState } from '../game/runEngine';
import {
  heartbeatSpectatorViewer,
  leaveSpectatorViewer,
  loadFriendSpectatorFeed,
  SPECTATOR_REFRESH_MS,
  SPECTATOR_VIEWER_HEARTBEAT_MS,
  type FriendSpectatorFeed,
} from '../game/socialSpectatorOnline';
import {
  SPECTATOR_BUFFER_CAPACITY,
  SPECTATOR_MAX_EXTRAPOLATION_MS,
  SPECTATOR_UI_PAINT_MS,
  SpectatorInterpolationBuffer,
} from '../game/spectatorInterpolation';
import { CombatStage } from './CombatStage';
import { SPECTATOR_RENDERER_EVENT } from './MainMenuDungeonScene';

const SPECTATOR_PERFORMANCE_KEY = 'dungeon-veil-spectator-performance';

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

type RuntimeCounters = {
  reactPaints: number;
  lastReactPaints: number;
  renderFrames: number;
  lastRenderFrames: number;
  lastMetricAt: number;
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
  const displayRef = useRef<RunGameState | null>(null);
  const diagnosticsRef = useRef<HTMLSpanElement>(null);
  const bufferRef = useRef<SpectatorInterpolationBuffer | null>(null);
  if (!bufferRef.current) bufferRef.current = new SpectatorInterpolationBuffer();
  const countersRef = useRef<RuntimeCounters>({
    reactPaints: 0,
    lastReactPaints: 0,
    renderFrames: 0,
    lastRenderFrames: 0,
    lastMetricAt: performance.now(),
  });
  countersRef.current.reactPaints += 1;

  const [displayState, setDisplayState] = useState<RunGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendererReady, setRendererReady] = useState(false);
  const [error, setError] = useState('');
  const [, setUiVersion] = useState(0);

  useEffect(() => {
    bufferRef.current = new SpectatorInterpolationBuffer();
    displayRef.current = null;
    feedRef.current = null;
    hadFeedRef.current = false;
    setDisplayState(null);
    setLoading(true);
    setError('');
  }, [friendId]);

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
    const interval = window.setInterval(() => setUiVersion(version => version + 1), SPECTATOR_UI_PAINT_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let frame = 0;
    const render = (time: number) => {
      const buffer = bufferRef.current;
      const current = buffer?.sample(Date.now()) ?? null;
      if (current) displayRef.current = current;
      const counters = countersRef.current;
      counters.renderFrames += 1;
      const elapsed = time - counters.lastMetricAt;
      if (elapsed >= 1_000 && buffer) {
        const metrics = buffer.metrics(Date.now());
        const reactPaintHz = (counters.reactPaints - counters.lastReactPaints) * 1_000 / elapsed;
        const renderFps = (counters.renderFrames - counters.lastRenderFrames) * 1_000 / elapsed;
        const state = buffer.state();
        const snapshot = {
          ...metrics,
          reactPaintHz: Number(reactPaintHz.toFixed(2)),
          renderFps: Number(renderFps.toFixed(2)),
          enemies: state?.enemies.length ?? 0,
          effects: state?.effects.length ?? 0,
          particles: state?.particles.length ?? 0,
          damageNumbers: state?.damageNumbers.length ?? 0,
          canvases: document.querySelectorAll('[data-testid="spectator-screen"] canvas').length,
          menuRendererSuspended: document.documentElement.dataset.dungeonVeilSpectating === '1',
          at: Date.now(),
        };
        const host = diagnosticsRef.current;
        if (host) {
          host.dataset.bufferDepth = String(snapshot.bufferDepth);
          host.dataset.networkHz = snapshot.networkHz.toFixed(2);
          host.dataset.packetAgeMs = String(Math.round(snapshot.packetAgeMs));
          host.dataset.lastPacketGapMs = String(Math.round(snapshot.lastPacketGapMs));
          host.dataset.maxPacketGapMs = String(Math.round(snapshot.maxPacketGapMs));
          host.dataset.reactPaintHz = snapshot.reactPaintHz.toFixed(2);
          host.dataset.renderFps = snapshot.renderFps.toFixed(2);
          host.dataset.interpolatedFrames = String(snapshot.interpolatedFrames);
          host.dataset.extrapolatedFrames = String(snapshot.extrapolatedFrames);
          host.dataset.heldFrames = String(snapshot.heldFrames);
          host.dataset.maxExtrapolatedDistancePx = snapshot.maxExtrapolatedDistancePx.toFixed(2);
          host.dataset.mode = snapshot.mode;
          host.dataset.effects = String(snapshot.effects);
          host.dataset.particles = String(snapshot.particles);
          host.dataset.damageNumbers = String(snapshot.damageNumbers);
          host.dataset.canvases = String(snapshot.canvases);
          host.dataset.menuRendererSuspended = snapshot.menuRendererSuspended ? 'true' : 'false';
        }
        try { localStorage.setItem(SPECTATOR_PERFORMANCE_KEY, JSON.stringify(snapshot)); } catch {}
        counters.lastReactPaints = counters.reactPaints;
        counters.lastRenderFrames = counters.renderFrames;
        counters.lastMetricAt = time;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
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
    const refresh = async () => {
      if (cancelled || busy) return;
      busy = true;
      try {
        const next = await loadFriendSpectatorFeed(friendId);
        if (cancelled) return;
        feedRef.current = next;
        if (next) {
          hadFeedRef.current = true;
          if (next.snapshot) {
            const display = bufferRef.current?.push(next.snapshot, Date.now()) ?? null;
            if (display && display !== displayRef.current) {
              displayRef.current = display;
              setDisplayState(display);
            }
          }
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
    const interval = window.setInterval(() => void refresh(), SPECTATOR_REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [friendId]);

  const feed = feedRef.current;
  const targetState = feed?.snapshot?.state ?? null;
  const gameState = displayState;
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
  const gifts = Object.entries(gameState?.runSkills ?? {})
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

  return <div data-testid="spectator-screen" className="fixed inset-0 z-[220] overflow-hidden bg-black text-white">
    {rendererReady && gameState && <CombatStage gameState={gameState} />}
    {(!rendererReady || !gameState) && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(67,41,102,.3),#050507_56%)]" />}

    <span
      ref={diagnosticsRef}
      data-testid="spectator-performance-diagnostics"
      data-contract="timestamp-buffer-direct-render-v1"
      data-buffer-capacity={SPECTATOR_BUFFER_CAPACITY}
      data-max-extrapolation-ms={SPECTATOR_MAX_EXTRAPOLATION_MS}
      className="sr-only"
    />

    <header className="pointer-events-none absolute inset-x-0 top-0 z-[240] flex items-start justify-between gap-2 bg-gradient-to-b from-black/92 via-black/58 to-transparent px-3 pb-12 pt-[max(10px,calc(env(safe-area-inset-top)+6px))]">
      <div className="min-w-0 max-w-[calc(100vw-68px)] rounded-2xl border border-violet-300/18 bg-black/72 px-3 py-2 backdrop-blur-lg">
        <div className="text-[7px] font-black uppercase tracking-[.24em] text-violet-200/55">{de ? 'LIVE ZUSCHAUEN' : 'LIVE SPECTATING'}</div>
        <div className="mt-1 truncate text-[13px] font-black text-white/90">{friendName}</div>
        <div className="mt-1 text-[7px] uppercase tracking-[.12em] text-white/42">{feed ? `${de ? 'Kapitel' : 'Chapter'} ${feed.chapter} · ${de ? 'Raum' : 'Room'} ${feed.room} · ${(delayMs / 1000).toFixed(1)} s` : (de ? 'Verbindung wird aufgebaut' : 'Connecting')}</div>
        {gameState && <div data-testid="spectator-health" className="mt-2">
          <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-[.12em]"><span className="text-white/38">{de ? 'LEBEN' : 'HEALTH'}</span><span className="text-white/72">{hp}/{maxHp}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full border border-white/10 bg-black/70"><div className="h-full rounded-full bg-red-500 transition-[width] duration-100" style={{ width: `${hpPercent}%` }} /></div>
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

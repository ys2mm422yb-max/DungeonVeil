import React, { useEffect, useRef, useState } from 'react';
import { LiveHybridMainMenuScene } from './LiveHybridMainMenuScene';
import { activeCompanionV5, COMPANION_COLLECTION_EVENT } from '../game/companionCollectionV5';
import './mainMenuPresentation.css';

export const SPECTATOR_RENDERER_EVENT = 'dungeon-veil-spectator-renderer';

type MenuWebglState = 'booting' | 'ready' | 'lost' | 'recovering' | 'reduced-motion';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function MainMenuDungeonScene() {
  const [suspended, setSuspended] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [ambientLoaded, setAmbientLoaded] = useState(false);
  const [ambientFailed, setAmbientFailed] = useState(false);
  const [rendererGeneration, setRendererGeneration] = useState(0);
  const [webglRecoveries, setWebglRecoveries] = useState(0);
  const [webglState, setWebglState] = useState<MenuWebglState>('booting');
  const [activeCompanion, setActiveCompanion] = useState(() => activeCompanionV5()?.definition ?? null);
  const liveFrameRef = useRef<HTMLDivElement>(null);
  // Pre-mounted: show synchronously on context loss, even before React commits a state update.
  const actorFallbackRef = useRef<HTMLDivElement>(null);
  const recoveryBlockedRef = useRef(false);
  // The old generation must never report ready after a context-lost event.
  const pendingRecoveryGenerationRef = useRef<number | null>(null);

  useEffect(() => {
    const handleSpectatorRenderer = (event: Event) => {
      setSuspended(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreference = () => {
      // A WebKit media-query change can paint before React commits its new tree.
      // Keep the already-mounted Ranger and companion visible throughout that gap.
      actorFallbackRef.current?.style.setProperty('visibility', 'visible');
      setReducedMotion(media.matches);
    };
    const syncCompanion = () => setActiveCompanion(activeCompanionV5()?.definition ?? null);
    handleMotionPreference();
    syncCompanion();
    window.addEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
    window.addEventListener(COMPANION_COLLECTION_EVENT, syncCompanion);
    window.addEventListener('storage', syncCompanion);
    media.addEventListener?.('change', handleMotionPreference);
    return () => {
      window.removeEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
      window.removeEventListener(COMPANION_COLLECTION_EVENT, syncCompanion);
      window.removeEventListener('storage', syncCompanion);
      media.removeEventListener?.('change', handleMotionPreference);
    };
  }, []);

  useEffect(() => {
    const frame = liveFrameRef.current;
    if (!frame || reducedMotion) return;
    let recoveryTimer = 0;

    const restartRenderer = () => {
      if (recoveryBlockedRef.current) return;
      recoveryBlockedRef.current = true;
      actorFallbackRef.current?.style.setProperty('visibility', 'visible');
      setWebglRecoveries(value => value + 1);
      setWebglState('recovering');
      setRendererGeneration(value => value + 1);
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (recoveryBlockedRef.current) return;
      pendingRecoveryGenerationRef.current = rendererGeneration + 1;
      actorFallbackRef.current?.style.setProperty('visibility', 'visible');
      setWebglState('lost');
      window.clearTimeout(recoveryTimer);
      recoveryTimer = window.setTimeout(restartRenderer, 120);
    };
    const handleContextRestored = () => {
      if (recoveryBlockedRef.current) return;
      window.clearTimeout(recoveryTimer);
      restartRenderer();
    };

    frame.addEventListener('webglcontextlost', handleContextLost, true);
    frame.addEventListener('webglcontextrestored', handleContextRestored, true);
    return () => {
      window.clearTimeout(recoveryTimer);
      frame.removeEventListener('webglcontextlost', handleContextLost, true);
      frame.removeEventListener('webglcontextrestored', handleContextRestored, true);
    };
  }, [rendererGeneration, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      pendingRecoveryGenerationRef.current = null;
      recoveryBlockedRef.current = true;
      setWebglState('reduced-motion');
      return () => { recoveryBlockedRef.current = false; };
    }

    const frame = liveFrameRef.current;
    if (!frame) return;
    setWebglState(rendererGeneration > 0 ? 'recovering' : 'booting');

    const markRendererReady = () => {
      // A still-running OLD canvas is not proof of restored WebGL. It previously
      // re-hid the static actor in WebKit before the replacement renderer mounted.
      if (pendingRecoveryGenerationRef.current !== null && rendererGeneration < pendingRecoveryGenerationRef.current) return;
      const liveScene = frame.querySelector<HTMLElement>('[data-testid="live-hybrid-main-menu-scene"]');
      const canvas = frame.querySelector('canvas[data-testid="live-hybrid-main-menu-canvas"]');
      // A loaded rig is not yet a composited Ranger. iPad WebKit original video
      // showed a portal-only gap while the replacement canvas had too few frames.
      // Match the existing minimum in waitForLiveMenuPaint before hiding fallback.
      const renderedFrames = Number(liveScene?.dataset.animationFrames ?? 0);
      if (liveScene?.dataset.animationState !== 'running' || liveScene.dataset.rangerLoaded !== 'true' || !canvas || renderedFrames < 10) return;
      if (pendingRecoveryGenerationRef.current !== null && rendererGeneration >= pendingRecoveryGenerationRef.current) pendingRecoveryGenerationRef.current = null;
      recoveryBlockedRef.current = false;
      setWebglState('ready');
    };
    const observer = new MutationObserver(markRendererReady);
    observer.observe(frame, { attributes: true, childList: true, subtree: true });
    const readyCheck = window.setTimeout(markRendererReady, 0);
    return () => {
      window.clearTimeout(readyCheck);
      observer.disconnect();
    };
  }, [rendererGeneration, reducedMotion]);

  if (suspended) return null;
  const heroUrl = `${import.meta.env.BASE_URL}assets/hall/veil-hall-hero.svg`;
  // Keep an actor and its equipped companion while WebGL remounts or reduced motion is active.
  const showActorFallback = reducedMotion || webglState !== 'ready';

  return <div
    data-testid="main-menu-scene-presentation"
    data-composition="live-hybrid-scene"
    data-static-role="portal-atmosphere-only"
    data-static-hero-embedded="false"
    data-key-art="ambient-gothic-portal-v1"
    data-reduced-motion-contract="static-ranger-and-portal-fallback"
    data-reduced-motion-active={reducedMotion ? 'true' : 'false'}
    data-image-loaded={ambientLoaded ? 'true' : 'false'}
    data-image-failed={ambientFailed ? 'true' : 'false'}
    data-webgl-context-contract="captured-loss-remount-recovery"
    data-webgl-state={webglState}
    data-webgl-recoveries={webglRecoveries}
    data-renderer-generation={rendererGeneration}
    className="dv-main-menu-scene pointer-events-none absolute inset-0 overflow-hidden bg-[#050208]"
    style={{ transform: 'translate3d(0,0,0)' }}
  >
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(93,49,153,.22),rgba(27,16,42,.1)_42%,#050208_82%)]" />
    <img
      aria-hidden="true"
      src={heroUrl}
      alt=""
      className={`dv-main-menu-ambient-blur absolute -inset-[8%] h-[116%] w-[116%] object-cover object-center transition-opacity duration-500 motion-reduce:transition-none ${ambientLoaded ? 'opacity-100' : 'opacity-0'}`}
      draggable={false}
    />
    <img
      data-testid="main-menu-ambient-portal-art"
      src={heroUrl}
      alt=""
      className={`dv-main-menu-ambient-portal absolute inset-x-0 top-0 h-[46%] w-full object-cover object-top transition-opacity duration-500 motion-reduce:transition-none ${ambientLoaded ? 'opacity-100' : 'opacity-0'}`}
      style={{
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 48%, rgba(0,0,0,.58) 68%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, black 0%, black 48%, rgba(0,0,0,.58) 68%, transparent 100%)',
      }}
      draggable={false}
      onLoad={event => {
        setAmbientLoaded(event.currentTarget.naturalWidth > 0);
        setAmbientFailed(false);
      }}
      onError={() => {
        setAmbientLoaded(false);
        setAmbientFailed(true);
      }}
    />
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,1,6,.62)_0%,rgba(8,3,14,.08)_28%,rgba(9,4,15,.12)_58%,rgba(3,1,6,.72)_100%)]" />
    {!reducedMotion && <div ref={liveFrameRef} data-testid="live-hybrid-main-menu-frame" className="dv-main-menu-live-frame">
      <LiveHybridMainMenuScene key={`live-menu-renderer-${rendererGeneration}`} />
    </div>}
    {!reducedMotion && webglState !== 'ready' && <div
      data-testid="main-menu-webgl-recovery-fallback"
      aria-hidden="true"
      className="absolute inset-[20%_18%_27%] z-[4] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(151,96,226,.16),rgba(31,14,47,.08)_48%,transparent_73%)] opacity-90 blur-[2px]"
    />}
    <div
      ref={actorFallbackRef}
      data-testid={reducedMotion ? "main-menu-reduced-motion-fallback" : "main-menu-actor-recovery-fallback"}
      aria-hidden="true"
      style={{ visibility: showActorFallback ? 'visible' : 'hidden' }}
      className="absolute inset-[15%_13%_25%] z-[5] flex items-end justify-center"
    >
      <svg data-testid="main-menu-static-ranger-fallback" viewBox="0 0 520 620" className="h-full max-h-[620px] w-full max-w-[520px] overflow-visible drop-shadow-[0_28px_38px_rgba(0,0,0,.65)]" role="presentation">
        <defs>
          <radialGradient id="reducedPortal" cx="50%" cy="44%" r="58%">
            <stop offset="0%" stopColor="#d8c5ff" stopOpacity=".64" />
            <stop offset="38%" stopColor="#8b5cf6" stopOpacity=".34" />
            <stop offset="100%" stopColor="#2b123f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="reducedArmor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d7c8b1" />
            <stop offset="42%" stopColor="#746278" />
            <stop offset="100%" stopColor="#241b2e" />
          </linearGradient>
          <linearGradient id="reducedCloak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34203f" />
            <stop offset="100%" stopColor="#100b18" />
          </linearGradient>
        </defs>
        <ellipse cx="260" cy="520" rx="205" ry="58" fill="url(#reducedPortal)" opacity=".38" />
        <ellipse cx="260" cy="247" rx="176" ry="225" fill="none" stroke="#a77bff" strokeWidth="17" opacity=".22" />
        <ellipse cx="260" cy="247" rx="148" ry="195" fill="url(#reducedPortal)" opacity=".28" />
        <path d="M188 216c23-44 121-44 144 0l-18 68 44 212H162l44-212z" fill="url(#reducedCloak)" stroke="#72578e" strokeWidth="5" />
        <path d="M221 221h78l29 146-68 52-68-52z" fill="url(#reducedArmor)" stroke="#c9b38a" strokeWidth="5" />
        <circle cx="260" cy="176" r="46" fill="#bda98f" stroke="#e2cfaf" strokeWidth="5" />
        <path d="M213 171c9-58 87-65 101-7l-14 8c-30-24-61-22-87-1z" fill="#241a2d" />
        <path d="M190 247l-45 177M329 250l54 175" stroke="#8f7d66" strokeWidth="18" strokeLinecap="round" />
        <path d="M144 421c70-96 139-111 237-7" fill="none" stroke="#c89758" strokeWidth="11" strokeLinecap="round" />
        <path d="M146 420c57 25 167 26 236-6" fill="none" stroke="#e9d8b5" strokeWidth="3" opacity=".9" />
        <path d="M327 191l44 146" stroke="#69533d" strokeWidth="17" strokeLinecap="round" />
        <path d="M344 186l39 132M358 181l39 119M371 181l37 103" stroke="#d8bd88" strokeWidth="4" strokeLinecap="round" />
        <path d="M208 478h104l19 52H188z" fill="#0a0710" opacity=".72" />
        {activeCompanion && <g
          data-testid="main-menu-static-companion-fallback"
          data-species={activeCompanion.species}
          transform="translate(405 394)"
        >
          <ellipse cx="0" cy="107" rx="53" ry="14" fill="#0c0712" opacity=".55" />
          <ellipse cx="0" cy="42" rx="52" ry="76" fill={activeCompanion.accent} opacity=".12" />
          {activeCompanion.species === 'veil-lynx' && <>
            <path d="M-25 73Q-41 30-24 8L-15-25 0-11 15-25 25 8Q43 30 25 73Z" fill="#273b4e" stroke={activeCompanion.accent} strokeWidth="4" />
            <path d="M-15 69Q-48 86-39 49" fill="none" stroke="#86b1c5" strokeWidth="8" strokeLinecap="round" />
            <path d="M-18 21l11 4M18 21L7 25" stroke="#e9faff" strokeWidth="5" strokeLinecap="round" />
          </>}
          {activeCompanion.species === 'ember-raven' && <>
            <path d="M-18 17Q-72-31-83 20L-24 52 0 68 24 52 83 20Q72-31 18 17L0-10Z" fill="#32232f" stroke={activeCompanion.accent} strokeWidth="4" />
            <path d="M-18 13Q0-25 18 13L10 58H-10Z" fill="#4b2b29" />
            <path d="M-12 12H12L0 29Z" fill="#ffd395" />
            <circle cx="-8" cy="5" r="4" fill="#fff4d9" /><circle cx="8" cy="5" r="4" fill="#fff4d9" />
          </>}
          {activeCompanion.species === 'rune-sentinel' && <>
            <path d="M-32 12L-20-32 20-32 32 12 27 72-27 72Z" fill="#334b45" stroke={activeCompanion.accent} strokeWidth="5" />
            <path d="M-44 14L-32 35M44 14L32 35M-16 74L-24 96M16 74L24 96" stroke="#758f79" strokeWidth="15" strokeLinecap="round" />
            <path d="M0-21L15 12 0 37-15 12Z" fill={activeCompanion.accent} opacity=".85" />
          </>}
          {activeCompanion.species === 'lantern-wisp' && <>
            <path d="M0-42Q47-5 33 33Q32 66 0 83Q-32 66-33 33Q-47-5 0-42Z" fill="#8b6943" stroke={activeCompanion.accent} strokeWidth="5" />
            <path d="M0-21Q26 10 15 36Q6 53 0 55Q-25 36-15 13Z" fill={activeCompanion.accent} opacity=".85" />
            <path d="M-30 21L30 21M-25 42L25 42" stroke="#ffe4a8" strokeWidth="4" />
          </>}
          {activeCompanion.species === 'dusk-drake' && <>
            <path d="M-18 22Q-75-27-79 25L-28 61 0 79 28 61 79 25Q75-27 18 22L0-21Z" fill="#422a62" stroke={activeCompanion.accent} strokeWidth="4" />
            <path d="M-24 3L-15-32 0-19 15-32 24 3 18 48-18 48Z" fill="#615077" />
            <path d="M-10 17L-2 21M10 17L2 21" stroke="#e9dfff" strokeWidth="5" strokeLinecap="round" />
          </>}
        </g>}
      </svg>
    </div>
    <div className="dv-main-menu-grounding" aria-hidden="true" />
    <div aria-hidden="true" className="absolute inset-x-[9%] top-[28%] h-[30%] rounded-full bg-violet-500/[.035] blur-[80px] mix-blend-screen" />
    <div aria-hidden="true" className="absolute inset-x-[-10%] bottom-[10%] h-[35%] bg-[radial-gradient(ellipse_at_center,rgba(87,58,123,.055),rgba(20,13,29,.035)_43%,transparent_74%)] blur-2xl" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_56%,transparent_0%,transparent_43%,rgba(2,1,4,.2)_72%,rgba(2,1,4,.68)_100%)]" />
  </div>;
}

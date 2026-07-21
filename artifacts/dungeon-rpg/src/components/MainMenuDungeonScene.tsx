import React, { useEffect, useState } from 'react';
import { LiveHybridMainMenuScene } from './LiveHybridMainMenuScene';
import './mainMenuPresentation.css';

export const SPECTATOR_RENDERER_EVENT = 'dungeon-veil-spectator-renderer';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function MainMenuDungeonScene() {
  const [suspended, setSuspended] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [ambientLoaded, setAmbientLoaded] = useState(false);
  const [ambientFailed, setAmbientFailed] = useState(false);

  useEffect(() => {
    const handleSpectatorRenderer = (event: Event) => {
      setSuspended(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreference = () => setReducedMotion(media.matches);
    handleMotionPreference();
    window.addEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
    media.addEventListener?.('change', handleMotionPreference);
    return () => {
      window.removeEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
      media.removeEventListener?.('change', handleMotionPreference);
    };
  }, []);

  if (suspended) return null;
  const heroUrl = `${import.meta.env.BASE_URL}assets/hall/veil-hall-hero.svg`;

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
    {!reducedMotion && <div data-testid="live-hybrid-main-menu-frame" className="dv-main-menu-live-frame">
      <LiveHybridMainMenuScene />
    </div>}
    {reducedMotion && <div data-testid="main-menu-reduced-motion-fallback" aria-hidden="true" className="absolute inset-[15%_13%_25%] flex items-end justify-center">
      <svg viewBox="0 0 520 620" className="h-full max-h-[620px] w-full max-w-[520px] overflow-visible drop-shadow-[0_28px_38px_rgba(0,0,0,.65)]" role="presentation">
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
      </svg>
    </div>}
    <div className="dv-main-menu-grounding" aria-hidden="true" />
    <div aria-hidden="true" className="absolute inset-x-[9%] top-[28%] h-[30%] rounded-full bg-violet-500/[.035] blur-[80px] mix-blend-screen" />
    <div aria-hidden="true" className="absolute inset-x-[-10%] bottom-[10%] h-[35%] bg-[radial-gradient(ellipse_at_center,rgba(87,58,123,.055),rgba(20,13,29,.035)_43%,transparent_74%)] blur-2xl" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_56%,transparent_0%,transparent_43%,rgba(2,1,4,.2)_72%,rgba(2,1,4,.68)_100%)]" />
  </div>;
}

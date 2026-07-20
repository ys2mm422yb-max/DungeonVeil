import React, { useEffect, useState } from 'react';
import { LiveHybridMainMenuScene } from './LiveHybridMainMenuScene';

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
  const heroUrl = `${import.meta.env.BASE_URL}assets/hall/veil-hall-hero.webp`;

  return <div
    data-testid="main-menu-scene-presentation"
    data-composition={reducedMotion ? 'static-reduced-motion-scene' : 'live-hybrid-scene'}
    data-static-role="portal-atmosphere-only"
    data-static-hero-embedded="false"
    data-key-art="ambient-gothic-portal-v1"
    data-reduced-motion-contract="static-ranger-and-portal-fallback"
    data-reduced-motion-active={reducedMotion ? 'true' : 'false'}
    data-image-loaded={ambientLoaded ? 'true' : 'false'}
    data-image-failed={ambientFailed ? 'true' : 'false'}
    className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050208]"
    style={{ transform: 'translate3d(0,0,0)' }}
  >
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(117,45,220,.38),rgba(31,13,54,.18)_42%,#050208_82%)]" />
    <img
      aria-hidden="true"
      src={heroUrl}
      alt=""
      className={`absolute -inset-[8%] h-[116%] w-[116%] object-cover object-center blur-[18px] saturate-[1.2] contrast-[1.08] transition-opacity duration-500 motion-reduce:transition-none ${ambientLoaded ? 'opacity-30' : 'opacity-0'}`}
      draggable={false}
    />
    <img
      data-testid="main-menu-ambient-portal-art"
      src={heroUrl}
      alt=""
      className={`absolute inset-x-0 top-0 h-[43%] w-full object-cover object-top saturate-[1.08] contrast-[1.04] blur-[1px] transition-opacity duration-500 motion-reduce:transition-none ${ambientLoaded ? 'opacity-48' : 'opacity-0'}`}
      style={{
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 52%, rgba(0,0,0,.66) 70%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, black 0%, black 52%, rgba(0,0,0,.66) 70%, transparent 100%)',
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
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,1,6,.5)_0%,rgba(8,3,14,.02)_28%,rgba(9,4,15,.08)_58%,rgba(3,1,6,.62)_100%)]" />
    {!reducedMotion && <div data-testid="live-hybrid-main-menu-frame" className="absolute -inset-[15%] origin-center translate-y-[6%] scale-[.78] md:-inset-[11%] md:translate-y-[5%] md:scale-[.82]">
      <LiveHybridMainMenuScene />
    </div>}
    {reducedMotion && <div data-testid="main-menu-reduced-motion-fallback" aria-hidden="true" className="absolute inset-[12%_8%_22%] flex items-end justify-center">
      <svg viewBox="0 0 520 620" className="h-full max-h-[620px] w-full max-w-[520px] overflow-visible drop-shadow-[0_28px_38px_rgba(0,0,0,.65)]" role="presentation">
        <defs>
          <radialGradient id="reducedPortal" cx="50%" cy="44%" r="58%">
            <stop offset="0%" stopColor="#d8c5ff" stopOpacity=".76" />
            <stop offset="38%" stopColor="#8b5cf6" stopOpacity=".42" />
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
        <ellipse cx="260" cy="520" rx="205" ry="58" fill="url(#reducedPortal)" opacity=".48" />
        <ellipse cx="260" cy="247" rx="176" ry="225" fill="none" stroke="#a77bff" strokeWidth="17" opacity=".28" />
        <ellipse cx="260" cy="247" rx="148" ry="195" fill="url(#reducedPortal)" opacity=".36" />
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
    <div aria-hidden="true" className="absolute inset-x-[5%] top-[25%] h-[38%] rounded-full bg-violet-500/[.065] blur-[72px] mix-blend-screen" />
    <div aria-hidden="true" className="absolute inset-x-[-10%] bottom-[10%] h-[35%] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,.095),rgba(24,12,40,.035)_43%,transparent_74%)] blur-2xl" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_56%,transparent_0%,transparent_48%,rgba(2,1,4,.16)_78%,rgba(2,1,4,.55)_100%)]" />
  </div>;
}

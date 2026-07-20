import React, { useEffect, useState } from 'react';
import { LiveHybridMainMenuScene } from './LiveHybridMainMenuScene';

export const SPECTATOR_RENDERER_EVENT = 'dungeon-veil-spectator-renderer';

export function MainMenuDungeonScene() {
  const [suspended, setSuspended] = useState(false);
  const [ambientLoaded, setAmbientLoaded] = useState(false);
  const [ambientFailed, setAmbientFailed] = useState(false);

  useEffect(() => {
    const handleSpectatorRenderer = (event: Event) => {
      setSuspended(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    };
    window.addEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
    return () => window.removeEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
  }, []);

  if (suspended) return null;
  const heroUrl = `${import.meta.env.BASE_URL}assets/hall/veil-hall-hero.webp`;

  return <div
    data-testid="main-menu-scene-presentation"
    data-composition="live-hybrid-scene"
    data-static-role="portal-atmosphere-only"
    data-static-hero-embedded="false"
    data-key-art="ambient-gothic-portal-v1"
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
      className={`absolute -inset-[8%] h-[116%] w-[116%] object-cover object-center blur-[18px] saturate-[1.2] contrast-[1.08] transition-opacity duration-500 ${ambientLoaded ? 'opacity-30' : 'opacity-0'}`}
      draggable={false}
    />
    <img
      data-testid="main-menu-ambient-portal-art"
      src={heroUrl}
      alt=""
      className={`absolute inset-x-0 top-0 h-[43%] w-full object-cover object-top saturate-[1.08] contrast-[1.04] blur-[1px] transition-opacity duration-500 ${ambientLoaded ? 'opacity-48' : 'opacity-0'}`}
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
    <div data-testid="live-hybrid-main-menu-frame" className="absolute -inset-[15%] origin-center translate-y-[6%] scale-[.78] md:-inset-[11%] md:translate-y-[5%] md:scale-[.82]">
      <LiveHybridMainMenuScene />
    </div>
    <div aria-hidden="true" className="absolute inset-x-[5%] top-[25%] h-[38%] rounded-full bg-violet-500/[.065] blur-[72px] mix-blend-screen" />
    <div aria-hidden="true" className="absolute inset-x-[-10%] bottom-[10%] h-[35%] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,.095),rgba(24,12,40,.035)_43%,transparent_74%)] blur-2xl" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_56%,transparent_0%,transparent_48%,rgba(2,1,4,.16)_78%,rgba(2,1,4,.55)_100%)]" />
  </div>;
}

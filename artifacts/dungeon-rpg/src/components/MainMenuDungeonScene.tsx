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
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(117,45,220,.42),rgba(31,13,54,.2)_38%,#050208_78%)]" />
    <img
      data-testid="main-menu-ambient-portal-art"
      src={heroUrl}
      alt=""
      className={`absolute inset-x-0 top-0 h-[43%] w-full object-cover object-top saturate-[1.08] contrast-[1.04] blur-[1px] transition-opacity duration-500 ${ambientLoaded ? 'opacity-55' : 'opacity-0'}`}
      style={{
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 56%, rgba(0,0,0,.72) 72%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, black 0%, black 56%, rgba(0,0,0,.72) 72%, transparent 100%)',
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
    <LiveHybridMainMenuScene />
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,1,6,.58)_0%,rgba(4,2,8,.04)_26%,rgba(4,2,8,.02)_64%,rgba(3,1,6,.74)_100%)]" />
    <div aria-hidden="true" className="absolute inset-x-[6%] top-[26%] h-[35%] rounded-full bg-violet-500/[.08] blur-[64px] mix-blend-screen" />
    <div aria-hidden="true" className="absolute inset-x-[-8%] bottom-[16%] h-[24%] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,.11),rgba(24,12,40,.04)_43%,transparent_72%)] blur-2xl" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,transparent_0%,transparent_44%,rgba(2,1,4,.18)_77%,rgba(2,1,4,.58)_100%)]" />
  </div>;
}

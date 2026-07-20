import React, { useEffect, useState } from 'react';

export const SPECTATOR_RENDERER_EVENT = 'dungeon-veil-spectator-renderer';

export function MainMenuDungeonScene() {
  const [suspended, setSuspended] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);

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
    data-composition="hd-key-art-overlay"
    data-hero-pair="ranger-and-veil-wolf"
    data-key-art="approved-gothic-portal-v1"
    data-image-loaded={heroLoaded ? 'true' : 'false'}
    data-image-failed={heroFailed ? 'true' : 'false'}
    className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050208]"
    style={{ transform: 'translate3d(0,0,0)' }}
  >
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_43%,rgba(117,45,220,.42),rgba(31,13,54,.2)_38%,#050208_78%)]" />
    <img
      aria-hidden="true"
      src={heroUrl}
      className={`absolute -inset-[5%] h-[110%] w-[110%] object-cover opacity-60 blur-2xl saturate-150 transition-opacity duration-500 ${heroLoaded ? 'opacity-60' : 'opacity-0'}`}
    />
    <img
      data-testid="main-menu-hd-key-art"
      src={heroUrl}
      alt=""
      className={`absolute inset-0 h-full w-full object-cover object-[center_43%] saturate-[1.08] contrast-[1.04] transition-opacity duration-500 md:object-contain md:object-center ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
      draggable={false}
      onLoad={event => {
        setHeroLoaded(event.currentTarget.naturalWidth > 0);
        setHeroFailed(false);
      }}
      onError={() => {
        setHeroLoaded(false);
        setHeroFailed(true);
      }}
    />
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,1,6,.48)_0%,rgba(4,2,8,.02)_28%,rgba(4,2,8,.02)_66%,rgba(3,1,6,.72)_100%)]" />
    <div aria-hidden="true" className="absolute inset-x-[8%] top-[22%] h-[42%] rounded-full bg-violet-500/[.12] blur-[70px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" />
    <div aria-hidden="true" className="absolute inset-x-[-8%] bottom-[17%] h-[23%] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,.12),rgba(24,12,40,.05)_43%,transparent_72%)] blur-2xl" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,transparent_0%,transparent_42%,rgba(2,1,4,.2)_78%,rgba(2,1,4,.62)_100%)]" />
  </div>;
}

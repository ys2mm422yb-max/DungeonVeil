import React, { useEffect, useState } from 'react';

export const SPECTATOR_RENDERER_EVENT = 'dungeon-veil-spectator-renderer';

export function MainMenuDungeonScene() {
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    const handleSpectatorRenderer = (event: Event) => {
      setSuspended(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    };
    window.addEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
    return () => window.removeEventListener(SPECTATOR_RENDERER_EVENT, handleSpectatorRenderer);
  }, []);

  if (suspended) return null;
  const heroUrl = `${import.meta.env.BASE_URL}assets/hall/veil-hall-hero.svg`;

  return <div
    data-testid="main-menu-scene-presentation"
    data-composition="hd-key-art-overlay"
    data-hero-pair="ranger-and-veil-wolf"
    data-key-art="approved-gothic-portal-v1"
    className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050208]"
    style={{ transform: 'translate3d(0,0,0)' }}
  >
    <img
      aria-hidden="true"
      src={heroUrl}
      className="absolute -inset-[5%] h-[110%] w-[110%] object-cover opacity-70 blur-2xl saturate-125"
    />
    <img
      data-testid="main-menu-hd-key-art"
      src={heroUrl}
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-[center_38%] md:object-contain md:object-center"
      draggable={false}
    />
    <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,1,6,.62)_0%,rgba(4,2,8,.08)_26%,rgba(4,2,8,.04)_62%,rgba(3,1,6,.78)_100%)]" />
    <div aria-hidden="true" className="absolute inset-x-[8%] top-[22%] h-[42%] rounded-full bg-violet-500/[.15] blur-[70px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" />
    <div aria-hidden="true" className="absolute inset-x-[-8%] bottom-[17%] h-[23%] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,.18),rgba(24,12,40,.08)_43%,transparent_72%)] blur-2xl" />
    <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,transparent_0%,transparent_36%,rgba(2,1,4,.28)_76%,rgba(2,1,4,.7)_100%)]" />
  </div>;
}

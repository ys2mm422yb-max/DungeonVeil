import React from 'react';

const HALL_BACKGROUND = `${import.meta.env.BASE_URL}assets/hall-of-the-veil/hall-background-v3.svg`;

export function HallOfVeilHybridBackground() {
  return <div
    aria-hidden="true"
    data-hall-hybrid-background="true"
    data-background-artwork="premium-gothic-v3"
    className="pointer-events-none absolute inset-0 overflow-hidden bg-[#020105]"
  >
    <div
      className="absolute inset-0 bg-cover bg-[center_30%] bg-no-repeat md:bg-center"
      style={{ backgroundImage: `url(${HALL_BACKGROUND})` }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(168,85,247,0.04)_0%,transparent_46%,rgba(1,0,4,0.48)_100%)]" />
    <div className="absolute left-1/2 top-[27%] h-[42%] w-[52%] -translate-x-1/2 rounded-[50%] bg-violet-500/8 blur-2xl motion-safe:animate-pulse" />
    <div className="absolute inset-x-[-10%] bottom-[9%] h-[23%] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.12),transparent_70%)] blur-xl" />
    <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/48" />
  </div>;
}

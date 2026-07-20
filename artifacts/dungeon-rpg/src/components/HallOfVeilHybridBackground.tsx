import React from 'react';

const HALL_BACKGROUND = `${import.meta.env.BASE_URL}assets/hall-of-the-veil/hall-background-v1.svg`;

export function HallOfVeilHybridBackground() {
  return <div
    aria-hidden="true"
    data-hall-hybrid-background="true"
    data-background-artwork="premium-gothic-v2"
    className="pointer-events-none absolute inset-0 overflow-hidden bg-[#030206]"
  >
    <div
      className="absolute inset-0 bg-cover bg-[center_34%] bg-no-repeat will-change-transform md:bg-center"
      style={{ backgroundImage: `url(${HALL_BACKGROUND})` }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_39%,rgba(168,85,247,0.08)_0%,transparent_43%,rgba(2,1,5,0.5)_100%)]" />
    <div className="absolute left-1/2 top-[24%] h-[48%] w-[64%] -translate-x-1/2 rounded-[50%] bg-violet-500/10 blur-3xl motion-safe:animate-pulse" />
    <div className="absolute inset-x-[-15%] bottom-[5%] h-[30%] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.18),transparent_68%)] blur-2xl" />
    <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/55" />
  </div>;
}

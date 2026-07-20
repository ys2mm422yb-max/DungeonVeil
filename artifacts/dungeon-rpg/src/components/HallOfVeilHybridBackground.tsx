import React from 'react';

const HALL_BACKGROUND = `${import.meta.env.BASE_URL}assets/hall-of-the-veil/hall-background-v1.svg`;

export function HallOfVeilHybridBackground() {
  return <div
    aria-hidden="true"
    data-hall-hybrid-background="true"
    className="pointer-events-none absolute inset-0 overflow-hidden bg-[#05030a]"
  >
    <div
      className="absolute inset-0 scale-[1.035] bg-cover bg-center bg-no-repeat opacity-90"
      style={{ backgroundImage: `url(${HALL_BACKGROUND})` }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(5,3,10,0.05)_48%,rgba(2,1,5,0.68)_100%)]" />
    <div className="absolute inset-x-[-12%] bottom-[-5%] h-[34%] bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.22),transparent_68%)] blur-2xl" />
  </div>;
}

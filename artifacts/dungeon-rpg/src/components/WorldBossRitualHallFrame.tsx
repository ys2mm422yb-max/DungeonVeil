import React from 'react';

export const WORLD_BOSS_RITUAL_HALL_CONTRACT = 'visible-ritual-core-and-boundaries-v1';

export function WorldBossRitualHallFrame() {
  return <div
    data-testid="worldboss-ritual-hall-frame"
    data-presentation-contract={WORLD_BOSS_RITUAL_HALL_CONTRACT}
    className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    aria-hidden="true"
  >
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="worldboss-hall-backdrop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#080508" stopOpacity="0" />
          <stop offset="0.3" stopColor="#160b0e" stopOpacity="0.86" />
          <stop offset="0.78" stopColor="#241315" stopOpacity="0.62" />
          <stop offset="1" stopColor="#241315" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="worldboss-boundary-stroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0b36d" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#b86d3a" stopOpacity="0.34" />
          <stop offset="1" stopColor="#5e3028" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id="worldboss-ritual-core">
          <stop offset="0" stopColor="#ffb45d" stopOpacity="0.18" />
          <stop offset="0.45" stopColor="#c25c32" stopOpacity="0.1" />
          <stop offset="1" stopColor="#5d2828" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="worldboss-brazier-glow">
          <stop offset="0" stopColor="#ffc36e" stopOpacity="0.38" />
          <stop offset="0.3" stopColor="#ef7436" stopOpacity="0.2" />
          <stop offset="1" stopColor="#c63b2f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="17" width="100" height="23" fill="url(#worldboss-hall-backdrop)" />
      <path d="M22 40 L30 34 L70 34 L78 40" fill="none" stroke="#6e4540" strokeOpacity="0.2" strokeWidth="0.45" />
      <path d="M31 35 Q50 24 69 35" fill="none" stroke="#c88759" strokeOpacity="0.12" strokeWidth="0.5" />

      <path d="M0 100 L0 48 L18 48 L31 41 L22 100 Z" fill="#050306" fillOpacity="0.18" />
      <path d="M100 100 L100 48 L82 48 L69 41 L78 100 Z" fill="#050306" fillOpacity="0.18" />

      <path d="M22 92 L31 41 L69 41 L78 92" fill="none" stroke="url(#worldboss-boundary-stroke)" strokeWidth="0.62" />
      <path d="M28 92 L35 44 L65 44 L72 92" fill="none" stroke="#f4c184" strokeOpacity="0.1" strokeWidth="0.28" />
      <path d="M22 92 L78 92" fill="none" stroke="#7d4434" strokeOpacity="0.22" strokeWidth="0.55" />

      <ellipse cx="50" cy="62" rx="23" ry="10" fill="url(#worldboss-ritual-core)" />
      <ellipse cx="50" cy="62" rx="14.5" ry="5.8" fill="none" stroke="#dc8952" strokeOpacity="0.24" strokeWidth="0.42" />
      <ellipse cx="50" cy="62" rx="8.6" ry="3.3" fill="none" stroke="#f0b36d" strokeOpacity="0.18" strokeWidth="0.34" />
      <path d="M35.5 62 H64.5 M50 56.2 V67.8 M39.8 57.9 L60.2 66.1 M60.2 57.9 L39.8 66.1" stroke="#d27b4b" strokeOpacity="0.14" strokeWidth="0.28" />

      <ellipse cx="28.5" cy="49" rx="6" ry="4.2" fill="url(#worldboss-brazier-glow)" />
      <ellipse cx="71.5" cy="49" rx="6" ry="4.2" fill="url(#worldboss-brazier-glow)" />
      <ellipse cx="23" cy="78" rx="5" ry="6" fill="url(#worldboss-brazier-glow)" opacity="0.48" />
      <ellipse cx="77" cy="78" rx="5" ry="6" fill="url(#worldboss-brazier-glow)" opacity="0.48" />
    </svg>
  </div>;
}

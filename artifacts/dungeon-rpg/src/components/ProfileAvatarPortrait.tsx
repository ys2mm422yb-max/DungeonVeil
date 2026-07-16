import React, { useId } from 'react';
import type { ProfileAvatarDefinition, ProfileAvatarId } from '../game/playerProfile';

type AvatarTheme = {
  hood: string;
  hoodShadow: string;
  skin: string;
  skinShadow: string;
  accent: string;
  eye: string;
  backdrop: string;
};

const THEMES: Record<ProfileAvatarId, AvatarTheme> = {
  ranger: { hood: '#315743', hoodShadow: '#142c24', skin: '#d8aa7d', skinShadow: '#8b5d45', accent: '#8dd0a7', eye: '#f5e9ce', backdrop: '#15261f' },
  ember: { hood: '#6e2f25', hoodShadow: '#2b1515', skin: '#c98c67', skinShadow: '#754438', accent: '#ff814f', eye: '#ffd08a', backdrop: '#3a1814' },
  frost: { hood: '#28546d', hoodShadow: '#10283a', skin: '#c6d8dd', skinShadow: '#718d9c', accent: '#8fe7ff', eye: '#d9fbff', backdrop: '#15364a' },
  warden: { hood: '#78602e', hoodShadow: '#302817', skin: '#c49a69', skinShadow: '#765838', accent: '#f4d276', eye: '#fff1b2', backdrop: '#3a2d16' },
  sigil: { hood: '#60437c', hoodShadow: '#271d38', skin: '#c79aa7', skinShadow: '#765265', accent: '#d6a6ff', eye: '#f0d9ff', backdrop: '#34214a' },
  veil: { hood: '#222f4d', hoodShadow: '#0b1328', skin: '#9e8195', skinShadow: '#59475d', accent: '#bd80ff', eye: '#e4b4ff', backdrop: '#111a33' },
  'ash-mask': { hood: '#4b3433', hoodShadow: '#1f1718', skin: '#a86d58', skinShadow: '#604038', accent: '#f0a16e', eye: '#ffcf9e', backdrop: '#2d1d1c' },
  'demon-eye': { hood: '#531d2c', hoodShadow: '#210812', skin: '#8e4351', skinShadow: '#51202c', accent: '#ff4d55', eye: '#ffce85', backdrop: '#2a0911' },
  'rune-bow': { hood: '#236052', hoodShadow: '#0c2b28', skin: '#b99376', skinShadow: '#6f5545', accent: '#75f0c1', eye: '#d8fff2', backdrop: '#103a34' },
  'worldboss-seal': { hood: '#713625', hoodShadow: '#2d1510', skin: '#bd7f5e', skinShadow: '#724332', accent: '#ffbf5f', eye: '#fff0b0', backdrop: '#3c1712' },
  'night-watch': { hood: '#283358', hoodShadow: '#0e142b', skin: '#9f8a8d', skinShadow: '#5c4a52', accent: '#aebeff', eye: '#e4e8ff', backdrop: '#151a37' },
  'arcane-eye': { hood: '#63318a', hoodShadow: '#25123c', skin: '#b07d9d', skinShadow: '#68435f', accent: '#e2a7ff', eye: '#fff0ff', backdrop: '#35144f' },
};

const MASKED = new Set<ProfileAvatarId>(['ember', 'warden', 'ash-mask', 'worldboss-seal']);
const FULL_MASK = new Set<ProfileAvatarId>(['warden', 'ash-mask', 'worldboss-seal']);

function Motif({ id, color }: { id: ProfileAvatarId; color: string }) {
  if (id === 'ember') return <><circle cx="18" cy="24" r="2" fill={color} /><circle cx="82" cy="18" r="1.6" fill={color} /><path d="M17 79c8-8 4-17 12-24-1 10 9 12 4 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" /></>;
  if (id === 'frost') return <><path d="M16 25h14M23 18v14M18 20l10 10M28 20L18 30" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><path d="M78 70h12M84 64v12" stroke={color} strokeWidth="1.6" strokeLinecap="round" /></>;
  if (id === 'warden') return <path d="M34 15l7 9 9-13 9 13 8-9-3 18H37z" fill={color} opacity=".9" />;
  if (id === 'sigil') return <><circle cx="50" cy="18" r="10" fill="none" stroke={color} strokeWidth="1.8" /><path d="M50 9l4 7-4 11-4-11z" fill={color} /></>;
  if (id === 'veil') return <><circle cx="50" cy="17" r="9" fill="none" stroke={color} strokeWidth="1.5" opacity=".75" /><circle cx="50" cy="17" r="3" fill={color} /></>;
  if (id === 'ash-mask') return <><path d="M22 19l8 5-5 8" fill="none" stroke={color} strokeWidth="2" /><path d="M78 19l-8 5 5 8" fill="none" stroke={color} strokeWidth="2" /></>;
  if (id === 'demon-eye') return <><path d="M31 27C19 21 18 10 22 5c2 9 10 8 17 16M69 27C81 21 82 10 78 5c-2 9-10 8-17 16" fill={color} opacity=".92" /><ellipse cx="50" cy="18" rx="8" ry="4.5" fill="none" stroke={color} strokeWidth="1.5" /><circle cx="50" cy="18" r="2.4" fill={color} /></>;
  if (id === 'rune-bow') return <><path d="M18 75Q9 49 22 26M22 26l7 5M22 26l-1 9" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" /><path d="M13 52l14 0" stroke={color} strokeWidth="1.3" /></>;
  if (id === 'worldboss-seal') return <><circle cx="50" cy="17" r="12" fill="none" stroke={color} strokeWidth="2" /><path d="M50 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill={color} /></>;
  if (id === 'night-watch') return <path d="M27 12c-8 12 0 24 13 22-10-3-12-14-6-22-2-1-5-1-7 0z" fill={color} opacity=".9" />;
  if (id === 'arcane-eye') return <><circle cx="50" cy="17" r="12" fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="3 3" /><ellipse cx="50" cy="17" rx="7" ry="4" fill="none" stroke={color} strokeWidth="1.6" /><circle cx="50" cy="17" r="2.4" fill={color} /></>;
  return <path d="M14 73Q9 45 24 24M24 24l7 6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity=".85" />;
}

export function ProfileAvatarPortrait({ avatar, className = '' }: { avatar: ProfileAvatarDefinition; className?: string }) {
  const rawId = useId().replace(/:/g, '');
  const theme = THEMES[avatar.id];
  const hoodGradient = `${rawId}-hood`;
  const faceGradient = `${rawId}-face`;
  const glow = `${rawId}-glow`;
  const masked = MASKED.has(avatar.id);
  const fullMask = FULL_MASK.has(avatar.id);
  const demon = avatar.id === 'demon-eye';
  const arcaneEye = avatar.id === 'arcane-eye' || avatar.id === 'veil';

  return <div className={`relative isolate overflow-hidden bg-black shadow-inner ${className}`} style={{ background: avatar.background }} aria-hidden="true">
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={hoodGradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor={theme.hood} /><stop offset="1" stopColor={theme.hoodShadow} /></linearGradient>
        <linearGradient id={faceGradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor={theme.skin} /><stop offset="1" stopColor={theme.skinShadow} /></linearGradient>
        <filter id={glow} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width="100" height="100" fill={theme.backdrop} opacity=".62" />
      <circle cx="50" cy="40" r="39" fill={theme.accent} opacity=".09" />
      <circle cx="50" cy="42" r="31" fill="none" stroke={theme.accent} strokeWidth="1" opacity=".16" />
      <Motif id={avatar.id} color={theme.accent} />
      <path d="M7 100c3-25 19-39 43-39s40 14 43 39z" fill={`url(#${hoodGradient})`} />
      <path d="M18 68C18 30 31 13 50 11c19 2 32 19 32 57-9-10-18-15-32-15S27 58 18 68z" fill={`url(#${hoodGradient})`} />
      <path d="M29 47c2-18 10-28 21-29 11 1 19 11 21 29-2 17-9 28-21 31-12-3-19-14-21-31z" fill={`url(#${faceGradient})`} />
      <path d="M31 46c4-5 10-8 19-8s15 3 19 8c-3-17-10-25-19-26-9 1-16 9-19 26z" fill={theme.hoodShadow} opacity=".52" />
      {demon && <><path d="M30 31c-8-5-11-13-8-23 6 8 12 8 18 13z" fill={theme.accent} /><path d="M70 31c8-5 11-13 8-23-6 8-12 8-18 13z" fill={theme.accent} /></>}
      {fullMask ? <path d="M30 43l8-12h24l8 12-4 27-16 9-16-9z" fill={avatar.id === 'ash-mask' ? '#b9a28a' : theme.hood} stroke={theme.accent} strokeWidth="1.4" /> : masked ? <path d="M30 55l7-8h26l7 8-5 18-15 6-15-6z" fill={theme.hoodShadow} stroke={theme.accent} strokeWidth="1" /> : null}
      <path d="M36 48c4-3 8-3 12 0" fill="none" stroke={theme.hoodShadow} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M52 48c4-3 8-3 12 0" fill="none" stroke={theme.hoodShadow} strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="42" cy="50" rx="2.6" ry="1.7" fill={theme.eye} filter={`url(#${glow})`} />
      <ellipse cx="58" cy="50" rx="2.6" ry="1.7" fill={theme.eye} filter={`url(#${glow})`} />
      {!fullMask && <><path d="M50 50l-2 10 5 1" fill="none" stroke={theme.skinShadow} strokeWidth="1.5" strokeLinecap="round" /><path d="M44 68c4 2 8 2 12 0" fill="none" stroke={theme.skinShadow} strokeWidth="1.6" strokeLinecap="round" /></>}
      {avatar.id === 'ash-mask' && <><path d="M39 39l4 9-5 12M61 39l-4 9 5 12M43 67l7-6 7 6" fill="none" stroke="#5d4438" strokeWidth="1.6" /><path d="M36 56l8-2M64 56l-8-2" stroke={theme.accent} strokeWidth="1.4" /></>}
      {avatar.id === 'warden' && <><path d="M32 45h36M50 32v45" stroke={theme.accent} strokeWidth="2" opacity=".72" /><path d="M38 59h24" stroke={theme.accent} strokeWidth="1.4" /></>}
      {avatar.id === 'worldboss-seal' && <path d="M31 43l7-9h24l7 9-4 8H35z" fill={theme.accent} opacity=".38" />}
      {arcaneEye && <g filter={`url(#${glow})`}><ellipse cx="50" cy="34" rx="5.5" ry="3.3" fill="none" stroke={theme.accent} strokeWidth="1.2" /><circle cx="50" cy="34" r="1.8" fill={theme.accent} /></g>}
      {avatar.id === 'sigil' && <path d="M50 29l4 6-4 7-4-7z" fill={theme.accent} filter={`url(#${glow})`} />}
      {avatar.id === 'frost' && <path d="M33 73l6-4M67 73l-6-4" stroke={theme.accent} strokeWidth="1.5" opacity=".85" />}
      <path d="M22 91c8-13 17-19 28-19s20 6 28 19" fill="none" stroke={theme.accent} strokeWidth="2" opacity=".28" />
    </svg>
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.13),transparent_35%,rgba(0,0,0,.26))]" />
  </div>;
}

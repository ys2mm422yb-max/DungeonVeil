import React from 'react';
import { EQUIPMENT, type EquipmentId } from '../game/metaProgression';
import type { EnemyType } from '../game/entities';
import type { VeilRelicId } from '../game/veilRelics';

type ArtworkProps = {
  className?: string;
  accent?: string;
  locked?: boolean;
};

function Frame({ children, className = '', accent = '#a78bfa', locked = false, label }: ArtworkProps & { children: React.ReactNode; label: string }) {
  return <span
    role="img"
    aria-label={label}
    className={'relative inline-flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,.12),rgba(8,5,16,.92)_72%)] ' + className}
    style={{ color: locked ? 'rgba(255,255,255,.2)' : accent, boxShadow: locked ? undefined : `inset 0 0 24px ${accent}18` }}
  >
    <svg viewBox="0 0 64 64" className={'h-[82%] w-[82%] ' + (locked ? 'opacity-35 grayscale' : '')} aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill="currentColor" opacity=".06" />
      {children}
    </svg>
    {locked && <span className="absolute inset-0 bg-black/20" />}
  </span>;
}

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function EnemyArtwork({ enemyType, room = 1, className, accent = '#bca276', locked = false }: ArtworkProps & { enemyType: EnemyType; room?: number }) {
  const boss = enemyType === 'boss';
  const label = boss ? `Wächter Raum ${room}` : enemyType;
  const art = (() => {
    if (boss) {
      if (room === 20) return <><path d="M19 47V27l13-11 13 11v20" {...line} /><path d="M25 27h14M25 35h14M32 16v31" {...line} /><circle cx="32" cy="27" r="3.5" fill="currentColor" /></>;
      if (room === 30) return <><path d="M18 49c5-18 10-28 14-32 4 4 9 14 14 32" {...line} /><path d="M23 38h18M27 27h10" {...line} /><path d="M16 23l8 5M48 23l-8 5" {...line} /></>;
      if (room === 40) return <><path d="M18 48l5-25 9-8 9 8 5 25" {...line} /><path d="M23 23l9 8 9-8M27 39l5 7 5-7" {...line} /><circle cx="32" cy="31" r="3" fill="currentColor" /></>;
      if (room === 50) return <><path d="M17 48l4-25 11-8 11 8 4 25" {...line} /><path d="M22 25h20M20 36h24" {...line} /><path d="M27 15l5 8 5-8M27 42l5 7 5-7" {...line} /></>;
      return <><path d="M20 48V25l12-10 12 10v23" {...line} /><path d="M22 28h20M25 37h14" {...line} /><path d="M27 15l5 8 5-8" {...line} /></>;
    }
    switch (enemyType) {
      case 'slime': return <><path d="M17 43c0-12 6-23 15-23s15 11 15 23c-7 6-23 6-30 0Z" {...line} /><circle cx="27" cy="35" r="2" fill="currentColor" /><circle cx="37" cy="35" r="2" fill="currentColor" /></>;
      case 'goblin': return <><path d="M19 40c0-12 5-20 13-20s13 8 13 20c-6 8-20 8-26 0Z" {...line} /><path d="M20 27l-8-5 6 12M44 27l8-5-6 12" {...line} /><circle cx="27" cy="35" r="2" fill="currentColor" /><circle cx="37" cy="35" r="2" fill="currentColor" /></>;
      case 'skeleton': return <><circle cx="32" cy="27" r="10" {...line} /><path d="M24 39h16M27 39v11M37 39v11M23 45h18" {...line} /><circle cx="28" cy="26" r="2" fill="currentColor" /><circle cx="36" cy="26" r="2" fill="currentColor" /><path d="M29 33h6" {...line} /></>;
      case 'orc': return <><path d="M18 46c1-18 6-27 14-27s13 9 14 27" {...line} /><path d="M22 28l-8-5 6 13M42 28l8-5-6 13" {...line} /><path d="M25 39l7 5 7-5" {...line} /><circle cx="27" cy="33" r="2" fill="currentColor" /><circle cx="37" cy="33" r="2" fill="currentColor" /></>;
      case 'spider': return <><ellipse cx="32" cy="34" rx="9" ry="12" {...line} /><circle cx="32" cy="22" r="6" {...line} /><path d="M23 29l-11-8M22 35H9M23 41l-11 8M41 29l11-8M42 35h13M41 41l11 8" {...line} /></>;
      case 'vampire': return <><path d="M9 31c9-15 16-14 23-3 7-11 14-12 23 3-8 1-12 5-15 12l-8-8-8 8c-3-7-7-11-15-12Z" {...line} /><circle cx="32" cy="29" r="3" fill="currentColor" /></>;
      case 'demon': return <><path d="M17 47c18 2 30-6 27-17-2-8-13-10-17-4-5 8 4 14 11 8" {...line} /><path d="M18 47l-7-6 9-2M44 30l8-4-5 8" {...line} /><circle cx="39" cy="28" r="2" fill="currentColor" /></>;
      case 'golem': return <><path d="M18 48l-3-23 9-9h16l9 9-3 23Z" {...line} /><path d="M24 16l8 9 8-9M21 34h22M27 41h10" {...line} /><circle cx="27" cy="30" r="2" fill="currentColor" /><circle cx="37" cy="30" r="2" fill="currentColor" /></>;
      default: return <path d="M18 48V25l14-10 14 10v23Z" {...line} />;
    }
  })();
  return <Frame className={className} accent={accent} locked={locked} label={label}>{art}</Frame>;
}

export function RelicArtwork({ relicId, className, accent = '#a78bfa', locked = false }: ArtworkProps & { relicId: VeilRelicId }) {
  const art = (() => {
    switch (relicId) {
      case 'ash-eye': return <><path d="M11 32c8-12 15-17 21-17s13 5 21 17c-8 12-15 17-21 17S19 44 11 32Z" {...line} /><circle cx="32" cy="32" r="8" {...line} /><path d="M32 24v16M24 32h16" {...line} /></>;
      case 'marked-claw': return <><path d="M17 50c3-16 8-27 14-34M28 50c2-16 6-27 11-35M39 49c1-13 4-22 8-29" {...line} /><path d="M15 43l7 6M27 42l7 6M39 41l7 5" {...line} /></>;
      case 'night-hunt-sigil': return <><circle cx="32" cy="32" r="18" {...line} /><path d="M32 12v40M12 32h40M19 19l26 26M45 19L19 45" {...line} /><circle cx="32" cy="32" r="5" fill="currentColor" /></>;
      case 'veil-heart': return <><path d="M32 50S13 39 13 24c0-8 10-12 19-3 9-9 19-5 19 3 0 15-19 26-19 26Z" {...line} /><path d="M21 32h7l4-9 5 18 4-9h5" {...line} /></>;
      case 'broken-guardian-crown': return <><path d="M14 45l4-24 11 11 7-16 10 16 7-11-3 24Z" {...line} /><path d="M18 45h32M32 22l5 8-7 7 5 10" {...line} /></>;
      case 'depth-rune-shard': return <><path d="M32 10l15 17-8 27-17-5-6-22Z" {...line} /><path d="M32 10l-3 20 10 24M16 27l13 3 18-3M22 49l7-19" {...line} /></>;
      case 'world-core': return <><circle cx="32" cy="32" r="19" {...line} /><circle cx="32" cy="32" r="10" {...line} /><path d="M32 8v9M32 47v9M8 32h9M47 32h9M15 15l7 7M42 42l7 7M49 15l-7 7M22 42l-7 7" {...line} /><circle cx="32" cy="32" r="4" fill="currentColor" /></>;
    }
  })();
  return <Frame className={className} accent={accent} locked={locked} label={relicId}>{art}</Frame>;
}

export function EquipmentArtwork({ itemId, className, accent, locked = false }: ArtworkProps & { itemId: EquipmentId }) {
  const item = EQUIPMENT[itemId];
  const tone = accent ?? item?.accent ?? '#d6c38d';
  const variant = String(itemId);
  const slot = item?.slot;
  const art = slot === 'bow'
    ? <><path d="M18 11c18 10 18 32 0 42M18 11l29 21-29 21M47 32H22" {...line} /><path d={variant.includes('warden') ? 'M25 22l7 10-7 10M38 25l5 7-5 7' : variant.includes('veil') ? 'M27 18l6 14-6 14' : variant.includes('ember') ? 'M31 19l5 8-4 5 4 5-5 8' : 'M27 24l6 8-6 8'} {...line} /></>
    : slot === 'quiver'
      ? <><path d="M23 20h20l-4 34H27Z" {...line} /><path d="M25 20l-4-9M32 20V8M39 20l4-9" {...line} /><path d="M25 15l-4-4 1 7M32 13l-3-5h6M39 15l4-4-1 7" {...line} /><path d={variant.includes('warden') ? 'M27 31h12M26 39h14M29 47h8' : variant.includes('black') ? 'M28 28l10 18M38 28L28 46' : 'M27 34h12'} {...line} /></>
      : <><path d="M20 18l12-7 12 7 7 12-7 6v17H20V36l-7-6Z" {...line} /><path d="M20 18l12 13 12-13M32 31v22M20 38h24" {...line} /><path d={variant.includes('warden') ? 'M24 24l8 7 8-7M24 45l8-7 8 7' : variant.includes('ash') ? 'M24 42l8-11 8 11' : 'M25 24l7 7 7-7'} {...line} /></>;
  return <Frame className={className} accent={tone} locked={locked} label={item?.nameDe ?? itemId}>{art}</Frame>;
}

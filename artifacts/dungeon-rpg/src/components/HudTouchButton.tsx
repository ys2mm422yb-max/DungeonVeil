import React from 'react';

export function HudTouchButton({ children, className = '', ariaLabel, onPress }: { children: React.ReactNode; className?: string; ariaLabel: string; onPress: () => void }) {
  return <button type="button" aria-label={ariaLabel} data-ui-control className={className} onPointerDown={e => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new Event('dungeon-veil-reset-input')); onPress(); }}>{children}</button>;
}

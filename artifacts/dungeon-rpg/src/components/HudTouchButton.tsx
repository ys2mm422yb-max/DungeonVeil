import React from 'react';

export function HudTouchButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <button type="button" onPointerDown={e => { e.preventDefault(); onPress(); }}>{label}</button>;
}

import React from 'react';
import { HallOfVeilHybridBackground } from './HallOfVeilHybridBackground';
import { HallOfVeilScene } from './HallOfVeilScene';

/**
 * Compatibility wrapper retained for existing menu imports and diagnostics.
 * The former market square has been fully replaced by the Hall of the Veil.
 */
export function ModernVillageSquareScene() {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden" data-hall-hybrid-composition="true">
    <HallOfVeilHybridBackground />
    <div className="absolute inset-0 opacity-[0.88] mix-blend-screen">
      <HallOfVeilScene />
    </div>
  </div>;
}

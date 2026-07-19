import React from 'react';
import { HallOfVeilScene } from './HallOfVeilScene';

/**
 * Compatibility wrapper retained for existing menu imports and diagnostics.
 * The former market square has been fully replaced by the Hall of the Veil.
 */
export function ModernVillageSquareScene() {
  return <HallOfVeilScene />;
}

import type { GameEngine } from './runEngine';
import {
  createRunBalanceState,
  chapterBalanceProfile,
  updateRunBalance as updateLegacyRunBalance,
  type RunBalanceState,
} from './runBalanceLegacy';
import { updateDrownedReliquaryMechanics } from './drownedReliquaryMechanics';
import { updateShatteredObservatoryMechanics } from './shatteredObservatoryMechanics';

export { createRunBalanceState, chapterBalanceProfile };
export type { RunBalanceState, ChapterBalanceProfile } from './runBalanceLegacy';

export function updateRunBalance(engine: GameEngine, state: RunBalanceState): void {
  updateLegacyRunBalance(engine, state);
  updateShatteredObservatoryMechanics(engine);
  updateDrownedReliquaryMechanics(engine);
}

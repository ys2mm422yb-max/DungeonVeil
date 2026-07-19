import type { GameEngine } from './runEngine';
import { defenseMitigation, installCriticalHitRuntime } from './equipmentCombatV4';
import {
  createEquipmentPlayerRuntimeState,
  updateEquipmentPlayerRuntimeV4,
  type EquipmentPlayerRuntimeState,
} from './equipmentPlayerRuntimeV4';
import {
  applyCombatBalanceV4Overlay,
  createCombatBalanceOverlayState,
  type CombatBalanceOverlayState,
} from './combatBalanceOverlayV4';
import {
  applyChapterEncounterRuntimeV4,
  createChapterEncounterRuntimeStateV4,
  type ChapterEncounterRuntimeStateV4,
} from './chapterEncounterRuntimeV4';

export type EquipmentRuntimeBalanceState = {
  player: EquipmentPlayerRuntimeState;
  combat: CombatBalanceOverlayState;
  chapterEncounter: ChapterEncounterRuntimeStateV4;
  criticalDisposer: (() => void) | null;
};

export function createEquipmentRuntimeBalanceState(): EquipmentRuntimeBalanceState {
  return {
    player: createEquipmentPlayerRuntimeState(),
    combat: createCombatBalanceOverlayState(),
    chapterEncounter: createChapterEncounterRuntimeStateV4(),
    criticalDisposer: null,
  };
}

export function defenseMitigationForValue(defense: number): number {
  return defenseMitigation(defense, 0.52);
}

export function updateEquipmentRuntimeBalance(engine: GameEngine, state: EquipmentRuntimeBalanceState): void {
  if (!state.criticalDisposer) state.criticalDisposer = installCriticalHitRuntime(engine);
  applyChapterEncounterRuntimeV4(engine, state.chapterEncounter);
  applyCombatBalanceV4Overlay(engine, state.combat);
  updateEquipmentPlayerRuntimeV4(engine, state.player, performance.now());
}

import type { GameEngine } from './runEngine';
import { redesignedEquipmentCombatModifiers } from './equipmentCombatV4';
import { loadMetaProgression } from './metaStoreV4';

export const equipmentCombatModifiers = redesignedEquipmentCombatModifiers;

export function applyMetaLoadoutToNewRun(engine: GameEngine) {
  const stats = redesignedEquipmentCombatModifiers(loadMetaProgression());
  const player = engine.state.player as typeof engine.state.player & {
    critChance?: number;
    critDamageMultiplier?: number;
    attackSpeedPercent?: number;
    equipmentV4Applied?: boolean;
  };
  player.attack = Math.max(1, Math.round(player.attack + stats.attackFlat));
  player.defense = Math.max(0, player.defense + stats.defense);
  player.attackRange = Math.max(320, player.attackRange + stats.attackRange);
  player.maxHp = Math.max(1, player.maxHp + stats.maxHp);
  player.hp = Math.min(player.maxHp, player.hp + stats.maxHp);
  player.critChance = stats.critChance;
  player.critDamageMultiplier = stats.critDamageMultiplier;
  player.attackSpeedPercent = stats.attackSpeedPercent;
  player.equipmentV4Applied = true;
  engine.saveNow('equipment-loadout');
}

import type { GameEngine } from './runEngine';
import { equipmentCombatModifiers } from './metaProgression';
import { skillRank } from './runSkills';

const ARCHER_BASE_ATTACK_COOLDOWN_MS = 270;
const ARCHER_BASE_DODGE_COOLDOWN_MS = 900;
const QUICK_DRAW_MULTIPLIERS = [1, 1.16, 1.3, 1.42] as const;

export type EquipmentRuntimeBalanceState = {
  roomKey: string;
  lastAttackTime: number;
  lastDodgeTime: number;
  lastHp: number | null;
};

export function createEquipmentRuntimeBalanceState(): EquipmentRuntimeBalanceState {
  return { roomKey: '', lastAttackTime: 0, lastDodgeTime: 0, lastHp: null };
}

export function defenseMitigationForValue(defense: number): number {
  const safe = Math.max(0, Number(defense) || 0);
  return Math.min(0.45, safe / (safe + 28));
}

function latestPlayerHit(engine: GameEngine) {
  return [...engine.state.damageNumbers].reverse().find(number => number.id.startsWith('hit-') || number.id.startsWith('rune-hit-'));
}

function reconcileIncomingDamage(engine: GameEngine, state: EquipmentRuntimeBalanceState) {
  const player = engine.state.player;
  if (state.lastHp === null) {
    state.lastHp = player.hp;
    return;
  }

  if (player.hp >= state.lastHp) {
    state.lastHp = player.hp;
    return;
  }

  const rawDamage = Math.max(1, Math.round(state.lastHp - player.hp));
  const mitigation = defenseMitigationForValue(player.defense);
  const adjustedDamage = Math.max(1, Math.round(rawDamage * (1 - mitigation)));
  const restored = Math.max(0, rawDamage - adjustedDamage);
  if (restored > 0) player.hp = Math.min(player.maxHp, player.hp + restored);

  const number = latestPlayerHit(engine);
  if (number) number.value = `-${adjustedDamage}`;
  if (player.hp > 0 && engine.state.status === 'gameover') engine.state.status = 'playing';
  state.lastHp = player.hp;
}

function normalizeAttackCooldown(engine: GameEngine, state: EquipmentRuntimeBalanceState) {
  const player = engine.state.player;
  if (!player.lastAttackTime || player.lastAttackTime === state.lastAttackTime) return;
  state.lastAttackTime = player.lastAttackTime;
  const quickDrawRank = skillRank(engine.state.runSkills, 'attackSpeed');
  const equipment = equipmentCombatModifiers();
  player.attackCooldown = Math.max(
    90,
    Math.round(ARCHER_BASE_ATTACK_COOLDOWN_MS * equipment.attackCooldownMultiplier / QUICK_DRAW_MULTIPLIERS[quickDrawRank]),
  );
}

function normalizeDodgeCooldown(engine: GameEngine, state: EquipmentRuntimeBalanceState) {
  const player = engine.state.player;
  if (!player.lastDodgeTime || player.lastDodgeTime === state.lastDodgeTime) return;
  state.lastDodgeTime = player.lastDodgeTime;
  const equipment = equipmentCombatModifiers();
  player.dodgeCooldown = Math.max(250, Math.round(ARCHER_BASE_DODGE_COOLDOWN_MS * equipment.dodgeCooldownMultiplier));
}

export function updateEquipmentRuntimeBalance(engine: GameEngine, state: EquipmentRuntimeBalanceState): void {
  const key = `${engine.state.chapter}:${engine.state.floor}`;
  if (state.roomKey !== key) {
    state.roomKey = key;
    state.lastHp = engine.state.player.hp;
    state.lastAttackTime = engine.state.player.lastAttackTime;
    state.lastDodgeTime = engine.state.player.lastDodgeTime;
  }

  normalizeAttackCooldown(engine, state);
  normalizeDodgeCooldown(engine, state);
  reconcileIncomingDamage(engine, state);
}

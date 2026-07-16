import type { GameEngine } from './runEngine';
import { equipmentCombatModifiers, loadMetaProgression, type EquipmentId } from './metaProgression';
import { skillRank } from './runSkills';
import { equippedVeilRelic } from './veilRelics';

const ARCHER_BASE_ATTACK_COOLDOWN_MS = 270;
const ARCHER_BASE_DODGE_COOLDOWN_MS = 900;
const QUICK_DRAW_MULTIPLIERS = [1, 1.16, 1.3, 1.42] as const;

const EQUIPMENT_SKILL_SETS = Object.freeze({
  fireArrow: ['ember-bow', 'ash-amulet', 'ash-armor'] as EquipmentId[],
  iceArrow: ['frost-bow', 'frost-quiver', 'frost-grimoire', 'frost-armor'] as EquipmentId[],
  ricochet: ['veil-bow', 'rune-quiver', 'ritual-shard', 'veil-mantle'] as EquipmentId[],
  piercing: ['splinter-bow', 'splinter-quiver'] as EquipmentId[],
});

export type EquipmentRuntimeBalanceState = {
  roomKey: string;
  lastAttackTime: number;
  lastDodgeTime: number;
  lastHp: number | null;
  lastHitId: string;
  setBonusSignature: string;
};

export function createEquipmentRuntimeBalanceState(): EquipmentRuntimeBalanceState {
  return { roomKey: '', lastAttackTime: 0, lastDodgeTime: 0, lastHp: null, lastHitId: '', setBonusSignature: '' };
}

export function defenseMitigationForValue(defense: number): number {
  const safe = Math.max(0, Number(defense) || 0);
  return Math.min(0.45, safe / (safe + 28));
}

function latestPlayerHit(engine: GameEngine, state: EquipmentRuntimeBalanceState) {
  return [...engine.state.damageNumbers].reverse().find(number => (
    number.id !== state.lastHitId
    && (number.id.startsWith('hit-') || number.id.startsWith('rune-hit-'))
  ));
}

function enemyAttackForHit(engine: GameEngine, hitId: string): number | null {
  if (!hitId.startsWith('hit-')) return null;
  const index = Number(hitId.split('-').at(-1));
  if (!Number.isInteger(index) || index < 0) return null;
  const attack = engine.state.enemies[index]?.attack;
  return Number.isFinite(attack) ? Math.max(1, Number(attack)) : null;
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

  const observedDamage = Math.max(1, Math.round(state.lastHp - player.hp));
  const number = latestPlayerHit(engine, state);
  if (number) state.lastHitId = number.id;
  const enemyAttack = number ? enemyAttackForHit(engine, number.id) : null;
  const rawDamage = enemyAttack === null ? observedDamage : enemyAttack + 1;
  const runeReduced = Boolean(number?.id.startsWith('rune-hit-') && equippedVeilRelic() === 'depth-rune-shard');
  const unmitigatedDamage = runeReduced ? Math.max(1, Math.round(rawDamage * 0.75)) : rawDamage;
  const mitigation = defenseMitigationForValue(player.defense);
  const adjustedDamage = Math.max(1, Math.round(unmitigatedDamage * (1 - mitigation)));
  const previousStatus = engine.state.status;

  player.hp = Math.max(0, Math.min(player.maxHp, state.lastHp - adjustedDamage));
  if (number) number.value = `-${adjustedDamage}`;
  engine.state.status = player.hp <= 0 ? 'gameover' : previousStatus === 'gameover' ? 'playing' : previousStatus;
  state.lastHp = player.hp;

  if (engine.state.status !== previousStatus) engine.onStateChange({ ...engine.state });
}

function setRank(engine: GameEngine, key: 'fireArrow' | 'iceArrow' | 'ricochet' | 'piercing', rank: number) {
  if (rank <= skillRank(engine.state.runSkills, key)) return;
  engine.state.runSkills[key] = rank;
}

function applyEquipmentSetSkills(engine: GameEngine, state: EquipmentRuntimeBalanceState) {
  const meta = loadMetaProgression();
  const equipped = Object.values(meta.equipped);
  const signature = [...equipped].sort().join('|');
  if (state.setBonusSignature === signature) return;
  state.setBonusSignature = signature;

  for (const [key, pieces] of Object.entries(EQUIPMENT_SKILL_SETS) as Array<['fireArrow' | 'iceArrow' | 'ricochet' | 'piercing', EquipmentId[]]>) {
    const count = pieces.filter(id => equipped.includes(id)).length;
    const rank = count >= 3 ? 3 : count >= 2 ? 2 : 0;
    if (rank > 0) setRank(engine, key, rank);
  }
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
    state.lastHitId = '';
  }

  applyEquipmentSetSkills(engine, state);
  normalizeAttackCooldown(engine, state);
  normalizeDodgeCooldown(engine, state);
  reconcileIncomingDamage(engine, state);
}

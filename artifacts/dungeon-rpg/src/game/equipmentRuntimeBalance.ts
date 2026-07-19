import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';
import { equippedVeilRelic } from './veilRelics';
import { activeEquipmentLoadoutStats } from './equipmentCoreRuntime';
import { effectiveAttackCooldown } from './equipmentCore';
import { installCriticalCombat } from './criticalCombat';

const ARCHER_BASE_ATTACK_COOLDOWN_MS = 270;
const QUICK_DRAW_MULTIPLIERS = [1, 1.16, 1.3, 1.42] as const;

installCriticalCombat();

export type EquipmentRuntimeBalanceState = {
  roomKey: string;
  lastAttackTime: number;
  lastHp: number | null;
  lastHitId: string;
  loadoutSignature: string;
};

export function createEquipmentRuntimeBalanceState(): EquipmentRuntimeBalanceState {
  return { roomKey: '', lastAttackTime: 0, lastHp: null, lastHitId: '', loadoutSignature: '' };
}

export function defenseMitigationForValue(defense: number): number {
  const safe = Math.max(0, Number(defense) || 0);
  return Math.min(0.45, safe / (safe + 28));
}

function latestPlayerHit(engine: GameEngine, state: EquipmentRuntimeBalanceState) {
  return [...engine.state.damageNumbers].reverse().find(number => (
    number.id !== state.lastHitId
    && (number.id.startsWith('hit-') || number.id.startsWith('rune-hit-') || number.id.startsWith('volatile-hit-'))
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

function synchronizeActiveLoadout(engine: GameEngine, state: EquipmentRuntimeBalanceState): void {
  const equipment = activeEquipmentLoadoutStats();
  const signature = equipment.equippedIds.join('|');
  if (state.loadoutSignature !== signature) state.loadoutSignature = signature;
  engine.state.player.critChance = equipment.critChanceTotal;
  engine.state.player.critDamage = equipment.critDamageTotal;
}

function normalizeAttackCooldown(engine: GameEngine, state: EquipmentRuntimeBalanceState) {
  const player = engine.state.player;
  if (!player.lastAttackTime || player.lastAttackTime === state.lastAttackTime) return;
  state.lastAttackTime = player.lastAttackTime;
  const quickDrawRank = skillRank(engine.state.runSkills, 'attackSpeed');
  const quickDrawBase = ARCHER_BASE_ATTACK_COOLDOWN_MS / QUICK_DRAW_MULTIPLIERS[quickDrawRank];
  const equipment = activeEquipmentLoadoutStats();
  player.attackCooldown = effectiveAttackCooldown(quickDrawBase, equipment.attackSpeedPercent);
}

export function updateEquipmentRuntimeBalance(engine: GameEngine, state: EquipmentRuntimeBalanceState): void {
  const key = `${engine.state.chapter}:${engine.state.floor}`;
  if (state.roomKey !== key) {
    state.roomKey = key;
    state.lastHp = engine.state.player.hp;
    state.lastAttackTime = engine.state.player.lastAttackTime;
    state.lastHitId = '';
  }

  synchronizeActiveLoadout(engine, state);
  normalizeAttackCooldown(engine, state);
  reconcileIncomingDamage(engine, state);
}

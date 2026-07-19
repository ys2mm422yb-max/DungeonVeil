import type { GameEngine } from './runEngine';
import { equipmentCombatModifiers, loadMetaProgression } from './metaProgression';
import { skillRank } from './runSkills';
import { equippedVeilRelic, loadVeilRelicProfile } from './veilRelics';
import { defenseMitigation } from './equipmentCombatV4';
import {
  RELIC_COMBAT_V4,
  depthRuneBeforeDefenseV4,
  guardianCrownAttackMultiplierV4,
  markedClawAttackCooldownV4,
} from './relicCombatContractV4';

const ARCHER_BASE_ATTACK_COOLDOWN_MS = 270;
const QUICK_DRAW_MULTIPLIERS = [1, 1.16, 1.3, 1.42] as const;

export type EquipmentPlayerRuntimeState = {
  roomKey: string;
  lastAttackTime: number;
  lastHp: number | null;
  lastHitId: string;
  lastKillCount: number;
  clawUntil: number;
  crownStack: number;
  crownInitialized: boolean;
  crownBaseAttack: number | null;
};

export function createEquipmentPlayerRuntimeState(): EquipmentPlayerRuntimeState {
  return {
    roomKey: '', lastAttackTime: 0, lastHp: null, lastHitId: '', lastKillCount: 0,
    clawUntil: 0, crownStack: 0, crownInitialized: false, crownBaseAttack: null,
  };
}

function latestPlayerHit(engine: GameEngine, state: EquipmentPlayerRuntimeState) {
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

function initializeLoadout(engine: GameEngine) {
  const player = engine.state.player as typeof engine.state.player & {
    critChance?: number;
    critDamageMultiplier?: number;
    attackSpeedPercent?: number;
    equipmentV4Applied?: boolean;
  };
  const equipment = equipmentCombatModifiers();
  if (!player.equipmentV4Applied) {
    player.attack = Math.max(1, Math.round(player.attack + equipment.attackFlat));
    player.defense = Math.max(0, player.defense + equipment.defense);
    player.attackRange = Math.max(320, player.attackRange + equipment.attackRange);
    player.maxHp = Math.max(1, player.maxHp + equipment.maxHp);
    player.hp = Math.min(player.maxHp, player.hp + equipment.maxHp);
    player.equipmentV4Applied = true;
  }
  player.critChance = equipment.critChance;
  player.critDamageMultiplier = equipment.critDamageMultiplier;
  player.attackSpeedPercent = equipment.attackSpeedPercent;
}

function reconcileIncomingDamage(engine: GameEngine, state: EquipmentPlayerRuntimeState) {
  const player = engine.state.player;
  if (state.lastHp === null) { state.lastHp = player.hp; return; }
  if (player.hp >= state.lastHp) { state.lastHp = player.hp; return; }
  const observedDamage = Math.max(1, Math.round(state.lastHp - player.hp));
  const number = latestPlayerHit(engine, state);
  if (number) state.lastHitId = number.id;
  const enemyAttack = number ? enemyAttackForHit(engine, number.id) : null;
  const rawDamage = enemyAttack === null ? observedDamage : enemyAttack + 1;
  const runeHit = Boolean(number?.id.startsWith('rune-hit-'));
  const beforeDefense = depthRuneBeforeDefenseV4(
    rawDamage,
    runeHit && equippedVeilRelic() === 'depth-rune-shard',
  );
  const bossLike = Boolean(number?.id.startsWith('rune-hit-') || number?.id.startsWith('volatile-hit-'));
  const mitigation = defenseMitigation(player.defense, bossLike ? 0.44 : 0.52);
  const adjustedDamage = Math.max(1, Math.round(beforeDefense * (1 - mitigation)));
  const previousStatus = engine.state.status;
  player.hp = Math.max(0, Math.min(player.maxHp, state.lastHp - adjustedDamage));
  if (number) number.value = `-${adjustedDamage}`;
  engine.state.status = player.hp <= 0 ? 'gameover' : previousStatus === 'gameover' ? 'playing' : previousStatus;
  state.lastHp = player.hp;
  if (engine.state.status !== previousStatus) engine.onStateChange({ ...engine.state });
}

function updateBoundedRelics(engine: GameEngine, state: EquipmentPlayerRuntimeState, time: number) {
  const relic = equippedVeilRelic();
  const player = engine.state.player;
  const kills = Math.max(0, engine.state.killCount ?? 0);
  if (relic === 'marked-claw') {
    if (Math.floor(kills / RELIC_COMBAT_V4.markedClaw.killsPerProc) > Math.floor(state.lastKillCount / RELIC_COMBAT_V4.markedClaw.killsPerProc)) {
      state.clawUntil = time + RELIC_COMBAT_V4.markedClaw.durationMs;
    }
    player.relicAttackSpeedUntil = state.clawUntil;
  } else {
    state.clawUntil = 0;
    player.relicAttackSpeedUntil = 0;
  }
  state.lastKillCount = kills;

  const runId = loadMetaProgression().currentRunId;
  const stack = relic === 'broken-guardian-crown' && runId
    ? Math.max(0, Math.min(RELIC_COMBAT_V4.guardianCrown.maxStacks, loadVeilRelicProfile().crownRunStacks[runId] ?? 0))
    : 0;
  if (!state.crownInitialized) {
    const legacyMultiplier = Math.pow(1 + RELIC_COMBAT_V4.guardianCrown.legacyAttackPerStack, stack);
    state.crownBaseAttack = Math.max(1, player.attack / Math.max(1, legacyMultiplier));
    player.attack = Math.max(1, Math.round(state.crownBaseAttack * guardianCrownAttackMultiplierV4(stack)));
    state.crownInitialized = true;
  } else if (stack !== state.crownStack) {
    const base = state.crownBaseAttack ?? Math.max(1, player.attack / guardianCrownAttackMultiplierV4(state.crownStack));
    state.crownBaseAttack = base;
    player.attack = Math.max(1, Math.round(base * guardianCrownAttackMultiplierV4(stack)));
  } else {
    state.crownBaseAttack = Math.max(1, player.attack / guardianCrownAttackMultiplierV4(stack));
  }
  state.crownStack = stack;
}

function normalizeAttackCooldown(engine: GameEngine, state: EquipmentPlayerRuntimeState, time: number) {
  const player = engine.state.player as typeof engine.state.player & { attackSpeedPercent?: number };
  if (!player.lastAttackTime || player.lastAttackTime === state.lastAttackTime) return;
  state.lastAttackTime = player.lastAttackTime;
  const quickDrawRank = skillRank(engine.state.runSkills, 'attackSpeed');
  player.attackCooldown = markedClawAttackCooldownV4(
    ARCHER_BASE_ATTACK_COOLDOWN_MS,
    player.attackSpeedPercent ?? 0,
    QUICK_DRAW_MULTIPLIERS[quickDrawRank],
    equippedVeilRelic() === 'marked-claw' && (player.relicAttackSpeedUntil ?? 0) > time,
  );
}

export function updateEquipmentPlayerRuntimeV4(
  engine: GameEngine,
  state: EquipmentPlayerRuntimeState,
  time: number,
): void {
  initializeLoadout(engine);
  const key = `${engine.state.chapter}:${engine.state.floor}`;
  if (state.roomKey !== key) {
    state.roomKey = key;
    state.lastHp = engine.state.player.hp;
    state.lastAttackTime = engine.state.player.lastAttackTime;
    state.lastHitId = '';
    if (!state.lastKillCount) state.lastKillCount = Math.max(0, engine.state.killCount ?? 0);
  }
  updateBoundedRelics(engine, state, time);
  normalizeAttackCooldown(engine, state, time);
  reconcileIncomingDamage(engine, state);
}

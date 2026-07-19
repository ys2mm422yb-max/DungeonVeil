import type { GameEngine } from './runEngine';
import { equipmentCombatModifiers, loadMetaProgression } from './metaProgression';
import { skillRank } from './runSkills';
import { equippedVeilRelic, loadVeilRelicProfile } from './veilRelics';
import { defenseMitigation } from './equipmentCombatV4';

const ARCHER_BASE_ATTACK_COOLDOWN_MS = 270;
const QUICK_DRAW_MULTIPLIERS = [1, 1.16, 1.3, 1.42] as const;
const MIN_ATTACK_COOLDOWN_MS = 125;

export type EquipmentPlayerRuntimeState = {
  roomKey: string;
  lastAttackTime: number;
  lastHp: number | null;
  lastHitId: string;
  lastKillCount: number;
  clawUntil: number;
  crownStack: number;
  crownInitialized: boolean;
};

export function createEquipmentPlayerRuntimeState(): EquipmentPlayerRuntimeState {
  return {
    roomKey: '', lastAttackTime: 0, lastHp: null, lastHitId: '', lastKillCount: 0,
    clawUntil: 0, crownStack: 0, crownInitialized: false,
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
  const runeFactor = runeHit && equippedVeilRelic() === 'depth-rune-shard' ? 0.82 : 1;
  const beforeDefense = Math.max(1, Math.round(rawDamage * runeFactor));
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
    if (Math.floor(kills / 7) > Math.floor(state.lastKillCount / 7)) state.clawUntil = time + 2500;
    player.relicAttackSpeedUntil = state.clawUntil;
  } else {
    state.clawUntil = 0;
    player.relicAttackSpeedUntil = 0;
  }
  state.lastKillCount = kills;

  const runId = loadMetaProgression().currentRunId;
  const stack = relic === 'broken-guardian-crown' && runId
    ? Math.max(0, Math.min(4, loadVeilRelicProfile().crownRunStacks[runId] ?? 0))
    : 0;
  if (!state.crownInitialized) {
    if (stack > 0) player.attack = Math.max(1, Math.round(player.attack * Math.pow(1.03 / 1.04, stack)));
    state.crownInitialized = true;
  } else if (stack > state.crownStack) {
    for (let index = state.crownStack; index < stack; index++) {
      player.attack = Math.max(1, Math.round(player.attack / 1.04 * 1.03));
    }
  }
  state.crownStack = stack;
}

function normalizeAttackCooldown(engine: GameEngine, state: EquipmentPlayerRuntimeState, time: number) {
  const player = engine.state.player as typeof engine.state.player & { attackSpeedPercent?: number };
  if (!player.lastAttackTime || player.lastAttackTime === state.lastAttackTime) return;
  state.lastAttackTime = player.lastAttackTime;
  const quickDrawRank = skillRank(engine.state.runSkills, 'attackSpeed');
  const equipmentSpeed = Math.max(0, Math.min(0.45, player.attackSpeedPercent ?? 0));
  const clawSpeed = equippedVeilRelic() === 'marked-claw' && (player.relicAttackSpeedUntil ?? 0) > time ? 0.14 : 0;
  const totalMultiplier = Math.min(1.75, (1 + equipmentSpeed + clawSpeed) * QUICK_DRAW_MULTIPLIERS[quickDrawRank]);
  player.attackCooldown = Math.max(MIN_ATTACK_COOLDOWN_MS, Math.round(ARCHER_BASE_ATTACK_COOLDOWN_MS / totalMultiplier));
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

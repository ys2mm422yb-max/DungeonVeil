import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';
import {
  RELIC_COMBAT_V4,
  depthRuneDamageV4,
  guardianCrownAttackMultiplierV4,
  markedClawAttackCooldownV4,
} from './relicCombatContractV4';
import { equippedVeilRelic, loadVeilRelicProfile } from './veilRelics';

const ARCHER_BASE_COOLDOWN_MS = 270;
const SPEED_MULTIPLIERS = [1, 1.16, 1.3, 1.42] as const;
const META_KEY = 'dungeon-veil-meta';

export type RelicRuntimeCorrectionStateV4 = {
  lastKillCount: number;
  clawKillChain: number;
  lastAttackTime: number;
  lastAppliedClawUntil: number;
  beforeAttack: number;
  beforeCrownStack: number;
  processedRuneHits: Set<string>;
};

function currentRunId(): string {
  try {
    const parsed = JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as { currentRunId?: unknown };
    return typeof parsed.currentRunId === 'string' ? parsed.currentRunId : '';
  } catch {
    return '';
  }
}

function currentCrownStack(): number {
  const runId = currentRunId();
  if (!runId) return 0;
  return Math.max(0, Math.min(
    RELIC_COMBAT_V4.guardianCrown.maxStacks,
    Math.floor(loadVeilRelicProfile().crownRunStacks[runId] ?? 0),
  ));
}

export function createRelicRuntimeCorrectionStateV4(engine: GameEngine | null): RelicRuntimeCorrectionStateV4 {
  return {
    lastKillCount: Math.max(0, engine?.state.killCount ?? 0),
    clawKillChain: 0,
    lastAttackTime: engine?.state.player.lastAttackTime ?? 0,
    lastAppliedClawUntil: 0,
    beforeAttack: engine?.state.player.attack ?? 0,
    beforeCrownStack: currentCrownStack(),
    processedRuneHits: new Set<string>(),
  };
}

export function prepareRelicRuntimeCorrectionV4(engine: GameEngine, state: RelicRuntimeCorrectionStateV4): void {
  state.beforeAttack = engine.state.player.attack;
  state.beforeCrownStack = currentCrownStack();
}

function correctMarkedClaw(engine: GameEngine, state: RelicRuntimeCorrectionStateV4, time: number): void {
  const player = engine.state.player;
  const active = equippedVeilRelic() === 'marked-claw';
  const currentKills = Math.max(0, engine.state.killCount ?? 0);
  const gainedKills = currentKills >= state.lastKillCount ? currentKills - state.lastKillCount : currentKills;
  state.lastKillCount = currentKills;

  if (!active) {
    state.clawKillChain = 0;
    state.lastAppliedClawUntil = 0;
    if ((player.relicAttackSpeedUntil ?? 0) > time) player.relicAttackSpeedUntil = 0;
  } else if (gainedKills > 0) {
    const previousChain = state.clawKillChain;
    state.clawKillChain += gainedKills;
    const previousProc = Math.floor(previousChain / RELIC_COMBAT_V4.markedClaw.killsPerProc);
    const nextProc = Math.floor(state.clawKillChain / RELIC_COMBAT_V4.markedClaw.killsPerProc);
    if (nextProc > previousProc) {
      state.lastAppliedClawUntil = time + RELIC_COMBAT_V4.markedClaw.durationMs;
      player.relicAttackSpeedUntil = state.lastAppliedClawUntil;
      engine.state.effects.push({
        id: `claw-v4-${time}`,
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        radius: 0,
        maxRadius: 58,
        color: '#e15e4e',
        lifeTime: 0,
        maxLifeTime: 440,
        type: 'circle',
        element: 'fire',
      });
      window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', {
        detail: {
          title: 'GEZEICHNETE KRALLE',
          text: `+${Math.round(RELIC_COMBAT_V4.markedClaw.attackSpeedBonus * 100)} % Angriffstempo · ${RELIC_COMBAT_V4.markedClaw.durationMs / 1000} Sekunden`,
          tone: 'relic',
        },
      }));
    } else if ((player.relicAttackSpeedUntil ?? 0) > time && player.relicAttackSpeedUntil !== state.lastAppliedClawUntil) {
      player.relicAttackSpeedUntil = state.lastAppliedClawUntil > time ? state.lastAppliedClawUntil : 0;
    }
  } else if ((player.relicAttackSpeedUntil ?? 0) > time && player.relicAttackSpeedUntil !== state.lastAppliedClawUntil) {
    player.relicAttackSpeedUntil = state.lastAppliedClawUntil > time ? state.lastAppliedClawUntil : 0;
  }

  if (player.lastAttackTime > state.lastAttackTime) {
    state.lastAttackTime = player.lastAttackTime;
    const rank = skillRank(engine.state.runSkills, 'attackSpeed');
    const baseCooldown = ARCHER_BASE_COOLDOWN_MS / SPEED_MULTIPLIERS[rank];
    player.attackCooldown = markedClawAttackCooldownV4(
      baseCooldown,
      active && time < (player.relicAttackSpeedUntil ?? 0),
    );
  }
}

function correctGuardianCrown(engine: GameEngine, state: RelicRuntimeCorrectionStateV4): void {
  if (equippedVeilRelic() !== 'broken-guardian-crown') return;
  const afterStack = currentCrownStack();
  if (afterStack <= state.beforeCrownStack) return;

  let correctedAttack = state.beforeAttack;
  for (let stack = state.beforeCrownStack; stack < afterStack; stack++) {
    const next = Math.max(
      correctedAttack + 1,
      Math.round(state.beforeAttack * guardianCrownAttackMultiplierV4(stack + 1)),
    );
    correctedAttack = next;
  }
  engine.state.player.attack = correctedAttack;
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', {
    detail: {
      title: 'DIE KRONE ERWACHT',
      text: `+${Math.round(RELIC_COMBAT_V4.guardianCrown.attackPerStack * 100)} % Angriff · Stapel ${afterStack}/${RELIC_COMBAT_V4.guardianCrown.maxStacks}`,
      tone: 'relic',
    },
  }));
}

function correctDepthRune(engine: GameEngine, state: RelicRuntimeCorrectionStateV4): void {
  const player = engine.state.player;
  const equipped = equippedVeilRelic() === 'depth-rune-shard';
  for (const number of engine.state.damageNumbers) {
    if (!number.id.startsWith('rune-hit-') || state.processedRuneHits.has(number.id)) continue;
    state.processedRuneHits.add(number.id);
    const rawDamage = Math.abs(Number(number.value));
    if (!Number.isFinite(rawDamage) || rawDamage <= 0) continue;
    const correctedDamage = depthRuneDamageV4(rawDamage, player.defense, equipped);
    const refund = Math.max(0, rawDamage - correctedDamage);
    if (refund > 0) player.hp = Math.min(player.maxHp, player.hp + refund);
    number.value = `-${correctedDamage}`;
    if (equipped) {
      number.color = '#8fc9ff';
      engine.state.effects.push({
        id: `depth-rune-guard-${number.id}`,
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        radius: 0,
        maxRadius: 48,
        color: '#7dbfff',
        lifeTime: 0,
        maxLifeTime: 360,
        type: 'circle',
        element: 'arcane',
      });
    }
  }
  if (state.processedRuneHits.size > 80) {
    const recent = [...state.processedRuneHits].slice(-30);
    state.processedRuneHits.clear();
    recent.forEach(id => state.processedRuneHits.add(id));
  }
}

export function finalizeRelicRuntimeCorrectionV4(
  engine: GameEngine,
  state: RelicRuntimeCorrectionStateV4,
  time: number,
): void {
  correctMarkedClaw(engine, state, time);
  correctGuardianCrown(engine, state);
  correctDepthRune(engine, state);
}

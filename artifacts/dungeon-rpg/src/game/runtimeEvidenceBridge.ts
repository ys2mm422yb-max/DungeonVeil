import { CHAPTER_ROOMS } from './chapterRun';
import { TileType } from './dungeon';
import { applyGiftUpgrade } from './giftUpgradeController';
import type { GameState } from './runEngine';
import { GameEngine } from './runEngine';
import { isEnemyFamilyId, runtimeEnemyTypeForFamily, type EnemyFamilyId } from './enemyRegistry';
import { ensureVeilHeartConsumedForCurrentRun } from './veilRelics';

const MARKER = 'dungeon-veil-runtime-evidence-v1';
const META_KEY = 'dungeon-veil-meta';
const RELIC_KEY = 'dungeon-veil-relics-v2';
const TERMINAL_DEATH_EVIDENCE_RUN_KEY = 'dungeon-veil-terminal-death-evidence-run-v1';

type EvidenceMode = 'solo' | 'duo';
type TerminalDeathTransitionArm = {
  armedAt: number;
  updateIndex: number;
  lastObservedStatus: GameState['status'];
  lastObservedHp: number;
  sourceDiagnostics: Record<string, unknown>;
  sourceSnapshot: Record<string, unknown>;
};

type RuntimeEvidenceApi = {
  snapshot: () => Record<string, unknown> | null;
  prepareTerminalDeathEvidence: () => Record<string, unknown> | null;
  forcePlayerDeath: () => Record<string, unknown> | null;
  loadRoom: (room: number, mode?: EvidenceMode) => Record<string, unknown> | null;
  killLivingEnemies: () => Record<string, unknown> | null;
  moveToExit: () => Record<string, unknown> | null;
  chooseFirstGift: () => Record<string, unknown> | null;
  prepareAttackGiftEvidence: () => Record<string, unknown> | null;
  saturateRunGiftsAtFullHp: () => Record<string, unknown> | null;
  setMode: (mode: EvidenceMode) => void;
  setPlayerStats: (attack: number, defense: number) => Record<string, unknown> | null;
  setLivingEnemyFamilies: (families: string[]) => Record<string, unknown> | null;
};

declare global {
  interface Window {
    __dungeonVeilRuntimeEvidence?: RuntimeEvidenceApi;
  }
}

let currentEngine: GameEngine | null = null;
let installed = false;
let terminalDeathTransitionArm: TerminalDeathTransitionArm | null = null;

function allowed(): boolean {
  if (typeof window === 'undefined') return false;
  const local = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  try { return local && sessionStorage.getItem(MARKER) === '1'; }
  catch { return false; }
}

function terminalDeathRunDiagnostics(): Record<string, unknown> {
  let currentRunId = '';
  let terminalDeathEvidenceRunId = '';
  let equipped: unknown = null;
  let consumedHeartRuns: unknown[] = [];
  try {
    const meta = JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as { currentRunId?: unknown };
    currentRunId = typeof meta.currentRunId === 'string' ? meta.currentRunId : '';
  } catch {}
  try { terminalDeathEvidenceRunId = sessionStorage.getItem(TERMINAL_DEATH_EVIDENCE_RUN_KEY) ?? ''; } catch {}
  try {
    const profile = JSON.parse(localStorage.getItem(RELIC_KEY) ?? '{}') as { equipped?: unknown; consumedHeartRuns?: unknown };
    equipped = profile.equipped ?? null;
    consumedHeartRuns = Array.isArray(profile.consumedHeartRuns) ? profile.consumedHeartRuns.slice(-30) : [];
  } catch {}
  return { currentRunId, terminalDeathEvidenceRunId, equipped, consumedHeartRuns };
}

function stateSnapshot(engine = currentEngine): Record<string, unknown> | null {
  if (!engine) return null;
  const state = engine.state;
  const livingEnemies = state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  return {
    floor: state.floor,
    chapter: state.chapter,
    status: state.status,
    hp: state.player.hp,
    maxHp: state.player.maxHp,
    playerX: state.player.x,
    playerY: state.player.y,
    playerFacingX: state.player.facing.x,
    playerFacingY: state.player.facing.y,
    playerLastAttackTime: state.player.lastAttackTime,
    playerAttackCooldown: state.player.attackCooldown,
    livingEnemies: livingEnemies.length,
    livingEnemyFamilies: livingEnemies.map(enemy => enemy.enemyFamilyId ?? null),
    livingEnemyPositions: livingEnemies.map(enemy => ({
      id: enemy.id,
      x: enemy.x + enemy.width / 2,
      y: enemy.y + enemy.height / 2,
    })),
    deadEnemies: state.enemies.filter(enemy => enemy.isDead || enemy.hp <= 0).length,
    roomClearReady: state.roomClearReady,
    effects: state.effects.map(effect => effect.id),
    damageNumbers: state.damageNumbers.map(number => number.id),
    upgradeChoices: [...state.upgradeChoices],
    runMode: document.documentElement.dataset.dungeonVeilRunMode ?? 'solo',
    orientation: document.documentElement.dataset.dungeonVeilOrientation ?? 'portrait',
  };
}

function emit(engine: GameEngine): void {
  engine.onStateChange({
    ...engine.state,
    player: { ...engine.state.player, facing: { ...engine.state.player.facing } },
    enemies: engine.state.enemies.map(enemy => ({ ...enemy })),
    items: engine.state.items.map(item => ({ ...item })),
    damageNumbers: engine.state.damageNumbers.map(number => ({ ...number })),
    particles: engine.state.particles.map(particle => ({ ...particle })),
    effects: engine.state.effects.map(effect => ({ ...effect })),
  } as GameState);
}

function setMode(mode: EvidenceMode): void {
  document.documentElement.dataset.dungeonVeilRunMode = mode;
}

function attachApi(): void {
  if (!allowed()) return;
  window.__dungeonVeilRuntimeEvidence = {
    snapshot: () => stateSnapshot(),
    prepareTerminalDeathEvidence: () => {
      const engine = currentEngine;
      if (!engine) return null;
      terminalDeathTransitionArm = null;
      const beforeEnsure = terminalDeathRunDiagnostics();
      if (!ensureVeilHeartConsumedForCurrentRun()) {
        throw new Error(`Terminal death evidence requires a current run id before preparation: ${JSON.stringify({ beforeEnsure })}`);
      }
      return {
        beforeEnsure,
        afterEnsure: terminalDeathRunDiagnostics(),
        snapshot: stateSnapshot(engine),
      };
    },
    forcePlayerDeath: () => {
      const engine = currentEngine;
      if (!engine) return null;
      terminalDeathTransitionArm = null;
      const beforeEnsure = terminalDeathRunDiagnostics();
      if (!ensureVeilHeartConsumedForCurrentRun()) {
        throw new Error(`Terminal death evidence requires a current run id before forcing 0 HP: ${JSON.stringify({ beforeEnsure })}`);
      }
      const afterEnsure = terminalDeathRunDiagnostics();
      engine.state.player.hp = 0;
      engine.update(performance.now() + 17);
      const afterUpdate = terminalDeathRunDiagnostics();
      emit(engine);
      const snapshot = stateSnapshot(engine);
      if (engine.state.status !== 'gameover' || engine.state.player.hp > 0) {
        throw new Error(`Terminal death evidence revived during lethal update: ${JSON.stringify({ beforeEnsure, afterEnsure, afterUpdate, snapshot })}`);
      }
      terminalDeathTransitionArm = {
        armedAt: performance.now(),
        updateIndex: 0,
        lastObservedStatus: engine.state.status,
        lastObservedHp: engine.state.player.hp,
        sourceDiagnostics: afterUpdate,
        sourceSnapshot: snapshot ?? {},
      };
      return snapshot;
    },
    loadRoom: (requestedRoom, mode = 'solo') => {
      const engine = currentEngine;
      if (!engine) return null;
      terminalDeathTransitionArm = null;
      const room = Math.max(1, Math.min(CHAPTER_ROOMS, Math.floor(Number(requestedRoom) || 1)));
      const player = engine.state.player;
      const roomChanges = engine.state.floor !== room || engine.state.chapter !== 1;
      const sameRoomQaKey = `qa-reload:1:${room}`;
      setMode(mode);
      document.documentElement.dataset.dungeonVeilRoomBuildState = 'preparing';
      document.documentElement.dataset.dungeonVeilRoomBuildFloor = String(room);
      if (!roomChanges) {
        window.dispatchEvent(new CustomEvent('dungeon-veil-room-preparing', {
          detail: { key: sameRoomQaKey, floor: room, qaReload: true },
        }));
      }
      engine.continueGame({
        playerName: player.playerName === 'Hero' ? 'Runtime Ranger' : player.playerName,
        playerClass: 'archer',
        floor: room,
        chapter: 1,
        level: Math.max(1, player.level),
        xp: 0,
        hp: 9_999,
        maxHp: 9_999,
        // Keep the evidence target durable while still allowing level-2 Critical Support
        // to round its real Special to the minimum publishable one damage.
        attack: 9,
        defense: 5_000,
        speed: Math.max(220, player.speed),
        attackRange: 520,
        skillRange: 520,
        killCount: engine.state.killCount,
        worldX: player.x,
        worldY: player.y,
        dungeonEntranceX: 0,
        dungeonEntranceY: 0,
        playerX: player.x,
        playerY: player.y,
        inDungeon: true,
        overworldMap: engine.state.map,
        savedAt: Date.now(),
        runSkills: engine.state.runSkills,
      });
      engine.state.player.hp = 9_999;
      engine.state.player.maxHp = 9_999;
      engine.state.player.attack = 9;
      engine.state.player.defense = 5_000;
      engine.state.status = 'playing';
      engine.lastTime = performance.now();
      emit(engine);
      if (!roomChanges) {
        document.documentElement.dataset.dungeonVeilRoomBuildState = 'ready';
        window.dispatchEvent(new CustomEvent('dungeon-veil-room-ready', {
          detail: { key: sameRoomQaKey, floor: room, qaReload: true },
        }));
      }
      return stateSnapshot(engine);
    },
    killLivingEnemies: () => {
      const engine = currentEngine;
      if (!engine) return null;
      for (const enemy of engine.state.enemies) {
        if (!enemy.isDead && enemy.hp > 0) enemy.hp = 0;
      }
      engine.update(performance.now() + 17);
      emit(engine);
      return stateSnapshot(engine);
    },
    moveToExit: () => {
      const engine = currentEngine;
      if (!engine) return null;
      for (let y = 0; y < engine.state.map.height; y++) {
        const x = engine.state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
        if (x < 0) continue;
        engine.state.player.x = x * 40 + 4;
        engine.state.player.y = y * 40 + 4;
        break;
      }
      engine.update(performance.now() + 17);
      emit(engine);
      return stateSnapshot(engine);
    },
    chooseFirstGift: () => {
      const engine = currentEngine;
      if (!engine) return null;
      const choice = engine.state.upgradeChoices[0];
      if (choice) applyGiftUpgrade(engine, choice);
      emit(engine);
      return stateSnapshot(engine);
    },
    prepareAttackGiftEvidence: () => {
      const engine = currentEngine;
      if (!engine) return null;
      engine.state.runSkills = {
        elementalStorm: 1,
        veilChain: 1,
        multishot: 3,
        speed: 3,
        defense: 3,
      };
      engine.state.upgradeChoices = [];
      engine.state.status = 'levelup';
      emit(engine);
      const expectedChoices = ['attack', 'attackSpeed', 'maxHp'] as const;
      const actualChoices = engine.state.upgradeChoices;
      if (actualChoices.length !== expectedChoices.length || expectedChoices.some(choice => !actualChoices.includes(choice))) {
        throw new Error(`Attack gift evidence preparation drifted: ${actualChoices.join(',')}`);
      }
      return stateSnapshot(engine);
    },
    saturateRunGiftsAtFullHp: () => {
      const engine = currentEngine;
      if (!engine) return null;
      engine.state.runSkills = {
        elementalStorm: 1,
        arrowStorm: 1,
        veilChain: 1,
        attack: 3,
        maxHp: 3,
        speed: 3,
        defense: 3,
        hunterBlessing: 3,
        vitalSpark: 3,
      };
      engine.state.player.hp = engine.state.player.maxHp;
      emit(engine);
      return stateSnapshot(engine);
    },
    setMode,
    setPlayerStats: (attack, defense) => {
      const engine = currentEngine;
      if (!engine) return null;
      engine.state.player.attack = Math.max(1, Number(attack) || 1);
      engine.state.player.defense = Math.max(0, Number(defense) || 0);
      engine.state.player.hp = Math.max(engine.state.player.hp, 9_999);
      engine.state.player.maxHp = Math.max(engine.state.player.maxHp, 9_999);
      emit(engine);
      return stateSnapshot(engine);
    },
    setLivingEnemyFamilies: requestedFamilies => {
      const engine = currentEngine;
      if (!engine) return null;
      const families = requestedFamilies.filter(isEnemyFamilyId) as EnemyFamilyId[];
      if (!families.length) return stateSnapshot(engine);
      const livingEnemies = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
      for (const [index, enemy] of livingEnemies.entries()) {
        const familyId = families[index % families.length];
        enemy.enemyFamilyId = familyId;
        enemy.enemyType = runtimeEnemyTypeForFamily(familyId);
      }
      emit(engine);
      return stateSnapshot(engine);
    },
  };
}

export function attachRuntimeEvidenceEngine(engine: GameEngine): void {
  if (!allowed()) return;
  currentEngine = engine;
  attachApi();
}

export function installRuntimeEvidenceBridge(): void {
  if (!allowed() || installed) return;
  installed = true;
  const prototype = GameEngine.prototype as any;
  const start = prototype.startNewGame;
  const resume = prototype.continueGame;
  const update = prototype.update;

  prototype.startNewGame = function (this: GameEngine, ...args: any[]) {
    terminalDeathTransitionArm = null;
    currentEngine = this;
    const result = start.apply(this, args);
    attachApi();
    return result;
  };
  prototype.continueGame = function (this: GameEngine, ...args: any[]) {
    terminalDeathTransitionArm = null;
    currentEngine = this;
    const result = resume.apply(this, args);
    attachApi();
    return result;
  };
  prototype.update = function (this: GameEngine, ...args: any[]) {
    currentEngine = this;
    const armed = terminalDeathTransitionArm;
    if (armed) {
      const currentStatus = this.state.status;
      const currentHp = this.state.player.hp;
      if (armed.lastObservedStatus === 'gameover' && armed.lastObservedHp <= 0 && (currentStatus !== 'gameover' || currentHp > 0)) {
        terminalDeathTransitionArm = null;
        throw new Error(`Terminal death evidence transitioned between GameEngine updates: ${JSON.stringify({
          phase: 'before-next-GameEngine.update',
          armedAt: armed.armedAt,
          updateIndex: armed.updateIndex,
          updateTime: args[0] ?? null,
          previous: { status: armed.lastObservedStatus, hp: armed.lastObservedHp },
          current: { status: currentStatus, hp: currentHp, playerState: this.state.player.state, invincibleUntil: this.state.player.invincibleUntil },
          sourceDiagnostics: armed.sourceDiagnostics,
          currentDiagnostics: terminalDeathRunDiagnostics(),
          sourceSnapshot: armed.sourceSnapshot,
          currentSnapshot: stateSnapshot(this),
        })}`);
      }
    }

    const beforeStatus = this.state.status;
    const beforeHp = this.state.player.hp;
    const beforeDiagnostics = armed ? terminalDeathRunDiagnostics() : null;
    const beforeEffects = armed ? this.state.effects.map(effect => effect.id) : [];
    const beforeDamageNumbers = armed ? this.state.damageNumbers.map(number => number.id) : [];
    const result = update.apply(this, args);

    if (armed && terminalDeathTransitionArm === armed) {
      armed.updateIndex += 1;
      const afterStatus = this.state.status;
      const afterHp = this.state.player.hp;
      if (beforeStatus === 'gameover' && beforeHp <= 0 && (afterStatus !== 'gameover' || afterHp > 0)) {
        terminalDeathTransitionArm = null;
        throw new Error(`Terminal death evidence transitioned inside GameEngine.update: ${JSON.stringify({
          phase: 'inside-GameEngine.update',
          armedAt: armed.armedAt,
          updateIndex: armed.updateIndex,
          updateTime: args[0] ?? null,
          before: { status: beforeStatus, hp: beforeHp },
          after: { status: afterStatus, hp: afterHp, playerState: this.state.player.state, invincibleUntil: this.state.player.invincibleUntil },
          beforeDiagnostics,
          afterDiagnostics: terminalDeathRunDiagnostics(),
          sourceDiagnostics: armed.sourceDiagnostics,
          sourceSnapshot: armed.sourceSnapshot,
          effectsBefore: beforeEffects,
          effectsAfter: this.state.effects.map(effect => effect.id),
          damageNumbersBefore: beforeDamageNumbers,
          damageNumbersAfter: this.state.damageNumbers.map(number => number.id),
          afterSnapshot: stateSnapshot(this),
        })}`);
      }
      armed.lastObservedStatus = afterStatus;
      armed.lastObservedHp = afterHp;
    }
    return result;
  };
}
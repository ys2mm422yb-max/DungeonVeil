import { TileType } from './dungeon';
import type { GameState } from './runEngine';
import { GameEngine } from './runEngine';

const MARKER = 'dungeon-veil-runtime-evidence-v1';

type EvidenceMode = 'solo' | 'duo';

type RuntimeEvidenceApi = {
  snapshot: () => Record<string, unknown> | null;
  loadRoom: (room: number, mode?: EvidenceMode) => Record<string, unknown> | null;
  killLivingEnemies: () => Record<string, unknown> | null;
  moveToExit: () => Record<string, unknown> | null;
  chooseFirstGift: () => Record<string, unknown> | null;
  setMode: (mode: EvidenceMode) => void;
  setPlayerStats: (attack: number, defense: number) => Record<string, unknown> | null;
};

declare global {
  interface Window {
    __dungeonVeilRuntimeEvidence?: RuntimeEvidenceApi;
  }
}

let currentEngine: GameEngine | null = null;
let installed = false;

function allowed(): boolean {
  if (typeof window === 'undefined') return false;
  const local = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  try { return local && sessionStorage.getItem(MARKER) === '1'; }
  catch { return false; }
}

function stateSnapshot(engine = currentEngine): Record<string, unknown> | null {
  if (!engine) return null;
  const state = engine.state;
  return {
    floor: state.floor,
    chapter: state.chapter,
    status: state.status,
    hp: state.player.hp,
    maxHp: state.player.maxHp,
    livingEnemies: state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead).length,
    deadEnemies: state.enemies.filter(enemy => enemy.isDead || enemy.hp <= 0).length,
    roomClearReady: state.roomClearReady,
    effects: state.effects.map(effect => effect.id),
    damageNumbers: state.damageNumbers.map(number => number.id),
    runMode: document.documentElement.dataset.dungeonVeilRunMode ?? 'solo',
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
    loadRoom: (requestedRoom, mode = 'solo') => {
      const engine = currentEngine;
      if (!engine) return null;
      const room = Math.max(1, Math.min(50, Math.floor(Number(requestedRoom) || 1)));
      const player = engine.state.player;
      setMode(mode);
      engine.continueGame({
        playerName: player.playerName === 'Hero' ? 'Runtime Ranger' : player.playerName,
        playerClass: 'archer',
        floor: room,
        chapter: 1,
        level: Math.max(1, player.level),
        xp: 0,
        hp: 9_999,
        maxHp: 9_999,
        attack: 50_000,
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
      engine.state.player.attack = 50_000;
      engine.state.player.defense = 5_000;
      engine.state.status = 'playing';
      engine.lastTime = performance.now();
      emit(engine);
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
      if (choice) engine.applyUpgrade(choice);
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
    currentEngine = this;
    const result = start.apply(this, args);
    attachApi();
    return result;
  };
  prototype.continueGame = function (this: GameEngine, ...args: any[]) {
    currentEngine = this;
    const result = resume.apply(this, args);
    attachApi();
    return result;
  };
  prototype.update = function (this: GameEngine, ...args: any[]) {
    currentEngine = this;
    return update.apply(this, args);
  };
}

import type { UpgradeKey } from '../i18n/translations';
import type { GameEngine, RunGameState } from './runEngine';
import {
  buildRunGiftChoices,
  consumeFusionComponents,
  isFusionKey,
  isInstantGift,
  nextSkillRank,
} from './runSkills';

type EngineInternals = GameEngine & {
  captureRoomEntrySnapshot: () => void;
  emit: () => void;
};

export function prepareGiftChoices(state: RunGameState): void {
  if (state.status !== 'levelup') return;
  state.upgradeChoices = buildRunGiftChoices(state.runSkills);
}

export function applyGiftUpgrade(engine: GameEngine, choice: UpgradeKey): boolean {
  const state = engine.state;
  if (state.status !== 'levelup' || !state.upgradeChoices.includes(choice)) return false;

  const player = state.player;
  const rank = nextSkillRank(state.runSkills, choice);

  if (isFusionKey(choice)) consumeFusionComponents(state.runSkills, choice);
  else if (!isInstantGift(choice)) state.runSkills[choice] = rank;

  if (choice === 'maxHp') {
    const gain = rank === 1 ? 20 : rank === 2 ? 25 : 30;
    player.maxHp += gain;
    player.hp = Math.min(player.maxHp, player.hp + gain);
  } else if (choice === 'attack') player.attack += rank === 3 ? 5 : 4;
  else if (choice === 'speed') player.speed += rank === 1 ? 12 : rank === 2 ? 10 : 8;
  else if (choice === 'defense') player.defense += rank === 1 ? 1 : 2;
  else if (choice === 'heal') player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.2);
  else if (choice === 'hunterBlessing') player.attack += 2;
  else if (choice === 'vitalSpark') {
    player.maxHp += 8;
    player.hp = Math.min(player.maxHp, player.hp + 8);
  }

  player.lastGiftTime = Date.now();
  player.lastGiftKey = choice;
  state.upgradeChoices = [];
  state.status = 'playing';

  const internals = engine as EngineInternals;
  internals.captureRoomEntrySnapshot();
  engine.saveNow('ability');
  internals.emit();
  return true;
}

import type { GameEngine } from './runEngine';
import { RELIC_COMBAT_V4, relicModeEnabledV4, veilHeartRestoreV4, worldCoreRunStatsV4 } from './relicCombatContractV4';
import { equippedVeilRelic } from './veilRelics';

export type WorldBossRelicRuntimeStateV4 = {
  worldCoreApplied: boolean;
  veilHeartConsumed: boolean;
};

export function createWorldBossRelicRuntimeStateV4(): WorldBossRelicRuntimeStateV4 {
  return { worldCoreApplied: false, veilHeartConsumed: false };
}

export function updateWorldBossRelicRuntimeV4(
  engine: GameEngine,
  state: WorldBossRelicRuntimeStateV4,
  time: number,
): void {
  const relic = equippedVeilRelic();
  const player = engine.state.player;

  if (relic === 'world-core' && relicModeEnabledV4(relic, 'worldboss') && !state.worldCoreApplied) {
    state.worldCoreApplied = true;
    const { attackGain, healthGain } = worldCoreRunStatsV4(player.attack, player.maxHp);
    player.attack += attackGain;
    player.maxHp += healthGain;
    player.hp = Math.min(player.maxHp, player.hp + healthGain);
    engine.state.effects.push({
      id: `worldboss-world-core-${time}`,
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      radius: 0,
      maxRadius: 105,
      color: '#ff8b4a',
      lifeTime: 0,
      maxLifeTime: 820,
      type: 'circle',
      element: 'fire',
    });
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', {
      detail: {
        title: 'DER WELTENKERN ERWACHT',
        text: `+${Math.round(RELIC_COMBAT_V4.worldCore.attackBonus * 100)} % Angriff · +${Math.round(RELIC_COMBAT_V4.worldCore.maximumHealthBonus * 100)} % maximales Leben`,
        tone: 'relic',
      },
    }));
  }

  if (
    relic === 'veil-heart'
    && relicModeEnabledV4(relic, 'worldboss')
    && !state.veilHeartConsumed
    && player.hp <= 0
  ) {
    state.veilHeartConsumed = true;
    player.hp = veilHeartRestoreV4(player.maxHp);
    player.invincibleUntil = time + RELIC_COMBAT_V4.veilHeart.invincibilityMs;
    player.state = 'idle';
    engine.state.status = 'playing';
    engine.state.effects.push({
      id: `worldboss-veil-heart-${time}`,
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      radius: 0,
      maxRadius: 118,
      color: '#c786ff',
      lifeTime: 0,
      maxLifeTime: 900,
      type: 'circle',
      element: 'arcane',
    });
    engine.state.damageNumbers.push({
      id: `worldboss-veil-heart-text-${time}`,
      x: player.x + player.width / 2,
      y: player.y - 16,
      value: 'HERZ DES SCHLEIERS',
      color: '#ddb7ff',
      lifeTime: 0,
      maxLifeTime: 1_800,
      scale: 1.35,
    });
    engine.onStateChange({ ...engine.state });
  }
}

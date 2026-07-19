import type { GameEngine } from './runEngine';
import { RELIC_COMBAT_V4, veilHeartRestoreV4, worldCoreRunStatsV4 } from './relicCombatContractV4';
import { activateWorldCoreForCurrentRun, consumeVeilHeartForCurrentRun, equippedVeilRelic } from './veilRelics';

export type RunRelicEffectState = { lastAttackTime: number };
export function createRunRelicEffectState(): RunRelicEffectState { return { lastAttackTime: 0 }; }

export function updateRunRelicEffects(engine: GameEngine, state: RunRelicEffectState, time: number): void {
  const player = engine.state.player;
  const relic = equippedVeilRelic();

  if (relic === 'world-core' && activateWorldCoreForCurrentRun()) {
    const { attackGain, healthGain } = worldCoreRunStatsV4(player.attack, player.maxHp);
    player.maxHp += healthGain;
    player.hp = Math.min(player.maxHp, player.hp + healthGain);
    player.attack += attackGain;
    engine.state.effects.push({ id: `world-core-${time}`, x: player.x + 16, y: player.y + 16, radius: 0, maxRadius: 110, color: '#ff8b4a', lifeTime: 0, maxLifeTime: 850, type: 'circle', element: 'fire' });
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER WELTENKERN ERWACHT', text: `+${Math.round(RELIC_COMBAT_V4.worldCore.attackBonus * 100)} % Angriff · +${Math.round(RELIC_COMBAT_V4.worldCore.maximumHealthBonus * 100)} % maximales Leben für diesen Run`, tone: 'relic' } }));
  }

  if (player.lastAttackTime > state.lastAttackTime) state.lastAttackTime = player.lastAttackTime;

  if (engine.state.status === 'gameover' && player.hp <= 0 && consumeVeilHeartForCurrentRun()) {
    player.hp = veilHeartRestoreV4(player.maxHp);
    player.invincibleUntil = time + RELIC_COMBAT_V4.veilHeart.invincibilityMs;
    player.state = 'idle';
    engine.state.status = 'playing';
    engine.state.effects.push({ id: `veil-heart-${time}`, x: player.x + 16, y: player.y + 16, radius: 0, maxRadius: 120, color: '#c786ff', lifeTime: 0, maxLifeTime: 900, type: 'circle', element: 'arcane' });
    engine.state.damageNumbers.push({ id: `veil-heart-text-${time}`, x: player.x + 16, y: player.y - 16, value: 'HERZ DES SCHLEIERS', color: '#ddb7ff', lifeTime: 0, maxLifeTime: 1800, scale: 1.35 });
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER SCHLEIER HÄLT DICH', text: `Tödlicher Schaden verhindert · ${Math.round(RELIC_COMBAT_V4.veilHeart.restoreHealthFraction * 100)} % Leben wiederhergestellt`, tone: 'relic' } }));
    engine.onStateChange({ ...engine.state });
  }
}

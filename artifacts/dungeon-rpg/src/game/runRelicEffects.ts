import type { GameEngine } from './runEngine';
import { activateWorldCoreForCurrentRun, consumeVeilHeartForCurrentRun, equippedVeilRelic } from './veilRelics';

export type RunRelicEffectState = { lastAttackTime: number };
export function createRunRelicEffectState(): RunRelicEffectState { return { lastAttackTime: 0 }; }

export function updateRunRelicEffects(engine: GameEngine, state: RunRelicEffectState, time: number): void {
  const player = engine.state.player;
  const relic = equippedVeilRelic();

  if (relic === 'world-core' && activateWorldCoreForCurrentRun()) {
    const healthGain = Math.max(1, Math.round(player.maxHp * 0.07));
    player.maxHp += healthGain;
    player.hp = Math.min(player.maxHp, player.hp + healthGain);
    player.attack = Math.max(player.attack + 1, Math.round(player.attack * 1.04));
    engine.state.effects.push({ id: `world-core-${time}`, x: player.x + 16, y: player.y + 16, radius: 0, maxRadius: 110, color: '#ff8b4a', lifeTime: 0, maxLifeTime: 850, type: 'circle', element: 'fire' });
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER WELTENKERN ERWACHT', text: '+4 % Angriff · +7 % maximales Leben für diesen Run', tone: 'relic' } }));
  }

  if (player.lastAttackTime > state.lastAttackTime) state.lastAttackTime = player.lastAttackTime;

  if (engine.state.status === 'gameover' && player.hp <= 0 && consumeVeilHeartForCurrentRun()) {
    player.hp = Math.max(1, Math.round(player.maxHp * 0.25));
    player.invincibleUntil = time + 1000;
    player.state = 'idle';
    engine.state.status = 'playing';
    engine.state.effects.push({ id: `veil-heart-${time}`, x: player.x + 16, y: player.y + 16, radius: 0, maxRadius: 120, color: '#c786ff', lifeTime: 0, maxLifeTime: 900, type: 'circle', element: 'arcane' });
    engine.state.damageNumbers.push({ id: `veil-heart-text-${time}`, x: player.x + 16, y: player.y - 16, value: 'HERZ DES SCHLEIERS', color: '#ddb7ff', lifeTime: 0, maxLifeTime: 1800, scale: 1.35 });
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER SCHLEIER HÄLT DICH', text: 'Tödlicher Schaden verhindert · 25 % Leben wiederhergestellt', tone: 'relic' } }));
    engine.onStateChange({ ...engine.state });
  }
}

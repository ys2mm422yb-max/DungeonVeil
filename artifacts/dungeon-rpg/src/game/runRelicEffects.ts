import type { GameEngine } from './runEngine';
import { activateWorldCoreForCurrentRun, consumeVeilHeartForCurrentRun, equippedVeilRelic } from './veilRelics';

export type RunRelicEffectState = {
  lastAttackTime: number;
  processedRuneHits: Set<string>;
};

export function createRunRelicEffectState(): RunRelicEffectState {
  return { lastAttackTime: 0, processedRuneHits: new Set<string>() };
}

export function updateRunRelicEffects(engine: GameEngine, state: RunRelicEffectState, time: number): void {
  const player = engine.state.player;
  const relic = equippedVeilRelic();

  if (relic === 'world-core' && activateWorldCoreForCurrentRun()) {
    const healthGain = Math.max(1, Math.round(player.maxHp * 0.1));
    player.maxHp += healthGain;
    player.hp = Math.min(player.maxHp, player.hp + healthGain);
    player.attack = Math.max(player.attack + 1, Math.round(player.attack * 1.06));
    engine.state.effects.push({ id: `world-core-${time}`, x: player.x + 16, y: player.y + 16, radius: 0, maxRadius: 110, color: '#ff8b4a', lifeTime: 0, maxLifeTime: 850, type: 'circle', element: 'fire' });
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER WELTENKERN ERWACHT', text: '+6 % Angriff · +10 % maximales Leben für diesen Run', tone: 'relic' } }));
  }

  if (relic === 'marked-claw' && (player.relicAttackSpeedUntil ?? 0) > time && player.lastAttackTime > state.lastAttackTime) {
    state.lastAttackTime = player.lastAttackTime;
    player.attackCooldown = Math.max(90, player.attackCooldown * 0.82);
  } else if (player.lastAttackTime > state.lastAttackTime) {
    state.lastAttackTime = player.lastAttackTime;
  }

  if (relic === 'depth-rune-shard') {
    const activeIds = new Set(engine.state.damageNumbers.map(number => number.id));
    for (const id of state.processedRuneHits) if (!activeIds.has(id)) state.processedRuneHits.delete(id);
    for (const number of engine.state.damageNumbers) {
      if (!number.id.startsWith('rune-hit-') || state.processedRuneHits.has(number.id)) continue;
      state.processedRuneHits.add(number.id);
      const originalDamage = Math.abs(Number(String(number.value).replace(/[^0-9.]/g, '')) || 0);
      if (originalDamage <= 0) continue;
      const reducedDamage = Math.max(1, Math.ceil(originalDamage * 0.75));
      const prevented = Math.max(0, originalDamage - reducedDamage);
      player.hp = Math.min(player.maxHp, player.hp + prevented);
      number.value = `-${reducedDamage}`;
      number.color = '#7dbfff';
      if (player.hp > 0 && engine.state.status === 'gameover') {
        player.state = 'idle';
        engine.state.status = 'playing';
        engine.onStateChange({ ...engine.state });
      }
      engine.state.damageNumbers.push({ id: `rune-shard-${number.id}`, x: player.x + 16, y: player.y - 4, value: `SCHUTZ ${prevented}`, color: '#7dbfff', lifeTime: 0, maxLifeTime: 650, scale: 0.9 });
    }
  }

  if (engine.state.status === 'gameover' && player.hp <= 0 && consumeVeilHeartForCurrentRun()) {
    player.hp = Math.max(1, Math.round(player.maxHp * 0.3));
    player.invincibleUntil = time + 1100;
    player.state = 'idle';
    engine.state.status = 'playing';
    engine.state.effects.push({ id: `veil-heart-${time}`, x: player.x + 16, y: player.y + 16, radius: 0, maxRadius: 120, color: '#c786ff', lifeTime: 0, maxLifeTime: 900, type: 'circle', element: 'arcane' });
    engine.state.damageNumbers.push({ id: `veil-heart-text-${time}`, x: player.x + 16, y: player.y - 16, value: 'HERZ DES SCHLEIERS', color: '#ddb7ff', lifeTime: 0, maxLifeTime: 1800, scale: 1.35 });
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER SCHLEIER HÄLT DICH', text: 'Tödlicher Schaden verhindert · 30 % Leben wiederhergestellt', tone: 'relic' } }));
    engine.onStateChange({ ...engine.state });
  }
}

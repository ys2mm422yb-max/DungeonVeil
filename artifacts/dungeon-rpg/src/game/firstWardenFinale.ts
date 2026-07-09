import type { GameEngine } from './runEngine';

export type FirstWardenFinaleState = {
  roomKey: string;
  introShown: boolean;
  victoryShown: boolean;
};

export function createFirstWardenFinaleState(): FirstWardenFinaleState {
  return { roomKey: '', introShown: false, victoryShown: false };
}

function emitStage(stage: 'intro' | 'victory'): void {
  window.dispatchEvent(new CustomEvent('dungeon-veil-first-warden-stage', { detail: { stage } }));
}

export function updateFirstWardenFinale(engine: GameEngine, state: FirstWardenFinaleState, time: number): void {
  const roomKey = `${engine.state.chapter}:${engine.state.floor}`;
  if (state.roomKey !== roomKey) {
    state.roomKey = roomKey;
    state.introShown = false;
    state.victoryShown = false;
  }
  if (engine.state.floor !== 20) return;

  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss');
  if (boss && !boss.isDead && boss.hp > 0 && !state.introShown) {
    state.introShown = true;
    const x = boss.x + boss.width / 2;
    const y = boss.y + boss.height / 2;
    engine.state.effects.push({ id: `warden-intro-outer-${time}`, x, y, radius: 0, maxRadius: 210, color: '#875dff', lifeTime: 0, maxLifeTime: 1300, type: 'circle', element: 'arcane' });
    engine.state.effects.push({ id: `warden-intro-inner-${time}`, x, y, radius: 0, maxRadius: 105, color: '#d5c2ff', lifeTime: 0, maxLifeTime: 800, type: 'circle', element: 'arcane' });
    boss.nextAttackTime = Math.max(boss.nextAttackTime, time + 2300);
    emitStage('intro');
  }

  if (!state.victoryShown && engine.state.roomClearReady && !engine.state.enemies.length) {
    state.victoryShown = true;
    const centerX = engine.state.map.width * 20;
    const centerY = engine.state.map.height * 20;
    engine.state.effects.push({ id: `warden-victory-outer-${time}`, x: centerX, y: centerY, radius: 0, maxRadius: 230, color: '#d8b7ff', lifeTime: 0, maxLifeTime: 1800, type: 'circle', element: 'arcane' });
    engine.state.effects.push({ id: `warden-victory-inner-${time}`, x: centerX, y: centerY, radius: 0, maxRadius: 120, color: '#e7c37a', lifeTime: 0, maxLifeTime: 1100, type: 'circle', element: 'normal' });
    engine.state.damageNumbers.push({ id: `warden-victory-text-${time}`, x: centerX, y: centerY - 34, value: 'ERSTER WÄCHTER GEFALLEN', color: '#e7c37a', lifeTime: 0, maxLifeTime: 3000, scale: 1.45 });
    emitStage('victory');
  }
}

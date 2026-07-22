import type { GameEngine } from './runEngine';

const HAZARD_EFFECT_PREFIXES = [
  'rune-warning-', 'rune-impact-',
  'forge-warn-', 'forge-hit-',
  'arc-warn-', 'arc-charge-', 'arc-fire-', 'arc-source-',
  'core-', 'core-inner-',
  'telegraph-', 'mage-cast-', 'mage-impact-', 'shot-mage-',
];
const HAZARD_DAMAGE_PREFIXES = [
  'rune-hit-', 'forge-text-', 'arc-text-', 'core-text-', 'hit-', 'mage-hit-',
];

let installed = false;

function hasLivingEnemies(engine: GameEngine): boolean {
  return engine.state.enemies.some(enemy => enemy.hp > 0 && !enemy.isDead);
}

function hasPostCombatHazards(engine: GameEngine): boolean {
  return engine.state.effects.some(effect => HAZARD_EFFECT_PREFIXES.some(prefix => effect.id.startsWith(prefix)))
    || engine.state.damageNumbers.some(number => HAZARD_DAMAGE_PREFIXES.some(prefix => number.id.startsWith(prefix)));
}

function clearPostCombatHazards(engine: GameEngine): void {
  engine.state.effects = engine.state.effects.filter(
    effect => !HAZARD_EFFECT_PREFIXES.some(prefix => effect.id.startsWith(prefix)),
  );
  engine.state.damageNumbers = engine.state.damageNumbers.filter(
    number => !HAZARD_DAMAGE_PREFIXES.some(prefix => number.id.startsWith(prefix)),
  );
}

function emitCorrectedState(engine: GameEngine): void {
  engine.onStateChange({
    ...engine.state,
    player: { ...engine.state.player, facing: { ...engine.state.player.facing } },
    enemies: engine.state.enemies.map(enemy => ({ ...enemy })),
    items: engine.state.items.map(item => ({ ...item })),
    damageNumbers: engine.state.damageNumbers.map(number => ({ ...number })),
    particles: engine.state.particles.map(particle => ({ ...particle })),
    effects: engine.state.effects.map(effect => ({ ...effect })),
  });
}

/**
 * Guarantees that a frame which starts without a living enemy cannot still
 * resolve a queued player hazard. A real simultaneous trade while the final
 * enemy is alive remains valid; only damage after the combat contract has
 * already ended is restored.
 */
export function installPostCombatHazardGuard(): void {
  if (installed) return;
  installed = true;

  const prototype = GameEngine.prototype;
  const update = prototype.update;

  prototype.update = function guardedUpdate(this: GameEngine, timestamp: number): void {
    const hadLivingEnemy = hasLivingEnemies(this);
    const hpBefore = this.state.player.hp;

    update.call(this, timestamp);

    if (hasLivingEnemies(this)) return;

    const restoreLateDamage = !hadLivingEnemy && this.state.player.hp < hpBefore;
    const dirty = hasPostCombatHazards(this);
    if (!restoreLateDamage && !dirty && hadLivingEnemy === false) return;

    if (restoreLateDamage) this.state.player.hp = hpBefore;
    clearPostCombatHazards(this);
    this.state.player.lastHitTime = 0;
    this.state.player.lastGuardTime = 0;
    this.state.player.invincibleUntil = Math.max(this.state.player.invincibleUntil, timestamp + 350);
    emitCorrectedState(this);
  };
}

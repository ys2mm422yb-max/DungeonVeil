import { Player, Enemy, DamageNumber, VisualEffect } from './entities';
import { CLASS_DEFS } from './classes';

export function calculateDamage(attacker: { attack: number }, defender: { defense?: number }): number {
  const def = defender.defense || 0;
  const baseDamage = Math.max(1, attacker.attack - def * 0.5);
  const variance = baseDamage * 0.1;
  return Math.max(1, Math.floor(baseDamage + (Math.random() * variance * 2 - variance)));
}

export function checkCollision(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function performPlayerAttack(
  player: Player,
  enemies: Enemy[],
  currentTime: number
): { hits: Enemy[]; damageNumbers: DamageNumber[]; effects: VisualEffect[] } {
  const hits: Enemy[] = [];
  const damageNumbers: DamageNumber[] = [];
  const effects: VisualEffect[] = [];
  const attackRange = player.attackRange;
  const classDef = CLASS_DEFS[player.playerClass];

  enemies.forEach(enemy => {
    const dist = distance(
      player.x + player.width / 2,
      player.y + player.height / 2,
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2
    );
    if (dist <= attackRange) {
      const dmg = calculateDamage(player, enemy);
      enemy.hp -= dmg;
      enemy.flashUntil = currentTime + 200;
      hits.push(enemy);
      damageNumbers.push({
        id: Math.random().toString(),
        x: enemy.x + enemy.width / 2 + (Math.random() * 20 - 10),
        y: enemy.y - 10,
        value: `-${dmg}`,
        color: '#e74c3c',
        lifeTime: 0,
        maxLifeTime: 1000,
      });
    }
  });

  effects.push({
    id: Math.random().toString(),
    x: player.x + player.width / 2 + player.facing.x * 20,
    y: player.y + player.height / 2 + player.facing.y * 20,
    radius: attackRange * 0.8,
    maxRadius: attackRange,
    color: classDef.skillEffectColor.replace('0.55', '0.35'),
    lifeTime: 0,
    maxLifeTime: 200,
    type: 'flash',
  });

  return { hits, damageNumbers, effects };
}

export function performPlayerSkill(
  player: Player,
  enemies: Enemy[],
  currentTime: number
): { hits: Enemy[]; damageNumbers: DamageNumber[]; effects: VisualEffect[] } {
  const hits: Enemy[] = [];
  const damageNumbers: DamageNumber[] = [];
  const effects: VisualEffect[] = [];
  const classDef = CLASS_DEFS[player.playerClass];
  const skillRange = player.skillRange;
  const damageMult = classDef.skillDamageMult;

  enemies.forEach(enemy => {
    const dist = distance(
      player.x + player.width / 2,
      player.y + player.height / 2,
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2
    );
    if (dist <= skillRange) {
      const dmg = calculateDamage({ attack: Math.floor(player.attack * damageMult) }, enemy);
      enemy.hp -= dmg;
      enemy.flashUntil = currentTime + 300;
      hits.push(enemy);
      damageNumbers.push({
        id: Math.random().toString(),
        x: enemy.x + enemy.width / 2,
        y: enemy.y - 14,
        value: `-${dmg}`,
        color: player.color,
        lifeTime: 0,
        maxLifeTime: 1200,
      });
    }
  });

  effects.push({
    id: Math.random().toString(),
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    radius: 0,
    maxRadius: skillRange,
    color: classDef.skillEffectColor,
    lifeTime: 0,
    maxLifeTime: 450,
    type: 'sweep',
  });

  return { hits, damageNumbers, effects };
}

import { Player, Enemy, DamageNumber, VisualEffect, Particle } from './entities';
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

export function makeParticles(
  x: number,
  y: number,
  color: string,
  count: number,
  speed = 80,
  size = 2,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = speed * (0.4 + Math.random() * 0.8);
    particles.push({
      id: Math.random().toString(),
      x, y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      color,
      lifeTime: 0,
      maxLifeTime: 400 + Math.random() * 400,
      size: size + Math.random() * 2,
      drag: 0.92,
      gravity: 0,
      fade: true,
    });
  }
  return particles;
}

export function makeHitSpark(
  x: number,
  y: number,
  color: string,
  count = 8,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 48 + Math.random() * 64;
    const brightEveryThird = i % 3 === 0;
    particles.push({
      id: Math.random().toString(),
      x: x + (Math.random() * 4 - 2),
      y: y + (Math.random() * 4 - 2),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: brightEveryThird ? '#fff7d0' : color,
      lifeTime: 0,
      maxLifeTime: 150 + Math.random() * 180,
      size: brightEveryThird ? 1.5 + Math.random() * 0.7 : 1 + Math.random() * 0.8,
      drag: 0.84,
      gravity: brightEveryThird ? -3 : 7,
      fade: true,
    });
  }
  return particles;
}

export function makeStepDust(
  x: number,
  y: number,
  color = '#6a6a6a',
): Particle[] {
  return makeParticles(x, y, color, 4, 30, 1.5).map(p => ({
    ...p,
    maxLifeTime: 350,
    gravity: -20,
  }));
}

export function performPlayerAttack(
  player: Player,
  enemies: Enemy[],
  currentTime: number
): { hits: Enemy[]; damageNumbers: DamageNumber[]; effects: VisualEffect[]; particles: Particle[] } {
  const hits: Enemy[] = [];
  const damageNumbers: DamageNumber[] = [];
  const effects: VisualEffect[] = [];
  const particles: Particle[] = [];
  const attackRange = player.attackRange;
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  player.lastAttackTime = currentTime;

  const slashAngle = Math.atan2(player.facing.y, player.facing.x);
  effects.push({
    id: Math.random().toString(),
    x: cx + player.facing.x * 12,
    y: cy + player.facing.y * 12,
    radius: 18,
    maxRadius: 18,
    color: 'rgba(255,224,120,0.72)',
    lifeTime: 0,
    maxLifeTime: 95,
    type: 'slash',
    angle: slashAngle,
    width: 5,
  });

  enemies.forEach(enemy => {
    if (enemy.hp <= 0 || enemy.state === 'dead') return;
    const dist = distance(
      cx, cy,
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2
    );
    if (dist <= attackRange) {
      const dmg = calculateDamage(player, enemy);
      enemy.hp -= dmg;
      enemy.flashUntil = currentTime + 220;
      hits.push(enemy);
      damageNumbers.push({
        id: Math.random().toString(),
        x: enemy.x + enemy.width / 2 + (Math.random() * 20 - 10),
        y: enemy.y - 10,
        value: `-${dmg}`,
        color: '#ffcf4a',
        lifeTime: 0,
        maxLifeTime: 1000,
        scale: 1.48,
      });
      particles.push(...makeHitSpark(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        '#ffd76a',
        8,
      ));
    }
  });

  return { hits, damageNumbers, effects, particles };
}

export function performPlayerSkill(
  player: Player,
  enemies: Enemy[],
  currentTime: number
): { hits: Enemy[]; damageNumbers: DamageNumber[]; effects: VisualEffect[]; particles: Particle[] } {
  const hits: Enemy[] = [];
  const damageNumbers: DamageNumber[] = [];
  const effects: VisualEffect[] = [];
  const particles: Particle[] = [];
  const classDef = CLASS_DEFS[player.playerClass];
  const skillRange = player.skillRange;
  const damageMult = classDef.skillDamageMult;
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;

  if (player.playerClass === 'mage') {
    effects.push({
      id: Math.random().toString(),
      x: cx, y: cy,
      radius: 0, maxRadius: skillRange,
      color: classDef.skillEffectColor,
      lifeTime: 0, maxLifeTime: 500,
      type: 'sweep',
    });
  } else if (player.playerClass === 'archer') {
    effects.push({
      id: Math.random().toString(),
      x: cx + player.facing.x * skillRange * 0.5,
      y: cy + player.facing.y * skillRange * 0.5,
      radius: skillRange * 0.72,
      maxRadius: skillRange,
      color: classDef.skillEffectColor,
      lifeTime: 0, maxLifeTime: 250,
      type: 'slash',
      angle: Math.atan2(player.facing.y, player.facing.x),
      width: 16,
    });
  } else {
    effects.push({
      id: Math.random().toString(),
      x: cx, y: cy,
      radius: 0, maxRadius: skillRange,
      color: classDef.skillEffectColor,
      lifeTime: 0, maxLifeTime: 400,
      type: 'sweep',
    });
  }

  enemies.forEach(enemy => {
    if (enemy.hp <= 0 || enemy.state === 'dead') return;
    const dist = distance(
      cx, cy,
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
        scale: 1.35,
      });
      particles.push(...makeHitSpark(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        player.color,
        18,
      ));
    }
  });

  return { hits, damageNumbers, effects, particles };
}

import type { Enemy } from '../game/entities';

export type KayKitEnemyAnimationRole = 'mage' | 'rogue' | 'warrior' | 'minion' | 'ranger' | 'barbarian' | 'knight';
export type KayKitEnemyAnimationFamily = 'creature' | 'skeleton' | 'adventurer';

export type KayKitEnemyRoleClips = {
  idle: any | null;
  move: any | null;
  attack: any | null;
  draw: any | null;
  hit: any | null;
  death: any | null;
};

type AttackTimingEnemy = Enemy & { attackResolveAt?: number };

function clipKey(clip: any) {
  return String(clip?.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function chooseClip(clips: any[], groups: string[][], rejects: string[] = []) {
  for (const terms of groups) {
    const match = clips.find(clip => {
      const key = clipKey(clip);
      return terms.every(term => key.includes(term)) && rejects.every(term => !key.includes(term));
    });
    if (match) return match;
  }
  return null;
}

export function selectKayKitEnemyRoleClips(
  clips: any[],
  role: KayKitEnemyAnimationRole,
  family: KayKitEnemyAnimationFamily,
  enemy: Enemy,
  room: number,
): KayKitEnemyRoleClips {
  const skeleton = family === 'skeleton';
  const room20Necromancer = enemy.enemyType === 'boss' && room === 20;
  const room30Ranger = enemy.enemyType === 'boss' && room === 30;
  const room40Rogue = enemy.enemyType === 'boss' && room === 40;
  const room50Warden = enemy.enemyType === 'boss' && room === 50;

  const idle = role === 'ranger'
    ? chooseClip(clips, [['ranged', 'bow', 'aiming', 'idle'], ['ranged', 'bow', 'idle']])
    : skeleton
      ? chooseClip(clips, [['skeletons', 'idle'], ['idle', 'a'], ['idle']])
      : role === 'warrior' || role === 'barbarian' || role === 'knight'
        ? chooseClip(clips, [['melee', '2h', 'idle'], ['idle', 'b'], ['idle', 'a'], ['idle']])
        : chooseClip(clips, [['idle', 'a'], ['idle', 'b'], ['idle']], ['crouch', 'sit', 'sleep']);

  const move = role === 'ranger'
    ? chooseClip(clips, [['running', 'holding', 'bow'], ['running', 'a'], ['running'], ['walking', 'a']])
    : skeleton && role === 'minion'
      ? chooseClip(clips, [['skeletons', 'walking'], ['walking', 'a'], ['running', 'a']])
      : role === 'warrior' || role === 'barbarian' || role === 'knight'
        ? chooseClip(clips, [['walking', 'a'], ['walking', 'b'], ['walking'], ['running', 'b']])
        : role === 'mage'
          ? chooseClip(clips, [['walking', 'b'], ['walking', 'a'], ['walking'], ['running', 'b']])
          : chooseClip(clips, [['running', 'a'], ['running', 'b'], ['running'], ['walking', 'a']], ['back', 'left', 'right', 'crouch']);

  const draw = role === 'ranger'
    ? chooseClip(clips, [['ranged', 'bow', 'draw']], ['up'])
    : null;

  const attack = room20Necromancer
    ? chooseClip(clips, [['ranged', 'magic', 'summon'], ['ranged', 'magic', 'spellcasting', 'long'], ['ranged', 'magic', 'shoot']])
    : role === 'mage'
      ? chooseClip(clips, [['ranged', 'magic', 'shoot'], ['ranged', 'magic', 'spellcasting'], ['ranged', 'magic', 'raise'], ['ranged', 'magic', 'summon']])
      : role === 'ranger' || room30Ranger
        ? chooseClip(clips, [['ranged', 'bow', 'release']], ['up'])
        : role === 'rogue' || room40Rogue
          ? chooseClip(clips, [['melee', 'dualwield', 'attack', 'slice'], ['melee', '1h', 'attack', 'slice', 'diagonal'], ['melee', '1h', 'attack', 'stab']])
          : role === 'warrior' || role === 'barbarian' || role === 'knight' || room50Warden
            ? chooseClip(clips, [['melee', '2h', 'attack', 'chop'], ['melee', '2h', 'attack', 'slice'], ['melee', '1h', 'attack', 'chop']])
            : chooseClip(clips, [['melee', '1h', 'attack', 'stab'], ['melee', '1h', 'attack', 'slice'], ['attack', 'a'], ['attack'], ['bite'], ['sting']], ['bow', 'crossbow', 'ranged']);

  const hit = chooseClip(clips, [['hit', 'a'], ['hit', 'b'], ['melee', 'block', 'hit']]);
  const death = skeleton
    ? chooseClip(clips, [['skeletons', 'death']], ['pose', 'resurrect'])
      ?? chooseClip(clips, [['death', 'a'], ['death', 'b'], ['death']], ['pose'])
    : chooseClip(clips, [['death', 'a'], ['death', 'b'], ['death'], ['die']], ['pose']);

  return { idle, move, attack, draw, hit, death };
}

export function enemyAttackResolveDelaySeconds(enemy: Enemy, room: number): number {
  const resolveAt = Number((enemy as AttackTimingEnemy).attackResolveAt);
  if (Number.isFinite(resolveAt) && resolveAt >= enemy.lastAttackTime) {
    return Math.max(0.08, Math.min(0.52, (resolveAt - enemy.lastAttackTime) / 1000));
  }
  if (enemy.enemyType === 'boss') {
    if (room === 20) return 0.46;
    if (room === 30) return 0.32;
    if (room === 40) return 0.23;
    if (room === 50) return 0.42;
    return 0.34;
  }
  if (enemy.enemyType === 'spider' || enemy.enemyType === 'vampire') return 0.165;
  if (enemy.enemyType === 'demon' || enemy.enemyType === 'golem' || enemy.enemyType === 'orc') return 0.27;
  return 0.185;
}

export function enemyRoleAttackDuration(role: KayKitEnemyAnimationRole, enemy: Enemy, room: number): number {
  const resolve = enemyAttackResolveDelaySeconds(enemy, room);
  if (role === 'ranger') return resolve + 0.12;
  if (role === 'mage') return resolve + 0.12;
  if (role === 'rogue') return Math.max(0.3, resolve * 2.05);
  if (role === 'warrior' || role === 'barbarian' || role === 'knight') return Math.max(0.48, resolve * 1.9);
  return Math.max(0.36, resolve * 1.9);
}

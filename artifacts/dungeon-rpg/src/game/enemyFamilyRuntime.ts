import type { Enemy } from './entities';
import type { GameEngine } from './runEngine';
import { getEncounterFamilyPlan } from './encounterPlan';
import {
  enemyDefinition,
  enemyFamilyForSpawn,
  type EnemyFamilyId,
} from './enemyRegistry';

function spawnIndexFromEnemyId(id: string): number {
  const withoutHunt = id.replace(/-hunt-\d+$/, '');
  const parsed = Number(withoutHunt.split('-').at(-1));
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function canonicalFamilyIdForEnemy(room: number, enemy: Enemy): EnemyFamilyId {
  if (enemy.enemyType === 'boss') return 'boss';
  return enemy.enemyFamilyId ?? enemyFamilyForSpawn(room, spawnIndexFromEnemyId(enemy.id), enemy.enemyType);
}

export function bindCanonicalEnemyFamilies(engine: GameEngine): void {
  const familyPlan = getEncounterFamilyPlan(engine.state.floor);
  for (const enemy of engine.state.enemies) {
    const spawnIndex = spawnIndexFromEnemyId(enemy.id);
    const familyId = enemy.enemyType === 'boss'
      ? 'boss'
      : familyPlan[spawnIndex] ?? enemyFamilyForSpawn(engine.state.floor, spawnIndex, enemy.enemyType);
    const definition = enemyDefinition(familyId);
    if (enemy.enemyFamilyId === familyId) continue;

    const runtimeBase = enemyDefinition(enemy.enemyType === 'boss' ? 'boss' : enemy.enemyType).stats;
    const hpScale = Math.max(0.1, enemy.maxHp / Math.max(1, runtimeBase.hp));
    const attackScale = Math.max(0.1, enemy.attack / Math.max(1, runtimeBase.attack));
    const hpFraction = enemy.maxHp > 0 ? Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)) : 1;
    const centerX = enemy.x + enemy.width / 2;
    const centerY = enemy.y + enemy.height / 2;

    enemy.enemyFamilyId = familyId;
    enemy.enemyCombatRole = definition.role;
    enemy.enemyAttackPattern = definition.attackPattern;
    enemy.enemyTelegraph = definition.telegraph;
    enemy.maxHp = Math.max(1, Math.round(definition.stats.hp * hpScale));
    enemy.hp = Math.max(0, Math.round(enemy.maxHp * hpFraction));
    enemy.attack = Math.max(1, Math.round(definition.stats.attack * attackScale));
    enemy.defense = definition.stats.defense;
    enemy.speed = definition.stats.speed;
    enemy.width = definition.stats.size;
    enemy.height = definition.stats.size;
    enemy.x = centerX - enemy.width / 2;
    enemy.y = centerY - enemy.height / 2;
    enemy.color = definition.stats.color;
  }
}

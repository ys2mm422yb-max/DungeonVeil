import { TILE_SIZE, isWalkable } from './dungeon';
import { generateRunRoom, isBossRoom } from './chapterRun';
import { getEncounterPlan } from './encounterPlan';
import { collidesWithRoomProp } from './roomCollision3D';
import { getRoomSpawnPoints, sceneSpawnToGame } from './roomSpawn3D';
import {
  CANONICAL_CLASS_COMBAT_MANIFEST,
  CANONICAL_ENEMY_COMBAT_MANIFEST,
  createCanonicalEncounterState,
  type AuthorityActorInput,
  type AuthorityClassKey,
  type AuthorityEnemyInput,
  type AuthorityEnemyType,
  type CanonicalEncounterState,
} from './duoEncounterAuthorityKernel';

export type CanonicalDuoActorIdentity = Readonly<{
  actorId: string;
  classKey: AuthorityClassKey;
  active?: boolean;
}>;

export type CreateRoomBoundCanonicalEncounterInput = Readonly<{
  runId: string;
  runAttempt: number;
  chapter: number;
  room: number;
  seed: number;
  authorityStartedAtMs: number;
  actors: readonly CanonicalDuoActorIdentity[];
}>;

function canonicalActorSpawn(room: number, actor: CanonicalDuoActorIdentity, slot: number): AuthorityActorInput {
  const map = generateRunRoom(room);
  const combat = CANONICAL_CLASS_COMBAT_MANIFEST[actor.classKey];
  if (!combat) throw new Error(`unknown classKey: ${String(actor.classKey)}`);

  const candidates = [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  const ordered = slot === 0 ? candidates : [candidates[1], candidates[2], candidates[3], candidates[4], candidates[0]];
  for (const candidate of ordered) {
    const x = (map.startX + candidate.dx) * TILE_SIZE + 4;
    const y = (map.startY + candidate.dy) * TILE_SIZE + 4;
    const centerX = x + combat.actorSize / 2;
    const centerY = y + combat.actorSize / 2;
    if (!isWalkable(map, centerX, centerY)) continue;
    if (collidesWithRoomProp(room, map.width, map.height, x, y, combat.actorSize, combat.actorSize, 0.12)) continue;
    return Object.freeze({ actorId: actor.actorId, classKey: actor.classKey, spawnX: x, spawnY: y, active: actor.active });
  }
  throw new Error(`room ${room} has no canonical safe actor spawn for slot ${slot}`);
}

function canonicalEnemyInputs(room: number): AuthorityEnemyInput[] {
  const map = generateRunRoom(room);
  const plan: AuthorityEnemyType[] = isBossRoom(room)
    ? ['boss']
    : getEncounterPlan(room).map(enemyType => enemyType as AuthorityEnemyType);
  const points = getRoomSpawnPoints(room);
  if (points.length < plan.length) throw new Error(`room ${room} has insufficient canonical enemy spawn points`);

  return plan.map((enemyType, index) => {
    const combat = CANONICAL_ENEMY_COMBAT_MANIFEST[enemyType];
    if (!combat) throw new Error(`room ${room} resolved unknown canonical enemy type: ${String(enemyType)}`);
    const spawn = sceneSpawnToGame(points[index], map.width, map.height, combat.size);
    const centerX = spawn.x + combat.size / 2;
    const centerY = spawn.y + combat.size / 2;
    if (!isWalkable(map, centerX, centerY)) throw new Error(`room ${room} canonical enemy spawn ${index} is not walkable`);
    if (collidesWithRoomProp(room, map.width, map.height, spawn.x, spawn.y, combat.size, combat.size, 0.22)) {
      throw new Error(`room ${room} canonical enemy spawn ${index} collides with authored geometry`);
    }
    return Object.freeze({ enemyType, x: spawn.x, y: spawn.y });
  });
}

export function createRoomBoundCanonicalEncounterState(input: CreateRoomBoundCanonicalEncounterInput): CanonicalEncounterState {
  if (input.actors.length < 1 || input.actors.length > 2) throw new Error('Duo authority requires one or two actor identities');
  const actors = input.actors.map((actor, slot) => canonicalActorSpawn(input.room, actor, slot));
  const enemies = canonicalEnemyInputs(input.room);
  return createCanonicalEncounterState({ ...input, actors, enemies });
}

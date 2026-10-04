import { DUO_AUTHORITY_ROOM_MANIFEST } from './duo_authority_room_manifest.ts';
import {
  CANONICAL_CLASS_COMBAT_MANIFEST,
  createCanonicalEncounterState,
  type AuthorityClassKey,
  type CanonicalEncounterState,
} from './duo_authority_kernel.ts';

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

export function createRoomBoundCanonicalEncounterState(
  input: CreateRoomBoundCanonicalEncounterInput,
): CanonicalEncounterState {
  if (input.actors.length < 1 || input.actors.length > 2) {
    throw new Error('Duo authority requires one or two actor identities');
  }
  const room = DUO_AUTHORITY_ROOM_MANIFEST[input.room];
  if (!room) throw new Error(`room ${input.room} has no canonical authority manifest`);
  const actors = input.actors.map((actor, slot) => {
    const combat = CANONICAL_CLASS_COMBAT_MANIFEST[actor.classKey];
    if (!combat) throw new Error(`unknown classKey: ${String(actor.classKey)}`);
    if (combat.actorSize !== 32) {
      throw new Error(`class ${actor.classKey} requires a regenerated authority room manifest`);
    }
    const spawn = room.actorSpawns[slot];
    if (!spawn) throw new Error(`room ${input.room} has no canonical actor spawn for slot ${slot}`);
    return Object.freeze({
      actorId: actor.actorId,
      classKey: actor.classKey,
      spawnX: spawn.x,
      spawnY: spawn.y,
      active: actor.active,
    });
  });
  return createCanonicalEncounterState({
    ...input,
    actors,
    enemies: room.enemies,
  });
}

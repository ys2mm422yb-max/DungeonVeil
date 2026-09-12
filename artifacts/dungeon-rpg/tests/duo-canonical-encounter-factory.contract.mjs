import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/game/duoCanonicalEncounterFactory.ts', import.meta.url), 'utf8');

const inputType = source.match(/export type CreateRoomBoundCanonicalEncounterInput = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';
const actorIdentityType = source.match(/export type CanonicalDuoActorIdentity = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';

test('producer boundary does not accept caller-owned encounter geometry or combat stats', () => {
  for (const forbidden of ['enemies', 'spawnX', 'spawnY', 'attack', 'speed', 'width', 'height', 'x', 'y']) {
    const field = new RegExp(`(?:^|\\n)\\s*${forbidden}\\??\\s*:`);
    assert.equal(field.test(inputType), false, `producer input must not trust ${forbidden}`);
    assert.equal(field.test(actorIdentityType), false, `actor identity must not trust ${forbidden}`);
  }
});

test('factory derives canonical room, encounter, spawn, walkability and collision state from repository sources', () => {
  assert.match(source, /generateRunRoom\(room\)/);
  assert.match(source, /isBossRoom\(room\)/);
  assert.match(source, /getEncounterPlan\(room\)/);
  assert.match(source, /getRoomSpawnPoints\(room\)/);
  assert.match(source, /sceneSpawnToGame\(/);
  assert.match(source, /isWalkable\(/);
  assert.match(source, /collidesWithRoomProp\(/);
  assert.match(source, /CANONICAL_ENEMY_COMBAT_MANIFEST\[enemyType\]/);
});

test('factory derives actor starts from canonical map start and class size instead of caller coordinates', () => {
  assert.match(source, /map\.startX/);
  assert.match(source, /map\.startY/);
  assert.match(source, /CANONICAL_CLASS_COMBAT_MANIFEST\[actor\.classKey\]/);
  assert.match(source, /canonicalActorSpawn\(input\.room, actor, slot\)/);
});

test('only the derived actor and enemy lists reach the canonical reducer state constructor', () => {
  assert.match(source, /const actors = input\.actors\.map/);
  assert.match(source, /const enemies = canonicalEnemyInputs\(input\.room\)/);
  assert.match(source, /createCanonicalEncounterState\(\{ \.\.\.input, actors, enemies \}\)/);
});

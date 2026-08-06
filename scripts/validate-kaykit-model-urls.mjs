import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifestSource = await readFile(
  'artifacts/dungeon-rpg/src/components/kaykitManifest3D.ts',
  'utf8',
);

assert.match(
  manifestSource,
  /function absoluteRuntimeModelUrl\(value: string\): string/,
  'KayKit model URLs need one maintained runtime normalizer',
);
assert.match(
  manifestSource,
  /function stripSchemeLessRuntimeHost\(value: string\): string/,
  'preview-origin paths accidentally serialized without a valid scheme must be repaired at one boundary',
);
assert.ok(
  manifestSource.includes("if (/^https?:\\/\\//i.test(value)) return value;"),
  'valid absolute HTTP(S) model URLs must remain unchanged',
);
assert.ok(
  manifestSource.includes("value.match(/^(?:https?:\\/?)?\\/{0,2}(?:localhost|127(?:\\.\\d{1,3}){3})(?::\\d+)?\\/(.+)$/i)"),
  'bare, slash-prefixed, protocol-relative and malformed-scheme localhost/loopback paths must be recognized deterministically',
);
assert.match(
  manifestSource,
  /const root = stripSchemeLessRuntimeHost\(value\.trim\(\)\.replace/,
  'manifest roots must be repaired before asset-root classification and model joining',
);
assert.match(
  manifestSource,
  /const repaired = stripSchemeLessRuntimeHost\(value\.trim\(\)\);/,
  'the final runtime model URL boundary must repair malformed preview origins before URL resolution',
);
assert.match(
  manifestSource,
  /new URL\(repaired, document\.baseURI\)\.href/,
  'repaired KayKit model paths must become standards-compliant absolute runtime URLs',
);
assert.match(
  manifestSource,
  /const joined = `[\s\S]*manifest\.root\.replace[\s\S]*relativePath\.replace[\s\S]*`;/,
  'model and manifest paths must be joined before runtime URL resolution',
);
assert.match(
  manifestSource,
  /return absoluteRuntimeModelUrl\(joined\);/,
  'every manifest-backed KayKit model must use the final runtime URL normalizer',
);
assert.doesNotMatch(
  manifestSource,
  /replace\(\/\^https\?[^\n]+/,
  'model URL handling must never strip a valid HTTP scheme into a host-looking path',
);

const previewBase = 'http://127.0.0.1:4173/DungeonVeil/index.html';
const expectedRoot = '/DungeonVeil/assets/kaykit';
const repairPreviewOrigin = (value) => {
  if (/^https?:\/\//i.test(value)) return value;
  const match = value.match(/^(?:https?:\/?)?\/{0,2}(?:localhost|127(?:\.\d{1,3}){3})(?::\d+)?\/(.+)$/i);
  return match ? `/${match[1]}` : value;
};

for (const malformedRoot of [
  '127.0.0.1:4173/DungeonVeil/assets/kaykit',
  '/127.0.0.1:4173/DungeonVeil/assets/kaykit',
  '//127.0.0.1:4173/DungeonVeil/assets/kaykit',
  'http:/127.0.0.1:4173/DungeonVeil/assets/kaykit',
  'http:127.0.0.1:4173/DungeonVeil/assets/kaykit',
  'localhost:4173/DungeonVeil/assets/kaykit',
  '/localhost:4173/DungeonVeil/assets/kaykit',
]) {
  const repairedRoot = repairPreviewOrigin(malformedRoot);
  assert.equal(repairedRoot, expectedRoot, `preview root was not repaired: ${malformedRoot}`);
  const resolvedModel = new URL(`${repairedRoot}/dungeon/example.gltf`, previewBase).href;
  assert.equal(
    resolvedModel,
    'http://127.0.0.1:4173/DungeonVeil/assets/kaykit/dungeon/example.gltf',
  );
  assert.equal(
    new URL('example.bin', resolvedModel).href,
    'http://127.0.0.1:4173/DungeonVeil/assets/kaykit/dungeon/example.bin',
  );
  assert.equal(
    new URL('dungeon_texture.png', resolvedModel).href,
    'http://127.0.0.1:4173/DungeonVeil/assets/kaykit/dungeon/dungeon_texture.png',
  );
  assert.ok(!new URL(resolvedModel).pathname.startsWith('/127.0.0.1:'), 'the repaired path must not contain the preview host');
}

const validAbsoluteModel = 'http://127.0.0.1:4173/DungeonVeil/assets/kaykit/dungeon/example.gltf';
assert.equal(repairPreviewOrigin(validAbsoluteModel), validAbsoluteModel, 'valid absolute model URLs must not be rewritten');
assert.equal(new URL('example.bin', validAbsoluteModel).origin, 'http://127.0.0.1:4173');
assert.equal(new URL('dungeon_texture.png', validAbsoluteModel).origin, 'http://127.0.0.1:4173');

console.log('KayKit runtime model URL contract passed.');

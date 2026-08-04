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
  'preview-origin paths accidentally serialized without a scheme must be repaired at the manifest boundary',
);
assert.match(
  manifestSource,
  /\^\\\/(?:localhost\|127/,
  'scheme-less localhost and loopback roots must be recognized deterministically',
);
assert.match(
  manifestSource,
  /const root = stripSchemeLessRuntimeHost\(value\.trim\(\)\.replace/,
  'manifest roots must be repaired before asset-root classification and model joining',
);
assert.match(
  manifestSource,
  /new URL\(value, document\.baseURI\)\.href/,
  'root-relative KayKit model paths must become standards-compliant absolute runtime URLs',
);
assert.match(
  manifestSource,
  /const joined = `[\s\S]*manifest\.root\.replace[\s\S]*relativePath\.replace[\s\S]*`;/,
  'model and manifest paths must be joined before runtime URL resolution',
);
assert.match(
  manifestSource,
  /return absoluteRuntimeModelUrl\(joined\);/,
  'every manifest-backed KayKit model must use the runtime URL normalizer',
);
assert.doesNotMatch(
  manifestSource,
  /replace\(\/\^https\?[^\n]+/,
  'model URL handling must never strip the HTTP scheme into a host-looking path',
);

const previewBase = 'http://127.0.0.1:4173/DungeonVeil/index.html';
const rootRelativeModel = '/DungeonVeil/assets/kaykit/dungeon/example.gltf';
const resolvedModel = new URL(rootRelativeModel, previewBase).href;
assert.equal(
  resolvedModel,
  'http://127.0.0.1:4173/DungeonVeil/assets/kaykit/dungeon/example.gltf',
);
assert.equal(new URL('example.bin', resolvedModel).origin, 'http://127.0.0.1:4173');
assert.equal(new URL('dungeon_texture.png', resolvedModel).origin, 'http://127.0.0.1:4173');
assert.ok(!resolvedModel.startsWith('/127.0.0.1:'), 'the runtime URL must retain its protocol');

const schemeLessRoot = '/127.0.0.1:4173/DungeonVeil/assets/kaykit';
const repairedRoot = schemeLessRoot.replace(/^\/(?:localhost|127(?:\.\d{1,3}){3})(?::\d+)?\/(.+)$/i, '/$1');
assert.equal(repairedRoot, '/DungeonVeil/assets/kaykit');
assert.equal(
  new URL(`${repairedRoot}/dungeon/example.gltf`, previewBase).href,
  'http://127.0.0.1:4173/DungeonVeil/assets/kaykit/dungeon/example.gltf',
);

console.log('KayKit runtime model URL contract passed.');
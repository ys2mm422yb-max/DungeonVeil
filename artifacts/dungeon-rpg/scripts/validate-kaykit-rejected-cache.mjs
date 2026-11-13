import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the actual source function bodies with browser-only dependencies mocked.
function body(source, name) {
  const start = source.indexOf('async function ' + name + '(');
  assert.ok(start >= 0, 'missing ' + name);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') { depth--; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error('unterminated ' + name);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function check(file, functionName, setup) {
  const source = readFileSync(new URL('../src/components/' + file, import.meta.url), 'utf8');
  const functionSource = body(source, functionName)
    .replace('name: AssetName', 'name').replace('path: string', 'path')
    .replace('error: unknown', 'error')
    .replace('await import(/* @vite-ignore */ GLTF_URL) as any', 'await importLoader()')
    .replace('const gltf: LoadedGltf =', 'const gltf =')
    .replaceAll('(node: any)', '(node)');
  const requests = [];
  class GLTFLoader {
    loadAsync(url) {
      const d = deferred();
      requests.push({ url, ...d });
      return d.promise;
    }
  }
  const cache = new Map();
  const context = {
    cache, modelPromises: cache, ASSETS: { floor: 'floor.gltf' },
    DUNGEON_ROOT: '/assets/', IS_MOBILE: false,
    gltfLoader: async () => new GLTFLoader(),
    importLoader: async () => ({ GLTFLoader }),
    loadKayKitManifest: async () => ({}),
    modelSource: (_, path) => path,
    keep() {},
  };
  const load = vm.runInNewContext('(function(){ ' + functionSource + '; return ' + functionName + '; })()', context);
  const key = setup === 'room' ? 'floor' : 'table.gltf';
  const first = load(key);
  const concurrent = load(key);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.equal(requests.length, 1, file + ': concurrent requests must deduplicate');
  const failure = new Error('transient GLTF failure');
  requests[0].reject(failure);
  await assert.rejects(first, e => e === failure);
  await assert.rejects(concurrent, e => e === failure);
  assert.equal(cache.size, 0, file + ': rejection must evict cached promise');
  const retry = load(key);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.equal(requests.length, 2, file + ': retry must issue new request');
  const scene = { traverse() {} };
  requests[1].resolve({ scene });
  const result = await retry;
  if (setup === 'room') assert.equal(result.scene, scene); else assert.equal(result, scene);
  await load(key);
  assert.equal(requests.length, 2, file + ': successful result must remain cached');
}
await check('kaykitRoom3D.ts', 'loadAsset', 'room');
await check('kaykitRoomThemesBase3D.ts', 'prototypeFor', 'theme');
console.log('KayKit cache rejection, concurrent deduplication, retry and success cache: PASS');

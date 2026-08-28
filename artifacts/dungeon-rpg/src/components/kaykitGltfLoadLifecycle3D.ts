const CDN_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const CDN_GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const APP_BASE_URL = String(import.meta.env.BASE_URL || '/');
const NORMALIZED_APP_BASE_URL = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;
const LOCAL_THREE_URL = `${NORMALIZED_APP_BASE_URL}assets/vendor/three/build/three.module.js`;
const LOCAL_GLTF_URL = `${NORMALIZED_APP_BASE_URL}assets/vendor/three/examples/jsm/loaders/GLTFLoader.js`;
const LIFECYCLE_MARK = Symbol.for('dungeonVeil.kayKitGltfLoadLifecycle.v1');

const familyTails = new Map<string, Promise<void>>();

function sharedTextureFamily(url: string) {
  const normalized = url.toLowerCase();
  if (normalized.includes('/assets/kaykit/dungeon/')) return 'dungeon';
  if (normalized.includes('/assets/kaykit/tools/')) return 'tools';
  if (normalized.includes('/assets/kaykit/weapons/')) return 'weapons';
  return null;
}

function patchLoaderPrototype(GLTFLoader: any) {
  const prototype = GLTFLoader?.prototype;
  if (!prototype || prototype[LIFECYCLE_MARK]) return;

  const originalLoadAsync = prototype.loadAsync;
  if (typeof originalLoadAsync !== 'function') return;

  prototype.loadAsync = function loadKayKitGltfWithSharedTextureLifecycle(
    this: any,
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
  ) {
    const family = sharedTextureFamily(String(url));
    if (!family) return originalLoadAsync.call(this, url, onProgress);

    const previous = familyTails.get(family) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => originalLoadAsync.call(this, url, onProgress));

    familyTails.set(family, task.then(() => undefined, () => undefined));
    return task;
  };

  Object.defineProperty(prototype, LIFECYCLE_MARK, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
}

async function patchLoaderModule(threeUrl: string, gltfUrl: string) {
  const [THREE, gltfModule] = await Promise.all([
    import(/* @vite-ignore */ threeUrl) as Promise<any>,
    import(/* @vite-ignore */ gltfUrl) as Promise<any>,
  ]);
  THREE.Cache.enabled = true;
  patchLoaderPrototype(gltfModule.GLTFLoader);
}

const lifecyclePromise = Promise.all([
  patchLoaderModule(CDN_THREE_URL, CDN_GLTF_URL),
  patchLoaderModule(LOCAL_THREE_URL, LOCAL_GLTF_URL),
]).then(() => undefined);

export function ensureKayKitGltfLoadLifecycle() {
  return lifecyclePromise;
}

import { controlledKayKitModel } from './controlledKayKitRegistry';

type RuntimeHandle = { dispose: () => void };

const HOST_TEST_ID = 'guild-raid-boss-panel';
const VISUAL_TEST_ID = 'controlled-kaykit-veiled-archon';
const THREE_MODULE_ID = 'three';
const GLTF_LOADER_MODULE_ID = 'three/addons/loaders/GLTFLoader.js';
let activeHandle: RuntimeHandle | null = null;
let observer: MutationObserver | null = null;

function assetUrl(path: string): string {
  const base = String(import.meta.env.BASE_URL || '/');
  return `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\//, '')}`;
}

async function mountVeiledArchon(host: HTMLElement): Promise<RuntimeHandle> {
  const shell = document.createElement('div');
  shell.dataset.testid = VISUAL_TEST_ID;
  shell.className = 'relative h-40 overflow-hidden rounded-2xl border border-violet-200/20 bg-[radial-gradient(circle_at_50%_28%,rgba(167,139,250,.22),transparent_42%),linear-gradient(180deg,rgba(15,10,25,.95),rgba(4,3,8,.98))]';
  shell.setAttribute('aria-label', 'Veiled Archon 3D model');
  const canvas = document.createElement('canvas');
  canvas.className = 'h-full w-full';
  canvas.setAttribute('aria-hidden', 'true');
  const fallback = document.createElement('div');
  fallback.className = 'absolute inset-0 grid place-items-center text-[9px] font-black uppercase tracking-[.16em] text-violet-100/45';
  fallback.textContent = 'VEILED ARCHON';
  shell.append(canvas, fallback);
  host.prepend(shell);

  let disposed = false;
  let frame = 0;
  let resizeObserver: ResizeObserver | null = null;
  let renderer: { dispose: () => void; setSize: (width: number, height: number, updateStyle?: boolean) => void; render: (scene: unknown, camera: unknown) => void; setPixelRatio: (ratio: number) => void } | null = null;
  let mixer: { update: (delta: number) => void } | null = null;
  const cleanups: Array<() => void> = [];

  try {
    // Runtime-only bare imports are resolved by the local import map in index.html.
    // Vite must not bundle them because the vendored Three runtime is copied from public/.
    // @ts-ignore Three is intentionally supplied by the vendored browser import map.
    const THREE = await import(/* @vite-ignore */ THREE_MODULE_ID);
    // @ts-ignore GLTFLoader is intentionally supplied by the vendored browser import map.
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_LOADER_MODULE_ID);
    if (disposed || !shell.isConnected) throw new Error('KayKit host was removed');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    camera.position.set(0, 1.25, 4.2);
    camera.lookAt(0, 0.9, 0);
    const webgl = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer = webgl;
    webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    webgl.outputColorSpace = THREE.SRGBColorSpace;
    webgl.shadowMap.enabled = false;

    scene.add(new THREE.HemisphereLight(0xd9ccff, 0x160b22, 2.4));
    const key = new THREE.DirectionalLight(0xffd7a8, 2.2);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8b5cf6, 2.5);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    const spec = controlledKayKitModel('veiledArchon');
    const gltf = await new GLTFLoader().loadAsync(assetUrl(spec.path));
    if (disposed || !shell.isConnected) throw new Error('KayKit host was removed');
    const model = gltf.scene;
    model.rotation.y = spec.rotationY;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = spec.targetHeight / Math.max(size.y, 0.001);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse((node: { isMesh?: boolean; frustumCulled?: boolean; material?: { roughness?: number; metalness?: number } }) => {
      if (!node.isMesh) return;
      node.frustumCulled = true;
      if (node.material) {
        node.material.roughness = Math.max(0.55, Number(node.material.roughness ?? 0.8));
        node.material.metalness = Math.min(0.2, Number(node.material.metalness ?? 0));
      }
    });
    scene.add(model);
    fallback.remove();

    if (gltf.animations?.length) {
      const animationMixer = new THREE.AnimationMixer(model);
      const idle = gltf.animations.find((clip: { name?: string }) => /idle/i.test(clip.name || '')) ?? gltf.animations[0];
      animationMixer.clipAction(idle).play();
      mixer = animationMixer;
      cleanups.push(() => animationMixer.stopAllAction());
    }

    const clock = new THREE.Clock();
    const resize = () => {
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      webgl.setSize(width, height, false);
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
    resize();

    const render = () => {
      if (disposed || !shell.isConnected) return;
      mixer?.update(Math.min(clock.getDelta(), 0.05));
      model.rotation.y += 0.0025;
      webgl.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    cleanups.push(() => {
      scene.traverse((node: { geometry?: { dispose?: () => void }; material?: unknown }) => {
        node.geometry?.dispose?.();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          if (material && typeof material === 'object' && 'dispose' in material && typeof (material as { dispose?: unknown }).dispose === 'function') {
            (material as { dispose: () => void }).dispose();
          }
        }
      });
    });
  } catch {
    fallback.textContent = 'VEILED ARCHON';
  }

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      cleanups.forEach(cleanup => cleanup());
      renderer?.dispose();
      shell.remove();
    },
  };
}

async function syncControlledKayKitVisual(): Promise<void> {
  const host = document.querySelector<HTMLElement>(`[data-testid="${HOST_TEST_ID}"]`);
  if (!host) {
    activeHandle?.dispose();
    activeHandle = null;
    return;
  }
  if (host.querySelector(`[data-testid="${VISUAL_TEST_ID}"]`)) return;
  activeHandle?.dispose();
  activeHandle = await mountVeiledArchon(host);
}

export function installControlledKayKitRuntime(): void {
  if (typeof window === 'undefined' || observer) return;
  observer = new MutationObserver(() => { void syncControlledKayKitVisual(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void syncControlledKayKitVisual();
  window.addEventListener('pagehide', () => {
    activeHandle?.dispose();
    activeHandle = null;
    observer?.disconnect();
    observer = null;
  }, { once: true });
}

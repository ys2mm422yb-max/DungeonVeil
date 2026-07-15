import { loadKayKitManifest, modelUrl } from './kaykitManifest3D';
import { buildKayKitOuterWorld, preloadKayKitOuterWorld } from './kaykitOuterWorld3D';
import { logicalRoomSetpieces, type LogicalRoomSetpiece } from '../game/logicalRoomSetpieces';
import { roomIdentity } from '../game/roomIdentity';
import { roomBibleSpec, type RoomBibleSpec } from '../game/roomBible';
import { roomPropDisplayScale, roomPropScaleClass } from '../game/propPresentation3D';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const modelPromises = new Map<string, Promise<any>>();

const ROOM_ACCENTS: Record<number, number> = {
  1: 0xd99a55, 2: 0xd5b06d, 3: 0x8da7bd, 4: 0xb98245, 5: 0x72a9a0, 6: 0xff7a32,
  7: 0x718da0, 8: 0x6b91a1, 9: 0xa260d6, 10: 0x74889c,
  11: 0x78966b, 12: 0xb79a76, 13: 0x7e6bb5, 14: 0x8b8174, 15: 0xa76adc,
  16: 0xb45f60, 17: 0x8f6475, 18: 0x8b5de0, 19: 0xbd6b68, 20: 0xc04f70,
};

type LoadedGltf = { scene: any };

function keep(resource: any) {
  if (!resource || resource.userData?.kayKitPersistent) return;
  resource.userData = { ...(resource.userData ?? {}), kayKitPersistent: true };
  resource.dispose = () => undefined;
}

function modelSource(manifest: Awaited<ReturnType<typeof loadKayKitManifest>>, path: string) {
  return path.startsWith('/') ? path : modelUrl(manifest, path);
}

async function prototypeFor(path: string) {
  const cached = modelPromises.get(path);
  if (cached) return cached;
  const promise = (async () => {
    const manifest = await loadKayKitManifest();
    const { GLTFLoader } = await import(/* @vite-ignore */ GLTF_URL) as any;
    const gltf: LoadedGltf = await new GLTFLoader().loadAsync(modelSource(manifest, path));
    gltf.scene.traverse((node: any) => {
      if (!node.isMesh && !node.isSkinnedMesh) return;
      keep(node.geometry);
      if (Array.isArray(node.material)) node.material.forEach(keep);
      else keep(node.material);
      node.castShadow = false;
      node.receiveShadow = !IS_MOBILE;
      node.frustumCulled = true;
    });
    return gltf.scene;
  })();
  modelPromises.set(path, promise);
  return promise;
}

async function prototypeForPiece(piece: LogicalRoomSetpiece) {
  const prefersNativeFallback = piece.model.startsWith('/assets/imported/fantasy-props/') && Boolean(piece.fallbackModel);
  const primary = prefersNativeFallback ? piece.fallbackModel! : piece.model;
  const secondary = prefersNativeFallback ? piece.model : piece.fallbackModel;
  try {
    return await prototypeFor(primary);
  } catch (primaryError) {
    if (!secondary || secondary === primary) throw primaryError;
    return prototypeFor(secondary);
  }
}

function additiveMaterial(THREE: any, color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

function addGroundSigil(THREE: any, root: any, x: number, z: number, radius: number, color: number, opacity = 0.5) {
  const group = new THREE.Group();
  group.position.set(x, 0.035, z);

  const outer = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.78, radius, IS_MOBILE ? 28 : 48),
    additiveMaterial(THREE, color, opacity),
  );
  outer.rotation.x = -Math.PI / 2;
  group.add(outer);

  const inner = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.38, radius * 0.48, IS_MOBILE ? 24 : 40),
    additiveMaterial(THREE, color, opacity * 0.72),
  );
  inner.rotation.x = -Math.PI / 2;
  group.add(inner);

  outer.onBeforeRender = () => {
    const now = performance.now();
    outer.rotation.z = now * 0.00022;
    inner.rotation.z = -now * 0.00034;
    outer.material.opacity = opacity * (0.82 + Math.sin(now * 0.0024) * 0.18);
  };
  root.add(group);
  return group;
}

function addRoomHeroEffects(THREE: any, root: any, room: number) {
  if (room === 6) {
    const ember = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, IS_MOBILE ? 28 : 48),
      additiveMaterial(THREE, 0xff6428, 0.34),
    );
    ember.rotation.x = -Math.PI / 2;
    ember.position.set(0, 0.045, -1.0);
    ember.onBeforeRender = () => {
      ember.material.opacity = 0.26 + Math.sin(performance.now() * 0.004) * 0.08;
    };
    root.add(ember);
    const glow = new THREE.PointLight(0xff6a2f, IS_MOBILE ? 1.8 : 3.5, 8, 2);
    glow.position.set(0, 2.1, -1.0);
    root.add(glow);
    return;
  }

  if (room === 9) {
    addGroundSigil(THREE, root, 0, 0, 2.25, 0x9b63ff, 0.55);
    return;
  }

  if (room === 10) {
    addGroundSigil(THREE, root, 0, -3.2, 2.45, 0x6e8bb7, 0.42);
    return;
  }

  if (room === 15) {
    addGroundSigil(THREE, root, 0, 0, 3.25, 0xb869ff, 0.6);
    return;
  }

  if (room === 18) {
    addGroundSigil(THREE, root, 0, 0, 2.5, 0x8a5cff, 0.48);
    const rift = new THREE.Group();
    rift.position.set(0, 0, 0);

    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 4.8),
      additiveMaterial(THREE, 0x7246dd, 0.5),
    );
    veil.position.y = 2.45;
    rift.add(veil);

    const core = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 4.35),
      additiveMaterial(THREE, 0xd5c2ff, 0.72),
    );
    core.position.set(0.05, 2.45, 0.02);
    rift.add(core);

    veil.onBeforeRender = () => {
      const pulse = 0.5 + Math.sin(performance.now() * 0.0032) * 0.5;
      veil.scale.x = 0.86 + pulse * 0.22;
      veil.material.opacity = 0.38 + pulse * 0.16;
      core.material.opacity = 0.58 + pulse * 0.22;
    };
    root.add(rift);

    const riftLight = new THREE.PointLight(0x8c62ff, IS_MOBILE ? 2.2 : 4.8, 12, 2);
    riftLight.position.set(0, 2.6, 0.5);
    root.add(riftLight);
    return;
  }

  if (room === 20) {
    addGroundSigil(THREE, root, 0, 0, 3.55, 0xc04f70, 0.52);
    for (const [x, z] of [[-5.8, -4.8], [5.8, -4.8], [-5.8, 4.8], [5.8, 4.8]] as const) {
      addGroundSigil(THREE, root, x, z, 0.85, 0xa96cff, 0.46);
    }
  }
}

function addLights(THREE: any, root: any, room: number, spec: RoomBibleSpec) {
  const accent = ROOM_ACCENTS[room] ?? spec.light.fill;
  const ambient = new THREE.AmbientLight(spec.light.ambient, IS_MOBILE ? 0.32 : 0.34);
  const hemisphere = new THREE.HemisphereLight(
    spec.light.hemisphereSky,
    spec.light.hemisphereGround,
    IS_MOBILE ? 0.55 : 0.62,
  );
  root.add(ambient);
  root.add(hemisphere);

  const heroLight = new THREE.PointLight(accent, IS_MOBILE ? 1.75 : 3.4, spec.silhouette === 'arena' ? 18 : 15, 2);
  const heroZ = spec.silhouette === 'ring' || spec.silhouette === 'orbit' || spec.silhouette === 'arena' ? 0 : -4.6;
  heroLight.position.set(0, 4.2, heroZ);
  root.add(heroLight);

  const lights = [ambient, hemisphere, heroLight];
  // The animated portal already owns a point light. A second mobile portal light was
  // redundant and expensive, so architecture uses it only on larger screens.
  if (!IS_MOBILE) {
    const portalLight = new THREE.PointLight(spec.light.fill, 1.8, 9.5, 2);
    portalLight.position.set(spec.portal.x, 3.2, spec.portal.z < -8 ? -8.5 : spec.portal.z);
    root.add(portalLight);
    lights.push(portalLight);
  }
  root.userData.architectureLights = lights;
}

function bindEnvironmentDriver(THREE: any, root: any, spec: RoomBibleSpec) {
  const background = new THREE.Color(spec.light.background);
  const fog = new THREE.Fog(
    spec.light.fog,
    spec.shell === 'veil' ? 24 : spec.shell === 'abandoned' ? 27 : 30,
    spec.shell === 'veil' ? 48 : spec.shell === 'abandoned' ? 53 : 58,
  );
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    colorWrite: false,
  });
  const driver = new THREE.Mesh(new THREE.PlaneGeometry(0.001, 0.001), material);
  driver.position.set(0, 0.1, 0);
  driver.frustumCulled = false;
  driver.renderOrder = -10000;
  driver.onBeforeRender = (renderer: any, scene: any) => {
    scene.background = background;
    scene.fog = fog;
    renderer.toneMappingExposure = spec.light.exposure;
  };
  root.add(driver);
  root.userData.environmentDriver = driver;
}

export async function preloadKayKitRoomTheme(room: number) {
  await preloadKayKitOuterWorld();
  await Promise.all(logicalRoomSetpieces(room).map(prototypeForPiece));
}

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = new THREE.Group();
  const identity = roomIdentity(room);
  const spec = roomBibleSpec(room);
  root.name = `KayKitSetpieceRoom${room}_${identity.id}_${spec.silhouette}`;
  root.userData.roomIdentity = identity;
  root.userData.environment = {
    background: spec.light.background,
    fog: spec.light.fog,
    exposure: spec.light.exposure,
  };
  let active = true;

  const outer = buildKayKitOuterWorld(THREE, 24, 32, room);
  root.add(outer);
  addLights(THREE, root, room, spec);
  addRoomHeroEffects(THREE, root, room);
  bindEnvironmentDriver(THREE, root, spec);

  const ready = Promise.all(logicalRoomSetpieces(room).map(async piece => {
    const prototype = await prototypeForPiece(piece);
    if (!active) return;
    const object = prototype.clone(true);
    const displayScale = roomPropDisplayScale(piece);
    object.position.set(piece.x, piece.y ?? 0, piece.z);
    object.rotation.y = piece.rotation ?? 0;
    object.scale.setScalar(displayScale);
    object.userData = {
      ...(object.userData ?? {}),
      roomPropPresentation: {
        authoredScale: piece.scale ?? 1,
        displayScale,
        scaleClass: roomPropScaleClass(piece),
      },
    };
    root.add(object);
  })).then(() => outer.userData?.ready ?? Promise.resolve()).then(() => undefined);

  root.userData.ready = ready;
  root.userData.dispose = () => {
    active = false;
    if (root.userData.environmentDriver) root.userData.environmentDriver.onBeforeRender = () => undefined;
    outer.userData?.dispose?.();
  };
  return root;
}

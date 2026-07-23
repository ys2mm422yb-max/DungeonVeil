import {
  buildKayKitRoomTheme as buildBaseKayKitRoomTheme,
  preloadKayKitRoomTheme as preloadBaseKayKitRoomTheme,
} from './kaykitRoomThemesBase3D';
import { buildEarlyVeilRoomAtmosphere } from './earlyVeilRoomAtmosphere3D';
import { buildRoomOneGrandEntrance } from './roomOneGrandEntrance3D';
import { buildRoomTwoCommandWatch } from './roomTwoCommandWatch3D';
import { buildAncientVeilRoomTheme, preloadAncientVeilRoomTheme } from './ancientVeilRoomsTheme3D';
import { buildFirelandsTheme } from './firelandsTheme3D';
import { buildMeadowRoomTheme, preloadMeadowRoomTheme } from './meadowRoomsTheme3D';
import { buildDarkwoodRoomTheme, preloadDarkwoodRoomTheme } from './darkwoodRoomsTheme3D';

const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);
const MEADOW_ENVIRONMENT = {
  background: 0x233d3a,
  fog: 0x34554e,
  ambient: 0xb8c5a8,
  hemisphereSky: 0xa7c9bf,
  hemisphereGround: 0x1b2f22,
  hero: 0x7aa89a,
  exposure: 1.06,
} as const;
const DARKWOOD_ENVIRONMENT = {
  background: 0x081118,
  fog: 0x17242b,
  ambient: 0x7a8582,
  hemisphereSky: 0x536879,
  hemisphereGround: 0x151116,
  hero: 0x7868a4,
  exposure: 0.88,
} as const;

export async function preloadKayKitRoomTheme(room: number) {
  const tasks: Promise<unknown>[] = [preloadBaseKayKitRoomTheme(room)];
  if (room >= 11 && room <= 20) tasks.push(preloadAncientVeilRoomTheme(room));
  if (room >= 21 && room <= 30) tasks.push(preloadMeadowRoomTheme(room));
  if (room >= 31 && room <= 40) tasks.push(preloadDarkwoodRoomTheme(room));
  await Promise.allSettled(tasks);
}

function nodeIdentity(node: any) {
  const names: string[] = [];
  let current = node;
  for (let depth = 0; current && depth < 5; depth += 1, current = current.parent) names.push(String(current.name ?? ''));
  return names.join(' ').toLowerCase();
}

function applyMeadowMaterialTreatment(THREE: any, root: any, room: number) {
  if (room < 21 || room > 30) return;
  const clones: Set<any> = root.userData.meadowMaterialClones ?? new Set<any>();
  root.userData.meadowMaterialClones = clones;
  const foliageTint = new THREE.Color(0x657d50);

  root.traverse?.((node: any) => {
    if ((!node.isMesh && !node.isSkinnedMesh) || node.userData?.dungeonVeilMeadowTreated) return;
    const identity = nodeIdentity(node);
    if (!/tree|bush|grass|flower|leaf|foliage/.test(identity)) return;

    const tint = (material: any) => {
      if (!material?.clone) return material;
      const clone = material.clone();
      clone.userData = { ...(clone.userData ?? {}), dungeonVeilMeadowClone: true };
      if (clone.color?.lerp) clone.color.lerp(foliageTint, 0.38).multiplyScalar(0.88);
      if (clone.emissive?.multiplyScalar) clone.emissive.multiplyScalar(0.45);
      clone.needsUpdate = true;
      clones.add(clone);
      return clone;
    };

    node.material = Array.isArray(node.material) ? node.material.map(tint) : tint(node.material);
    node.userData = { ...(node.userData ?? {}), dungeonVeilMeadowTreated: room };
  });
}

function applyMeadowEnvironment(THREE: any, root: any, room: number) {
  if (room < 21 || room > 30) return;
  const background = new THREE.Color(MEADOW_ENVIRONMENT.background);
  const fog = new THREE.Fog(MEADOW_ENVIRONMENT.fog, 27, 55);
  root.userData.environment = {
    background: MEADOW_ENVIRONMENT.background,
    fog: MEADOW_ENVIRONMENT.fog,
    exposure: MEADOW_ENVIRONMENT.exposure,
  };

  const driver = root.userData?.environmentDriver;
  if (driver) {
    driver.onBeforeRender = (renderer: any, scene: any) => {
      scene.background = background;
      scene.fog = fog;
      renderer.toneMappingExposure = MEADOW_ENVIRONMENT.exposure;
    };
  }

  const architectureLights = root.userData?.architectureLights ?? [];
  architectureLights.forEach((light: any) => {
    if (light.isAmbientLight) {
      light.color.setHex(MEADOW_ENVIRONMENT.ambient);
      light.intensity = IS_MOBILE ? 0.28 : 0.3;
    } else if (light.isHemisphereLight) {
      light.color.setHex(MEADOW_ENVIRONMENT.hemisphereSky);
      light.groundColor.setHex(MEADOW_ENVIRONMENT.hemisphereGround);
      light.intensity = IS_MOBILE ? 0.48 : 0.55;
    } else if (light.isPointLight) {
      light.color.setHex(MEADOW_ENVIRONMENT.hero);
      light.intensity = Math.min(Number(light.intensity) || 0, IS_MOBILE ? 1.3 : 2.5);
    }
  });
  applyMeadowMaterialTreatment(THREE, root, room);
}

function applyDarkwoodMaterialTreatment(THREE: any, root: any, room: number) {
  if (room < 31 || room > 40) return;
  const clones: Set<any> = root.userData.darkwoodMaterialClones ?? new Set<any>();
  root.userData.darkwoodMaterialClones = clones;
  const foliageTint = new THREE.Color(0x233a32);

  root.traverse?.((node: any) => {
    if ((!node.isMesh && !node.isSkinnedMesh) || node.userData?.dungeonVeilDarkwoodTreated) return;
    const identity = nodeIdentity(node);
    if (!/tree|bush|grass|flower|leaf|foliage/.test(identity)) return;

    const tint = (material: any) => {
      if (!material?.clone) return material;
      const clone = material.clone();
      clone.userData = { ...(clone.userData ?? {}), dungeonVeilDarkwoodClone: true };
      if (clone.color?.lerp) clone.color.lerp(foliageTint, 0.68).multiplyScalar(0.72);
      if (clone.emissive?.multiplyScalar) clone.emissive.multiplyScalar(0.22);
      clone.needsUpdate = true;
      clones.add(clone);
      return clone;
    };

    node.material = Array.isArray(node.material) ? node.material.map(tint) : tint(node.material);
    node.userData = { ...(node.userData ?? {}), dungeonVeilDarkwoodTreated: room };
  });
}

function applyDarkwoodEnvironment(THREE: any, root: any, room: number) {
  if (room < 31 || room > 40) return;
  const background = new THREE.Color(DARKWOOD_ENVIRONMENT.background);
  const fog = new THREE.Fog(DARKWOOD_ENVIRONMENT.fog, 24, 51);
  root.userData.environment = {
    background: DARKWOOD_ENVIRONMENT.background,
    fog: DARKWOOD_ENVIRONMENT.fog,
    exposure: DARKWOOD_ENVIRONMENT.exposure,
  };

  const driver = root.userData?.environmentDriver;
  if (driver) {
    driver.onBeforeRender = (renderer: any, scene: any) => {
      scene.background = background;
      scene.fog = fog;
      renderer.toneMappingExposure = DARKWOOD_ENVIRONMENT.exposure;
    };
  }

  const architectureLights = root.userData?.architectureLights ?? [];
  architectureLights.forEach((light: any) => {
    if (light.isAmbientLight) {
      light.color.setHex(DARKWOOD_ENVIRONMENT.ambient);
      light.intensity = IS_MOBILE ? 0.2 : 0.24;
    } else if (light.isHemisphereLight) {
      light.color.setHex(DARKWOOD_ENVIRONMENT.hemisphereSky);
      light.groundColor.setHex(DARKWOOD_ENVIRONMENT.hemisphereGround);
      light.intensity = IS_MOBILE ? 0.36 : 0.44;
    } else if (light.isPointLight) {
      light.color.setHex(DARKWOOD_ENVIRONMENT.hero);
      light.intensity = Math.min(Number(light.intensity) || 0, IS_MOBILE ? 1.15 : 2.2);
    }
  });
  applyDarkwoodMaterialTreatment(THREE, root, room);
}

function cleanStaticRoomTheme(root: any, room: number) {
  let pointLights = 0;
  let animatedDecor = 0;
  root.traverse?.((node: any) => {
    if (node.geometry?.type === 'RingGeometry') {
      node.visible = false;
      node.onBeforeRender = () => undefined;
    }
    if (node.isMesh) {
      node.castShadow = false;
      if (IS_MOBILE || room === 15) node.receiveShadow = false;
      node.frustumCulled = true;
    }
    if (room === 15 && node.isPointLight) {
      pointLights += 1;
      if (pointLights > 1) node.visible = false;
      else node.intensity = Math.min(Number(node.intensity) || 0, IS_MOBILE ? 1.1 : 2.2);
    }
    if (room === 15 && /candle|flame|fire/i.test(String(node.name ?? ''))) {
      animatedDecor += 1;
      if (animatedDecor > (IS_MOBILE ? 4 : 8)) node.visible = false;
    }
  });
}

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = buildBaseKayKitRoomTheme(THREE, room);
  const additions: any[] = [];

  const earlyVeilAtmosphere = buildEarlyVeilRoomAtmosphere(THREE, root, room);
  if (earlyVeilAtmosphere) additions.push(earlyVeilAtmosphere);
  if (room === 1) additions.push(buildRoomOneGrandEntrance(THREE));
  if (room === 2) additions.push(buildRoomTwoCommandWatch(THREE));
  if (room >= 11 && room <= 20) additions.push(buildAncientVeilRoomTheme(THREE, room));
  if (room >= 21 && room <= 30) additions.push(buildMeadowRoomTheme(THREE, room));
  if (room >= 31 && room <= 40) additions.push(buildDarkwoodRoomTheme(THREE, room));
  if (room >= 41 && room <= 50) additions.push(buildFirelandsTheme(THREE, room));

  additions.forEach(addition => root.add(addition));
  applyMeadowEnvironment(THREE, root, room);
  applyDarkwoodEnvironment(THREE, root, room);
  cleanStaticRoomTheme(root, room);

  const baseReady = Promise.resolve(root.userData?.ready ?? Promise.resolve()).catch(error => {
    console.warn(`Base room theme partially unavailable in room ${room}`, error);
  });
  root.userData.ready = Promise.all([
    baseReady,
    ...additions.map(addition => addition.userData?.ready ?? Promise.resolve()),
  ]).then(() => {
    applyMeadowEnvironment(THREE, root, room);
    applyDarkwoodEnvironment(THREE, root, room);
    cleanStaticRoomTheme(root, room);
    return undefined;
  });

  const baseDispose = root.userData?.dispose;
  root.userData.dispose = () => {
    additions.forEach(addition => addition.userData?.dispose?.());
    const meadowClones: Set<any> | undefined = root.userData.meadowMaterialClones;
    meadowClones?.forEach(material => material.dispose?.());
    meadowClones?.clear();
    const darkwoodClones: Set<any> | undefined = root.userData.darkwoodMaterialClones;
    darkwoodClones?.forEach(material => material.dispose?.());
    darkwoodClones?.clear();
    baseDispose?.();
  };
  return root;
}

import {
  buildKayKitRoomTheme as buildBaseKayKitRoomTheme,
  preloadKayKitRoomTheme as preloadBaseKayKitRoomTheme,
} from './kaykitRoomThemesBase3D';
import { buildEarlyVeilRoomAtmosphere } from './earlyVeilRoomAtmosphere3D';
import { buildRoomOneGrandEntrance } from './roomOneGrandEntrance3D';
import { buildRoomTwoCommandWatch } from './roomTwoCommandWatch3D';
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

export async function preloadKayKitRoomTheme(room: number) {
  const tasks: Promise<unknown>[] = [preloadBaseKayKitRoomTheme(room)];
  if (room >= 21 && room <= 30) tasks.push(preloadMeadowRoomTheme(room));
  if (room === 31 || room === 40) tasks.push(preloadDarkwoodRoomTheme(room));
  await Promise.allSettled(tasks);
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
  if (room >= 21 && room <= 30) additions.push(buildMeadowRoomTheme(THREE, room));
  if (room === 31 || room === 40) additions.push(buildDarkwoodRoomTheme(THREE, room));
  if (room >= 41 && room <= 50) additions.push(buildFirelandsTheme(THREE, room));

  additions.forEach(addition => root.add(addition));
  applyMeadowEnvironment(THREE, root, room);
  cleanStaticRoomTheme(root, room);

  const baseReady = Promise.resolve(root.userData?.ready ?? Promise.resolve()).catch(error => {
    console.warn(`Base room theme partially unavailable in room ${room}`, error);
  });
  root.userData.ready = Promise.all([
    baseReady,
    ...additions.map(addition => addition.userData?.ready ?? Promise.resolve()),
  ]).then(() => {
    applyMeadowEnvironment(THREE, root, room);
    cleanStaticRoomTheme(root, room);
    return undefined;
  });

  const baseDispose = root.userData?.dispose;
  root.userData.dispose = () => {
    additions.forEach(addition => addition.userData?.dispose?.());
    baseDispose?.();
  };
  return root;
}

import {
  buildKayKitRoomTheme as buildBaseKayKitRoomTheme,
  preloadKayKitRoomTheme as preloadBaseKayKitRoomTheme,
} from './kaykitRoomThemesBase3D';
import { buildRoomOneGrandEntrance } from './roomOneGrandEntrance3D';
import { buildRoomTwoCommandWatch } from './roomTwoCommandWatch3D';
import { buildFirelandsTheme } from './firelandsTheme3D';
import { buildMeadowRoomTheme, preloadMeadowRoomTheme } from './meadowRoomsTheme3D';

const IS_MOBILE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

export async function preloadKayKitRoomTheme(room: number) {
  const tasks: Promise<unknown>[] = [preloadBaseKayKitRoomTheme(room)];
  if (room >= 21 && room <= 30) tasks.push(preloadMeadowRoomTheme(room));
  await Promise.allSettled(tasks);
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

  if (room === 1) additions.push(buildRoomOneGrandEntrance(THREE));
  if (room === 2) additions.push(buildRoomTwoCommandWatch(THREE));
  if (room >= 21 && room <= 30) additions.push(buildMeadowRoomTheme(THREE, room));
  if (room >= 41 && room <= 50) additions.push(buildFirelandsTheme(THREE, room));

  additions.forEach(addition => root.add(addition));
  cleanStaticRoomTheme(root, room);

  const baseReady = Promise.resolve(root.userData?.ready ?? Promise.resolve()).catch(error => {
    console.warn(`Base room theme partially unavailable in room ${room}`, error);
  });
  root.userData.ready = Promise.all([
    baseReady,
    ...additions.map(addition => addition.userData?.ready ?? Promise.resolve()),
  ]).then(() => {
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

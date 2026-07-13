import {
  buildKayKitRoomTheme as buildBaseKayKitRoomTheme,
  preloadKayKitRoomTheme as preloadBaseKayKitRoomTheme,
} from './kaykitRoomThemesBase3D';
import { buildRoomOneGrandEntrance } from './roomOneGrandEntrance3D';
import { buildRoomTwoCommandWatch } from './roomTwoCommandWatch3D';

export const preloadKayKitRoomTheme = preloadBaseKayKitRoomTheme;

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = buildBaseKayKitRoomTheme(THREE, room);
  const additions: any[] = [];

  if (room === 1) additions.push(buildRoomOneGrandEntrance(THREE));
  if (room === 2) additions.push(buildRoomTwoCommandWatch(THREE));
  if (!additions.length) return root;

  additions.forEach(addition => root.add(addition));
  const baseReady = root.userData?.ready ?? Promise.resolve();
  root.userData.ready = Promise.all([
    baseReady,
    ...additions.map(addition => addition.userData?.ready ?? Promise.resolve()),
  ]).then(() => undefined);

  const baseDispose = root.userData?.dispose;
  root.userData.dispose = () => {
    additions.forEach(addition => addition.userData?.dispose?.());
    baseDispose?.();
  };
  return root;
}

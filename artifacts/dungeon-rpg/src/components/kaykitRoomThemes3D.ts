import {
  buildKayKitRoomTheme as buildBaseKayKitRoomTheme,
  preloadKayKitRoomTheme as preloadBaseKayKitRoomTheme,
} from './kaykitRoomThemesBase3D';
import { buildRoomOneGrandEntrance } from './roomOneGrandEntrance3D';

export const preloadKayKitRoomTheme = preloadBaseKayKitRoomTheme;

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = buildBaseKayKitRoomTheme(THREE, room);
  if (room !== 1) return root;

  const entrance = buildRoomOneGrandEntrance(THREE);
  root.add(entrance);

  const baseReady = root.userData?.ready ?? Promise.resolve();
  const entranceReady = entrance.userData?.ready ?? Promise.resolve();
  root.userData.ready = Promise.all([baseReady, entranceReady]).then(() => undefined);

  const baseDispose = root.userData?.dispose;
  root.userData.dispose = () => {
    entrance.userData?.dispose?.();
    baseDispose?.();
  };
  return root;
}

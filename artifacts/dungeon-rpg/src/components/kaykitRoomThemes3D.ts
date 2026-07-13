import {
  buildKayKitRoomTheme as buildBaseKayKitRoomTheme,
  preloadKayKitRoomTheme as preloadBaseKayKitRoomTheme,
} from './kaykitRoomThemesBase3D';
import { buildRoomTwoCommandWatch } from './roomTwoCommandWatch3D';

export const preloadKayKitRoomTheme = preloadBaseKayKitRoomTheme;

export function buildKayKitRoomTheme(THREE: any, room: number) {
  const root = buildBaseKayKitRoomTheme(THREE, room);
  if (room !== 2) return root;

  const commandWatch = buildRoomTwoCommandWatch(THREE);
  root.add(commandWatch);

  const baseReady = root.userData?.ready ?? Promise.resolve();
  const watchReady = commandWatch.userData?.ready ?? Promise.resolve();
  root.userData.ready = Promise.all([baseReady, watchReady]).then(() => undefined);

  const baseDispose = root.userData?.dispose;
  root.userData.dispose = () => {
    commandWatch.userData?.dispose?.();
    baseDispose?.();
  };
  return root;
}

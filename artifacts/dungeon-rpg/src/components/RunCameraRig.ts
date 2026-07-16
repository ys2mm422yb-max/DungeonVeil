export const RUN_CAMERA = {
  fov: 50,
  height: 18.4,
  distance: 23.0,
  lookHeight: 0.66,
  followLerp: 0.11,
  minFollowX: -4.65,
  maxFollowX: 4.65,
  minFollowZ: -3.1,
  maxFollowZ: 5.65,
  clearMinFollowZ: -3.4,
  clearMaxFollowZ: 3.8,
  safeHalfX: 4.25,
  safeForwardZ: 4.4,
  safeRearZ: 5.8,
  playerCenterOffset: 0.4,
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function isTabletLandscape(aspect: number) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const coarsePointer = navigator.maxTouchPoints > 1 || window.matchMedia?.('(pointer: coarse)').matches;
  return coarsePointer && aspect >= 1.15 && width > height && Math.min(width, height) >= 650;
}

function isSpectatorViewport() {
  return typeof document !== 'undefined' && document.documentElement.dataset.dungeonVeilSpectating === '1';
}

function responsiveFrame(aspect: number) {
  if (isTabletLandscape(aspect)) return { height: 15.9, distance: 19.0, lookAhead: 2.15 };
  if (isSpectatorViewport() && aspect < 0.55) return { height: 23.8, distance: 28.6, lookAhead: 1.8 };
  if (isSpectatorViewport() && aspect < 0.72) return { height: 22.4, distance: 27.0, lookAhead: 2.0 };
  if (aspect < 0.55) return { height: 20.2, distance: 21.7, lookAhead: 2.35 };
  if (aspect < 0.68) return { height: 19.6, distance: 22.4, lookAhead: 2.55 };
  return { height: 19.0, distance: 22.8, lookAhead: 2.75 };
}

export function updateRunCamera(
  camera: any,
  cameraGoal: any,
  playerX: number,
  playerZ: number,
  roomClearReady = false,
) {
  const centeredPlayerX = playerX + RUN_CAMERA.playerCenterOffset;
  const centeredPlayerZ = playerZ + RUN_CAMERA.playerCenterOffset;
  const minZ = roomClearReady ? RUN_CAMERA.clearMinFollowZ : RUN_CAMERA.minFollowZ;
  const maxZ = roomClearReady ? RUN_CAMERA.clearMaxFollowZ : RUN_CAMERA.maxFollowZ;

  let focusX = clamp(centeredPlayerX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  let focusZ = clamp(centeredPlayerZ - 0.18, minZ, maxZ);

  const offsetX = centeredPlayerX - focusX;
  if (offsetX > RUN_CAMERA.safeHalfX) focusX += offsetX - RUN_CAMERA.safeHalfX;
  else if (offsetX < -RUN_CAMERA.safeHalfX) focusX += offsetX + RUN_CAMERA.safeHalfX;

  const offsetZ = centeredPlayerZ - focusZ;
  if (offsetZ > RUN_CAMERA.safeForwardZ) focusZ += offsetZ - RUN_CAMERA.safeForwardZ;
  else if (offsetZ < -RUN_CAMERA.safeRearZ) focusZ += offsetZ + RUN_CAMERA.safeRearZ;

  focusX = clamp(focusX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  focusZ = clamp(focusZ, minZ, maxZ);

  const frame = responsiveFrame(Number(camera.aspect) || 1);
  cameraGoal.set(focusX, frame.height, focusZ + frame.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(focusX, 0.9, focusZ - frame.lookAhead);
}

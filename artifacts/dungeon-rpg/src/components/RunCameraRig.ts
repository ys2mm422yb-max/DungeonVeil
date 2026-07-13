export const RUN_CAMERA = {
  fov: 50,
  height: 18.6,
  distance: 23.2,
  lookHeight: 0.82,
  followLerp: 0.1,
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

function responsiveFrame(aspect: number) {
  if (aspect < 0.55) return { height: 17.35, distance: 21.7, lookAhead: 1.15 };
  if (aspect < 0.68) return { height: 17.95, distance: 22.45, lookAhead: 1.35 };
  return { height: RUN_CAMERA.height, distance: RUN_CAMERA.distance, lookAhead: 1.8 };
}

/**
 * Die Kamera folgt der Mitte der Spieler-Hitbox und passt ihre echte 3D-Framing-
 * Distanz an das sichtbare Hochformat an. Das ist kein CSS-Zoom: Seitenverhältnis,
 * Perspektive und Kameraposition bleiben vollständig im Renderer synchron.
 */
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
  let focusZ = clamp(centeredPlayerZ - 0.25, minZ, maxZ);

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
  camera.lookAt(focusX, RUN_CAMERA.lookHeight, focusZ - frame.lookAhead);
}

export const RUN_CAMERA = {
  fov: 50,
  height: 18.8,
  distance: 23.8,
  lookHeight: 0.64,
  followLerp: 0.12,
  // Portrait play needs more follow travel at the lower edge than the old static
  // clamp allowed. The outer room shell already covers this area, so the camera can
  // keep the player readable without exposing black staging gaps.
  minFollowX: -6.25,
  maxFollowX: 6.25,
  minFollowZ: -6.1,
  maxFollowZ: 9.15,
  safeHalfX: 4.7,
  safeForwardZ: 4.65,
  safeRearZ: 6.3,
  playerCenterOffset: 0.4,
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * GameCanvas passes the player's entity origin. Convert it to the 32 px collision
 * centre first, then keep that centre inside a portrait-safe world window.
 */
export function updateRunCamera(camera: any, cameraGoal: any, playerX: number, playerZ: number) {
  const centeredPlayerX = playerX + RUN_CAMERA.playerCenterOffset;
  const centeredPlayerZ = playerZ + RUN_CAMERA.playerCenterOffset;
  let focusX = clamp(centeredPlayerX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  let focusZ = clamp(centeredPlayerZ - 0.55, RUN_CAMERA.minFollowZ, RUN_CAMERA.maxFollowZ);

  const offsetX = centeredPlayerX - focusX;
  if (offsetX > RUN_CAMERA.safeHalfX) focusX += offsetX - RUN_CAMERA.safeHalfX;
  else if (offsetX < -RUN_CAMERA.safeHalfX) focusX += offsetX + RUN_CAMERA.safeHalfX;

  const offsetZ = centeredPlayerZ - focusZ;
  if (offsetZ > RUN_CAMERA.safeForwardZ) focusZ += offsetZ - RUN_CAMERA.safeForwardZ;
  else if (offsetZ < -RUN_CAMERA.safeRearZ) focusZ += offsetZ + RUN_CAMERA.safeRearZ;

  focusX = clamp(focusX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  focusZ = clamp(focusZ, RUN_CAMERA.minFollowZ, RUN_CAMERA.maxFollowZ);

  cameraGoal.set(focusX, RUN_CAMERA.height, focusZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(focusX, RUN_CAMERA.lookHeight, focusZ - 2.65);
}

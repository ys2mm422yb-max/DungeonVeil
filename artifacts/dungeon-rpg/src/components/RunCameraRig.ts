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
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Follows the player's world-space centre and then enforces a portrait-safe world
 * window. The second clamp is important near the lower corners: a plain room-bound
 * clamp left the player seven or more world units ahead of the camera and allowed
 * the character to disappear below the mobile viewport.
 */
export function updateRunCamera(camera: any, cameraGoal: any, playerX: number, playerZ: number) {
  let focusX = clamp(playerX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  let focusZ = clamp(playerZ - 0.55, RUN_CAMERA.minFollowZ, RUN_CAMERA.maxFollowZ);

  const offsetX = playerX - focusX;
  if (offsetX > RUN_CAMERA.safeHalfX) focusX += offsetX - RUN_CAMERA.safeHalfX;
  else if (offsetX < -RUN_CAMERA.safeHalfX) focusX += offsetX + RUN_CAMERA.safeHalfX;

  const offsetZ = playerZ - focusZ;
  if (offsetZ > RUN_CAMERA.safeForwardZ) focusZ += offsetZ - RUN_CAMERA.safeForwardZ;
  else if (offsetZ < -RUN_CAMERA.safeRearZ) focusZ += offsetZ + RUN_CAMERA.safeRearZ;

  focusX = clamp(focusX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  focusZ = clamp(focusZ, RUN_CAMERA.minFollowZ, RUN_CAMERA.maxFollowZ);

  cameraGoal.set(focusX, RUN_CAMERA.height, focusZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(focusX, RUN_CAMERA.lookHeight, focusZ - 2.65);
}

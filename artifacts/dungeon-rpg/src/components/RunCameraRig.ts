export const RUN_CAMERA = {
  fov: 50,
  height: 18.8,
  distance: 23.8,
  lookHeight: 0.64,
  followLerp: 0.11,
  // The playable room is wider than the portrait viewport. Following the player
  // all the way to its tile edge exposes the outer staging world and black gaps.
  // These limits keep the camera inside the authored mobile composition while the
  // player can still use the complete walkable arena.
  minFollowX: -4.65,
  maxFollowX: 4.65,
  minFollowZ: -5.4,
  maxFollowZ: 6.2,
} as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function updateRunCamera(camera: any, cameraGoal: any, playerX: number, playerZ: number) {
  const focusX = clamp(playerX, RUN_CAMERA.minFollowX, RUN_CAMERA.maxFollowX);
  const focusZ = clamp(playerZ, RUN_CAMERA.minFollowZ, RUN_CAMERA.maxFollowZ);
  cameraGoal.set(focusX, RUN_CAMERA.height, focusZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(focusX, RUN_CAMERA.lookHeight, focusZ - 2.8);
}

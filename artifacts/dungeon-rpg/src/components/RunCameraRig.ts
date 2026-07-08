export const RUN_CAMERA = {
  fov: 36,
  height: 10.8,
  distance: 10.9,
  lookHeight: 0.9,
  followLerp: 0.105,
} as const;

export function updateRunCamera(camera: any, cameraGoal: any, playerX: number, playerZ: number) {
  cameraGoal.set(playerX, RUN_CAMERA.height, playerZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(playerX, RUN_CAMERA.lookHeight, playerZ - 0.7);
}

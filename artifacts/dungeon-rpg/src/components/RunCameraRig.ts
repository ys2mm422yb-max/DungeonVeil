export const RUN_CAMERA = {
  fov: 44,
  height: 15.8,
  distance: 18.2,
  lookHeight: 0.72,
  followLerp: 0.12,
} as const;

export function updateRunCamera(camera: any, cameraGoal: any, playerX: number, playerZ: number) {
  cameraGoal.set(playerX, RUN_CAMERA.height, playerZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(playerX, RUN_CAMERA.lookHeight, playerZ - 2.1);
}

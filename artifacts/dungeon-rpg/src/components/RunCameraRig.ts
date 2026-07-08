export const RUN_CAMERA = {
  fov: 38,
  height: 13.1,
  distance: 13.3,
  lookHeight: 0.82,
  followLerp: 0.09,
} as const;

export function updateRunCamera(camera: any, cameraGoal: any, playerX: number, playerZ: number) {
  cameraGoal.set(playerX, RUN_CAMERA.height, playerZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(playerX, RUN_CAMERA.lookHeight, playerZ - 1.35);
}

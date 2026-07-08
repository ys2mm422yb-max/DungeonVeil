export const RUN_CAMERA = {
  fov: 50,
  height: 18.8,
  distance: 23.8,
  lookHeight: 0.64,
  followLerp: 0.11,
} as const;

export function updateRunCamera(camera: any, cameraGoal: any, playerX: number, playerZ: number) {
  cameraGoal.set(playerX, RUN_CAMERA.height, playerZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(playerX, RUN_CAMERA.lookHeight, playerZ - 2.8);
}

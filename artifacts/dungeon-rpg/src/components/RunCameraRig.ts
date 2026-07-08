export const RUN_CAMERA = {
  fov: 40,
  height: 15.2,
  distance: 15.4,
  lookHeight: 0.75,
  followLerp: 0.085,
} as const;

export function updateRunCamera(camera: any, cameraGoal: any, playerX: number, playerZ: number) {
  cameraGoal.set(playerX, RUN_CAMERA.height, playerZ + RUN_CAMERA.distance);
  camera.position.lerp(cameraGoal, RUN_CAMERA.followLerp);
  camera.lookAt(playerX, RUN_CAMERA.lookHeight, playerZ);
}

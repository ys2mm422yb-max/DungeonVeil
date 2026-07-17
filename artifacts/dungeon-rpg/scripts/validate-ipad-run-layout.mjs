import { readFile } from 'node:fs/promises';

const [camera, hud, joystick, actions, canvas, loading, enemyWrapper, enemyBase] = await Promise.all([
  readFile(new URL('../src/components/RunCameraRig.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/HUD.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/VirtualJoystick.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ActionButtons.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GameCanvasKayKit3D.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GlobalLoadingLayer.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/kaykitEnemy3D.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/kaykitEnemyBase3D.ts', import.meta.url), 'utf8'),
]);
const enemy = `${enemyWrapper}\n${enemyBase}`;

const checks = [
  [camera.includes('function isTabletLandscape') && camera.includes('Math.min(width, height) >= 650'), 'tablet landscape detection is missing from the run camera'],
  [camera.includes('height: 15.9') && camera.includes('distance: 19.0') && camera.includes('lookAhead: 2.15'), 'iPad landscape camera framing is not tightened'],
  [hud.includes('data-testid="run-hud"') && hud.includes("tabletLandscape?'left-6 right-6 top-5'"), 'iPad HUD inset is missing'],
  [hud.includes("tabletLandscape?'h-14 w-14 text-base'"), 'iPad pause control scaling is missing'],
  [joystick.includes('data-testid="run-joystick"') && joystick.includes('h-[148px] w-[148px]'), 'iPad joystick sizing is missing'],
  [joystick.includes('left-[max(2rem,calc(env(safe-area-inset-left)+1.4rem))]'), 'iPad joystick safe inset is missing'],
  [actions.includes('data-testid="run-dash-control"') && actions.includes('const size = worldBoss ? 78 : tabletLandscape ? 90 : 78;'), 'iPad dash sizing is missing'],
  [actions.includes("max(34px,calc(env(safe-area-inset-right) + 24px))"), 'iPad dash safe inset is missing'],
  [canvas.includes('prepareRoomEnemyVisuals') && canvas.includes('fallbackCount: 0') && !canvas.includes('EnemyVisibilitySafety_'), 'iPad rooms can still reveal colored or generic enemy safety models'],
  [loading.includes('if (!next.critical)'), 'iPad room loading can end before exact monster models are ready'],
  [enemy.includes('node.frustumCulled = false;'), 'enemy meshes can still be culled in the combined build'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`iPad run layout audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('iPad run layout audit passed: camera, HUD, 148px joystick and 90px dash use dedicated tablet framing while rooms wait for exact non-culled monster models with zero colored placeholders.');

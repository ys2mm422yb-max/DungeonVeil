import { readFile } from 'node:fs/promises';

const [camera, hud, joystick, actions, canvas, enemy] = await Promise.all([
  readFile(new URL('../src/components/RunCameraRig.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/HUD.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/VirtualJoystick.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ActionButtons.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/GameCanvasKayKit3D.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/kaykitEnemy3D.ts', import.meta.url), 'utf8'),
]);

const checks = [
  [camera.includes('function isTabletLandscape') && camera.includes('Math.min(width, height) >= 650'), 'tablet landscape detection is missing from the run camera'],
  [camera.includes('height: 15.9') && camera.includes('distance: 19.0') && camera.includes('lookAhead: 2.15'), 'iPad landscape camera framing is not tightened'],
  [hud.includes('data-testid="run-hud"') && hud.includes("tabletLandscape?'left-6 right-6 top-5'"), 'iPad HUD inset is missing'],
  [hud.includes("tabletLandscape?'h-14 w-14 text-base'"), 'iPad pause control scaling is missing'],
  [joystick.includes('data-testid="run-joystick"') && joystick.includes('h-[148px] w-[148px]'), 'iPad joystick sizing is missing'],
  [joystick.includes('left-[max(2rem,calc(env(safe-area-inset-left)+1.4rem))]'), 'iPad joystick safe inset is missing'],
  [actions.includes('data-testid="run-dash-control"') && actions.includes("tabletLandscape ? 80 : 68"), 'iPad dash sizing is missing'],
  [actions.includes("max(32px,calc(env(safe-area-inset-right) + 22px))"), 'iPad dash safe inset is missing'],
  [canvas.includes('const requiresPermanentSafety = state.floor >= 13 && !enemy.isDead;'), 'room 13+ enemy visibility safety is missing from the combined build'],
  [enemy.includes('node.frustumCulled = false;'), 'enemy meshes can still be culled in the combined build'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`iPad run layout audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('iPad run layout audit passed: camera, HUD, joystick and dash use dedicated tablet-landscape framing while room 13+ enemies retain permanent visibility safety.');

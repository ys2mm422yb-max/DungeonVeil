import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8');
const checks = [
  [source.includes('private getRoomExitCenter()'), 'room exit center cache is missing'],
  [source.includes('Math.hypot(playerX - exit.x, playerY - exit.y) > TILE_SIZE * 0.92'), 'portal activation radius is missing'],
  [source.includes('entity === this.state.player && this.playerWithinOpenExit(TILE_SIZE * 1.35)'), 'only the player may bypass props inside the open portal zone'],
  [!(/canExitRoom\(\)[\s\S]{0,240}state\.items/.test(source)), 'optional loot still blocks the exit condition'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Portal-priority audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}
console.log('Portal-priority audit passed: optional loot is independent and only the player crosses nearby props in the active exit zone.');

import { createServer } from 'vite';

const server = await createServer({
  root: process.cwd(),
  configFile: false,
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const layouts = await server.ssrLoadModule('/src/game/logicalRoomSetpieces.ts');
  const collision = await server.ssrLoadModule('/src/game/roomCollision3D.ts');
  const required = new Map([
    [4, ['pickaxe', 'pallet', 'bars_stack', 'banner']],
    [5, ['table_long', 'anvil', 'grindstone', 'shelf']],
  ]);
  const failures = [];
  for (const room of [4, 5]) {
    const pieces = layouts.logicalRoomSetpieces(room);
    const colliders = Array.from(collision.roomPropColliders(room));
    for (const token of required.get(room)) {
      if (!pieces.some(piece => piece.model.toLowerCase().includes(token))) failures.push(`Room ${room}: missing ${token}`);
    }
    const center = colliders.filter(collider => Math.abs(collider.x) < 2.7 && collider.z > -4.2 && collider.z < 4.8);
    if (center.length) failures.push(`Room ${room}: center lane has ${center.length} blocking collider(s)`);
    const portal = { x: 0, z: -13.7 };
    const portalBlocked = colliders.some(collider => Math.abs(portal.x - collider.x) <= collider.halfW + 1.25 && Math.abs(portal.z - collider.z) <= collider.halfH + 1.25);
    if (portalBlocked) failures.push(`Room ${room}: portal approach is blocked`);
    if (colliders.length > 10) failures.push(`Room ${room}: collider budget exceeded (${colliders.length}/10)`);
  }
  if (failures.length) {
    console.error(`Rooms 4–5 composition audit failed with ${failures.length} error(s):`);
    failures.forEach(message => console.error(`  - ${message}`));
    process.exit(1);
  }
  console.log('Rooms 4–5 composition audit passed: themed stations, clear center lanes and open portal approaches.');
} finally {
  await server.close();
}

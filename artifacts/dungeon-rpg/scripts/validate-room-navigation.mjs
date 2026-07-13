const { roomPropColliders } = await import('../src/game/roomPropCollisionBase.ts');
const { roomBibleSpec } = await import('../src/game/roomBible.ts');
const { CHAPTER_ROOMS } = await import('../src/game/chapterRun.ts');

const STEP = 0.35;
const HALF_PLAYER = 0.46;
const MIN_X = -10.2;
const MAX_X = 10.2;
const MIN_Z = -13.0;
const MAX_Z = 9.6;

const key = (x, z) => `${Math.round((x - MIN_X) / STEP)},${Math.round((z - MIN_Z) / STEP)}`;
const free = (colliders, x, z) => x >= MIN_X && x <= MAX_X && z >= MIN_Z && z <= MAX_Z
  && !colliders.some(collider => Math.abs(x - collider.x) < collider.halfW + HALF_PLAYER
    && Math.abs(z - collider.z) < collider.halfH + HALF_PLAYER);

function nearestFree(colliders, start) {
  if (free(colliders, start.x, start.z)) return start;
  for (let radius = STEP; radius <= 2.8; radius += STEP) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const point = { x: start.x + Math.cos(angle) * radius, z: start.z + Math.sin(angle) * radius };
      if (free(colliders, point.x, point.z)) return point;
    }
  }
  return null;
}

function reachable(colliders, startInput, targetInput) {
  const start = nearestFree(colliders, startInput);
  const target = nearestFree(colliders, targetInput);
  if (!start || !target) return false;
  const queue = [start];
  const seen = new Set([key(start.x, start.z)]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    if (Math.hypot(current.x - target.x, current.z - target.z) <= STEP * 1.8) return true;
    for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) {
      const next = { x: current.x + dx, z: current.z + dz };
      const id = key(next.x, next.z);
      if (!seen.has(id) && free(colliders, next.x, next.z)) {
        seen.add(id);
        queue.push(next);
      }
    }
  }
  return false;
}

const failures = [];
for (let room = 1; room <= CHAPTER_ROOMS; room++) {
  const colliders = roomPropColliders(room);
  const portal = roomBibleSpec(room).portal;
  const target = { x: portal.x, z: portal.z < -8 ? -8.5 : portal.z };
  const starts = {
    center: { x: 0, z: 8.5 },
    left: { x: -6.4, z: 7.2 },
    right: { x: 6.4, z: 7.2 },
  };
  for (const [lane, start] of Object.entries(starts)) {
    if (!reachable(colliders, start, target)) failures.push(`room ${room}: ${lane} route cannot reach portal`);
  }
}

if (failures.length) {
  console.error(`Room navigation audit failed with ${failures.length} blocked route(s):`);
  failures.forEach(item => console.error(`  - ${item}`));
  process.exit(1);
}

console.log(`Room navigation audit passed: center, left and right portal routes are reachable in all ${CHAPTER_ROOMS} rooms.`);

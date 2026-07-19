const PUBLISH_MS = 125;
const INTERPOLATION_DELAY_MS = 165;
const MAX_EXTRAPOLATION_MS = 120;
const BUFFER_LIMIT = 8;
const FRAME_MS = 1000 / 60;
const DURATION_MS = 12_000;
const SPEED_PX_PER_MS = 0.16;
const BASE_TIME = 1_000_000;
const JITTER = [0, 18, -12, 46, 8, 72, -6, 24, 0, 95, 12, -10];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const deliveries = [];
for (let index = 0, elapsed = 0; elapsed <= DURATION_MS; index += 1, elapsed += PUBLISH_MS) {
  if (index > 0 && (index % 11 === 0 || index % 17 === 0)) continue;
  const emittedAt = BASE_TIME + elapsed;
  const latency = 78 + JITTER[index % JITTER.length];
  deliveries.push({ emittedAt, receivedAt: emittedAt + latency, x: elapsed * SPEED_PX_PER_MS });
}
deliveries.sort((left, right) => left.receivedAt - right.receivedAt);

const packets = [];
const offsets = [];
let deliveryIndex = 0;
let outputX = 0;
let initialized = false;
let previousFrameX = 0;
let previousMoveAt = BASE_TIME;
let maxFrameStep = 0;
let maxFrozenMs = 0;
let squaredVelocityError = 0;
let velocitySamples = 0;
let interpolationFrames = 0;
let extrapolationFrames = 0;
let heldFrames = 0;

for (let localNow = BASE_TIME; localNow <= BASE_TIME + DURATION_MS; localNow += FRAME_MS) {
  while (deliveryIndex < deliveries.length && deliveries[deliveryIndex].receivedAt <= localNow) {
    const packet = deliveries[deliveryIndex++];
    packets.push(packet);
    packets.sort((left, right) => left.emittedAt - right.emittedAt);
    if (packets.length > BUFFER_LIMIT) packets.splice(0, packets.length - BUFFER_LIMIT);
    offsets.push(packet.receivedAt - packet.emittedAt);
    if (offsets.length > 16) offsets.shift();
  }
  if (packets.length === 0) continue;

  const sortedOffsets = [...offsets].sort((left, right) => left - right);
  const clockOffset = sortedOffsets.slice(0, Math.min(4, sortedOffsets.length)).reduce((sum, value) => sum + value, 0) / Math.min(4, sortedOffsets.length);
  const renderAt = localNow - clockOffset - INTERPOLATION_DELAY_MS;
  const latest = packets[packets.length - 1];
  let left = latest;
  let right = latest;
  let amount = 1;
  let mode = 'hold';

  for (let index = 1; index < packets.length; index += 1) {
    if (renderAt >= packets[index - 1].emittedAt && renderAt <= packets[index].emittedAt) {
      left = packets[index - 1];
      right = packets[index];
      amount = clamp((renderAt - left.emittedAt) / Math.max(1, right.emittedAt - left.emittedAt), 0, 1);
      mode = 'interpolate';
      break;
    }
  }

  let desiredX = right.x;
  if (mode === 'interpolate') {
    desiredX = left.x + (right.x - left.x) * amount;
    interpolationFrames += 1;
  } else if (renderAt > latest.emittedAt && packets.length >= 2) {
    left = packets[packets.length - 2];
    right = latest;
    const requestedExtra = Math.max(0, renderAt - latest.emittedAt);
    const extra = clamp(requestedExtra, 0, MAX_EXTRAPOLATION_MS);
    const interval = Math.max(1, right.emittedAt - left.emittedAt);
    desiredX = right.x + clamp((right.x - left.x) / interval * extra, -32, 32);
    mode = requestedExtra > 0 && requestedExtra <= MAX_EXTRAPOLATION_MS ? 'extrapolate' : 'hold';
    if (mode === 'extrapolate') extrapolationFrames += 1;
    else heldFrames += 1;
  } else {
    const earliest = packets[0];
    desiredX = earliest.x;
    heldFrames += 1;
  }

  if (!initialized) {
    outputX = desiredX;
    previousFrameX = outputX;
    initialized = true;
    continue;
  }
  const difference = desiredX - outputX;
  const maxStep = Math.max(3, Math.min(24, FRAME_MS * 0.82));
  const correction = clamp(difference, -maxStep, maxStep);
  const alpha = 1 - Math.exp(-FRAME_MS / 34);
  outputX += correction * alpha;

  const frameStep = Math.abs(outputX - previousFrameX);
  maxFrameStep = Math.max(maxFrameStep, frameStep);
  if (frameStep > 0.02) previousMoveAt = localNow;
  maxFrozenMs = Math.max(maxFrozenMs, localNow - previousMoveAt);
  const measuredSpeed = (outputX - previousFrameX) / FRAME_MS;
  squaredVelocityError += (measuredSpeed - SPEED_PX_PER_MS) ** 2;
  velocitySamples += 1;
  previousFrameX = outputX;
}

const velocityRmse = Math.sqrt(squaredVelocityError / Math.max(1, velocitySamples));
const summary = {
  generatedPackets: deliveries.length,
  droppedPackets: Math.floor(DURATION_MS / PUBLISH_MS) + 1 - deliveries.length,
  maxBufferDepth: BUFFER_LIMIT,
  interpolationFrames,
  extrapolationFrames,
  heldFrames,
  maxFrameStep: Number(maxFrameStep.toFixed(3)),
  maxFrozenMs: Number(maxFrozenMs.toFixed(1)),
  velocityRmse: Number(velocityRmse.toFixed(4)),
};

const failures = [];
if (packets.length > BUFFER_LIMIT) failures.push('snapshot buffer grew beyond its hard limit');
if (interpolationFrames <= extrapolationFrames) failures.push('normal playback is not predominantly interpolated');
if (extrapolationFrames <= 0) failures.push('short packet gaps never entered bounded extrapolation');
if (heldFrames <= 0) failures.push('long packet gaps never stopped in the hold state');
if (maxFrameStep > 6) failures.push(`frame correction jumped ${maxFrameStep.toFixed(2)} px`);
if (maxFrozenMs > 360) failures.push(`playback froze for ${maxFrozenMs.toFixed(0)} ms under bounded packet loss`);
if (velocityRmse > 0.11) failures.push(`smoothed velocity RMSE is too high (${velocityRmse.toFixed(3)})`);

if (failures.length) {
  console.error('Spectator interpolation simulation failed:');
  failures.forEach(failure => console.error(`  - ${failure}`));
  console.error(summary);
  process.exit(1);
}

console.log('Spectator interpolation simulation passed:', JSON.stringify(summary));

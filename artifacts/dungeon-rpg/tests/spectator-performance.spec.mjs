import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
function qaUrl() { const url = new URL(APP_URL); url.searchParams.set('qa', 'spectator'); return url.toString(); }
const numberAttr = (locator, name) => locator.getAttribute(name).then(value => Number(value || 0));
const SPECTATOR_ROLE_CASES = [
  { role: 'single-target', kind: 'attack' },
  { role: 'critical-support', kind: 'attack' },
  { role: 'shield', kind: 'guard' },
  { role: 'loot-comfort', kind: 'collect' },
  { role: 'distraction', kind: 'distract' },
];
async function rendererMetrics(page) { return page.evaluate(() => { try { return JSON.parse(localStorage.getItem('dungeon-veil-performance') || '{}'); } catch { return {}; } }); }
async function dispatchQaControl(page, detail) {
  await page.evaluate(value => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-qa-control-v1', { detail: value })), detail);
}
async function dispatchCompanionAction(page, role, kind) {
  await page.evaluate(({ actionRole, actionKind }) => {
    window.dispatchEvent(new CustomEvent('dungeon-veil-companion-action-v4', {
      detail: { ownerPlayerId: 'player', role: actionRole, level: 1, kind: actionKind, targetId: 'spectator-qa-goblin', at: performance.now() },
    }));
  }, { actionRole: role, actionKind: kind });
}

async function waitForFreshReconnectPresentation(page) {
  const rendererHost = page.getByTestId('run-three-host');
  const expectedKey = await rendererHost.getAttribute('data-room-paint-expected-key');
  const readyKey = await rendererHost.getAttribute('data-room-paint-ready-key');
  expect(expectedKey, 'spectator reconnect evidence has no active room-paint key').toBeTruthy();
  expect(readyKey, 'spectator reconnect evidence captured before the current room became paint-ready').toBe(expectedKey);
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect(rendererHost).toHaveAttribute('data-room-paint-expected-key', expectedKey);
  await expect(rendererHost).toHaveAttribute('data-room-paint-ready-key', expectedKey);
}

async function stableRendererMetrics(page) {
  const deadline = Date.now() + 8_000;
  let previous = await rendererMetrics(page);
  let previousAt = Number(previous.at || 0);
  let stablePublishedSamples = 0;
  while (Date.now() < deadline) {
    await page.waitForTimeout(250);
    const current = await rendererMetrics(page);
    const currentAt = Number(current.at || 0);
    if (!Number.isFinite(currentAt) || currentAt <= previousAt) continue;
    const sameGeometry = Number.isFinite(previous.geometries)
      && Number.isFinite(current.geometries)
      && previous.geometries === current.geometries;
    const sameTextures = Number.isFinite(previous.textures)
      && Number.isFinite(current.textures)
      && previous.textures === current.textures;
    stablePublishedSamples = sameGeometry && sameTextures ? stablePublishedSamples + 1 : 0;
    previous = current;
    previousAt = currentAt;
    if (stablePublishedSamples >= 3) return current;
  }
  return previous;
}

test('spectator playback and its companion stay smooth and bounded through jitter and packet loss', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name.includes('ipad')) await page.setViewportSize({ width: 820, height: 1180 });
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/favicon/i.test(message.text())) runtimeErrors.push(`console: ${message.text()}`); });
  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const spectatorQa = page.getByTestId('spectator-performance-qa');
  await expect(spectatorQa).toBeVisible();
  await expect(spectatorQa).toHaveAttribute('data-assets-ready', 'true');
  await dispatchQaControl(page, { role: 'single-target' });
  await expect(page.getByTestId('spectator-playback-stage')).toHaveAttribute('data-render-contract', 'single-stable-three-state-with-companion');
  await expect(page.getByTestId('spectator-performance-diagnostics')).toHaveAttribute('data-contract', 'jitter-loss-layout-long-run-v5');
  await expect(page.getByTestId('spectator-companion-contract')).toHaveAttribute('data-shared-renderer', 'true');
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  const companion = page.getByTestId('run-companion-scene');
  await expect(companion).toHaveAttribute('data-scene-captured', 'true', { timeout: 60_000 });
  await expect(companion).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });

  const diagnostics = page.getByTestId('spectator-performance-diagnostics');
  await expect.poll(() => numberAttr(diagnostics, 'data-frames'), { timeout: 45_000 }).toBeGreaterThan(8);
  await expect.poll(() => numberAttr(diagnostics, 'data-measured-frames'), { timeout: 45_000 }).toBeGreaterThan(1);
  await expect(diagnostics).toHaveAttribute('data-delta-has-map', 'false');
  const keyframeBytes = await numberAttr(diagnostics, 'data-keyframe-bytes');
  const deltaBytes = await numberAttr(diagnostics, 'data-delta-bytes');
  expect(keyframeBytes).toBeGreaterThan(1_000);
  expect(deltaBytes, 'spectator delta packet was not smaller than its room keyframe').toBeLessThan(keyframeBytes * 0.85);
  const startX = await numberAttr(diagnostics, 'data-player-x');
  const startFrames = await numberAttr(diagnostics, 'data-frames');
  const startMeasuredFrames = await numberAttr(diagnostics, 'data-measured-frames');
  const earlyRenderer = await stableRendererMetrics(page);
  await page.waitForTimeout(12_000);
  const finalX = await numberAttr(diagnostics, 'data-player-x');
  const frames = await numberAttr(diagnostics, 'data-frames');
  const measuredFrames = await numberAttr(diagnostics, 'data-measured-frames');
  const maxExcessStepPx = await numberAttr(diagnostics, 'data-max-excess-step-px');
  const maxCorrectionPx = await numberAttr(diagnostics, 'data-max-correction-px');
  const maxFrameIntervalMs = await numberAttr(diagnostics, 'data-max-frame-interval-ms');
  const maxStagnantMs = await numberAttr(diagnostics, 'data-max-stagnant-ms');
  const bufferDepth = await numberAttr(diagnostics, 'data-buffer-depth');
  const interpolationFrames = await numberAttr(diagnostics, 'data-interpolation-frames');
  const extrapolationFrames = await numberAttr(diagnostics, 'data-extrapolation-frames');
  const heldFrames = await numberAttr(diagnostics, 'data-held-frames');
  const outagePackets = await numberAttr(diagnostics, 'data-outage-packets');
  const layoutChanges = await numberAttr(diagnostics, 'data-layout-changes');
  const reactRenders = await numberAttr(diagnostics, 'data-react-renders');
  const canvasCount = await numberAttr(diagnostics, 'data-canvas-count');
  const menuCanvasCount = await numberAttr(diagnostics, 'data-menu-canvas-count');
  const lateRenderer = await rendererMetrics(page);
  expect(finalX - startX, 'spectator player did not continue moving locally between packets').toBeGreaterThan(50);
  expect(frames - startFrames, 'spectator requestAnimationFrame heartbeat stopped during the long run').toBeGreaterThan(2);
  expect(measuredFrames - startMeasuredFrames, 'spectator had no post-warmup render progress during the long run').toBeGreaterThan(2);
  expect(interpolationFrames, 'buffer never entered timestamp interpolation').toBeGreaterThan(2);
  expect(extrapolationFrames + heldFrames, 'packet gaps were not exercised').toBeGreaterThan(0);
  expect(heldFrames, 'the repeated 500ms packet outage never settled into bounded hold').toBeGreaterThan(0);
  expect(outagePackets, 'the synthetic long packet outage was not generated').toBeGreaterThanOrEqual(4);
  expect(layoutChanges, 'enemy additions and removals were not exercised').toBeGreaterThanOrEqual(2);
  expect(bufferDepth).toBeLessThanOrEqual(8);
  expect(maxCorrectionPx).toBeLessThanOrEqual(24.01);
  expect(maxExcessStepPx).toBeLessThan(2);
  expect(maxStagnantMs).toBeLessThan(Math.max(900, maxFrameIntervalMs * 3.5));
  expect(reactRenders).toBeLessThanOrEqual(4);
  expect(canvasCount).toBe(1);
  expect(menuCanvasCount).toBe(0);
  if (Number.isFinite(earlyRenderer.geometries) && Number.isFinite(lateRenderer.geometries)) expect(lateRenderer.geometries - earlyRenderer.geometries).toBeLessThan(34);
  if (Number.isFinite(earlyRenderer.textures) && Number.isFinite(lateRenderer.textures)) expect(lateRenderer.textures - earlyRenderer.textures).toBeLessThan(22);
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

test('spectator companion identity and actions survive reconnect, role changes and room transition', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name.includes('ipad')) await page.setViewportSize({ width: 820, height: 1180 });
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !/favicon/i.test(message.text())) runtimeErrors.push(`console: ${message.text()}`); });
  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const spectatorQa = page.getByTestId('spectator-performance-qa');
  await expect(spectatorQa).toBeVisible();
  await expect(spectatorQa).toHaveAttribute('data-assets-ready', 'true');
  await dispatchQaControl(page, { role: 'single-target' });
  await expect(page.getByTestId('spectator-playback-stage')).toHaveAttribute('data-render-contract', 'single-stable-three-state-with-companion');
  const spectatorCompanion = page.getByTestId('spectator-companion-contract');
  await expect(spectatorCompanion).toHaveAttribute('data-shared-renderer', 'true');
  await expect(spectatorCompanion).toHaveAttribute('data-companion-source', 'leader-snapshot');
  await expect(spectatorCompanion).not.toHaveAttribute('data-companion-id', 'spectator-playback-fallback');
  await expect(spectatorCompanion).toHaveAttribute('data-action-dedup', 'monotonic-sequence-high-water');
  await page.evaluate(() => {
    window.__dungeonVeilSpectatorPlaybackSequences = [];
    window.addEventListener('dungeon-veil-companion-action-v4', event => {
      const detail = event.detail;
      if (detail?.spectatorPlayback && Number.isFinite(Number(detail.spectatorSequence))) {
        window.__dungeonVeilSpectatorPlaybackSequences.push(Number(detail.spectatorSequence));
      }
    });
  });

  const companionId = await spectatorCompanion.getAttribute('data-companion-id');
  await dispatchCompanionAction(page, companionId, 'attack');
  await expect.poll(() => numberAttr(spectatorCompanion, 'data-last-action-sequence'), { timeout: 45_000 }).toBeGreaterThan(0);
  await expect.poll(() => numberAttr(spectatorCompanion, 'data-action-dispatch-count'), { timeout: 45_000 }).toBe(1);
  const firstSequence = await numberAttr(spectatorCompanion, 'data-last-action-sequence');
  await expect.poll(() => page.evaluate(() => window.__dungeonVeilSpectatorPlaybackSequences.length), { timeout: 45_000 }).toBe(1);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-qa-reconnect-v1')));
  await expect.poll(() => numberAttr(spectatorCompanion, 'data-reconnect-epoch'), { timeout: 15_000 }).toBeGreaterThan(0);
  await expect.poll(() => numberAttr(spectatorCompanion, 'data-last-action-sequence'), { timeout: 15_000 }).toBe(firstSequence);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__dungeonVeilSpectatorPlaybackSequences.length), 'spectator reconnect replayed buffered companion actions').toBe(1);
  await expect(spectatorCompanion).toHaveAttribute('data-action-dispatch-count', '0');

  await dispatchCompanionAction(page, companionId, 'attack');
  await expect.poll(() => numberAttr(spectatorCompanion, 'data-last-action-sequence'), { timeout: 45_000 }).toBeGreaterThan(firstSequence);
  await expect.poll(() => page.evaluate(() => window.__dungeonVeilSpectatorPlaybackSequences.length), { timeout: 45_000 }).toBe(2);
  await expect.poll(() => numberAttr(spectatorCompanion, 'data-action-dispatch-count'), { timeout: 45_000 }).toBe(1);
  await waitForFreshReconnectPresentation(page);
  await page.screenshot({ path: testInfo.outputPath(`autopilot-spectator-companion-reconnect-${testInfo.project.name}.png`), fullPage: true });

  for (const entry of SPECTATOR_ROLE_CASES) {
    await dispatchQaControl(page, { role: entry.role });
    await expect(spectatorCompanion).toHaveAttribute('data-companion-id', entry.role, { timeout: 15_000 });
    await expect(spectatorCompanion).toHaveAttribute('data-companion-source', 'leader-snapshot');
    const beforeSequence = await numberAttr(spectatorCompanion, 'data-last-action-sequence');
    await dispatchCompanionAction(page, entry.role, entry.kind);
    await expect.poll(() => numberAttr(spectatorCompanion, 'data-last-action-sequence'), { timeout: 45_000 }).toBeGreaterThan(beforeSequence);
    await expect(page.getByTestId('run-companion-scene')).toHaveAttribute('data-visible-count', '1', { timeout: 45_000 });
    await page.screenshot({ path: testInfo.outputPath(`autopilot-spectator-companion-role-${entry.role}-${testInfo.project.name}.png`), fullPage: true });
  }

  const roomKeyBefore = await spectatorCompanion.getAttribute('data-room-key');
  await dispatchQaControl(page, { roomDelta: 1 });
  await expect.poll(() => spectatorCompanion.getAttribute('data-room-key'), { timeout: 15_000 }).not.toBe(roomKeyBefore);
  await expect(spectatorCompanion).toHaveAttribute('data-companion-id', 'distraction');
  await expect(spectatorCompanion).toHaveAttribute('data-action-dispatch-count', '0');
  const roomSequenceBefore = await numberAttr(spectatorCompanion, 'data-last-action-sequence');
  await dispatchCompanionAction(page, 'distraction', 'distract');
  await expect.poll(() => numberAttr(spectatorCompanion, 'data-last-action-sequence'), { timeout: 45_000 }).toBeGreaterThan(roomSequenceBefore);
  await page.screenshot({ path: testInfo.outputPath(`autopilot-spectator-companion-room-transition-${testInfo.project.name}.png`), fullPage: true });

  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  const companion = page.getByTestId('run-companion-scene');
  await expect(companion).toHaveAttribute('data-scene-captured', 'true', { timeout: 60_000 });
  await expect(companion).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
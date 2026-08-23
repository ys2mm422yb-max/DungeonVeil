import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const RUNTIME_EVIDENCE_MARKER = 'dungeon-veil-runtime-evidence-v1';
const ROLES = ['single-target', 'critical-support', 'shield', 'loot-comfort', 'distraction'];

async function seedAndOpen(page, projectName, role, reducedMotion = false) {
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ ipad, activeRole, marker }) => {
    localStorage.clear();
    sessionStorage.setItem(marker, '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-player-profile-v1', JSON.stringify({
      version: 1,
      selectedTitle: 'veil-initiate',
      selectedCard: 'ash',
      selectedAvatar: 'ranger',
      stats: { runsStarted: 0, roomsCleared: 0, enemiesDefeated: 0, bossesDefeated: 0, totalDamage: 0, itemsFound: 0, questsCompleted: 0, playTimeMs: 0, highestChapter: 6, highestRoom: 1 },
      updatedAt: Date.now(),
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 1,
      xp: 0,
      dust: 2500,
      gold: 0,
      owned: {
        'ash-bow': { level: 1, copies: 0 },
        'ranger-quiver': { level: 1, copies: 0 },
        'ranger-cloak': { level: 1, copies: 0 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      cosmeticUnlocks: [],
      migrationCompensation: { gold: 0, dust: 0, copies: 0 },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: activeRole,
      companions: { [activeRole]: { level: 3, unlockedAt: 1 } },
      updatedAt: 1,
    }));
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, {
    ipad: projectName.includes('ipad'),
    activeRole: role,
    marker: RUNTIME_EVIDENCE_MARKER,
  });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
}

async function pressPointerUi(locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

async function waitForRoomPaintReady(page) {
  const host = page.getByTestId('run-three-host');
  await expect.poll(async () => {
    const expected = await host.getAttribute('data-room-paint-expected-key');
    const ready = await host.getAttribute('data-room-paint-ready-key');
    return Boolean(expected && ready === expected);
  }, { timeout: 60_000, intervals: [100, 250, 500] }).toBe(true);
}

async function startFreshRun(page) {
  await pressPointerUi(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await expect(page.getByText(/Spielmodus wählen|Choose game mode/i)).toBeVisible({ timeout: 20_000 });
  await pressPointerUi(page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first());
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible();
  await name.fill('Companion Movement Evidence');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  const skipIntro = page.getByRole('button', { name: /ÜBERSPRINGEN|SKIP/i });
  if (await skipIntro.isVisible({ timeout: 8_000 }).catch(() => false)) await skipIntro.click({ force: true });
  await expect(skipIntro).toBeHidden({ timeout: 20_000 });
}

async function waitForCompanionScene(page, role, reducedMotion = false) {
  const scene = page.getByTestId('run-companion-scene');
  await expect(scene).toHaveAttribute('data-follow-placement', 'role-aware-roam');
  await expect(scene).toHaveAttribute('data-local-role', role);
  await expect(scene).toHaveAttribute('data-local-level', '3');
  await expect(scene).toHaveAttribute('data-reduced-motion', reducedMotion ? 'reduce' : 'no-preference');
  await expect(scene).toHaveAttribute('data-shared-renderer', 'true');
  await expect(scene).toHaveAttribute('data-extra-canvas', 'false');
  await expect(scene).toHaveAttribute('data-scene-captured', 'true', { timeout: 60_000 });
  await expect(scene).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await waitForRoomPaintReady(page);
}

async function movePlayer(page, keys, durationMs) {
  for (const key of keys) await page.keyboard.down(key);
  try {
    await page.waitForTimeout(durationMs);
  } finally {
    for (const key of [...keys].reverse()) await page.keyboard.up(key);
  }
}

async function loadEvidenceRoom(page, room) {
  const snapshot = await page.evaluate(requestedRoom => window.__dungeonVeilRuntimeEvidence?.loadRoom(requestedRoom, 'solo') ?? null, room);
  expect(Number(snapshot?.floor || 0)).toBe(room);
  await expect.poll(async () => Number(await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot()?.floor || 0)), {
    timeout: 20_000,
    intervals: [50, 100, 250],
  }).toBe(room);
  await waitForRoomPaintReady(page);
}

async function openRoleRun(page, testInfo, role, reducedMotion = false) {
  await seedAndOpen(page, testInfo.project.name, role, reducedMotion);
  await startFreshRun(page);
  await waitForCompanionScene(page, role, reducedMotion);
  return testInfo.project.name;
}

async function captureEvidenceScreenshot(page, path) {
  // Preserve the full CSS viewport while avoiding redundant DPR upsampling in stored evidence.
  await page.screenshot({ path, fullPage: false, scale: 'css' });
}

for (const role of ROLES) {
  test(`companion ${role} visibly changes its free-roam position`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const project = await openRoleRun(page, testInfo, role, false);
    await captureEvidenceScreenshot(page, `test-results/autopilot-companion-movement-${role}-normal-start-${project}.png`);
    await page.waitForTimeout(1_350);
    await captureEvidenceScreenshot(page, `test-results/autopilot-companion-movement-${role}-normal-roam-${project}.png`);
  });
}

test('companion leash recovery, obstacle room and rebuild remain visually coherent', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const project = await openRoleRun(page, testInfo, 'shield', false);
  await movePlayer(page, ['ArrowRight', 'ArrowDown'], 1_900);
  await page.waitForTimeout(420);
  await captureEvidenceScreenshot(page, `test-results/autopilot-companion-movement-shield-leash-return-${project}.png`);

  await loadEvidenceRoom(page, 13);
  await waitForCompanionScene(page, 'shield', false);
  await movePlayer(page, ['ArrowLeft', 'ArrowUp'], 1_050);
  await page.waitForTimeout(650);
  await captureEvidenceScreenshot(page, `test-results/autopilot-companion-movement-shield-obstacle-room13-${project}.png`);

  await loadEvidenceRoom(page, 21);
  await waitForCompanionScene(page, 'shield', false);
  await page.waitForTimeout(900);
  await captureEvidenceScreenshot(page, `test-results/autopilot-companion-movement-shield-rebuild-room21-${project}.png`);
  const runtime = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null);
  expect(Number(runtime?.floor || 0)).toBe(21);
  expect(Number(runtime?.livingEnemies || 0)).toBeGreaterThan(0);
});

test('Reduced Motion keeps functional movement with less decorative roaming', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const project = await openRoleRun(page, testInfo, 'loot-comfort', true);
  await captureEvidenceScreenshot(page, `test-results/autopilot-companion-movement-loot-comfort-reduced-start-${project}.png`);
  await page.waitForTimeout(2_600);
  await captureEvidenceScreenshot(page, `test-results/autopilot-companion-movement-loot-comfort-reduced-roam-${project}.png`);
  await movePlayer(page, ['ArrowRight', 'ArrowDown'], 1_900);
  await page.waitForTimeout(420);
  await captureEvidenceScreenshot(page, `test-results/autopilot-companion-movement-loot-comfort-reduced-leash-return-${project}.png`);
});

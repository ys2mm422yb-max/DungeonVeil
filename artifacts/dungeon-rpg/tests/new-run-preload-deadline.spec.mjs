import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const requiredPreloadEvidenceTest = test.extend({});
requiredPreloadEvidenceTest.use({ video: 'on', trace: 'on' });
const REQUIRED_ROOM_1_IMPORTED_MODEL = '**/assets/imported/enemies/Bat.glb';

async function clickUi(locator) {
  await expect(locator).toBeVisible();
  await locator.click({ force: true });
}

async function startNamedRun(page, name) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await clickUi(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await expect(page.getByText(/Spielmodus wählen|Choose game mode/i)).toBeVisible();
  await clickUi(page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first());

  const nameInput = page.getByRole('textbox').first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill(name);

  const startButton = page.getByTestId('run-name-confirm');
  await expect(startButton).toBeEnabled();
  const startedAt = Date.now();
  await clickUi(startButton);
  return startedAt;
}

async function expectActualRunRoomReady(page, timeout = 20_000) {
  await expect(page.getByTestId('run-canvas-host')).toBeVisible({ timeout });
  await expect(page.locator('[data-testid="run-canvas-host"] canvas').first()).toBeVisible({ timeout });
  await expect(page.getByText(/RAUM WIRD AUFGEBAUT/i)).toBeHidden({ timeout });
}

test('a stalled later creature model cannot trap room 1 loading', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));

  let releaseStalledModel = () => undefined;
  const stalledModelGate = new Promise(resolve => { releaseStalledModel = resolve; });
  await page.route('**/assets/imported/enemies/Snake_angry.glb', async route => {
    await stalledModelGate;
    await route.abort('timedout');
  });

  try {
    const startedAt = await startNamedRun(page, 'Deadline Ranger');
    await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
    expect(Date.now() - startedAt).toBeLessThan(25_000);
    await expect(page.getByTestId('new-run-loading-screen')).toBeHidden();
  } finally {
    releaseStalledModel();
  }
});

// The FGR selector intentionally keeps the historical test title stable. Room 1's current
// family plan presents the goblin through the adventurer library and its second authored
// slot through `cave-bat`; Bat.glb is therefore the imported asset on the required preload
// lane. Rat.glb is not requested by this room and cannot prove the pending-required contract.
requiredPreloadEvidenceTest('room 1 stays on the run loading screen until its rat model is ready', async ({ page }) => {
  requiredPreloadEvidenceTest.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));

  let releaseRequiredModel = () => undefined;
  const requiredModelGate = new Promise(resolve => { releaseRequiredModel = resolve; });
  await page.route(REQUIRED_ROOM_1_IMPORTED_MODEL, async route => {
    await requiredModelGate;
    await route.continue();
  });

  const startedAt = await startNamedRun(page, 'Model Gate Ranger');
  try {
    await expect(page.getByTestId('new-run-loading-screen')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('run-hud')).toBeHidden();
    await page.waitForTimeout(8_500);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(8_000);
    await expect(page.getByTestId('new-run-loading-screen')).toBeVisible();
    await expect(page.getByTestId('run-hud')).toBeHidden();
  } finally {
    releaseRequiredModel();
  }

  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('new-run-loading-screen')).toBeHidden();
});

test('a failed required room 1 model cannot permanently block a fresh solo run', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));
  await page.route(REQUIRED_ROOM_1_IMPORTED_MODEL, route => route.abort('failed'));

  const startedAt = await startNamedRun(page, 'Fallback Ranger');
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 20_000 });
  await expectActualRunRoomReady(page);
  expect(Date.now() - startedAt).toBeLessThan(18_000);
  await expect(page.getByTestId('new-run-loading-screen')).toBeHidden();
});

test('a failed required model cannot permanently block Continue for an existing save', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));

  await startNamedRun(page, 'Continue Fallback Ranger');
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => sessionStorage.removeItem('dungeon-veil-active-run-session'));

  await page.route(REQUIRED_ROOM_1_IMPORTED_MODEL, route => route.abort('failed'));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });

  const continueButton = page.getByRole('button', { name: /Fortsetzen|Continue/i }).first();
  const continuedAt = Date.now();
  await clickUi(continueButton);
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 20_000 });
  await expectActualRunRoomReady(page);
  expect(Date.now() - continuedAt).toBeLessThan(18_000);
  await expect(page.getByTestId('new-run-loading-screen')).toBeHidden();
});

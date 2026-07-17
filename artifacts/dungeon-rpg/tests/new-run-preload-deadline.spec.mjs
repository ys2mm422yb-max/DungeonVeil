import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function clickAnimatedUi(locator) {
  await expect(locator).toBeVisible();
  await locator.click({ force: true, noWaitAfter: true });
}

async function startNamedRun(page, name) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await clickAnimatedUi(page.getByRole('button', { name: /Neuer Run|New Run/i }));

  const nameInput = page.getByRole('textbox').first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill(name);

  const startButton = page.getByRole('button', { name: /Run starten|Start Game/i }).first();
  await expect(startButton).toBeEnabled();
  const startedAt = Date.now();
  await clickAnimatedUi(startButton);
  return startedAt;
}

test('a stalled later creature model cannot trap the new-run loading screen', async ({ page }) => {
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

    await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 12_000 });
    expect(Date.now() - startedAt).toBeLessThan(10_000);
    await expect(page.getByTestId('new-run-loading-screen')).toBeHidden();
  } finally {
    releaseStalledModel();
  }
});

test('the current room stays hidden until its dedicated creature model is ready', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-language', 'de'));

  let releaseRequiredModel = () => undefined;
  const requiredModelGate = new Promise(resolve => { releaseRequiredModel = resolve; });
  await page.route('**/assets/imported/enemies/Rat.glb', async route => {
    await requiredModelGate;
    await route.continue();
  });

  await startNamedRun(page, 'Room Gate Ranger');
  await expect(page.getByTestId('new-run-loading-screen')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('run-hud')).toBeHidden();

  releaseRequiredModel();
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('new-run-loading-screen')).toBeHidden();
});

import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function clickAnimatedUi(locator) {
  await expect(locator).toBeVisible();
  await locator.click({ force: true, noWaitAfter: true });
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
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
    await clickAnimatedUi(page.getByRole('button', { name: /Neuer Run|New Run/i }));

    const nameInput = page.getByRole('textbox').first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Deadline Ranger');

    const startButton = page.getByRole('button', { name: /Run starten|Start Game/i }).first();
    await expect(startButton).toBeEnabled();
    const startedAt = Date.now();
    await clickAnimatedUi(startButton);

    await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 12_000 });
    expect(Date.now() - startedAt).toBeLessThan(10_000);
    await expect(page.getByTestId('new-run-loading-screen')).toBeHidden();
  } finally {
    releaseStalledModel();
  }
});

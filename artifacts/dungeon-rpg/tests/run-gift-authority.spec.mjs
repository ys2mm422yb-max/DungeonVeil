import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime');
  return url.toString();
}

async function startSolo(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      relics: ['ash-eye', 'marked-claw', 'veil-heart'],
      announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      announcedRelics: ['ash-eye', 'marked-claw', 'veil-heart'],
    }));
  });

  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await expect(page.getByText(/Spielmodus wählen|Choose game mode/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });

  const input = page.getByRole('textbox').first();
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill('Gift Authority');
  const confirm = page.getByTestId('run-name-confirm');
  if (await confirm.count()) await confirm.click({ force: true });
  else await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });

  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect.poll(
    () => page.evaluate(() => Boolean(window.__dungeonVeilRuntimeEvidence)),
    { timeout: 60_000 },
  ).toBe(true);
}

test('level-up shows authoritative gifts and choosing the first resumes the run', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await startSolo(page);

  await page.evaluate(() => {
    window.__dungeonVeilRuntimeEvidence.loadRoom(3, 'solo');
    window.__dungeonVeilRuntimeEvidence.killLivingEnemies();
  });
  await expect.poll(
    () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.roomClearReady),
    { timeout: 30_000, intervals: [100, 200, 350, 500, 750, 1_000] },
  ).toBe(true);

  await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.moveToExit());
  await expect.poll(
    () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.status),
    { timeout: 30_000, intervals: [100, 200, 350, 500, 750, 1_000] },
  ).toBe('levelup');

  await expect(page.getByText(/WÄHLE DEINE GABE|CHOOSE YOUR GIFT/i)).toBeVisible({ timeout: 30_000 });
  const choices = page.locator('[data-testid^="gift-choice-"]');
  await expect(choices).toHaveCount(3);
  await expect(choices.first()).toBeVisible();
  await page.screenshot({
    path: `test-results/autopilot-gift-levelup-${testInfo.project.name}.png`,
    fullPage: false,
  });

  const selected = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.chooseFirstGift());
  expect(selected?.status, JSON.stringify(selected)).toBe('playing');
  await expect.poll(
    () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.status),
    { timeout: 10_000 },
  ).toBe('playing');
  await expect(page.getByText(/WÄHLE DEINE GABE|CHOOSE YOUR GIFT/i)).toBeHidden({ timeout: 10_000 });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 10_000 });
});

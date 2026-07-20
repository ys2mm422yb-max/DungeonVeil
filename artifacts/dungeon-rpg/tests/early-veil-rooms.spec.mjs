import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function waitForMenu(page) {
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 60_000 });
}

async function waitForStableRun(page, expectedRoom) {
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  const skipIntro = page.getByRole('button', { name: /ÜBERSPRINGEN|SKIP/i });
  if (await skipIntro.isVisible({ timeout: 8_000 }).catch(() => false)) await skipIntro.click({ force: true });
  await expect(skipIntro).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText(new RegExp(`RAUM\\s+${expectedRoom}|ROOM\\s+${expectedRoom}`, 'i')).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForTimeout(10_000);
}

async function startFreshRun(page) {
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible({ timeout: 30_000 });
  await name.fill('Early Veil Visual Proof');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await waitForStableRun(page, 1);
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('dungeon-veil-save'))), { timeout: 20_000 }).toBe(true);
}

async function loadSavedRoom(page, room) {
  await page.evaluate(nextRoom => {
    const key = 'dungeon-veil-save';
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    parsed.floor = nextRoom;
    parsed.chapter = 1;
    parsed.inDungeon = true;
    parsed.hp = Math.max(1, Number(parsed.maxHp) || Number(parsed.hp) || 100);
    parsed.savedAt = Date.now();
    delete parsed.dungeonMap;
    localStorage.setItem(key, JSON.stringify(parsed));
  }, room);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForMenu(page);
  await page.getByRole('button', { name: /Fortsetzen|Continue/i }).first().click({ force: true });
  await waitForStableRun(page, room);
}

test('rooms 1, 5 and 9 keep the dark Veil atmosphere readable in real runs', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read|WebGL.*lost|room build failed/i.test(message.text())) runtimeErrors.push(message.text());
  });
  await page.addInitScript(({ ipad }) => {
    localStorage.clear();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({ version: 2, initialized: true, equipment: [], relics: [], announcedEquipment: [], announcedRelics: [] }));
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: testInfo.project.name.includes('ipad') });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForMenu(page);
  await startFreshRun(page);
  await page.screenshot({ path: `test-results/early-veil-room-1-${testInfo.project.name}.png`, fullPage: false });

  await loadSavedRoom(page, 5);
  await page.screenshot({ path: `test-results/early-veil-room-5-${testInfo.project.name}.png`, fullPage: false });

  await loadSavedRoom(page, 9);
  await page.screenshot({ path: `test-results/early-veil-room-9-${testInfo.project.name}.png`, fullPage: false });

  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

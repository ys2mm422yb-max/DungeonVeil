import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function openInventoryArmor(page, projectName) {
  await page.addInitScript(({ emulateIpad }) => {
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 2,
      rank: 1,
      xp: 0,
      dust: 0,
      gold: 0,
      owned: {
        'ash-bow': { level: 1, copies: 0 },
        'ranger-quiver': { level: 1, copies: 0 },
        'veil-key': { level: 1, copies: 0 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key' },
      rewardLedger: [],
      currentRunId: '',
    }));
    if (emulateIpad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { emulateIpad: projectName.includes('ipad') });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Inventar|Inventory/i }).first().click({ force: true });
  await expect(page.getByRole('heading', { name: /Inventar|Inventory/i })).toBeVisible();
  await page.getByTestId('inventory-tab-armor').click();
}

test('armor preview uses a male KayKit model and animated ready stance', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read/i.test(message.text())) errors.push(message.text());
  });

  await openInventoryArmor(page, testInfo.project.name);
  await expect(page.getByText(/Waldläufermantel|Ranger Cloak/i).first()).toBeVisible();

  const preview = page.locator('[data-equipment-preview-kind="armor"]').first();
  await expect(preview).toBeVisible({ timeout: 30_000 });
  await expect(preview).toHaveAttribute('data-equipment-preview-pose', 'idle-ready');
  const model = await preview.getAttribute('data-equipment-preview-model');
  expect(model).toMatch(/\/(Ranger|Knight|Barbarian)\.glb$/);
  expect(model).not.toMatch(/Mage|Rogue/i);
  await expect(preview.locator('canvas')).toBeVisible({ timeout: 30_000 });

  const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}'));
  expect(meta.version).toBe(4);
  expect(meta.equipped?.armor).toBe('ranger-cloak');
  expect(meta.owned?.['ranger-cloak']?.level).toBe(1);
  expect(errors, errors.join('\n')).toEqual([]);
});

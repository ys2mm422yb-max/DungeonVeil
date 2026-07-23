import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function seedUpgradeableAshBow(page) {
  await page.addInitScript(() => {
    const equipment = ['ash-bow', 'ranger-quiver', 'ranger-cloak'];
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment,
      relics: [],
      announcedEquipment: equipment,
      announcedRelics: [],
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 14,
      xp: 0,
      dust: 5000,
      gold: 50000,
      owned: {
        'ash-bow': { level: 1, copies: 4 },
        'ranger-quiver': { level: 1, copies: 0 },
        'ranger-cloak': { level: 1, copies: 0 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      cosmeticUnlocks: [],
      migrationCompensation: { gold: 0, dust: 0, copies: 0 },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-optional-equipment-v1', JSON.stringify({
      version: 1,
      equipped: { quiver: true },
      updatedAt: Date.now(),
    }));
  });
}

async function waitForMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('main-menu-gold-button')).toBeVisible();
  await expect(page.getByTestId('main-menu-dust-button')).toBeVisible();
}

async function assertNoWrongSurface(page) {
  await expect(page.getByTestId('player-profile-panel')).toHaveCount(0);
  await expect(page.getByTestId('accessibility-settings')).toHaveCount(0);
}

test('mobile resource actions and equipment upgrade stay on their intended surfaces', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await seedUpgradeableAshBow(page);
  await waitForMenu(page);

  await page.getByTestId('main-menu-gold-button').tap();
  await expect(page.getByTestId('main-menu-resource-popover')).toBeVisible();
  await assertNoWrongSurface(page);
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: /Gold-Menü schließen|Close gold menu/i }).tap();
  await expect(page.getByTestId('main-menu-resource-popover')).toHaveCount(0);

  await page.waitForTimeout(550);
  await page.getByTestId('main-menu-dust-button').tap();
  await expect(page.getByRole('heading', { name: /Ausrüstung|Equipment/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /Aschenbogen|Ash Bow/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Spielen|Play/i })).toHaveCount(0);
  await assertNoWrongSurface(page);

  const before = await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}');
    return {
      level: meta.owned?.['ash-bow']?.level,
      copies: meta.owned?.['ash-bow']?.copies,
      gold: meta.gold,
      dust: meta.dust,
    };
  });
  expect(before).toEqual({ level: 1, copies: 4, gold: 50000, dust: 5000 });

  await page.getByTestId('equipment-upgrade-button').tap();
  await expect.poll(async () => page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}');
    return {
      level: meta.owned?.['ash-bow']?.level,
      copies: meta.owned?.['ash-bow']?.copies,
      gold: meta.gold,
      dust: meta.dust,
    };
  }), { timeout: 10_000 }).toEqual({ level: 2, copies: 3, gold: 46500, dust: 4880 });

  await expect(page.getByRole('heading', { name: /Ausrüstung|Equipment/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Aschenbogen|Ash Bow/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Spielen|Play/i })).toHaveCount(0);
  await assertNoWrongSurface(page);
  await expect(page.getByText(/ITEM VERBESSERT|ITEM UPGRADED/i)).toBeVisible();

  await page.screenshot({ path: `test-results/mobile-resource-upgrade-${testInfo.project.name}.png`, fullPage: false });
});

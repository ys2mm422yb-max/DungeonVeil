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
  await expect(page.getByTestId('main-menu-settings-button')).toBeVisible();
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible();
}

async function assertOnlyShop(page) {
  await expect(page.getByTestId('main-menu-shop-panel')).toBeVisible();
  await expect(page.getByTestId('main-menu-shop-gold-balance')).toContainText('50.000');
  await expect(page.getByTestId('main-menu-shop-dust-balance')).toContainText('5.000');
  await expect(page.getByTestId('main-menu-options-panel')).toHaveCount(0);
  await expect(page.getByTestId('player-profile-panel')).toHaveCount(0);
  await expect(page.getByTestId('accessibility-settings')).toHaveCount(0);
}

async function closeShop(page) {
  await page.getByRole('button', { name: /Shop schließen|Close shop/i }).tap();
  await expect(page.getByTestId('main-menu-shop-panel')).toHaveCount(0);
}

test('gold, dust, options and profile use isolated mobile tap surfaces', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await seedUpgradeableAshBow(page);
  await waitForMenu(page);

  await page.getByTestId('main-menu-gold-button').tap();
  await assertOnlyShop(page);
  await closeShop(page);

  await page.getByTestId('main-menu-dust-button').tap();
  await assertOnlyShop(page);
  await closeShop(page);

  await page.getByTestId('main-menu-settings-button').tap();
  await expect(page.getByTestId('main-menu-options-panel')).toBeVisible();
  await expect(page.getByText('Online & Cloud', { exact: true })).toBeVisible();
  await expect(page.getByText(/Tutorial wiederholen|Replay tutorial/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Optionsmenü schließen|Close options menu/i })).toBeVisible();
  await expect(page.getByTestId('main-menu-shop-panel')).toHaveCount(0);
  await expect(page.getByTestId('player-profile-panel')).toHaveCount(0);
  await page.getByRole('button', { name: /Optionsmenü schließen|Close options menu/i }).tap();
  await expect(page.getByTestId('main-menu-options-panel')).toHaveCount(0);

  await page.getByTestId('main-menu-profile-badge').tap();
  await expect(page.getByTestId('player-profile-panel')).toBeVisible();
  await expect(page.getByTestId('main-menu-shop-panel')).toHaveCount(0);
  await expect(page.getByTestId('main-menu-options-panel')).toHaveCount(0);
  await page.getByRole('button', { name: /Profil schließen|Close profile/i }).tap();
  await expect(page.getByTestId('player-profile-panel')).toHaveCount(0);

  await page.getByTestId('main-menu-gold-button').tap();
  await assertOnlyShop(page);
  await closeShop(page);
  await page.getByTestId('main-menu-settings-button').tap();
  await expect(page.getByTestId('main-menu-options-panel')).toBeVisible();
  await expect(page.getByTestId('main-menu-shop-panel')).toHaveCount(0);
  await page.getByRole('button', { name: /Optionsmenü schließen|Close options menu/i }).tap();

  await page.getByTestId('main-menu-dust-button').tap();
  await assertOnlyShop(page);
  await page.screenshot({ path: `test-results/mobile-resource-upgrade-${testInfo.project.name}.png`, fullPage: false });
});

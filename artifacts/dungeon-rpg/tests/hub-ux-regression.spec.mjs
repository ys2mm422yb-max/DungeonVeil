import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function pressPointerUi(locator) {
  await expect(locator).toBeVisible();
  await locator.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, isPrimary: true });
}

async function seedHubState(page) {
  await page.addInitScript(() => {
    const knownEquipment = ['ash-bow', 'ranger-quiver', 'ranger-cloak'];
    const knownRelics = ['ash-eye'];
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: knownEquipment,
      relics: knownRelics,
      announcedEquipment: knownEquipment,
      announcedRelics: knownRelics,
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 14,
      xp: 0,
      dust: 2542,
      gold: 15914,
      owned: {
        'ash-bow': { level: 3, copies: 2 },
        'ranger-quiver': { level: 2, copies: 1 },
        'ranger-cloak': { level: 2, copies: 1 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-optional-loadout-v1', JSON.stringify({ version: 1, quiverEquipped: true, updatedAt: Date.now() }));
    localStorage.setItem('dungeon-veil-relics-v2', JSON.stringify({
      version: 2,
      owned: knownRelics,
      equipped: 'ash-eye',
      consumedHeartRuns: [],
      activatedWorldCoreRuns: [],
      relicMisses: { hunt: 0, boss: 0 },
      crownRunStacks: {},
    }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: 'single-target',
      companions: { 'single-target': { level: 3, unlockedAt: Date.now() } },
      updatedAt: Date.now(),
    }));
  });
}

async function openMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
}

test('gold popover, signed-out guild and mailbox stay compact and correctly routed', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await seedHubState(page);
  await openMenu(page);

  const goldButton = page.getByTestId('main-menu-gold-button');
  await pressPointerUi(goldButton);
  const popover = page.getByTestId('gold-menu-popover');
  await expect(popover).toBeVisible();
  const placement = await page.evaluate(() => {
    const button = document.querySelector('[data-testid="main-menu-gold-button"]')?.getBoundingClientRect();
    const menu = document.querySelector('[data-testid="gold-menu-popover"]')?.getBoundingClientRect();
    return button && menu ? {
      rightGap: Math.abs(button.right - menu.right),
      menuTop: menu.top,
      buttonBottom: button.bottom,
      viewportHeight: innerHeight,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    } : null;
  });
  expect(placement).not.toBeNull();
  expect(placement.rightGap).toBeLessThanOrEqual(12);
  expect(placement.menuTop).toBeGreaterThanOrEqual(placement.buttonBottom - 4);
  expect(placement.menuTop).toBeLessThan(placement.viewportHeight * 0.34);
  expect(placement.overflow).toBeLessThanOrEqual(4);
  await page.screenshot({ path: `test-results/hub-gold-popover-${testInfo.project.name}.png`, fullPage: false });
  await pressPointerUi(popover.getByRole('button', { name: /Schließen|Close/i }));
  await expect(popover).toHaveCount(0);

  await pressPointerUi(page.getByTestId('npc-guildmaster'));
  const guild = page.getByTestId('guild-signed-out-panel');
  await expect(guild).toBeVisible();
  const guildHeight = await guild.evaluate(node => node.getBoundingClientRect().height);
  expect(guildHeight).toBeLessThanOrEqual(460);
  await expect(guild.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  await page.screenshot({ path: `test-results/hub-guild-signed-out-${testInfo.project.name}.png`, fullPage: false });
  await pressPointerUi(page.getByTestId('guild-close-button'));
  await expect(guild).toHaveCount(0);

  await pressPointerUi(page.getByRole('button', { name: /Post/i }));
  const mailbox = page.getByTestId('mailbox-panel');
  await expect(mailbox).toBeVisible();
  await expect(mailbox.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  await page.screenshot({ path: `test-results/hub-mailbox-signed-out-${testInfo.project.name}.png`, fullPage: false });
  await pressPointerUi(page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }));
  await expect(mailbox).toHaveCount(0);
});

test('quiver, relic and companion can be unequipped while bow and armor remain required', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await seedHubState(page);
  await openMenu(page);
  await pressPointerUi(page.getByTestId('main-menu-equipment-navigation').getByRole('button'));
  await expect(page.getByRole('heading', { name: /Ausrüstung|Equipment/i })).toBeVisible({ timeout: 60_000 });

  await page.getByTestId('inventory-tab-bow').click({ force: true });
  await expect(page.getByTestId('equipment-primary-action')).toHaveAttribute('data-action', 'active');
  await expect(page.getByTestId('equipment-primary-action')).toBeDisabled();

  await page.getByTestId('inventory-tab-armor').click({ force: true });
  await expect(page.getByTestId('equipment-primary-action')).toHaveAttribute('data-action', 'active');
  await expect(page.getByTestId('equipment-primary-action')).toBeDisabled();

  await page.getByTestId('inventory-tab-quiver').click({ force: true });
  const equipmentAction = page.getByTestId('equipment-primary-action');
  await expect(equipmentAction).toHaveAttribute('data-action', 'unequip');
  await equipmentAction.click({ force: true });
  await expect(equipmentAction).toHaveAttribute('data-action', 'equip');
  await expect(page.getByTestId('equipment-optional-state')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-optional-loadout-v1') || '{}').quiverEquipped)).toBe(false);
  await page.screenshot({ path: `test-results/equipment-quiver-unequipped-${testInfo.project.name}.png`, fullPage: false });
  await equipmentAction.click({ force: true });
  await expect(equipmentAction).toHaveAttribute('data-action', 'unequip');

  await page.getByTestId('inventory-tab-relic').click({ force: true });
  const relicToggle = page.getByTestId('relic-equip-toggle');
  await expect(relicToggle).toContainText(/ABLEGEN|UNEQUIP/i);
  await relicToggle.click({ force: true });
  await expect(relicToggle).toContainText(/AUSRÜSTEN|EQUIP/i);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-relics-v2') || '{}').equipped ?? null)).toBeNull();
  await page.screenshot({ path: `test-results/equipment-relic-unequipped-${testInfo.project.name}.png`, fullPage: false });

  await page.getByTestId('inventory-tab-companion').click({ force: true });
  await expect(page.getByTestId('companion-unequip-button')).toBeVisible();
  await page.getByTestId('companion-unequip-button').click({ force: true });
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'none');
  await expect(page.getByText(/Kein Begleiter ausgewählt|No companion selected/i)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}').activeId ?? null)).toBeNull();
  await page.screenshot({ path: `test-results/equipment-companion-unequipped-${testInfo.project.name}.png`, fullPage: false });

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
});

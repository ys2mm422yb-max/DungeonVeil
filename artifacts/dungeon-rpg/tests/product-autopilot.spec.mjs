import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const SUPABASE_REST = 'https://hfndwqfghyomwapqsked.supabase.co/rest/v1/';

function withQaMode(mode = '') {
  const url = new URL(APP_URL);
  if (mode) url.searchParams.set('visualQa', mode);
  return url.toString();
}

async function pointer(locator) {
  await expect(locator).toBeVisible({ timeout: 30_000 });
  await locator.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, isPrimary: true });
}

async function screenshot(page, name, projectName) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(4);
  await page.screenshot({ path: `test-results/autopilot-${name}-${projectName}.png`, fullPage: false });
}

async function seedProductState(page, { signedIn = false } = {}) {
  await page.addInitScript(({ signedIn }) => {
    localStorage.clear();
    sessionStorage.clear();
    const now = Date.now();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'standard', textSize: 'standard', updatedAt: now }));
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      relics: ['marked-claw'],
      announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      announcedRelics: ['marked-claw'],
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 20,
      xp: 420,
      dust: 999999,
      gold: 999999,
      owned: {
        'ash-bow': { level: 1, copies: 99 },
        'ranger-quiver': { level: 1, copies: 99 },
        'ranger-cloak': { level: 1, copies: 99 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-optional-equipment-v1', JSON.stringify({ version: 1, equipped: { quiver: true }, updatedAt: now }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: 'single-target',
      companions: { 'single-target': { level: 1, unlockedAt: now } },
      updatedAt: now,
    }));
    localStorage.setItem('dungeon-veil-relics-v2', JSON.stringify({
      version: 2,
      owned: ['marked-claw'],
      equipped: 'marked-claw',
      consumedHeartRuns: [],
      activatedWorldCoreRuns: [],
      relicMisses: { hunt: 0, boss: 0 },
      crownRunStacks: {},
    }));
    localStorage.setItem('dungeon-veil-player-profile-v1', JSON.stringify({
      version: 1,
      selectedTitle: 'veil-initiate',
      selectedCard: 'ash',
      selectedAvatar: 'ranger',
      stats: { runsStarted: 4, roomsCleared: 80, enemiesDefeated: 260, bossesDefeated: 8, totalDamage: 22000, itemsFound: 18, questsCompleted: 7, playTimeMs: 7200000, highestChapter: 10, highestRoom: 50 },
      updatedAt: now,
    }));
    if (signedIn) {
      localStorage.setItem('dungeon-veil-supabase-session-v1', JSON.stringify({
        access_token: 'autopilot-access-token',
        refresh_token: 'autopilot-refresh-token',
        expires_at: 4102444800,
        token_type: 'bearer',
        user: { id: 'autopilot-user', email: 'autopilot@dungeonveil.invalid' },
      }));
    }
  }, { signedIn });
}

async function installEmptyOnlineMocks(page) {
  await page.route(`${SUPABASE_REST}**`, async route => {
    const method = route.request().method();
    await route.fulfill({
      status: method === 'GET' ? 200 : 204,
      contentType: 'application/json',
      body: method === 'GET' ? '[]' : '',
    });
  });
}

async function openMenu(page, url = APP_URL) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
}

async function closeStandardOverlay(page) {
  await pointer(page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).last());
}

test('signed-out menu, mailbox, guild and duo routes remain usable', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await seedProductState(page, { signedIn: false });
  await openMenu(page);

  await pointer(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await expect(page.getByText(/SPIELMODUS WÄHLEN|CHOOSE GAME MODE/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Solo-Run|Solo Run/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Duo-Run|Duo Run/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Weltboss|World Boss/i })).toBeVisible();
  await screenshot(page, 'play-mode-signed-out', testInfo.project.name);

  await pointer(page.getByRole('button', { name: /Duo-Run|Duo Run/i }));
  await expect(page.getByTestId('coop-lobby-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  await screenshot(page, 'duo-signed-out', testInfo.project.name);
  await closeStandardOverlay(page);

  await pointer(page.getByTestId('npc-guildmaster'));
  await expect(page.getByTestId('guild-panel-shell')).toBeVisible();
  await expect(page.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  await screenshot(page, 'guild-signed-out', testInfo.project.name);
  await page.getByTestId('guild-close-button').click({ force: true });

  await pointer(page.getByTestId('npc-postmaster'));
  await expect(page.getByTestId('mailbox-panel')).toBeVisible();
  await expect(page.getByText(/Online-Anmeldung erforderlich|Online sign-in required/i)).toBeVisible();
  await screenshot(page, 'mailbox-signed-out', testInfo.project.name);
});

test('signed-in player outside a guild sees creation and duo-lobby controls', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await installEmptyOnlineMocks(page);
  await seedProductState(page, { signedIn: true });
  await openMenu(page);

  await pointer(page.getByTestId('npc-guildmaster'));
  const guild = page.getByTestId('guild-panel-shell');
  await expect(guild).toBeVisible();
  await expect(guild.getByText(/Gilde gründen|Create a guild/i)).toBeVisible();
  await expect(guild.getByRole('button', { name: /Für .* Gold gründen|Create for .* gold/i })).toBeVisible();
  await screenshot(page, 'guild-signed-in-outside', testInfo.project.name);
  await page.getByTestId('guild-close-button').click({ force: true });

  await pointer(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await pointer(page.getByRole('button', { name: /Duo-Run|Duo Run/i }));
  await expect(page.getByTestId('coop-lobby-panel')).toBeVisible();
  await expect(page.getByTestId('coop-create-lobby')).toBeVisible();
  await expect(page.getByTestId('coop-invite-code-input')).toBeVisible();
  await screenshot(page, 'duo-signed-in', testInfo.project.name);
});

test('weapon, quiver, relic and companion actions mutate real persistent state', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  await installEmptyOnlineMocks(page);
  await seedProductState(page, { signedIn: true });
  await openMenu(page, withQaMode('filled-social'));

  await pointer(page.getByTestId('main-menu-equipment-navigation').getByRole('button'));
  await expect(page.getByTestId('equipment-category-tabs')).toBeVisible({ timeout: 60_000 });

  const bowLevelBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}').owned?.['ash-bow']?.level ?? 0);
  const bowUpgrade = page.getByTestId('equipment-upgrade-button');
  await expect(bowUpgrade).toBeEnabled();
  await bowUpgrade.click({ force: true });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}').owned?.['ash-bow']?.level ?? 0)).toBe(bowLevelBefore + 1);
  await screenshot(page, 'bow-upgraded', testInfo.project.name);

  await page.getByTestId('inventory-tab-armor').click({ force: true });
  await expect(page.getByTestId('equipment-equip-button')).toBeDisabled();

  await page.getByTestId('inventory-tab-quiver').click({ force: true });
  await pointer(page.getByTestId('equipment-unequip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-optional-equipment-v1') || '{}').equipped?.quiver)).toBe(false);
  await screenshot(page, 'quiver-unequipped', testInfo.project.name);
  await pointer(page.getByTestId('equipment-equip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-optional-equipment-v1') || '{}').equipped?.quiver)).toBe(true);

  await page.getByTestId('inventory-tab-relic').click({ force: true });
  await pointer(page.getByTestId('relic-unequip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-relics-v2') || '{}').equipped ?? null)).toBeNull();
  await screenshot(page, 'relic-unequipped', testInfo.project.name);
  await pointer(page.getByTestId('relic-equip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-relics-v2') || '{}').equipped ?? null)).toBe('marked-claw');

  await page.getByTestId('inventory-tab-companion').click({ force: true });
  const roleCard = page.getByTestId('companion-role-single-target');
  const companionLevelBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}').companions?.['single-target']?.level ?? 0);
  await pointer(roleCard.getByRole('button', { name: /VERBESSERN|UPGRADE/i }));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}').companions?.['single-target']?.level ?? 0)).toBe(companionLevelBefore + 1);
  await screenshot(page, 'companion-upgraded', testInfo.project.name);

  await pointer(page.getByTestId('companion-unequip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}').activeId ?? null)).toBeNull();
  await pointer(roleCard.getByRole('button', { name: /AUSWÄHLEN|SELECT/i }));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}').activeId ?? null)).toBe('single-target');
  await screenshot(page, 'companion-reselected', testInfo.project.name);
});

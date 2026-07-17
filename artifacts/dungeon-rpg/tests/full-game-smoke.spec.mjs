import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function attachRuntimeMonitor(page) {
  const issues = [];
  const appOrigin = new URL(APP_URL).origin;
  page.__dungeonVeilIntentionalNavigation = false;
  const intentionallyNavigating = () => page.__dungeonVeilIntentionalNavigation === true;

  page.on('pageerror', error => {
    if (!intentionallyNavigating()) issues.push(`pageerror: ${error.message}`);
  });
  page.on('console', message => {
    if (message.type() !== 'error' || intentionallyNavigating()) return;
    const text = message.text();
    if (/favicon|supabase.*401|supabase.*403/i.test(text)) return;
    if (/TypeError|ReferenceError|Cannot read|permission denied|Failed to fetch dynamically imported module/i.test(text)) {
      issues.push(`console: ${text}`);
    }
  });
  page.on('response', response => {
    if (intentionallyNavigating()) return;
    const url = response.url();
    if (!url.startsWith(appOrigin)) return;
    if (response.status() >= 400) issues.push(`http ${response.status()}: ${url}`);
  });

  return issues;
}

async function navigateToApp(page) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      return;
    } catch (error) {
      lastError = error;
      const retryable = /ERR_ABORTED|frame was detached/i.test(String(error));
      if (!retryable || attempt === 1) throw error;
      await page.waitForTimeout(350);
    }
  }
  throw lastError;
}

async function waitForReadyMenu(page) {
  const boot = page.getByTestId('app-boot-loading-screen');
  await expect(boot).toHaveAttribute('data-boot-presentation', 'veil-gate', { timeout: 20_000 });
  await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Neuer Run|New Run/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible();
}

async function preparePage(page, projectName) {
  const ipad = projectName.includes('ipad');
  await page.addInitScript(({ emulateIpad }) => {
    localStorage.setItem('dungeon-veil-language', 'de');
    if (emulateIpad) {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
    }
  }, { emulateIpad: ipad });
  await navigateToApp(page);
  await waitForReadyMenu(page);
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(
    Math.max(geometry.bodyWidth, geometry.documentWidth),
    `horizontal overflow: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.innerWidth + 4);
}

async function clickAnimatedUi(locator) {
  await expect(locator).toBeVisible();
  await locator.click({ force: true, noWaitAfter: true });
}

async function reloadMenu(page, projectName) {
  page.__dungeonVeilIntentionalNavigation = true;
  try {
    await page.context().clearCookies();
    await navigateToApp(page);
    if (projectName.includes('ipad')) {
      await page.evaluate(() => Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 }));
    }
    await waitForReadyMenu(page);
  } finally {
    page.__dungeonVeilIntentionalNavigation = false;
  }
}

async function openMenuButton(page, name) {
  await clickAnimatedUi(page.getByRole('button', { name }).first());
}

async function openOverflow(page) {
  await clickAnimatedUi(page.getByRole('button', { name: /Mehr|More/i }).first());
}

test('main menu, profile and every hub panel open without fatal errors', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({ version: 1, initialized: true, equipment: [], relics: [] })));
  const issues = attachRuntimeMonitor(page);
  await preparePage(page, testInfo.project.name);
  await page.waitForTimeout(250);
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0);
  const migratedUnlockMarkers = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-seen-unlocks-v1') || '{}'));
  expect(migratedUnlockMarkers.version).toBe(2);
  expect(migratedUnlockMarkers.announcedEquipment?.length ?? 0).toBeGreaterThan(0);
  await assertNoHorizontalOverflow(page);

  await test.step('profile overview and statistics', async () => {
    await clickAnimatedUi(page.getByTestId('main-menu-profile-badge'));
    await expect(page.getByText(/Statistik|Statistics/i).first()).toBeVisible();
    await expect(page.getByText(/Höchstes Kapitel|Highest Chapter/i).first()).toBeVisible();
    await expect(page.getByText(/Höchster Raum|Highest Room/i).first()).toBeVisible();
  });

  await test.step('inventory and armor migration', async () => {
    await page.evaluate(() => {
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
        equipped: {
          bow: 'ash-bow',
          quiver: 'ranger-quiver',
          talisman: 'veil-key',
        },
        rewardLedger: [],
        currentRunId: '',
      }));
    });
    await reloadMenu(page, testInfo.project.name);
    await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0);
    await openMenuButton(page, /Inventar|Inventory/i);
    await expect(page.getByRole('heading', { name: /Inventar|Inventory/i })).toBeVisible();
    await expect(page.getByText(/Ausrüstungslevel|Equipment Level/i).first()).toBeVisible();
    await expect(page.getByTestId('inventory-tab-bow')).toBeVisible();
    const armorTab = page.getByTestId('inventory-tab-armor');
    await expect(armorTab).toBeVisible();
    await expect(page.getByTestId('inventory-tab-relic')).toBeVisible();
    await armorTab.click();
    await expect(page.getByText(/Waldläufermantel|Ranger Cloak/i).first()).toBeVisible();
    const armorMeta = await page.evaluate(() => {
      const meta = JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}');
      return {
        version: meta.version,
        equippedArmor: meta.equipped?.armor,
        starterArmorLevel: meta.owned?.['ranger-cloak']?.level,
      };
    });
    expect(armorMeta).toEqual({ version: 3, equippedArmor: 'ranger-cloak', starterArmorLevel: 1 });
    await assertNoHorizontalOverflow(page);
  });

  await test.step('mailbox has no permission error', async () => {
    await reloadMenu(page, testInfo.project.name);
    const mailboxButton = page.getByTestId('npc-postmaster');
    await clickAnimatedUi(mailboxButton);
    await expect(page.getByText(/Nachrichten aus dem Schleier|Messages from the Veil/i)).toBeVisible();
    await expect(page.getByText(/permission denied/i)).toHaveCount(0);
  });

  await test.step('friends direct sign-in route', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /Freunde|Friends/i);
    await expect(page.getByText(/Gefährten im Schleier|Companions in the Veil/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  });

  await test.step('guild direct sign-in route', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /Gilde|Guild/i);
    await expect(page.getByText(/Gilde gründen|Create Guild/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  });

  await test.step('world boss direct sign-in route', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /Weltboss|World Boss/i);
    await expect(page.getByText(/Das nächste Weltereignis|The next world event/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  });

  await test.step('structured quest board', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /Aufträge|Quests/i);
    const toggle = page.getByTestId('quest-board-toggle');
    const content = page.getByTestId('quest-board-content');
    await expect(toggle).toBeVisible();
    if (!await content.isVisible().catch(() => false)) await toggle.click();
    await expect(content).toBeVisible();
    await expect(page.getByText(/Aktive Aufträge|Active Quests/i).first()).toBeVisible();
    await expect(page.getByText(/Erledigte Aufträge|Completed Quests/i).first()).toBeVisible();
    await expect(page.getByText(/Schleierstaub|Veil Dust/i).first()).toBeVisible();
  });

  await test.step('codex', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /Kodex|Codex/i);
    await expect(page.getByText(/Kodex|Codex/i).first()).toBeVisible();
  });

  await test.step('credits from overflow menu', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openOverflow(page);
    await openMenuButton(page, /Credits/i);
    await expect(page.getByText(/hobbyloser Typ|hobbyless guy/i)).toBeVisible();
  });

  await assertNoHorizontalOverflow(page);
  await testInfo.attach('runtime-issues.json', {
    body: Buffer.from(JSON.stringify(issues, null, 2)),
    contentType: 'application/json',
  });
  expect(issues, issues.join('\n')).toEqual([]);
});

test('settings persist contrast, storage and joystick with standard UI size', async ({ page }, testInfo) => {
  const issues = attachRuntimeMonitor(page);
  await page.addInitScript(() => localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'high', textSize: 'large', updatedAt: 1 })));
  await preparePage(page, testInfo.project.name);
  await openOverflow(page);
  await openMenuButton(page, /Einstellungen|Settings/i);

  await expect(page.getByTestId('accessibility-settings')).toBeVisible();
  await expect(page.getByTestId('joystick-mode-settings')).toBeVisible();
  await expect(page.getByTestId('profile-storage-settings')).toBeVisible();
  await expect(page.getByTestId('text-size-large')).toHaveCount(0);
  await expect(page.getByText(/UI-Schrift|UI text size/i)).toHaveCount(0);
  await page.getByTestId('contrast-mode-high').click();
  await page.getByTestId('joystick-mode-floating').click();

  const applied = await page.evaluate(() => ({
    contrast: document.documentElement.dataset.contrast,
    textSize: document.documentElement.dataset.textSize,
    storedTextSize: JSON.parse(localStorage.getItem('dungeon-veil-accessibility-v1') || '{}').textSize,
    accessibilityVersion: JSON.parse(localStorage.getItem('dungeon-veil-accessibility-v1') || '{}').version,
    joystick: JSON.parse(localStorage.getItem('dungeon-veil-control-settings-v1') || '{}').joystickMode,
  }));
  expect(applied).toEqual({ contrast: 'high', textSize: 'standard', storedTextSize: 'standard', accessibilityVersion: 3, joystick: 'floating' });
  await assertNoHorizontalOverflow(page);

  await reloadMenu(page, testInfo.project.name);
  const persisted = await page.evaluate(() => ({
    contrast: document.documentElement.dataset.contrast,
    textSize: document.documentElement.dataset.textSize,
  }));
  expect(persisted).toEqual({ contrast: 'high', textSize: 'standard' });
  expect(issues, issues.join('\n')).toEqual([]);
});

test('new run renders responsive combat controls and stays stable', async ({ page }, testInfo) => {
  const phoneFloating = testInfo.project.name.includes('iphone') || testInfo.project.name.includes('android');
  if (phoneFloating) {
    await page.addInitScript(() => localStorage.setItem('dungeon-veil-control-settings-v1', JSON.stringify({ joystickMode: 'floating' })));
  }
  const issues = attachRuntimeMonitor(page);
  await preparePage(page, testInfo.project.name);

  await page.getByRole('button', { name: /Neuer Run|New Run/i }).click();
  const nameInput = page.getByRole('textbox').first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill('Test Ranger');
  const startButton = page.getByRole('button', { name: /Run starten|Start Game/i }).first();
  await expect(startButton).toBeEnabled();
  await startButton.click();

  const hud = page.getByTestId('run-hud');
  await expect(hud).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('run-health-panel')).toBeVisible();
  await expect(page.getByTestId('run-pause-control')).toBeVisible();
  await expect(page.getByTestId('run-enemy-status')).toBeVisible();
  const joystick = page.getByTestId('run-joystick');
  await expect(joystick).toBeVisible();
  await expect(page.getByTestId('run-dash-button')).toBeVisible();
  await expect(page.getByTestId('run-dash-state')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();

  if (phoneFloating) {
    await expect(joystick).toHaveAttribute('data-joystick-mode', 'floating');
    await expect(page.getByTestId('run-joystick-floating-zone')).toBeVisible();
  } else {
    await expect(joystick).toHaveAttribute('data-joystick-mode', 'fixed');
  }

  await page.waitForTimeout(8_000);
  await assertNoHorizontalOverflow(page);

  if (testInfo.project.name.includes('ipad')) {
    const joystickBox = await joystick.boundingBox();
    const dashBox = await page.getByTestId('run-dash-control').boundingBox();
    expect(joystickBox?.width ?? 0).toBeGreaterThanOrEqual(140);
    expect(dashBox?.width ?? 0).toBeGreaterThanOrEqual(88);
  }

  await page.getByTestId('run-pause-control').click();
  await expect(page.getByText(/Pause|Fortsetzen|Continue/i).first()).toBeVisible();

  await testInfo.attach('runtime-issues.json', {
    body: Buffer.from(JSON.stringify(issues, null, 2)),
    contentType: 'application/json',
  });
  expect(issues, issues.join('\n')).toEqual([]);
});

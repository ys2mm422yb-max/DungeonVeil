import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function attachRuntimeMonitor(page) {
  const issues = [];
  const appOrigin = new URL(APP_URL).origin;

  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*401|supabase.*403/i.test(text)) return;
    if (/TypeError|ReferenceError|Cannot read|permission denied|Failed to fetch dynamically imported module/i.test(text)) {
      issues.push(`console: ${text}`);
    }
  });
  page.on('response', response => {
    const url = response.url();
    if (!url.startsWith(appOrigin)) return;
    if (response.status() >= 400) issues.push(`http ${response.status()}: ${url}`);
  });

  return issues;
}

async function preparePage(page, projectName) {
  if (projectName.includes('ipad')) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
    });
  }
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Neuer Run|New Run/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible();
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

async function reloadMenu(page, projectName) {
  await page.context().clearCookies();
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  if (projectName.includes('ipad')) {
    await page.evaluate(() => Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 }));
  }
  await expect(page.getByRole('button', { name: /Neuer Run|New Run/i })).toBeVisible({ timeout: 60_000 });
}

async function openMenuButton(page, name) {
  const button = page.getByRole('button', { name }).first();
  await expect(button).toBeVisible();
  await button.click();
}

test('main menu, profile and every hub panel open without fatal errors', async ({ page }, testInfo) => {
  const issues = attachRuntimeMonitor(page);
  await preparePage(page, testInfo.project.name);
  await assertNoHorizontalOverflow(page);

  await test.step('profile overview and statistics', async () => {
    await page.getByTestId('main-menu-profile-badge').click();
    await expect(page.getByText(/Statistik|Statistics/i).first()).toBeVisible();
    await expect(page.getByText(/Höchstes Kapitel|Highest Chapter/i).first()).toBeVisible();
    await expect(page.getByText(/Höchster Raum|Highest Room/i).first()).toBeVisible();
  });

  await test.step('inventory', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /Inventar|Inventory/i);
    await expect(page.getByRole('heading', { name: /Inventar|Inventory/i })).toBeVisible();
    await expect(page.getByText(/Ausrüstungslevel|Equipment Level/i).first()).toBeVisible();
  });

  await test.step('mailbox has no permission error', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /^Post$|^Mail$/i);
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

  await test.step('quests', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /Aufträge|Quests/i);
    await expect(page.getByText(/Aufträge|Quests/i).first()).toBeVisible();
  });

  await test.step('codex', async () => {
    await reloadMenu(page, testInfo.project.name);
    await openMenuButton(page, /Kodex|Codex/i);
    await expect(page.getByText(/Kodex|Codex/i).first()).toBeVisible();
  });

  await test.step('credits from overflow menu', async () => {
    await reloadMenu(page, testInfo.project.name);
    const overflow = page.locator('button').filter({ hasText: /⋯|•••|\.\.\./ }).first();
    await expect(overflow).toBeVisible();
    await overflow.click();
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

test('new run renders combat controls and stays stable', async ({ page }, testInfo) => {
  const issues = attachRuntimeMonitor(page);
  await preparePage(page, testInfo.project.name);

  await page.getByRole('button', { name: /Neuer Run|New Run/i }).click();

  const hud = page.getByTestId('run-hud');
  if (!(await hud.isVisible({ timeout: 8_000 }).catch(() => false))) {
    const startLabels = [/Waldläufer|Ranger/i, /Start|Beginnen|Enter|Betreten/i, /Weiter|Continue/i];
    for (const label of startLabels) {
      const candidate = page.getByRole('button', { name: label }).first();
      if (await candidate.isVisible().catch(() => false)) await candidate.click();
      if (await hud.isVisible({ timeout: 3_000 }).catch(() => false)) break;
    }
  }

  await expect(hud).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('run-joystick')).toBeVisible();
  await expect(page.getByTestId('run-dash-control')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();

  await page.waitForTimeout(8_000);
  await assertNoHorizontalOverflow(page);

  if (testInfo.project.name.includes('ipad')) {
    const joystickBox = await page.getByTestId('run-joystick').boundingBox();
    const dashBox = await page.getByTestId('run-dash-control').boundingBox();
    expect(joystickBox?.width ?? 0).toBeGreaterThanOrEqual(140);
    expect(dashBox?.width ?? 0).toBeGreaterThanOrEqual(78);
  }

  const pauseButton = page.getByRole('button', { name: /Ⅱ|Pause/i }).first();
  if (await pauseButton.isVisible().catch(() => false)) {
    await pauseButton.click();
    await expect(page.getByText(/Pause|Fortsetzen|Continue/i).first()).toBeVisible();
  }

  await testInfo.attach('runtime-issues.json', {
    body: Buffer.from(JSON.stringify(issues, null, 2)),
    contentType: 'application/json',
  });
  expect(issues, issues.join('\n')).toEqual([]);
});

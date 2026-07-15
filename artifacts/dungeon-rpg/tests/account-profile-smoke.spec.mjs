import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function openApp(page, projectName) {
  await page.addInitScript(({ ipad }) => {
    localStorage.setItem('dungeon-veil-language', 'de');
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad') });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible({ timeout: 60_000 });
}

async function reloadMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible({ timeout: 60_000 });
}

test('restored collections, account entry and weekly elite contracts are visible', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await openApp(page, testInfo.project.name);

  await page.getByTestId('main-menu-profile-badge').click({ force: true, noWaitAfter: true });
  await expect(page.getByTestId('player-profile-panel')).toBeVisible();
  await expect(page.getByTestId('profile-collection-summary')).toBeVisible();
  await page.getByRole('button', { name: /Visitenkarten|Calling Cards/i }).click({ force: true, noWaitAfter: true });
  await expect(page.getByText(/Glutriss|Ember Rift/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Avatare|Avatars/i }).click({ force: true, noWaitAfter: true });
  await expect(page.getByText(/Aschenmaske|Ash Mask/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Titel|Titles/i }).click({ force: true, noWaitAfter: true });
  await expect(page.getByText(/Dungeonläufer|Dungeon Runner/i).first()).toBeVisible();

  await reloadMenu(page);
  await page.getByRole('button', { name: /Mehr|More/i }).click({ force: true, noWaitAfter: true });
  await page.getByRole('button', { name: /Online & Cloud/i }).click({ force: true, noWaitAfter: true });
  await expect(page.getByRole('button', { name: /Mit Google anmelden|Continue with Google/i })).toBeVisible();
  await expect(page.getByPlaceholder('E-Mail')).toBeVisible();
  await expect(page.getByPlaceholder(/Passwort|Password/i)).toBeVisible();

  await reloadMenu(page);
  await page.getByRole('button', { name: /Aufträge|Quests/i }).first().click({ force: true, noWaitAfter: true });
  const content = page.getByTestId('quest-board-content');
  if (!await content.isVisible().catch(() => false)) await page.getByTestId('quest-board-toggle').click({ force: true, noWaitAfter: true });
  await expect(page.getByText(/Wöchentliche Elite-Aufträge|Weekly Elite Contracts/i)).toBeVisible();
  await expect(page.getByTestId('weekly-elite-card')).toHaveCount(3);
  await expect(page.getByText(/Gold-Aufträge|Gold Quests/i)).toBeVisible();
});

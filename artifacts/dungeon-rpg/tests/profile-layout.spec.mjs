import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'profiles');
  return url.toString();
}

async function columnCount(locator) {
  return locator.evaluate(element => {
    const value = getComputedStyle(element).gridTemplateColumns.trim();
    return value ? value.split(/\s+/).length : 0;
  });
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(overflow.document, overflow.body) - overflow.viewport, JSON.stringify(overflow)).toBeLessThanOrEqual(2);
}

test('own and public profiles use responsive current-equipment layouts', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const tablet = testInfo.project.name.includes('ipad');
  const desktop = testInfo.project.name.includes('desktop');
  const wide = tablet || desktop;
  if (tablet) await page.setViewportSize({ width: 820, height: 1180 });

  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !/favicon/i.test(message.text())) runtimeErrors.push(`console: ${message.text()}`);
  });

  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const qa = page.getByTestId('profile-layout-qa');
  await expect(qa).toBeVisible();
  await expect(qa).toHaveAttribute('data-contract', 'profile-tablet-current-equipment-v1');

  const ownShell = page.getByTestId('player-profile-responsive-shell');
  const ownOverview = page.getByTestId('player-profile-tablet-overview');
  await expect(ownShell).toBeVisible();
  await expect(ownOverview).toBeVisible();
  await expect(page.getByTestId('profile-distinct-equipment-count')).toContainText('6');
  await expect(page.getByTestId('own-player-profile-equipment')).toBeVisible();
  await expect(page.getByTestId('own-player-profile-equipment-slot-bow')).toHaveAttribute('data-equipped', 'true');
  await expect(page.getByTestId('own-player-profile-equipment-slot-quiver')).toHaveAttribute('data-equipped', 'true');
  await expect(page.getByTestId('own-player-profile-equipment-slot-armor')).toHaveAttribute('data-equipped', 'true');

  const ownBounds = await ownShell.boundingBox();
  expect(ownBounds).toBeTruthy();
  if (wide) expect(ownBounds.width).toBeGreaterThan(700);
  else expect(ownBounds.width).toBeLessThanOrEqual((await page.viewportSize()).width + 1);
  expect(await columnCount(ownOverview)).toBe(wide ? 2 : 1);
  await assertNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Statistik', exact: true }).click();
  await expect(page.getByTestId('profile-lifetime-equipment-rewards')).toContainText('14');
  await expect(page.getByTestId('player-profile-statistics-grid')).toBeVisible();

  await page.getByTestId('profile-qa-public').click();
  const diagnostics = page.getByTestId('profile-layout-diagnostics');
  await expect(diagnostics).toHaveAttribute('data-active-slots', '3');
  await expect(diagnostics).toHaveAttribute('data-legacy-talisman-filtered', 'true');
  await expect(page.getByTestId('public-player-profile-dialog')).toBeVisible();
  await expect(page.getByTestId('public-player-profile-tablet-columns')).toBeVisible();
  await expect(page.getByText(/Talisman/i)).toHaveCount(0);

  const publicCard = page.getByTestId('player-profile-card');
  const publicColumns = page.getByTestId('public-player-profile-tablet-columns');
  const publicBounds = await publicCard.boundingBox();
  expect(publicBounds).toBeTruthy();
  if (wide) expect(publicBounds.width).toBeGreaterThan(700);
  expect(await columnCount(publicColumns)).toBe(wide ? 2 : 1);

  const loadout = page.getByTestId('public-player-profile-equipment');
  await expect(loadout).toContainText('3/3');
  await expect(page.getByTestId('public-player-profile-equipment-slot-bow')).toHaveAttribute('data-equipped', 'true');
  await expect(page.getByTestId('public-player-profile-equipment-slot-quiver')).toHaveAttribute('data-equipped', 'true');
  await expect(page.getByTestId('public-player-profile-equipment-slot-armor')).toHaveAttribute('data-equipped', 'true');

  await page.getByTestId('public-player-profile-equipment-slot-armor').click();
  await expect(page.getByTestId('public-player-profile-equipment-detail')).toContainText('Aschenpanzer');
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await assertNoHorizontalOverflow(page);

  await testInfo.attach('profile-layout.png', {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  });
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

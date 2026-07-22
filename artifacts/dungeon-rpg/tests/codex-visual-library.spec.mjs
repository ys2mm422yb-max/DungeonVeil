import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const OWNED_RELICS = ['ash-eye', 'marked-claw', 'veil-heart'];
const STARTER_EQUIPMENT = ['ash-bow', 'ranger-quiver', 'ranger-cloak'];

async function openCodex(page) {
  await page.addInitScript(({ ownedRelics, starterEquipment }) => {
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-retention-v2', JSON.stringify({
      currencyVersion: 2,
      sigils: 0,
      codex: {
        enemies: ['goblin', 'skeleton', 'spider'],
        bosses: ['1:10', '1:20'],
        hunts: ['Aschenjäger'],
        relics: [],
      },
    }));
    localStorage.setItem('dungeon-veil-relics-v2', JSON.stringify({
      version: 2,
      owned: ownedRelics,
      equipped: 'marked-claw',
      consumedHeartRuns: [], activatedWorldCoreRuns: [],
      relicMisses: { hunt: 0, boss: 0 }, crownRunStacks: {},
    }));
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: starterEquipment,
      relics: ownedRelics,
      announcedEquipment: starterEquipment,
      announcedRelics: ownedRelics,
    }));
  }, { ownedRelics: OWNED_RELICS, starterEquipment: STARTER_EQUIPMENT });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Spielen|Play/i })).toBeVisible({ timeout: 60_000 });
  const codexButton = page.getByRole('button', { name: /Kodex|Codex/i }).first();
  await expect(codexButton).toBeVisible();
  const touchDevice = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (touchDevice) await codexButton.tap();
  else await codexButton.click({ noWaitAfter: true });
  await expect(page.getByTestId('codex-responsive-layout')).toBeVisible();
}

async function assertNoOverflow(page) {
  const width = await page.evaluate(() => ({
    viewport: innerWidth,
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
  }));
  expect(Math.max(width.body, width.root)).toBeLessThanOrEqual(width.viewport + 4);
}

test('codex uses visual cards, one shared model preview and responsive tablet detail', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openCodex(page);
  await assertNoOverflow(page);

  const grid = page.getByTestId('codex-card-grid');
  await expect(grid.locator('button')).toHaveCount(8);
  await expect(page.getByTestId('codex-card-goblin')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('codex-card-slime')).toHaveAttribute('data-known', 'false');
  await expect(page.getByTestId('codex-shared-model-preview')).toHaveCount(1);
  await expect(page.getByTestId('codex-shared-model-preview')).toHaveAttribute('data-preview-renderers', '1');
  expect(await page.locator('[data-codex-preview-canvas="true"]').count()).toBeLessThanOrEqual(1);

  await page.getByTestId('codex-card-slime').click();
  await expect(page.getByTestId('codex-shared-model-preview')).toHaveCount(0);
  await expect(page.getByTestId('codex-detail-panel')).toContainText(/Erstmals nach dem ersten Wächter|First seen after/i);

  await page.getByRole('button', { name: /WÄCHTER|WARDENS/i }).click();
  await expect(grid.locator('button')).toHaveCount(5);
  await expect(page.getByTestId('codex-card-warden-10')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('codex-card-warden-30')).toHaveAttribute('data-known', 'false');

  await page.getByRole('button', { name: /RELIKTE|RELICS/i }).click();
  await expect(grid.locator('button')).toHaveCount(7);
  await expect(page.getByTestId('codex-card-marked-claw')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('codex-card-world-core')).toHaveAttribute('data-known', 'false');

  await page.getByRole('button', { name: /AUSRÜSTUNG|EQUIPMENT/i }).click();
  await expect(grid.locator('button')).toHaveCount(10);

  if ((page.viewportSize()?.width ?? 390) >= 768) {
    const geometry = await page.evaluate(() => {
      const cards = document.querySelector('[data-testid="codex-card-grid"]')?.getBoundingClientRect();
      const detail = document.querySelector('[data-testid="codex-detail-panel"]')?.getBoundingClientRect();
      const columns = getComputedStyle(document.querySelector('[data-testid="codex-card-grid"]')).gridTemplateColumns.split(' ').filter(Boolean).length;
      return { cardsRight: cards?.right ?? 0, detailLeft: detail?.left ?? 0, columns };
    });
    expect(geometry.columns).toBeGreaterThanOrEqual(2);
    expect(geometry.detailLeft).toBeGreaterThanOrEqual(geometry.cardsRight - 6);
  }

  await assertNoOverflow(page);
  expect(runtimeErrors).toEqual([]);
});

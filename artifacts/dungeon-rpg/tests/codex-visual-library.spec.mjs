import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const OWNED_RELICS = ['ash-eye', 'marked-claw', 'veil-heart'];
const STARTER_EQUIPMENT = ['ash-bow', 'ranger-quiver', 'ranger-cloak'];

async function openCodex(page, { language = 'de' } = {}) {
  await page.addInitScript(({ ownedRelics, starterEquipment, language }) => {
    localStorage.setItem('dungeon-veil-language', language);
    localStorage.setItem('dungeon-veil-retention-v2', JSON.stringify({
      currencyVersion: 2,
      sigils: 0,
      daily: {
        date: '2026-07-30', selected: ['clear-rooms', 'defeat-enemies', 'reach-depth'],
        progress: { rooms: 0, kills: 0, hunts: 0, fireKills: 0, frostKills: 0, highHpRooms: 0, bossKills: 0, deepestRoom: 0, rankTwoGifts: 0, relicFinds: 0 },
        claimed: [],
      },
      codex: {
        enemies: ['goblin', 'skeleton', 'spider'],
        enemyKills: { goblin: 14, skeleton: 9, spider: 5 },
        bosses: ['1:10', '1:20', '1:50', '1:100'],
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
  }, { ownedRelics: OWNED_RELICS, starterEquipment: STARTER_EQUIPMENT, language });
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
  const width = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, root: document.documentElement.scrollWidth }));
  expect(Math.max(width.body, width.root)).toBeLessThanOrEqual(width.viewport + 4);
}
async function assertTouchTarget(locator, minimum = 44) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeGreaterThanOrEqual(minimum);
  expect(box.width).toBeGreaterThanOrEqual(minimum);
}

 test('codex uses 35 registry beast cards, ten wardens, exact counters and responsive detail', async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openCodex(page);
  await assertNoOverflow(page);
  await assertTouchTarget(page.getByTestId('codex-back'));
  for (const tab of ['beasts', 'hunts', 'wardens', 'relics', 'equipment']) await assertTouchTarget(page.getByTestId(`codex-tab-${tab}`));

  const grid = page.getByTestId('codex-card-grid');
  await expect(grid.locator('button')).toHaveCount(35);
  await expect(page.getByTestId('codex-card-goblin')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('codex-card-slime')).toHaveAttribute('data-known', 'false');
  await expect(page.getByTestId('codex-card-veil-aberration')).toHaveAttribute('data-known', 'false');
  await expect(page.getByTestId('codex-count-beasts')).toHaveText('3/35');
  await page.getByTestId('codex-card-goblin').click();
  await expect(page.getByTestId('codex-detail-panel')).toContainText('14');
  await expect(page.getByTestId('codex-shared-model-preview')).toHaveCount(1);
  await expect(page.getByTestId('codex-shared-model-preview')).toHaveAttribute('data-preview-renderers', '1');
  expect(await page.locator('[data-codex-preview-canvas="true"]').count()).toBeLessThanOrEqual(1);

  await page.getByTestId('codex-card-slime').click();
  await expect(page.getByTestId('codex-shared-model-preview')).toHaveCount(0);
  await expect(page.getByTestId('codex-detail-panel')).toContainText(/ersten Räumen|first rooms/i);

  await page.getByTestId('codex-tab-wardens').click();
  await expect(grid.locator('button')).toHaveCount(10);
  await expect(page.getByTestId('codex-count-wardens')).toHaveText('4/10');
  await expect(page.getByTestId('codex-card-warden-10')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('codex-card-warden-60')).toHaveAttribute('data-known', 'false');
  await expect(page.getByTestId('codex-card-warden-100')).toHaveAttribute('data-known', 'true');

  await page.getByTestId('codex-tab-relics').click();
  await expect(grid.locator('button')).toHaveCount(7);
  await expect(page.getByTestId('codex-card-marked-claw')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('codex-card-world-core')).toHaveAttribute('data-known', 'false');

  await page.getByTestId('codex-tab-equipment').click();
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

test('English registry codex contains no German card-state copy and survives reload', async ({ page }) => {
  test.setTimeout(180_000);
  await openCodex(page, { language: 'en' });
  await expect(page.getByRole('heading', { name: 'CODEX' })).toBeVisible();
  await expect(page.getByTestId('codex-count-beasts')).toHaveText('3/35');
  await expect(page.getByTestId('codex-card-slime')).toContainText('UNDISCOVERED');
  await expect(page.getByTestId('codex-card-slime')).toContainText('SILHOUETTE · DISCOVERY HINT');
  await expect(page.getByTestId('codex-card-slime')).not.toContainText('NICHT ENTDECKT');
  await page.getByTestId('codex-tab-wardens').click();
  await expect(page.getByTestId('codex-count-wardens')).toHaveText('4/10');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /Play/i })).toBeVisible({ timeout: 60_000 });
  const codexButton = page.getByRole('button', { name: /Codex/i }).first();
  await codexButton.click({ noWaitAfter: true });
  await expect(page.getByTestId('codex-card-slime')).toContainText('UNDISCOVERED');
  await expect(page.getByTestId('codex-count-beasts')).toHaveText('3/35');
  await page.getByTestId('codex-tab-wardens').click();
  await expect(page.getByTestId('codex-count-wardens')).toHaveText('4/10');
  await expect(page.getByTestId('codex-card-warden-100')).toHaveAttribute('data-known', 'true');
  await assertNoOverflow(page);
});

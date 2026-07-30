import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const OUTPUT = 'test-results/complete-runtime-evidence';
const RETENTION_KEY = 'dungeon-veil-retention-v2';
const SEED_MARKER = 'dungeon-veil-enemy-registry-codex-seeded-v1';

function retention(enemies = ['goblin', 'skeleton', 'orc'], enemyKills = { goblin: 14, skeleton: 9, orc: 4 }) {
  return {
    currencyVersion: 2,
    sigils: 0,
    daily: {
      date: '2026-07-30',
      selected: ['clear-rooms', 'defeat-enemies', 'reach-depth'],
      progress: { rooms: 0, kills: 0, hunts: 0, fireKills: 0, frostKills: 0, highHpRooms: 0, bossKills: 0, deepestRoom: 0, rankTwoGifts: 0, relicFinds: 0 },
      claimed: [],
    },
    codex: { enemies, enemyKills, bosses: [], hunts: [], relics: [] },
  };
}

async function openCodex(page) {
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Kodex|Codex/i }).click();
  await expect(page.getByTestId('codex-responsive-layout')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('codex-count-beasts')).toHaveText('3/35');
}

async function ensureGoblinDetail(page) {
  const layout = page.getByTestId('codex-responsive-layout');
  if (!await layout.isVisible().catch(() => false)) await openCodex(page);
  await page.getByTestId('codex-card-goblin').click();
  await expect(page.getByTestId('codex-detail-panel')).toBeVisible({ timeout: 20_000 });
}

test('canonical enemy registry Codex keeps family discoveries and counters across reload and cloud restore', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`); });

  await page.addInitScript(({ key, profile, seedMarker }) => {
    if (sessionStorage.getItem(seedMarker) === '1') return;
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem(key, JSON.stringify(profile));
    sessionStorage.setItem(seedMarker, '1');
  }, { key: RETENTION_KEY, profile: retention(), seedMarker: SEED_MARKER });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await openCodex(page);
  await expect(page.getByTestId('codex-card-goblin')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('codex-card-cave-bat')).toHaveAttribute('data-known', 'false');
  await ensureGoblinDetail(page);
  await expect(page.getByTestId('codex-detail-panel')).toContainText(/BESIEGT|DEFEATED/i);
  await expect(page.getByTestId('codex-detail-panel')).toContainText('14');

  const restoreSettled = Promise.race([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30_000 }).then(() => 'navigated').catch(() => 'unchanged'),
    page.waitForFunction(() => document.querySelector('[data-testid="codex-detail-panel"]')?.textContent?.includes('15'), null, { timeout: 30_000 }).then(() => 'updated').catch(() => 'unchanged'),
  ]);
  await page.evaluate(({ key, profile }) => {
    localStorage.setItem(key, JSON.stringify(profile));
    window.dispatchEvent(new Event('dungeon-veil-cloud-save-restored'));
  }, { key: RETENTION_KEY, profile: retention(['goblin', 'skeleton', 'orc'], { goblin: 15, skeleton: 9, orc: 4 }) });
  await restoreSettled;
  await ensureGoblinDetail(page);
  await expect(page.getByTestId('codex-detail-panel')).toContainText('15');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await openCodex(page);
  await ensureGoblinDetail(page);
  await expect(page.getByTestId('codex-detail-panel')).toContainText('15');

  await mkdir(OUTPUT, { recursive: true });
  await page.screenshot({ path: `${OUTPUT}/enemy-registry-codex-${testInfo.project.name}.png`, fullPage: false });
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

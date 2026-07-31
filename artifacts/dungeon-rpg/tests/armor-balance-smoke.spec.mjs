import { test, expect } from '@playwright/test';
import { waitForLiveMenuPaint } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function openEquipmentArmor(page) {
  await page.addInitScript(() => {
    const knownEquipment = ['ash-bow', 'ranger-quiver', 'ranger-cloak'];
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: knownEquipment,
      relics: [],
      announcedEquipment: knownEquipment,
      announcedRelics: [],
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 1,
      xp: 0,
      dust: 0,
      gold: 0,
      owned: {
        'ash-bow': { level: 1, copies: 0 },
        'ranger-quiver': { level: 1, copies: 0 },
        'ranger-cloak': { level: 1, copies: 0 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      rewardLedger: [],
      currentRunId: '',
    }));
  });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });

  // A forced click can land while the cold WebKit menu scene is still booting and
  // bypass the normal interaction contract. Reuse the canonical live-menu readiness
  // proof, then perform a genuine actionable click so the navigation event cannot be
  // discarded during renderer startup.
  await waitForLiveMenuPaint(page);
  const equipmentEntry = page.getByTestId('main-menu-equipment-navigation');
  const equipmentButton = equipmentEntry.getByRole('button');
  await expect(equipmentButton).toBeVisible({ timeout: 60_000 });
  await expect(equipmentButton).toBeEnabled();
  await equipmentButton.click();

  await expect(page.getByRole('heading', { name: /Ausrüstung|Equipment/i })).toBeVisible({ timeout: 60_000 });
  const armorTab = page.getByTestId('inventory-tab-armor');
  await expect(armorTab).toBeVisible();
  await armorTab.click();
  await expect(page.getByText(/Waldläufermantel|Ranger Cloak/i).first()).toBeVisible({ timeout: 30_000 });
}

test('armor preview uses a male KayKit model and animated ready stance', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read/i.test(message.text())) errors.push(message.text());
  });

  await openEquipmentArmor(page);

  const preview = page.locator('[data-equipment-preview-kind="armor"]').first();
  await expect(preview).toBeVisible({ timeout: 30_000 });
  await expect(preview).toHaveAttribute('data-equipment-preview-pose', 'idle-ready');
  const model = await preview.getAttribute('data-equipment-preview-model');
  expect(model).toMatch(/\/(Ranger|Knight|Barbarian)\.glb$/);
  expect(model).not.toMatch(/Mage|Rogue/i);
  await expect(preview.locator('canvas')).toBeVisible({ timeout: 30_000 });

  const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}'));
  expect(meta.version).toBe(4);
  expect(meta.equipped?.armor).toBe('ranger-cloak');
  expect(meta.owned?.['ranger-cloak']?.level).toBe(1);
  expect(errors, errors.join('\n')).toEqual([]);
});
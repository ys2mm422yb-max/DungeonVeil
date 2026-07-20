import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function seedEquipmentState(page) {
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
  });
}

test('equipment uses a real tablet and desktop workspace without breaking mobile', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await seedEquipmentState(page);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await page.getByRole('button', { name: /Ausrüstung|Equipment/i }).first().click({ force: true });
  await expect(page.getByRole('heading', { name: /Ausrüstung|Equipment/i })).toBeVisible({ timeout: 60_000 });

  const tabs = page.getByTestId('equipment-category-tabs');
  const preview = page.locator('[data-equipment-preview-kind="bow"]');
  await expect(tabs).toBeVisible();
  await expect(preview).toBeVisible({ timeout: 60_000 });
  await expect(preview.locator('canvas')).toBeVisible({ timeout: 60_000 });

  const layout = await tabs.evaluate(node => {
    const shell = node.parentElement;
    const previewNode = document.querySelector('[data-equipment-preview-kind="bow"]');
    const shellRect = shell?.getBoundingClientRect();
    const previewRect = previewNode?.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      shellWidth: shellRect?.width ?? 0,
      previewWidth: previewRect?.width ?? 0,
    };
  });

  expect(layout.documentWidth - layout.viewportWidth).toBeLessThanOrEqual(4);
  if (layout.viewportWidth >= 768) {
    expect(layout.shellWidth, `${testInfo.project.name} equipment shell stayed phone-sized`).toBeGreaterThanOrEqual(700);
    expect(layout.previewWidth, `${testInfo.project.name} equipment preview stayed too narrow`).toBeGreaterThanOrEqual(260);
  } else {
    expect(layout.shellWidth).toBeGreaterThanOrEqual(layout.viewportWidth - 40);
    expect(layout.shellWidth).toBeLessThanOrEqual(layout.viewportWidth);
  }

  await page.screenshot({ path: `test-results/equipment-responsive-${testInfo.project.name}.png`, fullPage: false });
});

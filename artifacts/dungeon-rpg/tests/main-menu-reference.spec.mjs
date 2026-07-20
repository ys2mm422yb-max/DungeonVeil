import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function openReferenceMenu(page) {
  await page.addInitScript(() => {
    localStorage.setItem('dungeon-veil-language', 'de');
  });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  const presentation = page.getByTestId('main-menu-scene-presentation');
  await expect(presentation).toHaveAttribute('data-image-loaded', 'true', { timeout: 60_000 });
  await expect(presentation).toHaveAttribute('data-image-failed', 'false');
  await expect(page.getByTestId('main-menu-hd-key-art')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'DUNGEON VEIL' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(1_000);
}

test('approved HD key art keeps four primary actions and companions inside equipment', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read|WebGL.*lost/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openReferenceMenu(page);
  const presentation = page.getByTestId('main-menu-scene-presentation');
  const keyArt = page.getByTestId('main-menu-hd-key-art');
  await expect(presentation).toHaveAttribute('data-composition', 'hd-key-art-overlay');
  await expect(presentation).toHaveAttribute('data-hero-pair', 'ranger-and-veil-wolf');
  await expect(presentation).toHaveAttribute('data-key-art', 'approved-gothic-portal-v1');
  await expect(keyArt).toHaveAttribute('src', /assets\/hall\/veil-hall-hero\.webp/);
  expect(await keyArt.evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight, complete: image.complete }))).toEqual({ width: 540, height: 960, complete: true });
  await expect(page.getByTestId('modern-village-square-scene')).toHaveCount(0);
  await expect(page.getByTestId('main-menu-hero-focus-bridge')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('main-menu-scene-focus')).toBeVisible();
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mehr' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tagesbelohnung/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Kapitel 1/i })).toHaveCount(0);
  await expect(page.getByTestId('veil-village-npc-hub')).toBeVisible();
  await expect(page.getByRole('button', { name: /Aufträge/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Post/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Freunde/i })).toBeVisible();
  await expect(page.getByTestId('npc-guildmaster')).toBeVisible();
  await expect(page.getByRole('button', { name: /Fortsetzen/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Spielen/i })).toBeVisible();
  await expect(page.getByTestId('main-menu-equipment-navigation')).toBeVisible();
  await expect(page.getByRole('button', { name: /Ausrüstung/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Kodex/i })).toBeVisible();
  await expect(page.getByTestId('main-menu-companion-navigation')).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const sceneFocus = document.querySelector('[data-testid="main-menu-scene-focus"]');
    const controlStack = document.querySelector('[data-testid="main-menu-control-stack"]');
    const socialDock = document.querySelector('[data-testid="veil-village-npc-hub"]');
    const scenePresentation = document.querySelector('[data-testid="main-menu-scene-presentation"]');
    const actionNames = ['FORTSETZEN', 'SPIELEN', 'AUSRÜSTUNG', 'KODEX'];
    const actionButtons = [...document.querySelectorAll('button')].filter(button => actionNames.some(name => (button.textContent || '').toUpperCase().includes(name)));
    const visibleTextRoots = [socialDock, ...actionButtons].filter(Boolean);
    const clippedLabels = visibleTextRoots.flatMap(root => [...root.querySelectorAll('*')])
      .filter(element => element.scrollWidth > element.clientWidth + 1)
      .filter(element => (element.textContent || '').trim().length > 0)
      .map(element => element.textContent?.trim() || 'unknown');
    const sceneBox = sceneFocus?.getBoundingClientRect();
    const controlsBox = controlStack?.getBoundingClientRect();
    const socialBox = socialDock?.getBoundingClientRect();
    const presentationStyle = scenePresentation ? getComputedStyle(scenePresentation) : null;
    return {
      viewportHeight: innerHeight,
      sceneHeight: sceneBox?.height ?? 0,
      sceneBottom: sceneBox?.bottom ?? 0,
      controlsTop: controlsBox?.top ?? 0,
      socialHeight: socialBox?.height ?? 999,
      actionHeights: actionButtons.map(button => button.getBoundingClientRect().height),
      actionBottom: Math.max(0, ...actionButtons.map(button => button.getBoundingClientRect().bottom)),
      clippedLabels,
      sceneTransform: presentationStyle?.transform ?? 'none',
    };
  });

  expect(layout.sceneHeight).toBeGreaterThanOrEqual(300);
  expect(layout.controlsTop).toBeGreaterThanOrEqual(layout.sceneBottom - 1);
  expect(layout.socialHeight).toBeLessThanOrEqual(60);
  expect(Math.max(...layout.actionHeights)).toBeLessThanOrEqual(58);
  expect(layout.actionBottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.clippedLabels).toEqual([]);
  expect(layout.sceneTransform).not.toBe('none');

  await page.getByRole('button', { name: /Spielen/i }).click({ force: true });
  await expect(page.getByRole('button', { name: /Weltboss/i })).toBeVisible();
  await page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).click({ force: true });

  await page.getByTestId('main-menu-equipment-navigation').getByRole('button').click({ force: true });
  await expect(page.getByRole('heading', { name: 'AUSRÜSTUNG' })).toBeVisible();
  await expect(page.getByTestId('equipment-category-tabs').locator('button')).toHaveCount(5);
  await page.getByTestId('inventory-tab-companion').click({ force: true });
  await expect(page.getByTestId('equipment-companion-section')).toBeVisible();
  await expect(page.getByTestId('companion-management-panel')).toHaveAttribute('data-embedded', 'true');
  await page.getByRole('button', { name: 'Zurück' }).click({ force: true });
  await expect(keyArt).toBeVisible({ timeout: 30_000 });
  await expect(presentation).toHaveAttribute('data-image-loaded', 'true');
  await expect(page.locator('canvas')).toHaveCount(0, { timeout: 60_000 });

  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
  await page.screenshot({ path: `test-results/main-menu-reference-${testInfo.project.name}.png`, fullPage: false });

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-renderer', { detail: { active: true } })));
  await expect(page.getByTestId('main-menu-scene-presentation')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-renderer', { detail: { active: false } })));
  const restoredPresentation = page.getByTestId('main-menu-scene-presentation');
  const restored = page.getByTestId('main-menu-hd-key-art');
  await expect(restoredPresentation).toHaveAttribute('data-image-loaded', 'true', { timeout: 30_000 });
  await expect(restored).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('canvas')).toHaveCount(0, { timeout: 60_000 });
  await expect(restoredPresentation).toHaveAttribute('data-key-art', 'approved-gothic-portal-v1');
  expect(runtimeErrors).toEqual([]);
});

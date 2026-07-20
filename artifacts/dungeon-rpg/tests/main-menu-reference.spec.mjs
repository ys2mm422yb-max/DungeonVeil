import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

async function pressPointerUi(locator) {
  await expect(locator).toBeVisible();
  await locator.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, isPrimary: true });
}

async function openReferenceMenu(page) {
  await page.addInitScript(() => {
    const knownEquipment = ['ash-bow', 'ranger-quiver', 'ranger-cloak'];
    const knownRelics = ['ash-eye', 'marked-claw', 'veil-heart'];
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: knownEquipment,
      relics: knownRelics,
      announcedEquipment: knownEquipment,
      announcedRelics: knownRelics,
    }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: 'single-target',
      companions: { 'single-target': { level: 3, unlockedAt: Date.now() } },
      updatedAt: Date.now(),
    }));
  });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
  const presentation = page.getByTestId('main-menu-scene-presentation');
  await expect(presentation).toHaveAttribute('data-composition', 'live-hybrid-scene', { timeout: 60_000 });
  await expect(presentation).toHaveAttribute('data-static-hero-embedded', 'false');
  await expect(presentation).toHaveAttribute('data-image-loaded', 'true', { timeout: 60_000 });
  await expect(presentation).toHaveAttribute('data-image-failed', 'false');
  await expect(page.getByTestId('main-menu-ambient-portal-art')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('live-hybrid-main-menu-frame')).toBeVisible();
  const liveScene = page.getByTestId('live-hybrid-main-menu-scene');
  await expect(liveScene).toHaveAttribute('data-ranger-loaded', 'true', { timeout: 60_000 });
  await expect(liveScene).toHaveAttribute('data-animation-state', 'running');
  await expect(liveScene).toHaveAttribute('data-companion-species', 'veil-lynx');
  await expect(liveScene).toHaveAttribute('data-companion-level', '3');
  await expect(page.getByTestId('live-hybrid-main-menu-canvas')).toBeVisible({ timeout: 60_000 });
  const firstFrame = Number(await liveScene.getAttribute('data-animation-frames') || 0);
  await expect.poll(async () => Number(await liveScene.getAttribute('data-animation-frames') || 0), { timeout: 20_000 }).toBeGreaterThan(firstFrame);
  const menuBanner = page.getByRole('banner');
  await expect(menuBanner.getByRole('heading', { name: 'DUNGEON VEIL', exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForTimeout(1_000);
}

test('live hybrid menu keeps four primary actions with an animated equipped Ranger and V5 companion', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|Cannot read|WebGL.*lost|Live hybrid menu Ranger failed|Live hybrid main menu failed/i.test(message.text())) runtimeErrors.push(message.text());
  });

  await openReferenceMenu(page);
  const presentation = page.getByTestId('main-menu-scene-presentation');
  const liveScene = page.getByTestId('live-hybrid-main-menu-scene');
  await expect(presentation).toHaveAttribute('data-static-role', 'portal-atmosphere-only');
  await expect(presentation).toHaveAttribute('data-key-art', 'ambient-gothic-portal-v1');
  await expect(page.getByTestId('main-menu-hd-key-art')).toHaveCount(0);
  await expect(page.getByTestId('modern-village-square-scene')).toHaveCount(0);
  await expect(page.getByTestId('main-menu-hero-focus-bridge')).toHaveCount(0);
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

  const diagnostics = await page.evaluate(() => window.__DUNGEON_VEIL_MENU_RANGER__ || null);
  expect(diagnostics).toMatchObject({
    cleanSingleBody: true,
    depthTestedEquipment: true,
    visibleEquipment: { bow: true, armor: true },
  });
  expect(diagnostics.visibleEquipment.quiver).toBe(true);
  expect(diagnostics.animationDriver).toBeTruthy();

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

  await pressPointerUi(page.getByRole('button', { name: /Spielen/i }));
  await expect(page.getByRole('button', { name: /Weltboss/i })).toBeVisible();
  await pressPointerUi(page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }));

  await pressPointerUi(page.getByTestId('main-menu-equipment-navigation').getByRole('button'));
  await expect(page.getByRole('heading', { name: 'AUSRÜSTUNG' })).toBeVisible();
  await expect(page.getByTestId('equipment-category-tabs').locator('button')).toHaveCount(5);
  await page.getByTestId('inventory-tab-companion').click({ force: true });
  await expect(page.getByTestId('equipment-companion-section')).toBeVisible();
  await expect(page.getByTestId('companion-management-panel')).toHaveAttribute('data-embedded', 'true');
  await pressPointerUi(page.getByRole('button', { name: 'Zurück' }));
  await page.bringToFront();
  await expect(liveScene).toHaveAttribute('data-ranger-loaded', 'true', { timeout: 30_000 });
  await expect(page.getByTestId('live-hybrid-main-menu-canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });

  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
  await page.screenshot({ path: `test-results/main-menu-reference-${testInfo.project.name}.png`, fullPage: false });

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-renderer', { detail: { active: true } })));
  await expect(page.getByTestId('main-menu-scene-presentation')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dungeon-veil-spectator-renderer', { detail: { active: false } })));
  const restoredPresentation = page.getByTestId('main-menu-scene-presentation');
  const restoredScene = page.getByTestId('live-hybrid-main-menu-scene');
  await expect(restoredPresentation).toHaveAttribute('data-composition', 'live-hybrid-scene', { timeout: 30_000 });
  await expect(restoredScene).toHaveAttribute('data-ranger-loaded', 'true', { timeout: 60_000 });
  await expect(page.getByTestId('live-hybrid-main-menu-canvas')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  expect(runtimeErrors).toEqual([]);
});

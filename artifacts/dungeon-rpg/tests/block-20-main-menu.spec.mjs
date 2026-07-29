import { test, expect } from '@playwright/test';
import { waitForLiveMenuPaint, waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const STANDARD_LOADOUT = Object.freeze({ bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' });
const ALTERNATE_LOADOUT = Object.freeze({ bow: 'ember-bow', quiver: 'rune-quiver', armor: 'warden-armor' });
const KNOWN_EQUIPMENT = Object.freeze([
  ...Object.values(STANDARD_LOADOUT),
  ...Object.values(ALTERNATE_LOADOUT),
]);

function attachRuntimeMonitor(page) {
  const issues = [];
  const appOrigin = new URL(APP_URL).origin;
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*401|supabase.*403/i.test(text)) return;
    if (/TypeError|ReferenceError|Cannot read|room build failed|failed to initialize|failed to load|module script failed/i.test(text)) issues.push(`console: ${text}`);
  });
  page.on('response', response => {
    if (response.url().startsWith(appOrigin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

async function seedBlock20State(page, { activeCompanion = null, loadout = STANDARD_LOADOUT, quiverVisible = true } = {}) {
  await page.addInitScript(({ companion, equipment, equipped, showQuiver }) => {
    const owned = Object.fromEntries(equipment.map(id => [id, { level: id === equipped.bow ? 3 : 2, copies: 1 }]));
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'standard', textSize: 'standard', updatedAt: Date.now() }));
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment,
      relics: ['ash-eye', 'marked-claw', 'veil-heart'],
      announcedEquipment: equipment,
      announcedRelics: ['ash-eye', 'marked-claw', 'veil-heart'],
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 18,
      xp: 0,
      dust: 2542,
      gold: 15914,
      owned,
      equipped,
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-optional-equipment-v1', JSON.stringify({
      version: 1,
      equipped: { quiver: showQuiver },
      updatedAt: Date.now(),
    }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: companion,
      companions: companion ? { [companion]: { level: 3, unlockedAt: Date.now() } } : {},
      updatedAt: Date.now(),
    }));
    localStorage.setItem('dungeon-veil-relics-v2', JSON.stringify({
      version: 2,
      owned: ['ash-eye', 'marked-claw', 'veil-heart'],
      equipped: 'marked-claw',
      consumedHeartRuns: [],
      activatedWorldCoreRuns: [],
      relicMisses: { hunt: 0, boss: 0 },
      crownRunStacks: {},
    }));
  }, { companion: activeCompanion, equipment: KNOWN_EQUIPMENT, equipped: loadout, showQuiver: quiverVisible });
}

async function gotoMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
}

async function reloadReadyMenu(page) {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  return waitForLiveMenuPaint(page);
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(overflow.document, overflow.body) - overflow.viewport, JSON.stringify(overflow)).toBeLessThanOrEqual(4);
}

async function capture(page, name, projectName) {
  await assertNoHorizontalOverflow(page);
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
  return page.screenshot({ path: `test-results/block20-${name}-${projectName}.png`, fullPage: false });
}

async function updateEquipment(page, loadout, quiverVisible) {
  await page.evaluate(({ equipped, showQuiver }) => {
    const meta = JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}');
    meta.equipped = equipped;
    meta.owned = {
      ...(meta.owned || {}),
      [equipped.bow]: { level: 3, copies: 1 },
      [equipped.quiver]: { level: 2, copies: 1 },
      [equipped.armor]: { level: 2, copies: 1 },
    };
    localStorage.setItem('dungeon-veil-meta', JSON.stringify(meta));
    localStorage.setItem('dungeon-veil-optional-equipment-v1', JSON.stringify({
      version: 1,
      equipped: { quiver: showQuiver },
      updatedAt: Date.now(),
    }));
  }, { equipped: loadout, showQuiver: quiverVisible });
}

async function setCompanion(page, activeId) {
  await page.evaluate(id => {
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: id,
      companions: id ? { [id]: { level: 3, unlockedAt: Date.now() } } : {},
      updatedAt: Date.now(),
    }));
    window.dispatchEvent(new CustomEvent('dungeon-veil-companion-collection-v5'));
  }, activeId);
}

async function rangerDiagnostics(page) {
  return page.evaluate(() => window.__DUNGEON_VEIL_MENU_RANGER__ || null);
}

async function closeGenericOverlay(page) {
  const close = page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).last();
  await expect(close).toBeVisible({ timeout: 20_000 });
  await close.tap();
  await expect(close).toHaveCount(0, { timeout: 20_000 });
}

test('Block 20 preserves animated Ranger, equipment combinations and companion states', async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await seedBlock20State(page, { activeCompanion: null });
  await gotoMenu(page);

  const scene = await waitForLiveMenuPaint(page);
  const presentation = page.getByTestId('main-menu-scene-presentation');
  await expect(presentation).toHaveAttribute('data-webgl-state', 'ready');
  await expect(scene).toHaveAttribute('data-companion-species', 'none');
  await expect(page.locator('canvas')).toHaveCount(1);

  const standard = await rangerDiagnostics(page);
  expect(standard?.loadout).toEqual(STANDARD_LOADOUT);
  expect(standard?.visibleEquipment).toMatchObject({ bow: true, quiver: true, armor: true, arrows: 3 });
  await capture(page, 'no-companion-standard-loadout', testInfo.project.name);

  const firstFrames = Number(await scene.getAttribute('data-animation-frames') || 0);
  const frameA = await capture(page, 'animation-frame-a', testInfo.project.name);
  await expect.poll(
    async () => Number(await scene.getAttribute('data-animation-frames') || 0),
    { timeout: 20_000, intervals: [100, 200, 350, 500, 750] },
  ).toBeGreaterThan(firstFrames);
  const frameB = await capture(page, 'animation-frame-b', testInfo.project.name);
  expect(frameA.equals(frameB), 'Portal, light and Ranger evidence remained pixel-identical while frames advanced').toBe(false);

  await setCompanion(page, 'critical-support');
  await expect(scene).toHaveAttribute('data-companion-species', 'ember-raven', { timeout: 20_000 });
  await capture(page, 'active-companion-ember-raven', testInfo.project.name);

  await updateEquipment(page, ALTERNATE_LOADOUT, true);
  const alternateScene = await reloadReadyMenu(page);
  await expect(alternateScene).toHaveAttribute('data-companion-species', 'ember-raven');
  const alternate = await rangerDiagnostics(page);
  expect(alternate?.loadout).toEqual(ALTERNATE_LOADOUT);
  expect(alternate?.visibleEquipment).toMatchObject({ bow: true, quiver: true, armor: true, arrows: 3 });
  await capture(page, 'alternate-loadout-with-quiver', testInfo.project.name);

  await updateEquipment(page, ALTERNATE_LOADOUT, false);
  await reloadReadyMenu(page);
  const withoutQuiver = await rangerDiagnostics(page);
  expect(withoutQuiver?.loadout).toEqual({ ...ALTERNATE_LOADOUT, quiver: null });
  expect(withoutQuiver?.visibleEquipment).toMatchObject({ bow: true, quiver: false, armor: true, arrows: 0 });
  await capture(page, 'alternate-loadout-without-quiver', testInfo.project.name);

  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

test('Block 20 genuine touch taps open and close only the intended menu surface', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await seedBlock20State(page, { activeCompanion: 'single-target' });
  await gotoMenu(page);
  await waitForLiveMenuPaint(page);

  await page.getByTestId('main-menu-profile-badge').tap();
  await expect(page.getByTestId('player-profile-panel')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Profil schließen|Close profile/i }).tap();
  await expect(page.getByTestId('player-profile-panel')).toHaveCount(0);

  await page.getByTestId('main-menu-dust-button').tap();
  await expect(page.getByTestId('main-menu-shop-panel')).toBeVisible();
  await expect(page.getByTestId('main-menu-options-panel')).toHaveCount(0);
  await page.getByRole('button', { name: /Shop schließen|Close shop/i }).tap();
  await expect(page.getByTestId('main-menu-shop-panel')).toHaveCount(0);

  await page.getByTestId('main-menu-settings-button').tap();
  await expect(page.getByTestId('main-menu-options-panel')).toBeVisible();
  await expect(page.getByTestId('main-menu-shop-panel')).toHaveCount(0);
  await page.getByRole('button', { name: /Optionsmenü schließen|Close options menu/i }).tap();
  await expect(page.getByTestId('main-menu-options-panel')).toHaveCount(0);

  const socialRoutes = [
    ['npc-questmaster', /Aktive Aufträge|Active Quests/i],
    ['npc-postmaster', /Nachrichten aus dem Schleier|Messages from the Veil/i],
    ['npc-scout', /Gefährten im Schleier|Companions in the Veil/i],
  ];
  for (const [testId, visibleText] of socialRoutes) {
    await page.getByTestId(testId).tap();
    await expect(page.getByText(visibleText).first()).toBeVisible({ timeout: 30_000 });
    await closeGenericOverlay(page);
  }

  await page.getByTestId('npc-guildmaster').tap();
  await expect(page.getByTestId('guild-social-panel')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('guild-close-button').tap();
  await expect(page.getByTestId('guild-social-panel')).toHaveCount(0, { timeout: 20_000 });

  await capture(page, 'touch-navigation-returned-to-menu', testInfo.project.name);
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

test('Block 20 recovers one live canvas after WebGL loss and keeps reduced-motion static', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await seedBlock20State(page, { activeCompanion: 'shield' });
  await gotoMenu(page);
  await waitForLiveMenuPaint(page);

  const presentation = page.getByTestId('main-menu-scene-presentation');
  await expect(presentation).toHaveAttribute('data-webgl-context-contract', 'captured-loss-remount-recovery');
  await expect(presentation).toHaveAttribute('data-webgl-state', 'ready');
  await expect(page.locator('canvas')).toHaveCount(1);
  await capture(page, 'webgl-before-loss', testInfo.project.name);

  const loss = await page.getByTestId('live-hybrid-main-menu-canvas').evaluate(canvas => {
    const lost = new Event('webglcontextlost', { bubbles: true, cancelable: true });
    const dispatchAccepted = canvas.dispatchEvent(lost);
    const restored = new Event('webglcontextrestored', { bubbles: true, cancelable: false });
    canvas.dispatchEvent(restored);
    return { defaultPrevented: lost.defaultPrevented, dispatchAccepted };
  });
  expect(loss.defaultPrevented || loss.dispatchAccepted === false).toBe(true);

  await expect(presentation).toHaveAttribute('data-webgl-recoveries', '1', { timeout: 30_000 });
  await expect(presentation).toHaveAttribute('data-renderer-generation', '1', { timeout: 30_000 });
  await expect(presentation).toHaveAttribute('data-webgl-state', 'ready', { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await waitForPaintedCanvas(page, page.getByTestId('live-hybrid-main-menu-canvas'), 60_000);
  await capture(page, 'webgl-after-recovery', testInfo.project.name);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(presentation).toHaveAttribute('data-reduced-motion-active', 'true', { timeout: 20_000 });
  await expect(presentation).toHaveAttribute('data-webgl-state', 'reduced-motion');
  await expect(page.getByTestId('main-menu-reduced-motion-fallback')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await capture(page, 'reduced-motion-static', testInfo.project.name);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(presentation).toHaveAttribute('data-reduced-motion-active', 'false', { timeout: 20_000 });
  await expect(presentation).toHaveAttribute('data-webgl-state', 'ready', { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await waitForPaintedCanvas(page, page.getByTestId('live-hybrid-main-menu-canvas'), 60_000);

  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

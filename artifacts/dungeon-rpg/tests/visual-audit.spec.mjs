import { test, expect } from '@playwright/test';
import { waitForLiveMenuPaint, waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const CRITICAL_ROOMS = [1, 5, 9, 10, 11, 19, 20, 21, 29, 30, 31, 39, 40, 41, 49, 50];
// [1, 10, 20, 30, 40, 50] remains a strict boundary subset of the expanded matrix.
const COMPANION_MATRIX = [
  ['single-target', 'veil-lynx'],
  ['critical-support', 'ember-raven'],
  ['shield', 'rune-sentinel'],
  ['loot-comfort', 'lantern-wisp'],
  ['distraction', 'dusk-drake'],
];

function attachRuntimeMonitor(page) {
  const issues = [];
  const appOrigin = new URL(APP_URL).origin;
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*401|supabase.*403/i.test(text)) return;
    if (/TypeError|ReferenceError|Cannot read|WebGL.*lost|room build failed|failed to initialize|failed to load|module script failed/i.test(text)) issues.push(`console: ${text}`);
  });
  page.on('response', response => {
    if (response.url().startsWith(appOrigin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

async function pressPointerUi(locator) {
  await expect(locator).toBeVisible();
  await locator.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, isPrimary: true });
}

async function initVisualState(page, projectName, { activeCompanion = true } = {}) {
  await page.addInitScript(({ ipad, withCompanion }) => {
    const marker = 'dungeon-veil-visual-audit-seeded-v2';
    if (sessionStorage.getItem(marker) !== 'true') {
      localStorage.clear();
      const knownEquipment = ['ash-bow', 'ranger-quiver', 'ranger-cloak'];
      const knownRelics = ['ash-eye', 'marked-claw', 'veil-heart'];
      localStorage.setItem('dungeon-veil-language', 'de');
      localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
      localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'standard', textSize: 'standard', updatedAt: Date.now() }));
      localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
        version: 2,
        initialized: true,
        equipment: knownEquipment,
        relics: knownRelics,
        announcedEquipment: knownEquipment,
        announcedRelics: knownRelics,
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
      localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
        version: 1,
        activeId: withCompanion ? 'single-target' : null,
        companions: withCompanion ? {
          'single-target': { level: 3, unlockedAt: Date.now() },
          'critical-support': { level: 2, unlockedAt: Date.now() },
          shield: { level: 2, unlockedAt: Date.now() },
          'loot-comfort': { level: 2, unlockedAt: Date.now() },
          distraction: { level: 2, unlockedAt: Date.now() },
        } : {},
        updatedAt: Date.now(),
      }));
      localStorage.setItem('dungeon-veil-relics-v2', JSON.stringify({
        version: 2,
        owned: knownRelics,
        equipped: 'marked-claw',
        consumedHeartRuns: [],
        activatedWorldCoreRuns: [],
        relicMisses: { hunt: 0, boss: 0 },
        crownRunStacks: {},
      }));
      sessionStorage.setItem(marker, 'true');
    }
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad'), withCompanion: activeCompanion });
}

async function gotoMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible();
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
}

async function reloadMenu(page) {
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(overflow.document, overflow.body) - overflow.viewport, JSON.stringify(overflow)).toBeLessThanOrEqual(4);
}

async function assertScreenshotIsUnobscured(page) {
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0, { timeout: 20_000 });
}

async function closeOverlay(page) {
  const close = page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).last();
  if (await close.isVisible().catch(() => false)) await pressPointerUi(close);
}

async function capture(page, path, { allowTutorial = false } = {}) {
  await assertNoHorizontalOverflow(page);
  if (!allowTutorial) await assertScreenshotIsUnobscured(page);
  return page.screenshot({ path, fullPage: false });
}

async function setActiveCompanion(page, activeId) {
  await page.evaluate(({ id, matrix }) => {
    const companions = Object.fromEntries(matrix.map(([role]) => [role, { level: role === id ? 3 : 2, unlockedAt: Date.now() }]));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: id,
      companions: id ? companions : {},
      updatedAt: Date.now(),
    }));
    window.dispatchEvent(new CustomEvent('dungeon-veil-companion-collection-v5'));
  }, { id: activeId, matrix: COMPANION_MATRIX });
}

async function waitForMenuAdvance(scene, previousFrames, timeout = 20_000) {
  await expect.poll(
    async () => Number(await scene.getAttribute('data-animation-frames') || 0),
    { timeout, intervals: [100, 200, 350, 500, 750, 1_000] },
  ).toBeGreaterThan(previousFrames);
}

async function roomLabel(page, room) {
  return page.getByText(`RAUM ${room}/50`, { exact: false }).first();
}

async function startFreshRun(page) {
  await pressPointerUi(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await pressPointerUi(page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first());
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible({ timeout: 30_000 });
  await name.fill('Visual Audit Ranger');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await waitForPaintedCanvas(page);
}

async function loadRoom(page, room) {
  await page.evaluate(nextRoom => {
    const key = 'dungeon-veil-save';
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    parsed.floor = nextRoom;
    parsed.inDungeon = true;
    parsed.hp = 9999;
    parsed.maxHp = 9999;
    parsed.defense = 999;
    parsed.savedAt = Date.now();
    delete parsed.dungeonMap;
    localStorage.setItem(key, JSON.stringify(parsed));
    sessionStorage.removeItem('dungeon-veil-active-run-session');
  }, room);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  const continueButton = page.getByRole('button', { name: /Fortsetzen|Continue/i }).first();
  await expect(continueButton).toBeVisible({ timeout: 60_000 });
  await pressPointerUi(continueButton);
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await expect(await roomLabel(page, room)).toBeVisible({ timeout: 30_000 });
  await waitForPaintedCanvas(page);
}

async function openPlayMenu(page) {
  await pressPointerUi(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await expect(page.getByText(/Spielmodus wählen|Choose game mode/i)).toBeVisible({ timeout: 20_000 });
}

async function openMoreMenu(page) {
  await pressPointerUi(page.getByRole('button', { name: /Mehr|More/i }).first());
  await expect(page.getByText(/Weitere Optionen|More options/i)).toBeVisible({ timeout: 20_000 });
}

test('live main menu proves a true no-companion start, five silhouettes and visible animation frames', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await initVisualState(page, testInfo.project.name, { activeCompanion: false });
  await gotoMenu(page);

  const scene = await waitForLiveMenuPaint(page);
  await expect(scene).toHaveAttribute('data-companion-species', 'none');
  await expect(page.locator('canvas')).toHaveCount(1);
  await capture(page, `test-results/visual-main-menu-no-companion-${testInfo.project.name}.png`);

  const beforeFrames = Number(await scene.getAttribute('data-animation-frames') || 0);
  const frameA = await capture(page, `test-results/visual-main-menu-frame-a-${testInfo.project.name}.png`);
  await waitForMenuAdvance(scene, beforeFrames);
  await waitForPaintedCanvas(page, page.getByTestId('live-hybrid-main-menu-canvas'));
  const frameB = await capture(page, `test-results/visual-main-menu-frame-b-${testInfo.project.name}.png`);
  const afterFrames = Number(await scene.getAttribute('data-animation-frames') || 0);
  expect(afterFrames).toBeGreaterThan(beforeFrames);
  expect(frameA.equals(frameB), 'The rendered menu frame remained pixel-identical while animation frames advanced').toBe(false);

  for (const [role, species] of COMPANION_MATRIX) {
    const previousFrames = Number(await scene.getAttribute('data-animation-frames') || 0);
    await setActiveCompanion(page, role);
    await expect(scene).toHaveAttribute('data-companion-species', species, { timeout: 20_000 });
    await waitForMenuAdvance(scene, previousFrames);
    await waitForPaintedCanvas(page, page.getByTestId('live-hybrid-main-menu-canvas'));
    await capture(page, `test-results/visual-main-menu-companion-${species}-${testInfo.project.name}.png`);
  }

  await openPlayMenu(page);
  await capture(page, `test-results/visual-play-mode-${testInfo.project.name}.png`);
  await closeOverlay(page);
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

test('central UI surfaces produce reviewable screenshots without clipping', async ({ page }, testInfo) => {
  test.setTimeout(540_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await initVisualState(page, testInfo.project.name);
  await gotoMenu(page);
  await waitForLiveMenuPaint(page);
  await capture(page, `test-results/visual-main-menu-${testInfo.project.name}.png`);

  await pressPointerUi(page.getByTestId('main-menu-profile-badge'));
  await expect(page.getByTestId('player-profile-panel')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('player-profile-responsive-shell')).toBeVisible();
  const profileTabs = [
    ['overview', /Übersicht|Overview/i, 'player-profile-tablet-overview'],
    ['stats', /Statistik|Stats/i, 'player-profile-statistics-grid'],
    ['titles', /Titel|Titles/i, null],
    ['cards', /Visitenkarten|Calling Cards/i, null],
    ['avatars', /Avatare|Avatars/i, null],
  ];
  for (const [name, label, visibleTestId] of profileTabs) {
    await page.getByTestId('player-profile-tabs').getByRole('button', { name: label }).click({ force: true });
    if (visibleTestId) await expect(page.getByTestId(visibleTestId)).toBeVisible();
    await capture(page, `test-results/visual-profile-${name}-${testInfo.project.name}.png`);
  }
  await page.getByRole('button', { name: /Profil schließen|Close profile/i }).click({ force: true });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 30_000 });

  await pressPointerUi(page.getByRole('button', { name: /Ausrüstung|Equipment/i }).first());
  await expect(page.getByRole('heading', { name: /Ausrüstung|Equipment/i })).toBeVisible({ timeout: 60_000 });
  const tabs = [
    ['bow', 'inventory-tab-bow'],
    ['quiver', 'inventory-tab-quiver'],
    ['armor', 'inventory-tab-armor'],
    ['relic', 'inventory-tab-relic'],
    ['companion', 'inventory-tab-companion'],
  ];
  for (const [name, testId] of tabs) {
    await page.getByTestId(testId).click({ force: true });
    await page.waitForTimeout(450);
    await capture(page, `test-results/visual-equipment-${name}-${testInfo.project.name}.png`);
  }
  await page.getByRole('button', { name: /Zurück|Back/i }).first().click({ force: true });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 30_000 });

  await pressPointerUi(page.getByRole('button', { name: /Kodex|Codex/i }).first());
  await expect(page.getByText(/Kodex|Codex/i).first()).toBeVisible({ timeout: 30_000 });
  await capture(page, `test-results/visual-codex-${testInfo.project.name}.png`);
  const codexBack = page.getByRole('button', { name: /Zurück|Back/i }).first();
  if (await codexBack.isVisible().catch(() => false)) await codexBack.click({ force: true });
  else await reloadMenu(page);
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 30_000 });

  const overlays = [
    ['quests', /Aufträge|Quests/i, /Aktive Aufträge|Active Quests/i],
    ['mailbox', /Post|Mail/i, /Nachrichten aus dem Schleier|Messages from the Veil/i],
    ['friends', /Freunde|Friends/i, /Gefährten im Schleier|Companions in the Veil/i],
    ['guild', /Gilde|Guild/i, /Gilde gründen|Create Guild/i],
  ];
  for (const [name, buttonName, visibleText] of overlays) {
    await pressPointerUi(page.getByRole('button', { name: buttonName }).first());
    await expect(page.getByText(visibleText).first()).toBeVisible({ timeout: 30_000 });
    await capture(page, `test-results/visual-${name}-${testInfo.project.name}.png`);
    await closeOverlay(page);
  }

  await openMoreMenu(page);
  await pressPointerUi(page.getByRole('button', { name: /Online & Cloud/i }).first());
  await capture(page, `test-results/visual-online-cloud-${testInfo.project.name}.png`);
  await closeOverlay(page);

  await openPlayMenu(page);
  await pressPointerUi(page.getByRole('button', { name: /Duo-Run|Duo Run/i }).first());
  await expect(page.getByTestId('coop-lobby-panel')).toBeVisible({ timeout: 30_000 });
  await capture(page, `test-results/visual-coop-lobby-${testInfo.project.name}.png`);
  await closeOverlay(page);

  await openPlayMenu(page);
  await pressPointerUi(page.getByRole('button', { name: /Weltboss|World Boss/i }).last());
  await expect(page.getByText(/Das nächste Weltereignis|The next world event/i)).toBeVisible({ timeout: 30_000 });
  await capture(page, `test-results/visual-worldboss-${testInfo.project.name}.png`);
  await closeOverlay(page);

  await pressPointerUi(page.getByRole('button', { name: /Optionen|Options/i }));
  await expect(page.getByTestId('accessibility-settings')).toBeVisible({ timeout: 30_000 });
  await capture(page, `test-results/visual-settings-${testInfo.project.name}.png`);
  await page.getByRole('button', { name: /Zurück|Back/i }).first().click({ force: true });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 30_000 });

  await openMoreMenu(page);
  await pressPointerUi(page.getByRole('button', { name: /Credits/i }).first());
  await expect(page.getByText(/hobbyloser Typ|hobbyless guy/i)).toBeVisible({ timeout: 30_000 });
  await capture(page, `test-results/visual-credits-${testInfo.project.name}.png`);
  await page.getByRole('button').first().click({ force: true });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 30_000 });

  if (testInfo.project.name === 'ipad-landscape-webkit') {
    await page.setViewportSize({ width: 820, height: 1180 });
    await reloadMenu(page);
    await waitForLiveMenuPaint(page);
    await capture(page, 'test-results/visual-main-menu-ipad-portrait-webkit.png');
    await pressPointerUi(page.getByTestId('main-menu-profile-badge'));
    await expect(page.getByTestId('player-profile-panel')).toBeVisible({ timeout: 30_000 });
    await capture(page, 'test-results/visual-profile-ipad-portrait-webkit.png');
  }

  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

test('rooms 1-50 produce stable visual evidence across the full run', async ({ page }, testInfo) => {
  const fullRoomMatrix = testInfo.project.name === 'desktop-chromium' || testInfo.project.name === 'iphone-webkit';
  const rooms = fullRoomMatrix ? Array.from({ length: 50 }, (_, index) => index + 1) : CRITICAL_ROOMS;
  test.setTimeout(fullRoomMatrix ? 1_500_000 : 600_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await initVisualState(page, testInfo.project.name);
  await gotoMenu(page);
  await startFreshRun(page);

  for (const room of rooms) {
    if (room !== 1) await loadRoom(page, room);
    await expect(await roomLabel(page, room)).toBeVisible({ timeout: 30_000 });
    await waitForPaintedCanvas(page);
    await capture(page, `test-results/visual-room-${String(room).padStart(2, '0')}-${testInfo.project.name}.png`);
  }

  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

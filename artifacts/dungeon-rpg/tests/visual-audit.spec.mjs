import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function attachRuntimeMonitor(page) {
  const issues = [];
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*401|supabase.*403/i.test(text)) return;
    if (/TypeError|ReferenceError|Cannot read|WebGL.*lost|room build failed|failed to initialize|failed to load/i.test(text)) issues.push(`console: ${text}`);
  });
  return issues;
}

async function initVisualState(page, projectName) {
  await page.addInitScript(({ ipad }) => {
    const marker = 'dungeon-veil-visual-audit-seeded';
    if (sessionStorage.getItem(marker) !== 'true') {
      localStorage.clear();
      localStorage.setItem('dungeon-veil-language', 'de');
      localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
        version: 2,
        initialized: true,
        equipment: [],
        relics: [],
        announcedEquipment: [],
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
      localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
        version: 1,
        activeId: 'single-target',
        companions: {
          'single-target': { level: 3, unlockedAt: Date.now() },
          shield: { level: 2, unlockedAt: Date.now() },
        },
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
      sessionStorage.setItem(marker, 'true');
    }
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad') });
}

async function gotoMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible();
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(overflow.document, overflow.body) - overflow.viewport, JSON.stringify(overflow)).toBeLessThanOrEqual(4);
}

async function closeOverlay(page) {
  const close = page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).last();
  if (await close.isVisible().catch(() => false)) await close.click({ force: true });
}

async function capture(page, path) {
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path, fullPage: false });
}

async function startFreshRun(page) {
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible({ timeout: 30_000 });
  await name.fill('Visual Audit Ranger');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  const skipIntro = page.getByRole('button', { name: /ÜBERSPRINGEN|SKIP/i });
  if (await skipIntro.isVisible({ timeout: 8_000 }).catch(() => false)) await skipIntro.click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForTimeout(2_000);
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
  }, room);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Fortsetzen|Continue/i }).first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Fortsetzen|Continue/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await expect.poll(() => page.evaluate(expected => {
    const saved = JSON.parse(localStorage.getItem('dungeon-veil-save') || '{}');
    return Number(saved.floor) === expected && saved.inDungeon === true;
  }, room), { timeout: 30_000 }).toBe(true);
  await page.waitForTimeout(2_200);
}

test('central UI surfaces produce reviewable screenshots without clipping', async ({ page }, testInfo) => {
  test.setTimeout(420_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await initVisualState(page, testInfo.project.name);
  await gotoMenu(page);
  await expect(page.getByTestId('live-hybrid-main-menu-scene')).toHaveAttribute('data-ranger-loaded', 'true', { timeout: 60_000 });
  await capture(page, `test-results/visual-main-menu-${testInfo.project.name}.png`);

  await page.getByTestId('main-menu-profile-badge').click({ force: true });
  await expect(page.getByText(/Statistik|Statistics/i).first()).toBeVisible();
  await capture(page, `test-results/visual-profile-${testInfo.project.name}.png`);
  await page.keyboard.press('Escape').catch(() => {});
  const profileClose = page.getByRole('button', { name: /SCHLIESSEN|CLOSE|Zurück|Back/i }).last();
  if (await profileClose.isVisible().catch(() => false)) await profileClose.click({ force: true });
  if (!await page.getByRole('button', { name: /Spielen|Play/i }).first().isVisible().catch(() => false)) await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoMenu(page);

  await page.getByRole('button', { name: /Ausrüstung|Equipment/i }).first().click({ force: true });
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

  await page.getByRole('button', { name: /Kodex|Codex/i }).first().click({ force: true });
  await expect(page.getByText(/Kodex|Codex/i).first()).toBeVisible({ timeout: 30_000 });
  await capture(page, `test-results/visual-codex-${testInfo.project.name}.png`);
  const codexBack = page.getByRole('button', { name: /Zurück|Back/i }).first();
  if (await codexBack.isVisible().catch(() => false)) await codexBack.click({ force: true });
  else await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoMenu(page);

  const overlays = [
    ['quests', /Aufträge|Quests/i, /Aktive Aufträge|Active Quests/i],
    ['mailbox', /Post|Mail/i, /Nachrichten aus dem Schleier|Messages from the Veil/i],
    ['friends', /Freunde|Friends/i, /Gefährten im Schleier|Companions in the Veil/i],
    ['guild', /Gilde|Guild/i, /Gilde gründen|Create Guild/i],
  ];
  for (const [name, buttonName, visibleText] of overlays) {
    await page.getByRole('button', { name: buttonName }).first().click({ force: true });
    await expect(page.getByText(visibleText).first()).toBeVisible({ timeout: 30_000 });
    await capture(page, `test-results/visual-${name}-${testInfo.project.name}.png`);
    await closeOverlay(page);
  }

  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

test('rooms 1-50 produce stable visual evidence across the full run', async ({ page }, testInfo) => {
  const desktop = testInfo.project.name === 'desktop-chromium';
  const rooms = desktop ? Array.from({ length: 50 }, (_, index) => index + 1) : [1, 10, 20, 30, 40, 50];
  test.setTimeout(desktop ? 1_200_000 : 360_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await initVisualState(page, testInfo.project.name);
  await gotoMenu(page);
  await startFreshRun(page);

  for (const room of rooms) {
    if (room !== 1) await loadRoom(page, room);
    await expect(page.getByText(new RegExp(`RAUM\\s+${room}/50`, 'i')).first()).toBeVisible({ timeout: 30_000 });
    await capture(page, `test-results/visual-room-${String(room).padStart(2, '0')}-${testInfo.project.name}.png`);
  }

  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

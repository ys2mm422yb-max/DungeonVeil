import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const FULL_ROOM_CHUNKS = [
  [1, 10],
  [11, 20],
  [21, 30],
  [31, 40],
  [41, 50],
];
const CRITICAL_ROOMS = [1, 5, 9, 10, 11, 19, 20, 21, 29, 30, 31, 39, 40, 41, 49, 50];

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

async function seedVisualState(page, projectName) {
  await page.addInitScript(({ ipad }) => {
    const marker = 'dungeon-veil-room-evidence-seeded-v1';
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
        activeId: 'single-target',
        companions: {
          'single-target': { level: 3, unlockedAt: Date.now() },
          'critical-support': { level: 2, unlockedAt: Date.now() },
          shield: { level: 2, unlockedAt: Date.now() },
          'loot-comfort': { level: 2, unlockedAt: Date.now() },
          distraction: { level: 2, unlockedAt: Date.now() },
        },
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
  }, { ipad: projectName.includes('ipad') });
}

async function gotoMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Spielen|Play/i }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
}

async function startFreshRun(page) {
  await pressPointerUi(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await pressPointerUi(page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first());
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible({ timeout: 30_000 });
  await name.fill('Room Evidence Ranger');
  await pressPointerUi(page.getByTestId('run-name-confirm'));
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 60_000 });
  await waitForPaintedCanvas(page);
}

async function roomLabel(page, room) {
  return page.getByText(`RAUM ${room}/50`, { exact: false }).first();
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

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(overflow.document, overflow.body) - overflow.viewport, JSON.stringify(overflow)).toBeLessThanOrEqual(4);
}

async function captureRoom(page, room, projectName) {
  await assertNoHorizontalOverflow(page);
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByTestId('tutorial-overlay')).toHaveCount(0, { timeout: 20_000 });
  await waitForPaintedCanvas(page);
  await page.screenshot({ path: `test-results/visual-room-${String(room).padStart(2, '0')}-${projectName}.png`, fullPage: false });
}

async function captureRooms(page, testInfo, rooms) {
  const runtimeIssues = attachRuntimeMonitor(page);
  await seedVisualState(page, testInfo.project.name);
  await gotoMenu(page);
  await startFreshRun(page);
  for (const room of rooms) {
    if (room !== 1) await loadRoom(page, room);
    await expect(await roomLabel(page, room)).toBeVisible({ timeout: 30_000 });
    await captureRoom(page, room, testInfo.project.name);
  }
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
}

for (const [first, last] of FULL_ROOM_CHUNKS) {
  test(`full room visual evidence ${first}-${last} uses a fresh WebGL context`, async ({ page }, testInfo) => {
    test.skip(!['iphone-webkit', 'desktop-chromium'].includes(testInfo.project.name), 'Full room evidence is required on iPhone and desktop only.');
    test.setTimeout(600_000);
    await captureRooms(page, testInfo, Array.from({ length: last - first + 1 }, (_, index) => first + index));
  });
}

test('critical room visual evidence covers Android and iPad boundaries', async ({ page }, testInfo) => {
  test.skip(!['android-chromium', 'ipad-landscape-webkit'].includes(testInfo.project.name), 'Critical boundary evidence is required on Android and iPad only.');
  test.setTimeout(900_000);
  await captureRooms(page, testInfo, CRITICAL_ROOMS);
});

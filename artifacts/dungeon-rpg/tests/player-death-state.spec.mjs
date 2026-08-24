import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const RUNTIME_EVIDENCE_MARKER = 'dungeon-veil-runtime-evidence-v1';

async function pressPointerUi(locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

async function openMenu(page, projectName) {
  await page.addInitScript(({ ipad, runtimeEvidenceMarker }) => {
    localStorage.clear();
    sessionStorage.setItem(runtimeEvidenceMarker, '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, {
    ipad: projectName.includes('ipad'),
    runtimeEvidenceMarker: RUNTIME_EVIDENCE_MARKER,
  });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('app-boot-loading-screen')).toBeHidden({ timeout: 60_000 });
}

async function startFreshRun(page) {
  await pressPointerUi(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await expect(page.getByText(/Spielmodus wählen|Choose game mode/i)).toBeVisible({ timeout: 20_000 });
  await pressPointerUi(page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first());
  const name = page.getByRole('textbox').first();
  await expect(name).toBeVisible();
  await name.fill('Death State QA');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  const skipIntro = page.getByRole('button', { name: /ÜBERSPRINGEN|SKIP/i });
  if (await skipIntro.isVisible({ timeout: 8_000 }).catch(() => false)) await skipIntro.click({ force: true });
  await expect(skipIntro).toBeHidden({ timeout: 20_000 });
}

test('solo death uses an explicit visual death state before the final overlay', async ({ page }, testInfo) => {
  await openMenu(page, testInfo.project.name);
  await startFreshRun(page);

  const capability = await page.evaluate(() => ({
    forcePlayerDeath: typeof window.__dungeonVeilRuntimeEvidence?.forcePlayerDeath === 'function',
  }));
  expect(capability.forcePlayerDeath, 'localhost evidence API must expose a real player-death trigger').toBe(true);

  const before = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null);
  expect(Number(before?.hp || 0)).toBeGreaterThan(0);

  // This criterion proves a terminal Solo death. The localhost evidence API consumes an
  // equipped current-run Veil Heart through the real relic contract before the lethal update.
  await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.forcePlayerDeath());

  const playerRenderer = page.locator('[data-player-death-state="active"]');
  await expect(playerRenderer, 'renderer must publish an active death-state instead of freezing in idle/run').toBeVisible({ timeout: 2_000 });

  const overlay = page.getByTestId('game-over-screen');
  await expect(overlay).toHaveAttribute('data-death-sequence', 'settling', { timeout: 1_000 });
  await expect.poll(async () => overlay.getAttribute('data-death-sequence'), {
    timeout: 2_000,
    intervals: [50, 100],
    message: 'death overlay must transition from the visual death beat to a settled defeat state',
  }).toBe('settled');
  await expect(overlay).toBeVisible();

  const after = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null);
  expect(after?.status).toBe('gameover');
  expect(Number(after?.hp || 1)).toBeLessThanOrEqual(0);

  const attackAt = Number(after?.playerLastAttackTime || 0);
  await page.keyboard.press('Space');
  await expect.poll(async () => Number((await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null))?.playerLastAttackTime || 0), {
    timeout: 750,
    intervals: [50, 100],
    message: 'player attacks must stay blocked after death',
  }).toBe(attackAt);

  await page.screenshot({ path: testInfo.outputPath(`player-death-solo-${testInfo.project.name}.png`), fullPage: true });
});

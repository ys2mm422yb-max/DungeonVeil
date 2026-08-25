import { writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const RUNTIME_EVIDENCE_MARKER = 'dungeon-veil-runtime-evidence-v1';
const POST_DEATH_ATTACK_BLOCK_WINDOW_MS = 750;

test.use({ video: 'on' });

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

  // Observe the first staged overlay state immediately after the real lethal transition.
  // On slower renderers, waiting for the 3D death-pose assertion first can legitimately consume
  // the unchanged 1100 ms death beat and turn a correct settled overlay into a false negative.
  const overlay = page.getByTestId('game-over-screen');
  await expect(overlay).toHaveAttribute('data-death-sequence', 'settling', { timeout: 1_000 });

  const playerRenderer = page.locator('[data-player-death-state="active"]');
  await expect(playerRenderer, 'renderer must publish an active death-state instead of freezing in idle/run').toBeVisible({ timeout: 2_000 });

  // Keep the unchanged <=2 s acceptance entirely on the browser clock. A repeated Playwright
  // protocol poll can itself consume most of that window on slower WebKit/Chromium devices even
  // when the 1100 ms product transition has already committed on the page main thread.
  const deathSequenceObservation = await overlay.evaluate(async (element) => {
    const startedAt = performance.now();
    let state = element.getAttribute('data-death-sequence');
    while (state !== 'settled') {
      const elapsedMs = performance.now() - startedAt;
      if (elapsedMs >= 2_000) return { state, elapsedMs };
      await new Promise(resolve => requestAnimationFrame(resolve));
      state = element.getAttribute('data-death-sequence');
    }
    return { state, elapsedMs: performance.now() - startedAt };
  });
  expect(deathSequenceObservation.state, 'death overlay must transition from the visual death beat to a settled defeat state').toBe('settled');
  expect(deathSequenceObservation.elapsedMs, 'death overlay must settle within the unchanged 2 s acceptance window').toBeLessThanOrEqual(2_000);
  await expect(overlay).toBeVisible();

  const after = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null);
  expect(after?.status).toBe('gameover');
  expect(Number(after?.hp ?? 1)).toBeLessThanOrEqual(0);

  const postDeathAttackObservation = await page.evaluate(() => ({
    attackAt: Number(window.__dungeonVeilRuntimeEvidence?.snapshot()?.playerLastAttackTime || 0),
    startedAt: performance.now(),
  }));
  await page.keyboard.press('Space');
  const postDeathAttackAfterWindow = await page.evaluate(async ({ startedAt, windowMs }) => {
    while (performance.now() - startedAt < windowMs) {
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return {
      elapsedMs: performance.now() - startedAt,
      attackAt: Number(window.__dungeonVeilRuntimeEvidence?.snapshot()?.playerLastAttackTime || 0),
    };
  }, {
    startedAt: postDeathAttackObservation.startedAt,
    windowMs: POST_DEATH_ATTACK_BLOCK_WINDOW_MS,
  });
  expect(postDeathAttackAfterWindow.elapsedMs, 'post-death input proof must observe the full 750 ms block window').toBeGreaterThanOrEqual(POST_DEATH_ATTACK_BLOCK_WINDOW_MS);
  expect(postDeathAttackAfterWindow.attackAt, 'player attacks must stay blocked after death').toBe(postDeathAttackObservation.attackAt);

  const deathSequence = await overlay.getAttribute('data-death-sequence');
  const rendererDeathState = await playerRenderer.getAttribute('data-player-death-state');
  await writeFile(testInfo.outputPath(`player-death-solo-${testInfo.project.name}.trace.json`), JSON.stringify({
    project: testInfo.project.name,
    before: { status: before?.status ?? null, hp: Number(before?.hp || 0) },
    after: { status: after?.status ?? null, hp: Number(after?.hp ?? 1), playerLastAttackTime: postDeathAttackObservation.attackAt },
    deathSequence,
    rendererDeathState,
    postDeathAttackObservedMs: postDeathAttackAfterWindow.elapsedMs,
    postDeathAttackBlocked: true,
  }, null, 2));
  await page.screenshot({ path: testInfo.outputPath(`player-death-solo-${testInfo.project.name}.png`), fullPage: true });
});

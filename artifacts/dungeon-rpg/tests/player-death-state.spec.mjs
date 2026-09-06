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
  }, { ipad: projectName.includes('ipad'), runtimeEvidenceMarker: RUNTIME_EVIDENCE_MARKER });
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

async function openDuoLifecycleQa(page, projectName, language) {
  await page.addInitScript(({ ipad, runtimeEvidenceMarker, language }) => {
    localStorage.clear();
    sessionStorage.setItem(runtimeEvidenceMarker, '1');
    localStorage.setItem('dungeon-veil-language', language);
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad'), runtimeEvidenceMarker: RUNTIME_EVIDENCE_MARKER, language });
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime-duo');
  url.searchParams.set('duoLifecycle', '1');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByTestId('runtime-duo-evidence-qa')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('runtime-duo-lifecycle-start').click();
}

test('solo death uses an explicit visual death state before the final overlay', async ({ page }, testInfo) => {
  await openMenu(page, testInfo.project.name);
  await startFreshRun(page);
  const capability = await page.evaluate(() => ({
    prepareTerminalDeathEvidence: typeof window.__dungeonVeilRuntimeEvidence?.prepareTerminalDeathEvidence === 'function',
    forcePlayerDeath: typeof window.__dungeonVeilRuntimeEvidence?.forcePlayerDeath === 'function',
  }));
  expect(capability.prepareTerminalDeathEvidence, 'localhost evidence API must expose terminal-death preconditioning outside the measured lethal transition').toBe(true);
  expect(capability.forcePlayerDeath, 'localhost evidence API must expose a real player-death trigger').toBe(true);
  const before = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null);
  expect(Number(before?.hp || 0)).toBeGreaterThan(0);
  const terminalDeathPreparation = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.prepareTerminalDeathEvidence?.() ?? null);
  expect(terminalDeathPreparation, 'terminal-death evidence preconditioning must complete before the unchanged browser-clock acceptance timer starts').toBeTruthy();
  expect(Number(terminalDeathPreparation?.snapshot?.hp || 0), 'preconditioning must leave the live player alive before the measured lethal transition').toBeGreaterThan(0);
  const deathSequenceObservation = await page.evaluate(async () => {
    const startedAt = performance.now();
    const deadline = startedAt + 2_000;
    const states = [];
    let settledAt = null;
    let settledCommittedAt = null;

    return await new Promise(resolve => {
      let finished = false;
      let timeoutId = null;
      const finish = () => {
        if (finished) return;
        finished = true;
        observer.disconnect();
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        resolve({
          states,
          state: states.at(-1) ?? null,
          sawSettling: states.includes('settling'),
          elapsedMs: settledAt ?? performance.now() - startedAt,
          settledCommittedAt,
        });
      };
      const recordState = (element) => {
        if (!(element instanceof HTMLElement) || element.dataset.testid !== 'game-over-screen') return;
        const state = element.getAttribute('data-death-sequence');
        if (state && states.at(-1) !== state) states.push(state);
        if (state === 'settled' && settledAt === null) {
          const committedAt = Number(element.dataset.deathSettledAt);
          settledCommittedAt = Number.isFinite(committedAt) ? committedAt : null;
          settledAt = settledCommittedAt === null ? performance.now() - startedAt : settledCommittedAt - startedAt;
          finish();
        }
      };
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes') recordState(mutation.target);
          for (const node of mutation.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            recordState(node);
            node.querySelectorAll?.('[data-testid="game-over-screen"]').forEach(recordState);
          }
        }
      });
      observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-death-sequence'] });
      window.__dungeonVeilRuntimeEvidence.forcePlayerDeath();
      const overlay = document.querySelector('[data-testid="game-over-screen"]');
      if (overlay instanceof HTMLElement) recordState(overlay);
      if (finished) return;
      // Do not poll with requestAnimationFrame here. The product's fixed 1100 ms death
      // beat itself uses render-timeline signals; a test-owned rAF loop can compete for the
      // same loaded mobile rendering turns. The observer detects the state transition, while
      // the product-stamped DOM commit clock records when the visible `settled` mutation
      // actually happened. This prevents delayed MutationObserver delivery from being counted
      // as product latency while the unchanged browser-clock 2000 ms watchdog still fails closed.
      timeoutId = window.setTimeout(finish, Math.max(0, deadline - performance.now()));
    });
  });
  expect(deathSequenceObservation.sawSettling, 'death overlay must expose the explicit visual settling state before final defeat').toBe(true);
  expect(deathSequenceObservation.state, 'death overlay must transition from the visual death beat to a settled defeat state').toBe('settled');
  expect(Number.isFinite(deathSequenceObservation.settledCommittedAt), 'settled death DOM must publish its exact product commit timestamp').toBe(true);
  expect(deathSequenceObservation.elapsedMs, 'death overlay must not settle before the measured lethal transition').toBeGreaterThanOrEqual(0);
  expect(deathSequenceObservation.elapsedMs, 'death overlay must settle within the unchanged 2 s acceptance window').toBeLessThanOrEqual(2_000);
  const overlay = page.getByTestId('game-over-screen');
  await expect(overlay).toBeVisible();
  const playerRenderer = page.locator('[data-player-death-state="active"]');
  await expect(playerRenderer, 'renderer must publish an active death-state instead of freezing in idle/run').toBeVisible({ timeout: 2_000 });
  const after = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null);
  expect(after?.status).toBe('gameover');
  expect(Number(after?.hp ?? 1)).toBeLessThanOrEqual(0);
  const postDeathAttackObservation = await page.evaluate(() => ({ attackAt: Number(window.__dungeonVeilRuntimeEvidence?.snapshot()?.playerLastAttackTime || 0), startedAt: performance.now() }));
  await page.keyboard.press('Space');
  const postDeathAttackAfterWindow = await page.evaluate(async ({ startedAt, windowMs }) => {
    while (performance.now() - startedAt < windowMs) await new Promise(resolve => requestAnimationFrame(resolve));
    return { elapsedMs: performance.now() - startedAt, attackAt: Number(window.__dungeonVeilRuntimeEvidence?.snapshot()?.playerLastAttackTime || 0) };
  }, { startedAt: postDeathAttackObservation.startedAt, windowMs: POST_DEATH_ATTACK_BLOCK_WINDOW_MS });
  expect(postDeathAttackAfterWindow.elapsedMs, 'post-death input proof must observe the full 750 ms block window').toBeGreaterThanOrEqual(POST_DEATH_ATTACK_BLOCK_WINDOW_MS);
  expect(postDeathAttackAfterWindow.attackAt, 'player attacks must stay blocked after death').toBe(postDeathAttackObservation.attackAt);
  const deathSequence = await overlay.getAttribute('data-death-sequence');
  const rendererDeathState = await playerRenderer.getAttribute('data-player-death-state');
  await writeFile(testInfo.outputPath(`player-death-solo-${testInfo.project.name}.trace.json`), JSON.stringify({ project: testInfo.project.name, before: { status: before?.status ?? null, hp: Number(before?.hp || 0) }, after: { status: after?.status ?? null, hp: Number(after?.hp ?? 1), playerLastAttackTime: postDeathAttackObservation.attackAt }, deathSequence, deathSequenceStates: deathSequenceObservation.states, deathSequenceObservedMs: deathSequenceObservation.elapsedMs, deathSequenceCommittedAt: deathSequenceObservation.settledCommittedAt, rendererDeathState, postDeathAttackObservedMs: postDeathAttackAfterWindow.elapsedMs, postDeathAttackBlocked: true }, null, 2));
  await page.screenshot({ path: testInfo.outputPath(`player-death-solo-${testInfo.project.name}.png`), fullPage: true });
});

const TEAM_DEFEAT_COPY = {
  de: {
    title: 'BEIDE GEFALLEN',
    body: 'Der gemeinsame Run ist beendet. Nur der Host kann beide Spieler zusammen neu starten.',
  },
  en: {
    title: 'BOTH FALLEN',
    body: 'The shared run is over. Only the host can restart both players together.',
  },
};

for (const language of ['de', 'en']) {
  test(`duo lifecycle emits Downed -> Revived -> Fallen -> Team Defeat temporal evidence (${language})`, async ({ page }, testInfo) => {
    await openDuoLifecycleQa(page, testInfo.project.name, language);
    const host = page.getByTestId('runtime-duo-evidence-qa');
    const teamPanel = page.getByTestId('coop-team-health-panel');
    const advance = page.getByTestId('runtime-duo-lifecycle-advance');
    const startedAt = await page.evaluate(() => performance.now());
    const phases = [];
    const remoteLifeStates = [];
    const observe = async (phase, lifeState) => {
      await expect(host).toHaveAttribute('data-lifecycle-phase', phase, { timeout: 5_000 });
      await expect(teamPanel).toHaveAttribute('data-life-state', lifeState, { timeout: 5_000 });
      phases.push(phase);
      if (remoteLifeStates.at(-1) !== lifeState) remoteLifeStates.push(lifeState);
    };
    await observe('alive', 'alive');
    await advance.click();
    await observe('downed', 'downed');
    await advance.click();
    await observe('revived', 'alive');
    await advance.click();
    await observe('fallen', 'fallen');
    await advance.click();
    await observe('team-defeat', 'fallen');
    const elapsedMs = await page.evaluate(start => performance.now() - start, startedAt);
    expect(phases).toEqual(['alive', 'downed', 'revived', 'fallen', 'team-defeat']);
    expect(remoteLifeStates).toEqual(['alive', 'downed', 'alive', 'fallen']);
    const teamDefeat = page.getByTestId('runtime-duo-team-game-over');
    await expect(teamDefeat).toBeVisible();
    await expect(teamDefeat).toContainText(TEAM_DEFEAT_COPY[language].title);
    await expect(teamDefeat).toContainText(TEAM_DEFEAT_COPY[language].body);
    await expect(page.getByTestId('coop-team-health-panel')).toHaveAttribute('data-life-state', 'fallen');
    await expect(advance).toHaveCount(0);
    await writeFile(testInfo.outputPath(`player-death-duo-${language}-${testInfo.project.name}.trace.json`), JSON.stringify({ project: testInfo.project.name, language, phases, remoteLifeStates, elapsedMs, finalTeamDefeatVisible: true, finalTeamDefeatTitle: TEAM_DEFEAT_COPY[language].title, finalTeamDefeatBody: TEAM_DEFEAT_COPY[language].body }, null, 2));
    await page.screenshot({ path: testInfo.outputPath(`player-death-duo-${language}-${testInfo.project.name}.png`), fullPage: true });
    // Keep the verified terminal card on-screen long enough to be encoded into the temporal evidence EOF.
    await page.waitForTimeout(1_000);
  });
}

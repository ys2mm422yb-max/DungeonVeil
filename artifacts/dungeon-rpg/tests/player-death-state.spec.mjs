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
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad'), runtimeEvidenceMarker: RUNTIME_EVIDENCE_MARKER, language });
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime-duo');
  url.searchParams.set('duoLifecycle', '1');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const host = page.getByTestId('runtime-duo-evidence-qa');
  await expect(host).toBeVisible({ timeout: 60_000 });
  await expect(host).toHaveAttribute('data-authority-lifecycle', 'running', { timeout: 10_000 });
  await page.getByTestId('runtime-duo-lifecycle-start').click();
}

async function observeDuoUi(page, expected, {
  action = null,
  actionArgs = [],
  timeoutMs = 5_000,
  captureSnapshot = false,
} = {}) {
  const observation = await page.evaluate(async ({
    expected,
    action,
    actionArgs,
    timeoutMs,
    captureSnapshot,
  }) => {
    const evidence = window.__dungeonVeilDuoAuthorityEvidence;
    if (!evidence) throw new Error('Duo authority evidence API is unavailable');

    const isVisible = element => {
      if (!(element instanceof HTMLElement) || element.hidden) return false;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const read = () => {
      const host = document.querySelector('[data-testid="runtime-duo-evidence-qa"]');
      const teamPanel = document.querySelector('[data-testid="coop-team-health-panel"]');
      const revive = document.querySelector('[data-testid="coop-revive-control"]');
      const disconnected = document.querySelector('[data-testid="coop-teammate-disconnected"]');
      const teamDefeat = document.querySelector('[data-testid="coop-team-game-over"]');
      return {
        phase: host instanceof HTMLElement ? host.dataset.lifecyclePhase ?? null : null,
        lifeState: teamPanel instanceof HTMLElement ? teamPanel.dataset.lifeState ?? null : null,
        connectionStatus: host instanceof HTMLElement ? host.dataset.connectionStatus ?? null : null,
        reviveVisible: isVisible(revive),
        disconnectedVisible: isVisible(disconnected),
        teamDefeatVisible: isVisible(teamDefeat),
        teamDefeatText: teamDefeat?.textContent ?? '',
        advanceCount: document.querySelectorAll('[data-testid="runtime-duo-lifecycle-advance"]').length,
      };
    };
    const matches = state => Object.entries(expected).every(([key, value]) => {
      if (key === 'teamDefeatTextIncludes') return value.every(fragment => state.teamDefeatText.includes(fragment));
      return state[key] === value;
    });
    const waitForExpectedState = () => new Promise((resolve, reject) => {
      const startedAt = performance.now();
      let intervalId = 0;
      let timeoutId = 0;
      const observer = new MutationObserver(check);
      function cleanup() {
        observer.disconnect();
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
      }
      function check() {
        const state = read();
        if (!matches(state)) return;
        cleanup();
        resolve(state);
      }
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      intervalId = window.setInterval(check, 25);
      timeoutId = window.setTimeout(() => {
        const state = read();
        cleanup();
        reject(new Error(`Duo UI did not reach ${JSON.stringify(expected)} within ${timeoutMs} ms; observed ${JSON.stringify(state)} after ${Math.round(performance.now() - startedAt)} ms`));
      }, timeoutMs);
      check();
    });

    if (action) {
      const operation = evidence[action];
      if (typeof operation !== 'function') throw new Error(`Unknown Duo evidence action: ${action}`);
      await operation(...actionArgs);
    }
    const state = await waitForExpectedState();
    return {
      ...state,
      observedAt: performance.now(),
      engineStatus: evidence.engineStatus(),
      snapshot: captureSnapshot ? evidence.snapshot() : null,
    };
  }, { expected, action, actionArgs, timeoutMs, captureSnapshot });

  for (const [key, value] of Object.entries(expected)) {
    if (key === 'teamDefeatTextIncludes') {
      for (const fragment of value) expect(observation.teamDefeatText).toContain(fragment);
    } else {
      expect(observation[key]).toBe(value);
    }
  }
  return observation;
}

test('solo death uses an explicit visual death state before the final overlay', async ({ page }, testInfo) => {
  await openMenu(page, testInfo.project.name);
  await startFreshRun(page);
  const capability = await page.evaluate(() => ({
    prepareTerminalDeathEvidence: typeof window.__dungeonVeilRuntimeEvidence?.prepareTerminalDeathEvidence === 'function',
    forcePlayerDeath: typeof window.__dungeonVeilRuntimeEvidence?.forcePlayerDeath === 'function',
    forcePlayerDeathWithStarvedTerminalEmit: typeof window.__dungeonVeilRuntimeEvidence?.forcePlayerDeathWithStarvedTerminalEmit === 'function',
  }));
  expect(capability.prepareTerminalDeathEvidence, 'localhost evidence API must expose terminal-death preconditioning outside the measured lethal transition').toBe(true);
  expect(capability.forcePlayerDeath, 'localhost evidence API must expose a real player-death trigger').toBe(true);
  expect(capability.forcePlayerDeathWithStarvedTerminalEmit, 'localhost evidence API must expose deterministic terminal-emit starvation without fabricating product state').toBe(true);
  const before = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null);
  expect(Number(before?.hp || 0)).toBeGreaterThan(0);
  const terminalDeathPreparation = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.prepareTerminalDeathEvidence?.() ?? null);
  expect(terminalDeathPreparation, 'terminal-death evidence preconditioning must complete before the unchanged browser-clock acceptance timer starts').toBeTruthy();
  expect(Number(terminalDeathPreparation?.snapshot?.hp || 0), 'preconditioning must leave the live player alive before the measured lethal transition').toBeGreaterThan(0);
  const preMountedBoundary = await page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="game-over-screen"]');
    return overlay instanceof HTMLElement
      ? { exists: true, sequence: overlay.dataset.deathSequence, ariaHidden: overlay.getAttribute('aria-hidden') }
      : { exists: false, sequence: null, ariaHidden: null };
  });
  expect(preMountedBoundary.exists, 'terminal overlay presentation boundary must exist before lethal input').toBe(true);
  expect(preMountedBoundary.sequence, 'pre-mounted terminal boundary must be inactive before lethal input').toBe('inactive');
  expect(preMountedBoundary.ariaHidden, 'inactive terminal boundary must not obstruct live gameplay').toBe('true');
  const deathSequenceObservation = await page.evaluate(async () => {
    const startedAt = performance.now();
    const states = [];
    let settledCommittedAt = null;
    let synchronousDeathBoundary = null;
    let preEmitDeathBoundary = null;
    const recordState = (element) => {
      if (!(element instanceof HTMLElement) || element.dataset.testid !== 'game-over-screen') return;
      const state = element.getAttribute('data-death-sequence');
      if (state && states.at(-1) !== state) states.push(state);
      if (state === 'settled') {
        const committedAt = Number(element.dataset.deathSettledAt);
        settledCommittedAt = Number.isFinite(committedAt) ? committedAt : null;
      }
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') recordState(mutation.target);
      }
    });
    observer.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-death-sequence'] });
    const capturePreEmitBoundary = (event) => {
      const detail = event.detail;
      if (!detail?.dead || detail.gameState || !Number.isFinite(Number(detail.transitionStartedAt))) return;
      const overlay = document.querySelector('[data-testid="game-over-screen"]');
      preEmitDeathBoundary = {
        observedAt: performance.now(),
        transitionStartedAt: Number(detail.transitionStartedAt),
        overlaySequence: overlay?.getAttribute('data-death-sequence') ?? null,
        visualStartedAt: Number(overlay?.getAttribute('data-death-visual-started-at')),
        visualDeadline: Number(overlay?.getAttribute('data-death-visual-deadline')),
        visualDriver: overlay?.getAttribute('data-death-visual-driver') ?? null,
        animations: overlay instanceof HTMLElement
          ? overlay.getAnimations({ subtree: true }).map(animation => animation.id).sort()
          : [],
      };
    };
    window.addEventListener('dungeon-veil-player-death-v1', capturePreEmitBoundary);
    try {
      const originalRequestAnimationFrame = window.requestAnimationFrame;
      let withheldAnimationFrames = 0;
      window.requestAnimationFrame = () => {
        withheldAnimationFrames += 1;
        return 900_000 + withheldAnimationFrames;
      };
      try {
        const starvationStartedAt = performance.now();
        const forcedDeath = window.__dungeonVeilRuntimeEvidence.forcePlayerDeathWithStarvedTerminalEmit(1_250);
        const synchronousOverlay = document.querySelector('[data-testid="game-over-screen"]');
        const synchronousRenderer = document.querySelector('[data-testid="run-three-host"]');
        const synchronousAnimations = synchronousOverlay instanceof HTMLElement
          ? synchronousOverlay.getAnimations({ subtree: true }).map(animation => ({
            id: animation.id,
            duration: Number(animation.effect?.getComputedTiming().activeDuration ?? 0),
          }))
          : [];
        synchronousDeathBoundary = {
          overlaySequence: synchronousOverlay?.getAttribute('data-death-sequence') ?? null,
          terminalRenderMode: synchronousRenderer?.getAttribute('data-terminal-render-mode') ?? null,
          terminalRenderFrames: synchronousRenderer?.getAttribute('data-terminal-render-frames') ?? null,
          withheldAnimationFrames,
          visualStartedAt: Number(synchronousOverlay?.getAttribute('data-death-visual-started-at')),
          visualDeadline: Number(synchronousOverlay?.getAttribute('data-death-visual-deadline')),
          visualDuration: Number(synchronousOverlay?.getAttribute('data-death-visual-duration')),
          visualDriver: synchronousOverlay?.getAttribute('data-death-visual-driver') ?? null,
          animations: synchronousAnimations,
          terminalEmitStarvationMs: Number(forcedDeath?.terminalEmitStarvationMs),
          blockedElapsedMs: performance.now() - starvationStartedAt,
        };
      } finally {
        window.requestAnimationFrame = originalRequestAnimationFrame;
      }
      const overlay = document.querySelector('[data-testid="game-over-screen"]');
      if (overlay instanceof HTMLElement) recordState(overlay);
      const animations = overlay instanceof HTMLElement ? overlay.getAnimations({ subtree: true }) : [];
      await Promise.all(animations.map(animation => animation.finished));
      if (overlay instanceof HTMLElement) recordState(overlay);
      const content = overlay?.firstElementChild;
      return {
        states,
        state: overlay?.getAttribute('data-death-sequence') ?? null,
        sawSettling: states.includes('settling'),
        elapsedMs: Number(synchronousDeathBoundary?.visualDeadline) - startedAt,
        settledCommittedAt,
        preEmitDeathBoundary,
        synchronousDeathBoundary,
        visualCompletion: {
          contentOpacity: content instanceof HTMLElement ? Number(getComputedStyle(content).opacity) : null,
          animations: animations.map(animation => ({
            id: animation.id,
            currentTime: Number(animation.currentTime),
            duration: Number(animation.effect?.getComputedTiming().activeDuration ?? 0),
            playState: animation.playState,
          })),
        },
      };
    } finally {
      window.removeEventListener('dungeon-veil-player-death-v1', capturePreEmitBoundary);
      observer.disconnect();
    }
  });
  expect(deathSequenceObservation.preEmitDeathBoundary?.overlaySequence, 'presentation boundary must already be settling before the terminal snapshot emit is starved').toBe('settling');
  expect(deathSequenceObservation.preEmitDeathBoundary?.visualDriver, 'pre-emit lethal boundary must start the browser animation timeline').toBe('web-animations');
  expect(deathSequenceObservation.preEmitDeathBoundary?.animations).toEqual(['dungeon-veil-death-content', 'dungeon-veil-death-overlay']);
  expect(deathSequenceObservation.preEmitDeathBoundary?.visualDeadline - deathSequenceObservation.preEmitDeathBoundary?.transitionStartedAt, 'pre-emit animations must preserve the original lethal clock and unchanged 1100 ms beat').toBe(1_100);
  expect(deathSequenceObservation.synchronousDeathBoundary?.terminalEmitStarvationMs, 'starvation proof must exceed the unchanged death beat').toBeGreaterThan(1_100);
  expect(deathSequenceObservation.synchronousDeathBoundary?.blockedElapsedMs, 'real terminal snapshot emit must remain blocked long enough to reproduce loaded iPad/WebKit').toBeGreaterThanOrEqual(1_100);
  expect(deathSequenceObservation.sawSettling, 'death overlay must expose the explicit visual settling state before final defeat').toBe(true);
  expect(deathSequenceObservation.synchronousDeathBoundary?.overlaySequence, 'authoritative death event must synchronously publish the real settling boundary').toBe('settling');
  expect(deathSequenceObservation.synchronousDeathBoundary?.terminalRenderMode, 'withholding future rAF callbacks must not prevent the real frozen terminal render').toBe('frozen-final-pose');
  expect(deathSequenceObservation.synchronousDeathBoundary?.terminalRenderFrames, 'authoritative death event must commit exactly one final WebGL frame').toBe('1');
  expect(deathSequenceObservation.synchronousDeathBoundary?.visualDriver, 'visible settle must use a browser animation timeline rather than depend on main-thread deadline callbacks').toBe('web-animations');
  expect(deathSequenceObservation.synchronousDeathBoundary?.animations.map(animation => animation.id).sort()).toEqual(['dungeon-veil-death-content', 'dungeon-veil-death-overlay']);
  expect(deathSequenceObservation.synchronousDeathBoundary?.animations.every(animation => animation.duration > 0 && animation.duration <= 1_100), 'both visible effects must retain the bounded 1100 ms death beat').toBe(true);
  expect(deathSequenceObservation.state, 'death overlay must transition from the visual death beat to a settled defeat state').toBe('settled');
  expect(Number.isFinite(deathSequenceObservation.settledCommittedAt), 'settled death DOM must publish its exact product commit timestamp').toBe(true);
  expect(deathSequenceObservation.elapsedMs, 'visible death animation must not settle before the measured lethal transition').toBeGreaterThanOrEqual(0);
  expect(deathSequenceObservation.elapsedMs, 'visible death animation must settle within the unchanged 2 s acceptance window').toBeLessThanOrEqual(2_000);
  expect(deathSequenceObservation.visualCompletion.contentOpacity, 'the browser timeline must expose the real terminal copy and controls at completion').toBe(1);
  expect(deathSequenceObservation.visualCompletion.animations.every(animation => animation.playState === 'finished' && animation.currentTime >= animation.duration), 'both visible effects must actually reach their filled final frame').toBe(true);
  const overlay = page.getByTestId('game-over-screen');
  await expect(overlay).toBeVisible();
  await expect(overlay, 'pre-mounted presentation must reconcile the real terminal player and controls').toContainText('Death State QA');
  await expect(page.getByTestId('button-retry'), 'retry control must remain usable after the pre-mounted boundary activates').toBeVisible();
  await expect(page.getByTestId('button-main-menu'), 'main-menu control must remain usable after the pre-mounted boundary activates').toBeVisible();
  const playerRenderer = page.locator('[data-player-death-state="active"]');
  await expect(playerRenderer, 'renderer must publish an active death-state instead of freezing in idle/run').toBeVisible({ timeout: 2_000 });
  const rendererHost = page.getByTestId('run-three-host');
  await expect(rendererHost, 'terminal renderer must retain one final death pose without continuing software-WebGL draws').toHaveAttribute('data-terminal-render-mode', 'frozen-final-pose', { timeout: 2_000 });
  await expect(rendererHost, 'terminal renderer must bound the death presentation to exactly one final WebGL frame').toHaveAttribute('data-terminal-render-frames', '1');
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
  await writeFile(testInfo.outputPath(`player-death-solo-${testInfo.project.name}.trace.json`), JSON.stringify({ project: testInfo.project.name, before: { status: before?.status ?? null, hp: Number(before?.hp || 0) }, after: { status: after?.status ?? null, hp: Number(after?.hp ?? 1), playerLastAttackTime: postDeathAttackObservation.attackAt }, preMountedBoundary, preEmitDeathBoundary: deathSequenceObservation.preEmitDeathBoundary, synchronousDeathBoundary: deathSequenceObservation.synchronousDeathBoundary, visualCompletion: deathSequenceObservation.visualCompletion, deathSequence, deathSequenceStates: deathSequenceObservation.states, visualSettleDeadlineMs: deathSequenceObservation.elapsedMs, semanticDeathSequenceCommittedAt: deathSequenceObservation.settledCommittedAt, rendererDeathState, terminalRenderMode: await rendererHost.getAttribute('data-terminal-render-mode'), terminalRenderFrames: Number(await rendererHost.getAttribute('data-terminal-render-frames')), postDeathAttackObservedMs: postDeathAttackAfterWindow.elapsedMs, postDeathAttackBlocked: true }, null, 2));
  await page.screenshot({ path: testInfo.outputPath(`player-death-solo-${testInfo.project.name}.png`), fullPage: true });
  // WebKit's iPhone video encoder trails the already-rendered terminal DOM by more than the generic EOF hold.
  // Keep only that project alive longer after all assertions so the final card is actually encoded into the video.
  await page.waitForTimeout(testInfo.project.name === 'iphone-webkit' ? 3_000 : 1_000);
});

const TEAM_DEFEAT_COPY = {
  de: {
    title: 'BEIDE GEFALLEN',
    body: 'Der gemeinsame Run ist beendet. Nur der Host kann beide Spieler zusammen neu starten.',
  },
  en: {
    title: 'BOTH HAVE FALLEN',
    body: 'The shared run is over. Only the host can restart both players together.',
  },
};

for (const language of ['de', 'en']) {
  test(`mounted authority bridge proves held revive -> second-death Fallen -> Team Defeat (${language})`, async ({ page }, testInfo) => {
    await openDuoLifecycleQa(page, testInfo.project.name, language);
    const startedAt = await page.evaluate(() => performance.now());
    const phases = [];
    const remoteLifeStates = [];
    const observe = async (phase, lifeState, options) => {
      const observation = await observeDuoUi(page, { phase, lifeState }, options);
      phases.push(phase);
      if (remoteLifeStates.at(-1) !== lifeState) remoteLifeStates.push(lifeState);
      return observation;
    };
    const resetDownedBoundary = async () => {
      const observation = await observeDuoUi(
        page,
        { phase: 'downed', lifeState: 'downed', reviveVisible: true },
        { action: 'resetPartnerDownedEvidenceBoundary', timeoutMs: 2_000 },
      );
      phases.push('downed');
      if (remoteLifeStates.at(-1) !== 'downed') remoteLifeStates.push('downed');
      return observation;
    };
    await observe('downed', 'downed');

    const revive = page.getByTestId('coop-revive-control');
    await expect(revive).toBeVisible();
    await revive.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true });
    await page.waitForTimeout(700);
    await revive.dispatchEvent('pointercancel', { pointerId: 7, pointerType: 'touch', isPrimary: true });
    await page.waitForTimeout(350);
    const afterPointerCancel = (await observe('downed', 'downed', { captureSnapshot: true })).snapshot;
    await resetDownedBoundary();

    await revive.dispatchEvent('pointerdown', { pointerId: 71, pointerType: 'touch', isPrimary: true });
    await page.waitForTimeout(500);
    await revive.dispatchEvent('pointerup', { pointerId: 71, pointerType: 'touch', isPrimary: true });
    await page.waitForTimeout(350);
    const afterPointerUp = (await observe('downed', 'downed', { captureSnapshot: true })).snapshot;
    await resetDownedBoundary();

    await revive.dispatchEvent('pointerdown', { pointerId: 72, pointerType: 'touch', isPrimary: true });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__dungeonVeilDuoAuthorityEvidence.movePartnerOutOfReviveRange());
    await expect(revive).toHaveCount(0, { timeout: 2_000 });
    await page.waitForTimeout(3_100);
    const afterRangeLoss = (await observe('downed', 'downed', { captureSnapshot: true })).snapshot;
    await page.evaluate(() => window.__dungeonVeilDuoAuthorityEvidence.movePartnerIntoReviveRange());
    await resetDownedBoundary();

    const assertReconnectRecovery = async trigger => {
      await observeDuoUi(
        page,
        { connectionStatus: 'reconnecting', disconnectedVisible: true },
        { action: trigger, timeoutMs: 2_000 },
      );
      const observation = await observeDuoUi(
        page,
        { phase: 'downed', lifeState: 'downed', connectionStatus: 'connected', disconnectedVisible: false },
        { action: 'releaseTransportFailure', timeoutMs: 3_000 },
      );
      phases.push('downed');
      if (remoteLifeStates.at(-1) !== 'downed') remoteLifeStates.push('downed');
      return observation;
    };
    await assertReconnectRecovery('interruptNextRead');
    await resetDownedBoundary();
    await assertReconnectRecovery('rejectNextSubmitAsStale');
    await resetDownedBoundary();
    const sessionBefore = await page.evaluate(() => window.__dungeonVeilDuoAuthorityEvidence.snapshot());
    await observeDuoUi(
      page,
      { connectionStatus: 'reconnecting', disconnectedVisible: true },
      { action: 'interruptNextActorSession', timeoutMs: 2_000 },
    );
    const sessionRecovery = await observeDuoUi(
      page,
      { connectionStatus: 'connected', disconnectedVisible: false },
      { action: 'refreshActorSession', timeoutMs: 3_000, captureSnapshot: true },
    );
    const sessionAfter = sessionRecovery.snapshot;
    expect(sessionAfter.sessionGeneration).toBe(sessionBefore.sessionGeneration + 1);
    expect(sessionAfter.sessionAvailable).toBe(true);
    expect(sessionAfter.consumedSessions.some(entry => entry.operation === 'read'
      && entry.actorId === 'runtime-authority-host'
      && entry.credentialGeneration === sessionAfter.sessionGeneration)).toBe(true);
    expect(sessionAfter.consumedSessions.some(entry => entry.operation === 'submit'
      && entry.actorId === 'runtime-authority-host'
      && entry.credentialGeneration === sessionAfter.sessionGeneration)).toBe(true);
    await resetDownedBoundary();

    await page.evaluate(() => window.__dungeonVeilDuoAuthorityEvidence.setUserPaused(true));
    const pausedRecovery = await assertReconnectRecovery('interruptNextRead');
    expect(pausedRecovery.engineStatus).toBe('paused');
    await page.evaluate(() => window.__dungeonVeilDuoAuthorityEvidence.setUserPaused(false));
    await resetDownedBoundary();

    const holdStartedAt = await page.evaluate(() => performance.now());
    await revive.dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch', isPrimary: true });
    const revivedObservation = await observe('revived', 'alive');
    const holdElapsedMs = revivedObservation.observedAt - holdStartedAt;

    const { presentationBefore, presentationAfter } = await page.evaluate(async () => {
      const evidence = window.__dungeonVeilDuoAuthorityEvidence;
      evidence.prepareHostTelegraph();
      const deadline = performance.now() + 5_000;
      while (evidence.authorityPresentation().length === 0 && performance.now() < deadline) {
        await new Promise(resolve => window.setTimeout(resolve, 25));
      }
      const presentationBefore = evidence.authorityPresentation()[0];
      if (!presentationBefore) throw new Error('Authority telegraph presentation did not become visible within 5000 ms');
      await new Promise(resolve => window.setTimeout(resolve, 120));
      const presentationAfter = evidence.authorityPresentation()
        .find(presentation => presentation.id === presentationBefore.id);
      evidence.clearHostTelegraph();
      return { presentationBefore, presentationAfter };
    });
    const presentationAgedOrExpired = presentationAfter === undefined
      || (presentationAfter.lifeTime > presentationBefore.lifeTime && presentationAfter.lifeTime <= presentationAfter.maxLifeTime);
    expect(presentationAgedOrExpired, 'the same authority telegraph must age forward within its bound or be absent after expiry/replacement').toBe(true);

    await observe('fallen', 'fallen', { action: 'preparePartnerSecondDeath' });

    const teamDefeatObservation = await observeDuoUi(
      page,
      {
        phase: 'team-defeat',
        lifeState: 'fallen',
        teamDefeatVisible: true,
        teamDefeatTextIncludes: [TEAM_DEFEAT_COPY[language].title, TEAM_DEFEAT_COPY[language].body],
        advanceCount: 0,
      },
      { action: 'prepareTeamDefeat', captureSnapshot: true },
    );
    phases.push('team-defeat');
    if (remoteLifeStates.at(-1) !== 'fallen') remoteLifeStates.push('fallen');
    const elapsedMs = teamDefeatObservation.observedAt - startedAt;
    const phaseTransitions = phases.filter((phase, index) => index === 0 || phases[index - 1] !== phase);
    expect(phaseTransitions).toEqual(['downed', 'revived', 'fallen', 'team-defeat']);
    expect(remoteLifeStates).toEqual(['downed', 'alive', 'fallen']);
    expect(holdElapsedMs, 'revive evidence must retain a continuous real pointer hold for at least the server contract').toBeGreaterThanOrEqual(3_000);
    const authoritySnapshot = teamDefeatObservation.snapshot;
    const hostReviveIntents = authoritySnapshot.intents.filter(intent => intent.actorId === 'runtime-authority-host' && intent.kind === 'revive-hold');
    expect(hostReviveIntents.length, 'mounted bridge must submit repeated revive-hold intents through the deterministic authority transport').toBeGreaterThan(2);
    expect(authoritySnapshot.state.actors.find(actor => actor.actorId === 'runtime-authority-partner')?.revivesUsed).toBe(1);
    expect(authoritySnapshot.state.actors.find(actor => actor.actorId === 'runtime-authority-partner')?.lifeState).toBe('fallen');
    const { invalidatedProbe, afterExit } = await page.evaluate(async () => {
      const evidence = window.__dungeonVeilDuoAuthorityEvidence;
      await evidence.exitAuthorityAttempt();
      const invalidatedProbe = await evidence.probeInvalidatedAttempt();
      return { invalidatedProbe, afterExit: evidence.snapshot() };
    });
    expect(afterExit.attemptStatus).toBe('invalidated');
    expect(afterExit.sessionAvailable).toBe(true);
    expect(afterExit.exitCalls).toBe(1);
    expect(invalidatedProbe).toEqual({ readRejected: true, submitRejected: true });
    expect(afterExit.invalidatedReadRejections).toBeGreaterThanOrEqual(1);
    expect(afterExit.invalidatedSubmitRejections).toBeGreaterThanOrEqual(1);
    expect(afterExit.completionProofs).toBe(0);
    const pointerCancelPreventedRevive = afterPointerCancel.state.actors.find(actor => actor.actorId === 'runtime-authority-partner')?.lifeState === 'downed';
    const pointerUpPreventedRevive = afterPointerUp.state.actors.find(actor => actor.actorId === 'runtime-authority-partner')?.lifeState === 'downed';
    const rangeLossPreventedRevive = afterRangeLoss.state.actors.find(actor => actor.actorId === 'runtime-authority-partner')?.lifeState === 'downed';
    expect(pointerCancelPreventedRevive).toBe(true);
    expect(pointerUpPreventedRevive).toBe(true);
    expect(rangeLossPreventedRevive).toBe(true);
    await writeFile(testInfo.outputPath(`player-death-duo-${language}-${testInfo.project.name}.trace.json`), JSON.stringify({ project: testInfo.project.name, language, source: 'mounted-CoopAuthorityRuntimeBridge', phases, phaseTransitions, remoteLifeStates, elapsedMs, holdElapsedMs, reviveIntentCount: hostReviveIntents.length, pointerCancelPreventedRevive, pointerUpPreventedRevive, rangeLossPreventedRevive, readFailureRecovered: true, staleSubmitRecovered: true, sessionGenerationBefore: sessionBefore.sessionGeneration, sessionGenerationAfter: sessionAfter.sessionGeneration, refreshedSessionRecovered: sessionAfter.sessionGeneration === sessionBefore.sessionGeneration + 1 && sessionAfter.sessionAvailable, refreshedSessionConsumedByRead: sessionAfter.consumedSessions.some(entry => entry.operation === 'read' && entry.credentialGeneration === sessionAfter.sessionGeneration), refreshedSessionConsumedBySubmit: sessionAfter.consumedSessions.some(entry => entry.operation === 'submit' && entry.credentialGeneration === sessionAfter.sessionGeneration), userPausePreserved: true, presentationAgedOrExpired, partnerRevivesUsed: 1, partnerSecondDeath: 'fallen', exitInvokedThroughMountedBridge: afterExit.exitCalls === 1, exitInvalidatedAttempt: afterExit.attemptStatus === 'invalidated' && invalidatedProbe.readRejected && invalidatedProbe.submitRejected, invalidatedReadRejections: afterExit.invalidatedReadRejections, invalidatedSubmitRejections: afterExit.invalidatedSubmitRejections, exitCompletionProofs: afterExit.completionProofs, finalTeamDefeatVisible: true, finalTeamDefeatTitle: TEAM_DEFEAT_COPY[language].title, finalTeamDefeatBody: TEAM_DEFEAT_COPY[language].body }, null, 2));
    await page.screenshot({ path: testInfo.outputPath(`player-death-duo-${language}-${testInfo.project.name}.png`), fullPage: true });
    // Keep the verified terminal card on-screen long enough to be encoded into the temporal evidence EOF.
    await page.waitForTimeout(1_000);
  });
}

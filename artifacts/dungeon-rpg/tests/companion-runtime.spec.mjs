import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';
const COMPANION_ACTION_LOG = '__dungeonVeilCompanionActionLog';
const COMPANION_ACTION_LISTENER = '__dungeonVeilCompanionActionListenerInstalled';
const COMPANION_FEEDBACK_REJECTION_LOG = '__dungeonVeilCompanionFeedbackRejectionLog';
const RUNTIME_EVIDENCE_MARKER = 'dungeon-veil-runtime-evidence-v1';
const COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS = 250;
const DEFAULT_COMPANION_STATE = {
  activeId: 'single-target',
  companions: { 'single-target': { level: 1, unlockedAt: 1 } },
};

async function pressPointerUi(locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

async function openMenu(page, projectName, companionState = DEFAULT_COMPANION_STATE) {
  await page.addInitScript(({ ipad, initialCompanionState, runtimeEvidenceMarker }) => {
    localStorage.clear();
    sessionStorage.setItem(runtimeEvidenceMarker, '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-player-profile-v1', JSON.stringify({
      version: 1,
      selectedTitle: 'veil-initiate',
      selectedCard: 'ash',
      selectedAvatar: 'ranger',
      stats: { runsStarted: 0, roomsCleared: 0, enemiesDefeated: 0, bossesDefeated: 0, totalDamage: 0, itemsFound: 0, questsCompleted: 0, playTimeMs: 0, highestChapter: 6, highestRoom: 1 },
      updatedAt: Date.now(),
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4, rank: 1, xp: 0, dust: 2500, gold: 0,
      owned: { 'ash-bow': { level: 1, copies: 0 }, 'ranger-quiver': { level: 1, copies: 0 }, 'ranger-cloak': { level: 1, copies: 0 } },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      cosmeticUnlocks: [], migrationCompensation: { gold: 0, dust: 0, copies: 0 }, rewardLedger: [], currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: initialCompanionState.activeId,
      companions: initialCompanionState.companions,
      updatedAt: 1,
    }));
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, {
    ipad: projectName.includes('ipad'),
    initialCompanionState: companionState,
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
  await name.fill('Companion Collection Runtime');
  await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  const skipIntro = page.getByRole('button', { name: /ÜBERSPRINGEN|SKIP/i });
  if (await skipIntro.isVisible({ timeout: 8_000 }).catch(() => false)) await skipIntro.click({ force: true });
  await expect(skipIntro).toBeHidden({ timeout: 20_000 });
}

async function readRuntimeCombatSnapshot(page) {
  return page.evaluate(() => window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null);
}

async function prepareLivePlayerAttackLine(page) {
  const enemyStatus = page.getByTestId('run-enemy-status');
  await expect(enemyStatus).toBeVisible();
  await expect(enemyStatus).not.toHaveText(/RAUM FREI|ROOM CLEAR/i);
  await expect.poll(async () => Number((await readRuntimeCombatSnapshot(page))?.livingEnemies || 0), {
    timeout: 10_000,
    intervals: [50, 100, 250],
    message: 'localhost runtime evidence must expose at least one living target before critical proc capture',
  }).toBeGreaterThan(0);
}

function keysForVector(dx, dy) {
  const keys = [];
  if (Math.abs(dx) >= 18) keys.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
  if (Math.abs(dy) >= 18) keys.push(dy < 0 ? 'ArrowUp' : 'ArrowDown');
  return keys.length ? keys : ['ArrowUp'];
}

async function moveWithKeyboard(page, keys, durationMs) {
  for (const key of keys) await page.keyboard.down(key);
  try {
    await page.waitForTimeout(durationMs);
  } finally {
    for (const key of [...keys].reverse()) await page.keyboard.up(key);
  }
}

async function triggerConfirmedPlayerAttack(page, attackBoundary) {
  const inputBurst = 6;
  const attempts = [];

  for (let attempt = 0; attempt < inputBurst; attempt += 1) {
    const before = await readRuntimeCombatSnapshot(page);
    const previousAttackAt = Number(before?.playerLastAttackTime || 0);
    if (previousAttackAt > attackBoundary) return previousAttackAt;

    const enemies = Array.isArray(before?.livingEnemyPositions) ? before.livingEnemyPositions : [];
    if (!enemies.length) break;

    const playerX = Number(before?.playerX || 0) + 16;
    const playerY = Number(before?.playerY || 0) + 16;
    const target = [...enemies].sort((left, right) => (
      Math.hypot(Number(left.x) - playerX, Number(left.y) - playerY)
      - Math.hypot(Number(right.x) - playerX, Number(right.y) - playerY)
    ))[0];
    const dx = Number(target.x) - playerX;
    const dy = Number(target.y) - playerY;
    const phase = attempt % 3;
    const vector = phase === 0 ? { x: dx, y: dy }
      : phase === 1 ? { x: -dy, y: dx }
        : { x: dy, y: -dx };
    const keys = keysForVector(vector.x, vector.y);
    const durationMs = phase === 0 ? 260 : 190;

    await moveWithKeyboard(page, keys, durationMs);
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);

    const after = await readRuntimeCombatSnapshot(page);
    const confirmedAt = Number(after?.playerLastAttackTime || 0);
    attempts.push({
      attempt,
      keys,
      durationMs,
      playerX,
      playerY,
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
      previousAttackAt,
      confirmedAt,
      livingEnemies: Number(after?.livingEnemies || 0),
    });
    if (confirmedAt > attackBoundary) return confirmedAt;
  }

  const finalSnapshot = await readRuntimeCombatSnapshot(page);
  throw new Error(`No authoritative player attack occurred after ${attackBoundary}. Attempts: ${JSON.stringify(attempts)}. Final snapshot: ${JSON.stringify(finalSnapshot)}`);
}

async function readTransientRoomTitleState(page) {
  return page.evaluate(() => {
    const exactTitle = /^(VERSORGUNGSPOSTEN|SUPPLY POST)$/i;
    const owners = [];
    const visibleOwners = [];
    for (const candidate of document.querySelectorAll('[data-testid]')) {
      const testId = candidate.getAttribute('data-testid') ?? '';
      if (!/(room.*title|title.*room|transition)/i.test(testId)) continue;
      const text = (candidate.textContent ?? '').trim();
      if (!exactTitle.test(text)) continue;
      owners.push(testId);
      const style = window.getComputedStyle(candidate);
      const bounds = candidate.getBoundingClientRect();
      if (style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0 && bounds.width > 0 && bounds.height > 0) visibleOwners.push(testId);
    }
    const rendererHost = document.querySelector('[data-testid="run-three-host"]');
    const expectedPaintKey = rendererHost?.getAttribute('data-room-paint-expected-key') ?? '';
    const paintReadyKey = rendererHost?.getAttribute('data-room-paint-ready-key') ?? '';
    return { owners, visibleOwners, expectedPaintKey, paintReadyKey };
  });
}

async function waitForStableRoom(page) {
  let hiddenSince = 0;
  await expect.poll(async () => {
    const { owners, visibleOwners, expectedPaintKey, paintReadyKey } = await readTransientRoomTitleState(page);
    if (owners.length > 1 || visibleOwners.length > 1) return 'duplicate';
    if (visibleOwners.length === 1) {
      hiddenSince = 0;
      return 'active';
    }
    if (hiddenSince === 0) hiddenSince = Date.now();
    const titleStable = Date.now() - hiddenSince >= 1_200;
    if (!expectedPaintKey || paintReadyKey !== expectedPaintKey) return titleStable ? 'renderer-pending' : 'settling';
    return titleStable ? 'stable' : 'settling';
  }, {
    timeout: 120_000,
    intervals: [100, 250, 500],
    message: 'the authoritative room-title transition must be continuously hidden and the current renderer world root must be paint-ready before companion feedback evidence capture',
  }).toBe('stable');
}

async function armCompanionActionObservation(page) {
  await page.evaluate(({ eventName, logKey, listenerKey }) => {
    const scope = window;
    scope[logKey] = [];
    if (scope[listenerKey]) return;
    scope[listenerKey] = true;
    window.addEventListener(eventName, event => {
      const detail = event.detail;
      if (!detail || detail.kind !== 'attack' || !detail.targetId) return;
      const log = scope[logKey];
      log.push({
        role: detail.role,
        kind: detail.kind,
        targetId: detail.targetId,
        at: detail.at,
        observedAt: performance.now(),
      });
      if (log.length > 24) log.splice(0, log.length - 24);
    });
  }, { eventName: COMPANION_ACTION_EVENT, logKey: COMPANION_ACTION_LOG, listenerKey: COMPANION_ACTION_LISTENER });
}

function assertReadableFeedback(observedFeedback, { role, critical, marker }) {
  expect(observedFeedback).toBeTruthy();
  expect(observedFeedback.feedbackId).toMatch(/^companion-damage-number-/);
  expect(observedFeedback.feedbackRole).toBe(role);
  expect(observedFeedback.feedbackTargetId).toBe(observedFeedback.targetId);
  expect(observedFeedback.critical).toBe(String(critical));
  expect(observedFeedback.text).toMatch(marker);
  expect(observedFeedback.visibleCount).toBe('1');
  expect(observedFeedback.width).toBeGreaterThan(0);
  expect(observedFeedback.height).toBeGreaterThan(0);
  expect(observedFeedback.fontSize).toBeGreaterThan(0);
  const viewportClass = observedFeedback.viewportWidth >= 600 ? 'tablet' : 'phone';
  const maxFont = viewportClass === 'tablet' ? (critical ? 16 : 13) : (critical ? 12 : 10.5);
  const minFont = viewportClass === 'tablet' ? (critical ? 13 : 11) : (critical ? 9.5 : 8);
  expect(observedFeedback.fontSize).toBeGreaterThanOrEqual(minFont);
  expect(observedFeedback.fontSize).toBeLessThanOrEqual(maxFont);
  expect(observedFeedback.backgroundColor).toMatch(/rgba\(0, 0, 0, 0\)|transparent/i);
  expect(observedFeedback.borderTopWidth).toBe('0px');
  expect(observedFeedback.boxShadow).toBe('none');
  expect(observedFeedback.pointerEvents).toBe('none');
  expect(observedFeedback.opacity).toBeGreaterThanOrEqual(0.9);
  expect(observedFeedback.actionAgeMs).toBeGreaterThanOrEqual(0);
  expect(observedFeedback.actionAgeMs).toBeLessThanOrEqual(COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS);
}

function assertFullViewportPng(screenshot, viewport) {
  expect([...screenshot.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(screenshot.length).toBeGreaterThan(10_000);
  const width = screenshot.readUInt32BE(16);
  const height = screenshot.readUInt32BE(20);
  expect(width).toBeGreaterThanOrEqual(viewport.width);
  expect(height).toBeGreaterThanOrEqual(viewport.height);
}

async function readCompanionFeedbackDiagnostics(page, { role, critical, notBefore }) {
  return page.evaluate(({ actionLogKey, rejectionLogKey, expectedRole, expectedCritical, minimumAt }) => {
    const runtime = document.querySelector('[data-testid="companion-runtime-bridge"]');
    return {
      now: performance.now(),
      expectedRole,
      expectedCritical: String(expectedCritical),
      minimumAt,
      runtime: runtime ? { ...runtime.dataset } : null,
      runtimeEvidence: window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null,
      actions: (window[actionLogKey] || []).slice(-12),
      rejections: (window[rejectionLogKey] || []).slice(-32),
      liveFeedback: [...document.querySelectorAll('[data-testid^="companion-damage-number-"]')].map(node => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          feedbackId: node.getAttribute('data-testid') || '',
          role: node.dataset.companionRole || '',
          targetId: node.dataset.targetId || '',
          critical: node.dataset.critical || '',
          text: node.textContent || '',
          connected: Boolean(node.isConnected),
          opacity: Number(style.opacity),
          width: rect.width,
          height: rect.height,
        };
      }),
    };
  }, {
    actionLogKey: COMPANION_ACTION_LOG,
    rejectionLogKey: COMPANION_FEEDBACK_REJECTION_LOG,
    expectedRole: role,
    expectedCritical: critical,
    minimumAt: notBefore,
  });
}

async function captureLiveCompanionFeedbackEvidence(page, { role, critical, notBefore, marker, path }) {
  let observedFeedback = null;
  const bindingName = critical ? '__dungeonVeilCaptureCriticalCompanionFeedback' : '__dungeonVeilCaptureBasicCompanionFeedback';
  const observationKey = critical ? '__dungeonVeilCriticalCompanionFeedbackObservation' : '__dungeonVeilBasicCompanionFeedbackObservation';
  const observerKey = `${observationKey}Observer`;
  const armedKey = `${observationKey}Armed`;
  const minimumAtSetterKey = `${observationKey}SetMinimumAt`;
  const minimumAtStateKey = `${observationKey}MinimumAt`;
  let resolveScreenshot;
  let rejectScreenshot;
  const screenshotPromise = new Promise((resolve, reject) => {
    resolveScreenshot = resolve;
    rejectScreenshot = reject;
  });

  try {
    await page.exposeBinding(bindingName, async ({ page: boundPage }, payload) => {
      try {
        const viewport = boundPage.viewportSize();
        expect(viewport).toBeTruthy();
        const screenshot = await boundPage.screenshot({ path, fullPage: false, scale: 'css' });
        resolveScreenshot({ screenshot, viewport, payload });
      } catch (error) {
        rejectScreenshot(error);
      }
    });

    await page.evaluate(({ eventName, logKey, expectedRole, expectedCritical, minimumAt, maxActionAgeMs, binding, observation, observer, armed }) => {
      const scope = window;
      const rejectionLogKey = '__dungeonVeilCompanionFeedbackRejectionLog';
      const minimumAtStateKey = `${observation}MinimumAt`;
      const initialMinimumAt = minimumAt;
      minimumAt = Number.POSITIVE_INFINITY;
      scope[minimumAtStateKey] = minimumAt;
      scope[observation] = null;
      scope[armed] = false;
      scope[rejectionLogKey] = [];
      scope[observer]?.disconnect?.();
      let paintReinspectionFrame = 0;
      let mutationObserver = null;
      let actionListener = null;
      const captureActions = [];
      let criticalBoundaryPrimed = !expectedCritical;

      const recordRejection = (reason, node, extra = {}) => {
        const log = scope[rejectionLogKey];
        const style = node ? getComputedStyle(node) : null;
        const rect = node?.getBoundingClientRect?.();
        log.push({
          reason,
          at: performance.now(),
          feedbackId: node?.getAttribute?.('data-testid') || '',
          role: node?.dataset?.companionRole || '',
          targetId: node?.dataset?.targetId || '',
          critical: node?.dataset?.critical || '',
          text: node?.textContent || '',
          connected: Boolean(node?.isConnected),
          opacity: style ? Number(style.opacity) : null,
          width: rect?.width ?? null,
          height: rect?.height ?? null,
          ...extra,
        });
        if (log.length > 32) log.splice(0, log.length - 32);
      };

      const cleanup = () => {
        mutationObserver?.disconnect();
        if (actionListener) window.removeEventListener(eventName, actionListener);
        if (paintReinspectionFrame) cancelAnimationFrame(paintReinspectionFrame);
        paintReinspectionFrame = 0;
      };
      scope[observer] = { disconnect: cleanup };

      const schedulePaintReinspection = () => {
        if (paintReinspectionFrame || scope[observation]) return;
        paintReinspectionFrame = requestAnimationFrame(() => {
          paintReinspectionFrame = 0;
          inspect();
        });
      };

      const inspect = () => {
        if (scope[observation]) return true;
        const nodes = [...document.querySelectorAll('[data-testid^="companion-damage-number-"]')];
        for (let index = nodes.length - 1; index >= 0; index -= 1) {
          const node = nodes[index];
          if (node.dataset.companionRole !== expectedRole || node.dataset.critical !== String(expectedCritical)) {
            recordRejection('identity-mismatch', node, { expectedRole, expectedCritical: String(expectedCritical) });
            continue;
          }
          const targetId = node.dataset.targetId || '';
          if (!node.isConnected) {
            recordRejection('disconnected', node);
            continue;
          }
          const action = [...captureActions].reverse().find(entry => (
            entry.role === expectedRole
            && entry.kind === 'attack'
            && entry.targetId === targetId
            && entry.at > minimumAt
          ));
          if (!action) {
            recordRejection('no-correlated-action', node, { minimumAt, targetId });
            schedulePaintReinspection();
            continue;
          }
          const diagnosticCaptureNow = performance.now();
          const diagnosticActionAgeMs = diagnosticCaptureNow - Number(action.at);
          if (!Number.isFinite(diagnosticActionAgeMs) || diagnosticActionAgeMs < 0 || diagnosticActionAgeMs > maxActionAgeMs) {
            recordRejection('action-age', node, { actionAt: action.at, actionAgeMs: diagnosticActionAgeMs, maxActionAgeMs });
          }
          const captureNow = performance.now();
          const actionAgeMs = captureNow - Number(action.at);
          if (!Number.isFinite(actionAgeMs) || actionAgeMs < 0 || actionAgeMs > maxActionAgeMs) continue;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          const opacity = Number(style.opacity);
          if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none') {
            recordRejection('not-visible-geometry', node, { visibility: style.visibility, display: style.display });
            continue;
          }
          if (opacity < 0.9) {
            recordRejection('opacity-below-threshold', node, { opacity });
            schedulePaintReinspection();
            continue;
          }
          const layer = document.querySelector('[data-testid="companion-damage-feedback-layer"]');
          const payload = {
            ...action,
            capturedAt: captureNow,
            actionAgeMs,
            feedbackId: node.getAttribute('data-testid') || '',
            feedbackRole: node.dataset.companionRole || '',
            feedbackTargetId: targetId,
            critical: node.dataset.critical || '',
            text: node.textContent || '',
            width: rect.width,
            height: rect.height,
            fontSize: Number.parseFloat(style.fontSize),
            viewportWidth: window.innerWidth,
            backgroundColor: style.backgroundColor,
            borderTopWidth: style.borderTopWidth,
            boxShadow: style.boxShadow,
            pointerEvents: style.pointerEvents,
            opacity,
            visibleCount: layer?.getAttribute('data-visible-count') || '',
            expectedCritical: String(expectedCritical),
          };
          scope[observation] = payload;
          scope[observer]?.disconnect?.();
          void scope[binding](payload);
          return true;
        }
        return false;
      };

      scope[`${observation}SetMinimumAt`] = nextMinimumAt => {
        const candidate = Number(nextMinimumAt);
        if (!Number.isFinite(candidate) || candidate <= initialMinimumAt) return false;
        if (!criticalBoundaryPrimed) {
          criticalBoundaryPrimed = true;
          scope[minimumAtStateKey] = candidate;
          return true;
        }
        const previousMinimumAt = Number(scope[minimumAtStateKey]);
        if (Number.isFinite(previousMinimumAt) && candidate <= previousMinimumAt) return false;
        minimumAt = candidate;
        scope[minimumAtStateKey] = minimumAt;
        inspect();
        return true;
      };

      actionListener = event => {
        const detail = event.detail;
        if (!detail || detail.kind !== 'attack' || !detail.targetId) return;
        if (detail.role !== expectedRole || Number(detail.at) <= minimumAt) return;
        captureActions.push({ ...detail, observedAt: performance.now() });
        if (captureActions.length > 8) captureActions.splice(0, captureActions.length - 8);
        queueMicrotask(() => inspect());
      };
      window.addEventListener(eventName, actionListener);

      mutationObserver = new MutationObserver(() => inspect());
      mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-visible-count', 'data-critical', 'data-target-id', 'data-companion-role'],
      });
      inspect();
      scope[armed] = true;
    }, {
      eventName: COMPANION_ACTION_EVENT,
      logKey: COMPANION_ACTION_LOG,
      expectedRole: role,
      expectedCritical: critical,
      minimumAt: notBefore,
      maxActionAgeMs: COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS,
      binding: bindingName,
      observation: observationKey,
      observer: observerKey,
      armed: armedKey,
    });

    await page.waitForFunction(({ minimumAtState }) => Number.isFinite(window[minimumAtState]), {
      minimumAtState: minimumAtStateKey,
    }, {
      timeout: 20_000,
      polling: 16,
    });

    const handle = await page.waitForFunction(({ observation }) => window[observation] || false, {
      observation: observationKey,
    }, {
      timeout: 20_000,
      polling: 16,
    });

    const { screenshot, viewport, payload } = await screenshotPromise;
    observedFeedback = await handle.jsonValue();
    expect(payload.feedbackId).toBe(observedFeedback.feedbackId);
    expect(payload.capturedAt).toBe(observedFeedback.capturedAt);
    assertReadableFeedback(observedFeedback, { role, critical, marker });
    assertFullViewportPng(screenshot, viewport);
    return observedFeedback;
  } catch (error) {
    const diagnostics = await readCompanionFeedbackDiagnostics(page, { role, critical, notBefore }).catch(diagnosticError => ({ diagnosticError: String(diagnosticError) }));
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nCompanion feedback diagnostics: ${JSON.stringify(diagnostics, null, 2)}`);
  } finally {
    await page.evaluate(({ observer, armed, minimumAtSetter, minimumAtState }) => {
      window[observer]?.disconnect?.();
      delete window[observer];
      delete window[armed];
      delete window[minimumAtSetter];
      delete window[minimumAtState];
    }, { observer: observerKey, armed: armedKey, minimumAtSetter: minimumAtSetterKey, minimumAtState: minimumAtStateKey }).catch(() => {});
  }
}

/* Remaining tests unchanged from exact head 154da78bfba2a114e99df4abd31e12009939c657. */

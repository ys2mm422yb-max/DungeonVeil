import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';
const COMPANION_ACTION_LOG = '__dungeonVeilCompanionActionLog';
const COMPANION_ACTION_LISTENER = '__dungeonVeilCompanionActionListenerInstalled';
const RUNTIME_EVIDENCE_MARKER = 'dungeon-veil-runtime-evidence-v1';
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

async function triggerConfirmedPlayerAttack(page, attackIssuedAt) {
  const inputBurst = 6;
  const attempts = [];

  for (let attempt = 0; attempt < inputBurst; attempt += 1) {
    const before = await readRuntimeCombatSnapshot(page);
    const previousAttackAt = Number(before?.playerLastAttackTime || 0);
    if (previousAttackAt >= attackIssuedAt) return previousAttackAt;

    const enemies = Array.isArray(before?.livingEnemyPositions) ? before.livingEnemyPositions : [];
    if (!enemies.length) break;

    await page.keyboard.press('Space');
    await page.waitForTimeout(90);
    const immediate = await readRuntimeCombatSnapshot(page);
    const immediateAttackAt = Number(immediate?.playerLastAttackTime || 0);
    if (immediateAttackAt >= attackIssuedAt) return immediateAttackAt;

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
      immediateAttackAt,
      confirmedAt,
      livingEnemies: Number(after?.livingEnemies || 0),
    });
    if (confirmedAt >= attackIssuedAt) return confirmedAt;
  }

  const finalSnapshot = await readRuntimeCombatSnapshot(page);
  throw new Error(`No authoritative player attack occurred after ${attackIssuedAt}. Attempts: ${JSON.stringify(attempts)}. Final snapshot: ${JSON.stringify(finalSnapshot)}`);
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
    return { owners, visibleOwners };
  });
}

async function waitForStableRoom(page) {
  let hiddenSince = 0;
  await expect.poll(async () => {
    const { owners, visibleOwners } = await readTransientRoomTitleState(page);
    if (owners.length > 1 || visibleOwners.length > 1) return 'duplicate';
    if (visibleOwners.length === 1) {
      hiddenSince = 0;
      return 'active';
    }
    if (hiddenSince === 0) hiddenSince = Date.now();
    return Date.now() - hiddenSince >= 1_200 ? 'stable' : 'settling';
  }, {
    timeout: 120_000,
    intervals: [100, 250, 500],
    message: 'the authoritative room-title transition must be absent or continuously hidden before companion feedback evidence capture',
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
  expect(observedFeedback.width).toBeGreaterThanOrEqual(24);
  expect(observedFeedback.width).toBeLessThanOrEqual(72);
  expect(observedFeedback.height).toBeGreaterThanOrEqual(15);
  expect(observedFeedback.height).toBeLessThanOrEqual(32);
  expect(observedFeedback.fontSize).toBeGreaterThanOrEqual(critical ? 17 : 15);
  expect(observedFeedback.fontSize).toBeLessThanOrEqual(critical ? 20.5 : 18);
  expect(observedFeedback.backgroundColor).toMatch(/rgba\(0, 0, 0, 0\)|transparent/i);
  expect(observedFeedback.borderTopWidth).toBe('0px');
  expect(observedFeedback.boxShadow).toBe('none');
  expect(observedFeedback.pointerEvents).toBe('none');
  expect(observedFeedback.opacity).toBeGreaterThanOrEqual(0.9);
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
  return page.evaluate(({ actionLogKey, expectedRole, expectedCritical, minimumAt }) => {
    const runtime = document.querySelector('[data-testid="companion-runtime-bridge"]');
    return {
      now: performance.now(),
      expectedRole,
      expectedCritical: String(expectedCritical),
      minimumAt,
      runtime: runtime ? { ...runtime.dataset } : null,
      runtimeEvidence: window.__dungeonVeilRuntimeEvidence?.snapshot() ?? null,
      actions: (window[actionLogKey] || []).slice(-12),
      liveFeedback: [...document.querySelectorAll('[data-testid^="companion-damage-number-"]')].map(node => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          feedbackId: node.getAttribute('data-testid') || '',
          role: node.dataset.companionRole || '',
          targetId: node.dataset.targetId || '',
          critical: node.dataset.critical || '',
          text: node.textContent || '',
          connected: node.isConnected,
          opacity: Number(style.opacity),
          width: rect.width,
          height: rect.height,
        };
      }),
    };
  }, {
    actionLogKey: COMPANION_ACTION_LOG,
    expectedRole: role,
    expectedCritical: critical,
    minimumAt: notBefore,
  });
}

async function captureLiveCompanionFeedbackEvidence(page, { role, critical, notBefore, marker, path }) {
  let observedFeedback = null;

  try {
    const handle = await page.waitForFunction(({ logKey, expectedRole, expectedCritical, minimumAt }) => {
      const nodes = [...document.querySelectorAll('[data-testid^="companion-damage-number-"]')];
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        if (node.dataset.companionRole !== expectedRole || node.dataset.critical !== String(expectedCritical)) continue;
        const targetId = node.dataset.targetId || '';
        const action = [...(window[logKey] || [])].reverse().find(entry => (
          entry.role === expectedRole
          && entry.kind === 'attack'
          && entry.targetId === targetId
          && entry.at >= minimumAt
        ));
        if (!action || !node.isConnected) continue;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const opacity = Number(style.opacity);
        if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none' || opacity < 0.9) continue;
        const layer = document.querySelector('[data-testid="companion-damage-feedback-layer"]');
        return {
          ...action,
          capturedAt: performance.now(),
          feedbackId: node.getAttribute('data-testid') || '',
          feedbackRole: node.dataset.companionRole || '',
          feedbackTargetId: targetId,
          critical: node.dataset.critical || '',
          text: node.textContent || '',
          width: rect.width,
          height: rect.height,
          fontSize: Number.parseFloat(style.fontSize),
          backgroundColor: style.backgroundColor,
          borderTopWidth: style.borderTopWidth,
          boxShadow: style.boxShadow,
          pointerEvents: style.pointerEvents,
          opacity,
          visibleCount: layer?.getAttribute('data-visible-count') || '',
          expectedCritical: String(expectedCritical),
        };
      }
      return false;
    }, { logKey: COMPANION_ACTION_LOG, expectedRole: role, expectedCritical: critical, minimumAt: notBefore }, {
      timeout: 20_000,
      polling: 'raf',
    });

    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    const screenshot = await page.screenshot({ path, fullPage: false });
    observedFeedback = await handle.jsonValue();
    assertReadableFeedback(observedFeedback, { role, critical, marker });
    assertFullViewportPng(screenshot, viewport);
    return observedFeedback;
  } catch (error) {
    const diagnostics = await readCompanionFeedbackDiagnostics(page, { role, critical, notBefore }).catch(diagnosticError => ({ diagnosticError: String(diagnosticError) }));
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nCompanion feedback diagnostics: ${JSON.stringify(diagnostics, null, 2)}`);
  }
}

test('companions are found and upgraded before a run, then remain fixed with articulated combat motion', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /companion|lynx|raven|sentinel|wisp|drake|TypeError|ReferenceError|Cannot read/i.test(message.text())) runtimeErrors.push(message.text()); });
  await openMenu(page, testInfo.project.name);
  await expect(page.getByTestId('main-menu-companion-navigation')).toHaveCount(0);
  const equipmentEntry = page.getByTestId('main-menu-equipment-navigation');
  await expect(equipmentEntry).toBeVisible();
  await pressPointerUi(equipmentEntry.getByRole('button'));
  await expect(page.getByRole('heading', { name: /AUSRÜSTUNG|EQUIPMENT/i })).toBeVisible();
  await page.getByTestId('inventory-tab-companion').click({ force: true });
  const management = page.getByTestId('companion-management-panel');
  await expect(management).toBeVisible();
  await expect(management).toHaveAttribute('data-embedded', 'true');
  await expect(management).toHaveAttribute('data-selection-surface', 'pre-run-only');
  await expect(management).toHaveAttribute('data-companion-species', 'veil-lynx');
  await expect(page.getByRole('heading', { name: /Gefährten des Schleiers|Allies of the Veil/i })).toBeVisible();
  await expect(page.getByTestId('equipment-permanent-progression-copy')).toBeHidden();
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'single-target');
  await expect(page.getByTestId('companion-reserve-count')).toContainText('1 / 5');
  await expect(page.getByTestId('companion-role-single-target')).toHaveAttribute('data-unlocked', 'true');
  await expect(page.getByTestId('companion-role-shield')).toHaveAttribute('data-unlocked', 'false');
  const shieldCard = page.getByTestId('companion-role-shield');
  await shieldCard.getByRole('button', { name: /FUND BEANSPRUCHEN|CLAIM FIND/i }).click({ force: true });
  await expect(shieldCard).toHaveAttribute('data-unlocked', 'true');
  await shieldCard.getByRole('button', { name: /AUSWÄHLEN|SELECT/i }).click({ force: true });
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'shield');
  await shieldCard.getByRole('button', { name: /VERBESSERN|UPGRADE/i }).click({ force: true });
  await expect(page.getByTestId('companion-active-role')).toContainText(/STUFE 2|LEVEL 2/i);
  await expect(page.getByTestId('companion-reserve-count')).toContainText('2 / 5');
  await page.screenshot({ path: `test-results/companion-management-${testInfo.project.name}.png`, fullPage: false });
  const storedBeforeRun = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}'));
  expect(storedBeforeRun.activeId).toBe('shield');
  expect(storedBeforeRun.companions.shield.level).toBe(2);
  await page.getByRole('button', { name: /Zurück|Back/i }).click({ force: true });
  await expect(management).toBeHidden();
  await expect(page.getByRole('heading', { name: 'DUNGEON VEIL' })).toBeVisible({ timeout: 60_000 });
  await armCompanionActionObservation(page);
  const basicEvidenceEpoch = await page.evaluate(() => performance.now());
  await startFreshRun(page);
  const chip = page.getByTestId('run-companion-chip');
  const runtime = page.getByTestId('companion-runtime-bridge');
  const scene = page.getByTestId('run-companion-scene');
  await waitForStableRoom(page);
  await captureLiveCompanionFeedbackEvidence(page, {
    role: 'shield',
    critical: false,
    notBefore: basicEvidenceEpoch,
    marker: /◆\s*-\d+/,
    path: `test-results/companion-damage-feedback-${testInfo.project.name}.png`,
  });
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('data-presentation', 'read-only-companion-status');
  await expect(chip).toHaveAttribute('data-companion-role', 'shield');
  await expect(chip).toHaveAttribute('data-companion-species', 'rune-sentinel');
  await expect(chip).toHaveAttribute('data-companion-level', '2');
  expect(await chip.evaluate(element => element.tagName)).toBe('DIV');
  await expect(runtime).toHaveAttribute('data-role', 'shield');
  await expect(runtime).toHaveAttribute('data-level', '2');
  await expect(runtime).toHaveAttribute('data-species', 'rune-sentinel');
  await expect(runtime).toHaveAttribute('data-basic-attacks', 'true');
  await expect(runtime).toHaveAttribute('data-selection', 'pre-run-frozen');
  await expect(runtime).toHaveAttribute('data-ai-hz', '10');
  await expect(runtime).toHaveAttribute('data-revive-target', 'false');
  await expect.poll(async () => Number(await runtime.getAttribute('data-basic-attack-count') || 0), { timeout: 20_000 }).toBeGreaterThan(0);
  await expect(scene).toHaveAttribute('data-scene-hook', 'object3d-add');
  await expect(scene).toHaveAttribute('data-model-source', 'procedural-distinct-companion-v5');
  await expect(scene).toHaveAttribute('data-animation-source', 'articulated-locomotion-and-attacks');
  await expect(scene).toHaveAttribute('data-selection-surface', 'pre-run-only');
  await expect(scene).toHaveAttribute('data-local-species', 'rune-sentinel');
  await expect(scene).toHaveAttribute('data-local-level', '2');
  await expect(scene).toHaveAttribute('data-follow-placement', 'inward-side');
  await expect(scene).toHaveAttribute('data-shared-renderer', 'true');
  await expect(scene).toHaveAttribute('data-extra-canvas', 'false');
  await expect(scene).toHaveAttribute('data-scene-captured', 'true', { timeout: 60_000 });
  await expect(scene).toHaveAttribute('data-loaded-count', '1', { timeout: 60_000 });
  await expect(scene).toHaveAttribute('data-visible-count', '1', { timeout: 60_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({ path: `test-results/companion-run-${testInfo.project.name}.png`, fullPage: false });
  await chip.click({ force: true });
  await page.waitForTimeout(500);
  await expect(chip).toHaveAttribute('data-companion-role', 'shield');
  await expect(runtime).toHaveAttribute('data-role', 'shield');
  await expect(scene).toHaveAttribute('data-local-role', 'shield');
  const storedAfterClick = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}'));
  expect(storedAfterClick.activeId).toBe('shield');
  expect(storedAfterClick.companions.shield.level).toBe(2);
  const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, bodyWidth: document.body.scrollWidth, documentWidth: document.documentElement.scrollWidth }));
  expect(Math.max(geometry.bodyWidth, geometry.documentWidth)).toBeLessThanOrEqual(geometry.innerWidth + 4);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

test('critical-support proc renders one readable value on its actual target', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /companion|lynx|raven|sentinel|wisp|drake|TypeError|ReferenceError|Cannot read/i.test(message.text())) runtimeErrors.push(message.text()); });
  await openMenu(page, testInfo.project.name, { activeId: 'critical-support', companions: { 'critical-support': { level: 2, unlockedAt: 1 } } });
  await armCompanionActionObservation(page);
  await startFreshRun(page);
  const runtime = page.getByTestId('companion-runtime-bridge');
  await expect(runtime).toHaveAttribute('data-role', 'critical-support');
  await waitForStableRoom(page);
  await prepareLivePlayerAttackLine(page);
  const attackIssuedAt = await page.evaluate(() => performance.now());
  const capturePromise = captureLiveCompanionFeedbackEvidence(page, {
    role: 'critical-support',
    critical: true,
    notBefore: attackIssuedAt,
    marker: /✦\s*-\d+/,
    path: `test-results/companion-damage-feedback-critical-${testInfo.project.name}.png`,
  });
  await page.waitForTimeout(2_700);
  const [confirmedPlayerAttackAt, observedCritical] = await Promise.all([
    triggerConfirmedPlayerAttack(page, attackIssuedAt),
    capturePromise,
  ]);
  expect(confirmedPlayerAttackAt).toBeGreaterThanOrEqual(attackIssuedAt);
  expect(observedCritical.at).toBeGreaterThanOrEqual(attackIssuedAt);
  const chip = page.getByTestId('run-companion-chip');
  await expect(runtime).toHaveAttribute('data-level', '2');
  await expect(runtime).toHaveAttribute('data-basic-attacks', 'true');
  await expect(chip).toHaveAttribute('data-companion-role', 'critical-support');
  await expect(chip).toHaveAttribute('data-companion-level', '2');
  const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, bodyWidth: document.body.scrollWidth, documentWidth: document.documentElement.scrollWidth }));
  expect(Math.max(geometry.bodyWidth, geometry.documentWidth)).toBeLessThanOrEqual(geometry.innerWidth + 4);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});
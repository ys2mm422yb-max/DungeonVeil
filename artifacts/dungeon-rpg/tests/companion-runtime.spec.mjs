import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';
const COMPANION_ACTION_LOG = '__dungeonVeilCompanionActionLog';
const COMPANION_ACTION_SNAPSHOTS = '__dungeonVeilCompanionActionSnapshots';
const COMPANION_ACTION_LISTENER = '__dungeonVeilCompanionActionListenerInstalled';
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
  await page.addInitScript(({ ipad, initialCompanionState }) => {
    localStorage.clear();
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
  }, { ipad: projectName.includes('ipad'), initialCompanionState: companionState });
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

async function triggerConfirmedPlayerAttack(page) {
  const attackIssuedAt = await page.evaluate(() => performance.now());
  const inputBurst = 6;
  for (let attempt = 0; attempt < inputBurst; attempt += 1) {
    await page.keyboard.press('Space');
    if (attempt < inputBurst - 1) await page.waitForTimeout(240);
  }
  return attackIssuedAt;
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
  await page.evaluate(({ eventName, logKey, snapshotKey, listenerKey }) => {
    const scope = window;
    scope[logKey] = [];
    scope[snapshotKey] = [];
    if (scope[listenerKey]) return;
    scope[listenerKey] = true;
    let captureUntil = 0;
    let captureFrameScheduled = false;
    const captureRenderedFeedback = () => {
      const log = scope[logKey] || [];
      const snapshots = scope[snapshotKey] || [];
      const layer = document.querySelector('[data-testid="companion-damage-feedback-layer"]');
      const nodes = [...document.querySelectorAll('[data-testid^="companion-damage-number-"]')];
      for (const node of nodes) {
        const entry = [...log].reverse().find(candidate => candidate.role === node.dataset.companionRole && candidate.targetId === node.dataset.targetId);
        if (!entry) continue;
        const feedbackId = node.getAttribute('data-testid') || '';
        if (snapshots.some(snapshot => snapshot.feedbackId === feedbackId && snapshot.at === entry.at)) continue;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) <= 0) continue;
        snapshots.push(Object.freeze({ ...entry, feedbackId, feedbackRole: node.dataset.companionRole || '', feedbackTargetId: node.dataset.targetId || '', critical: node.dataset.critical || '', text: node.textContent || '', width: rect.width, height: rect.height, fontSize: Number.parseFloat(style.fontSize), pointerEvents: style.pointerEvents, visibleCount: layer?.getAttribute('data-visible-count') || '' }));
        if (snapshots.length > 16) snapshots.splice(0, snapshots.length - 16);
      }
    };
    const scheduleRenderedFeedbackCapture = () => {
      if (captureFrameScheduled || performance.now() >= captureUntil) return;
      captureFrameScheduled = true;
      requestAnimationFrame(() => {
        captureFrameScheduled = false;
        captureRenderedFeedback();
        scheduleRenderedFeedbackCapture();
      });
    };
    new MutationObserver(() => {
      captureRenderedFeedback();
      scheduleRenderedFeedbackCapture();
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-visible-count'] });
    window.addEventListener(eventName, event => {
      const detail = event.detail;
      if (!detail || detail.kind !== 'attack' || !detail.targetId) return;
      const log = scope[logKey];
      log.push({ role: detail.role, kind: detail.kind, targetId: detail.targetId, at: detail.at });
      if (log.length > 16) log.splice(0, log.length - 16);
      captureUntil = Math.max(captureUntil, performance.now() + 1_200);
      queueMicrotask(() => {
        captureRenderedFeedback();
        scheduleRenderedFeedbackCapture();
      });
    });
  }, { eventName: COMPANION_ACTION_EVENT, logKey: COMPANION_ACTION_LOG, snapshotKey: COMPANION_ACTION_SNAPSHOTS, listenerKey: COMPANION_ACTION_LISTENER });
}

async function waitForCorrelatedCompanionFeedback(page, role, expectedCritical = false, notBefore = 0) {
  const handle = await page.waitForFunction(({ snapshotKey, expectedRole, critical, minimumAt }) => {
    const snapshots = window[snapshotKey] || [];
    for (let index = snapshots.length - 1; index >= 0; index -= 1) {
      const snapshot = snapshots[index];
      if (snapshot.role === expectedRole && snapshot.kind === 'attack' && snapshot.targetId && snapshot.at >= minimumAt && snapshot.feedbackRole === expectedRole && snapshot.feedbackTargetId === snapshot.targetId && snapshot.critical === String(critical)) return snapshot;
    }
    return false;
  }, { snapshotKey: COMPANION_ACTION_SNAPSHOTS, expectedRole: role, critical: expectedCritical, minimumAt: notBefore }, { timeout: 20_000 });
  return handle.jsonValue();
}

function assertReadableFeedback(observedFeedback, { role, critical, marker }) {
  expect(observedFeedback).toBeTruthy();
  expect(observedFeedback.feedbackId).toMatch(/^companion-damage-number-/);
  expect(observedFeedback.feedbackRole).toBe(role);
  expect(observedFeedback.feedbackTargetId).toBe(observedFeedback.targetId);
  expect(observedFeedback.critical).toBe(String(critical));
  expect(observedFeedback.text).toMatch(marker);
  expect(observedFeedback.visibleCount).toBe('1');
  expect(observedFeedback.width).toBeGreaterThanOrEqual(82);
  expect(observedFeedback.height).toBeGreaterThanOrEqual(38);
  expect(observedFeedback.fontSize).toBeGreaterThanOrEqual(21);
  expect(observedFeedback.pointerEvents).toBe('none');
}

async function captureCorrelatedCompanionFeedbackEvidence(page, observedFeedback, path) {
  const feedback = page.getByTestId(observedFeedback.feedbackId);
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('data-companion-role', observedFeedback.feedbackRole);
  await expect(feedback).toHaveAttribute('data-target-id', observedFeedback.targetId);
  await expect(feedback).toHaveAttribute('data-critical', observedFeedback.critical);
  await page.screenshot({ path, fullPage: false });
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
  await expect(page.getByTestId('companion-role-distraction')).toHaveAttribute('data-unlocked', 'false');
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
  await startFreshRun(page);
  const chip = page.getByTestId('run-companion-chip');
  const runtime = page.getByTestId('companion-runtime-bridge');
  const scene = page.getByTestId('run-companion-scene');
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
  await waitForStableRoom(page);
  const basicEvidenceEpoch = await page.evaluate(() => performance.now());
  const observedFeedback = await waitForCorrelatedCompanionFeedback(page, 'shield', false, basicEvidenceEpoch);
  assertReadableFeedback(observedFeedback, { role: 'shield', critical: false, marker: /◆\s*-\d+/ });
  await captureCorrelatedCompanionFeedbackEvidence(page, observedFeedback, `test-results/companion-damage-feedback-${testInfo.project.name}.png`);
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
  const attackIssuedAt = await triggerConfirmedPlayerAttack(page);
  const chip = page.getByTestId('run-companion-chip');
  await expect(runtime).toHaveAttribute('data-level', '2');
  await expect(runtime).toHaveAttribute('data-basic-attacks', 'true');
  await expect(chip).toHaveAttribute('data-companion-role', 'critical-support');
  await expect(chip).toHaveAttribute('data-companion-level', '2');
  const observedCritical = await waitForCorrelatedCompanionFeedback(page, 'critical-support', true, attackIssuedAt);
  assertReadableFeedback(observedCritical, { role: 'critical-support', critical: true, marker: /✦\s*-\d+/ });
  await captureCorrelatedCompanionFeedbackEvidence(page, observedCritical, `test-results/companion-damage-feedback-critical-${testInfo.project.name}.png`);
  const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, bodyWidth: document.body.scrollWidth, documentWidth: document.documentElement.scrollWidth }));
  expect(Math.max(geometry.bodyWidth, geometry.documentWidth)).toBeLessThanOrEqual(geometry.innerWidth + 4);
  expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
});

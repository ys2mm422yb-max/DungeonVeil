import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function monitorRuntime(page) {
  const issues = [];
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*(?:401|403)/i.test(text)) return;
    issues.push(`console: ${text}`);
  });
  return issues;
}

async function seedQuestBoardState(page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('dungeon-veil-quest-board-evidence-seeded-v1') === '1') return;
    localStorage.clear();
    sessionStorage.clear();

    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const stats = {
      runsStarted: 50,
      roomsCleared: 1000,
      enemiesDefeated: 5000,
      bossesDefeated: 100,
      totalDamage: 500000,
      itemsFound: 120,
      questsCompleted: 100,
      playTimeMs: 259200000,
      highestChapter: 10,
      highestRoom: 100,
    };

    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'standard', textSize: 'standard', updatedAt: Date.now() }));
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      relics: ['ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core'],
      announcedRelics: ['ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core'],
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 20,
      xp: 420,
      dust: 9876,
      gold: 54321,
      owned: {},
      equipped: {},
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-retention-v2', JSON.stringify({
      currencyVersion: 2,
      sigils: 0,
      daily: {
        date: dateKey,
        selected: ['rooms-15', 'kills-80', 'rooms-25-gold'],
        progress: { rooms: 25, kills: 42, hunts: 0, fireKills: 0, frostKills: 0, highHpRooms: 0, bossKills: 0, deepestRoom: 0, rankTwoGifts: 0, relicFinds: 0 },
        claimed: ['rooms-15'],
      },
      codex: { enemies: [], bosses: [], hunts: [], relics: [] },
    }));
    localStorage.setItem('dungeon-veil-player-profile-v1', JSON.stringify({
      version: 1,
      selectedTitle: 'world-savior',
      selectedCard: 'worldboss',
      selectedAvatar: 'worldboss-seal',
      stats,
      updatedAt: Date.now(),
    }));
    localStorage.setItem('dungeon-veil-weekly-elite-v1', JSON.stringify({
      version: 1,
      weekKey,
      baseline: { enemiesDefeated: 0, roomsCleared: 0, bossesDefeated: 0, totalDamage: 0, runsStarted: 0, questsCompleted: 0 },
      claimedQuestIds: [],
      ownedRewardIds: [],
      eliteMarks: 0,
    }));
    localStorage.removeItem('dungeon-veil-active-session-v1');
    localStorage.setItem('dungeon-veil-quest-board-evidence-seeded-v1', '1');
  });
}

async function gotoMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
}

async function openQuestBoard(page) {
  await page.getByTestId('npc-questmaster').tap();
  await expect(page.getByTestId('daily-quest-panel')).toBeVisible();
  await expect(page.getByTestId('quest-board-content')).toBeVisible();
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="daily-quest-panel"]');
    const content = document.querySelector('[data-testid="quest-board-content"]');
    return {
      document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      panel: panel ? panel.scrollWidth - panel.clientWidth : 999,
      content: content ? content.scrollWidth - content.clientWidth : 999,
    };
  });
  expect(overflow.document).toBeLessThanOrEqual(4);
  expect(overflow.panel).toBeLessThanOrEqual(2);
  expect(overflow.content).toBeLessThanOrEqual(2);
}

async function assertTouchTarget(locator, minimum = 44) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeGreaterThanOrEqual(minimum);
}

async function capture(page, state, projectName) {
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: `test-results/autopilot-quest-board-${state}-${projectName}.png`, fullPage: false });
}

test('quest board is touch-safe, readable and claim-idempotent on portrait mobile', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const issues = monitorRuntime(page);
  await seedQuestBoardState(page);
  await gotoMenu(page);
  await openQuestBoard(page);

  const boardToggle = page.getByTestId('quest-board-toggle');
  const completedToggle = page.getByTestId('quest-completed-toggle');
  await expect(boardToggle).toHaveAttribute('aria-expanded', 'true');
  await assertTouchTarget(boardToggle, 48);
  await expect(page.getByTestId('quest-active-section')).toBeVisible();
  await expect(page.getByTestId('quest-gold-section')).toBeVisible();
  await expect(page.getByTestId('quest-elite-section')).toBeVisible();
  await expect(page.getByTestId('daily-quest-reset-timer')).toContainText(/Neu in/i);
  await capture(page, 'open', testInfo.project.name);

  await boardToggle.tap();
  await expect(page.getByTestId('quest-board-content')).toHaveCount(0);
  await expect(boardToggle).toHaveAttribute('aria-expanded', 'false');
  await boardToggle.tap();
  await expect(page.getByTestId('quest-board-content')).toBeVisible();

  await completedToggle.scrollIntoViewIfNeeded();
  await assertTouchTarget(completedToggle);
  await completedToggle.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await expect(completedToggle).toHaveAttribute('aria-expanded', 'false');
  await completedToggle.dispatchEvent('pointercancel', { pointerType: 'touch', isPrimary: true });
  await completedToggle.tap();
  await expect(completedToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('quest-completed-card')).toHaveCount(1);
  await capture(page, 'completed-open', testInfo.project.name);

  const firstClaim = page.getByTestId('weekly-elite-claim').filter({ hasText: /Belohnung abholen/i }).first();
  await firstClaim.scrollIntoViewIfNeeded();
  await expect(firstClaim).toBeEnabled();
  await assertTouchTarget(firstClaim);

  const beforePointerDown = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-weekly-elite-v1') || '{}'));
  await firstClaim.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await firstClaim.dispatchEvent('pointercancel', { pointerType: 'touch', isPrimary: true });
  const afterPointerCancel = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-weekly-elite-v1') || '{}'));
  expect(afterPointerCancel.claimedQuestIds).toEqual(beforePointerDown.claimedQuestIds);
  expect(afterPointerCancel.eliteMarks).toBe(beforePointerDown.eliteMarks);

  await firstClaim.tap();
  await expect(firstClaim).toBeDisabled();
  await expect(firstClaim).toContainText(/Belohnung erhalten/i);
  const afterClaim = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-weekly-elite-v1') || '{}'));
  expect(afterClaim.claimedQuestIds).toHaveLength(1);
  expect(afterClaim.eliteMarks).toBe(1);
  await capture(page, 'elite-claimed', testInfo.project.name);

  await page.reload({ waitUntil: 'domcontentloaded' });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await openQuestBoard(page);
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-weekly-elite-v1') || '{}'));
  expect(persisted.claimedQuestIds).toHaveLength(1);
  expect(persisted.eliteMarks).toBe(1);
  await page.getByTestId('quest-elite-section').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('weekly-elite-claim').filter({ hasText: /Belohnung erhalten/i })).toHaveCount(1);
  await capture(page, 'reload-persisted', testInfo.project.name);

  expect(issues, issues.join('\n')).toEqual([]);
});

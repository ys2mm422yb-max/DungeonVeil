import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const SUPABASE_REST = 'https://hfndwqfghyomwapqsked.supabase.co/rest/v1/';

function qaUrl(mode) {
  const url = new URL(APP_URL);
  url.searchParams.set('visualQa', mode);
  return url.toString();
}

function runtimeMonitor(page) {
  const issues = [];
  const appOrigin = new URL(APP_URL).origin;
  page.__dungeonVeilIntentionalNavigation = false;
  const intentionallyNavigating = () => page.__dungeonVeilIntentionalNavigation === true;
  page.on('pageerror', error => {
    if (!intentionallyNavigating()) issues.push(`pageerror: ${error.message}`);
  });
  page.on('console', message => {
    if (message.type() !== 'error' || intentionallyNavigating()) return;
    const text = message.text();
    if (/favicon|supabase.*(?:401|403)/i.test(text)) return;
    issues.push(`console: ${text}`);
  });
  page.on('request', request => {
    if (/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/i.test(request.url())) {
      issues.push(`external runtime request: ${request.url()}`);
    }
  });
  page.on('response', response => {
    if (intentionallyNavigating()) return;
    if (response.url().startsWith(appOrigin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

async function seedBaseState(page, { signedIn = false } = {}) {
  await page.addInitScript(({ online }) => {
    localStorage.clear();
    sessionStorage.clear();
    const now = Date.now();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'standard', textSize: 'standard', updatedAt: now }));
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
      dust: 999999,
      gold: 999999,
      owned: {
        'ash-bow': { level: 1, copies: 99 },
        'ranger-quiver': { level: 1, copies: 99 },
        'ranger-cloak': { level: 1, copies: 99 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-optional-equipment-v1', JSON.stringify({ version: 1, equipped: { quiver: true } }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: 'single-target',
      companions: {
        'single-target': { level: 1, unlockedAt: now },
        'critical-support': { level: 1, unlockedAt: now },
        shield: { level: 1, unlockedAt: now },
        'loot-comfort': { level: 1, unlockedAt: now },
        distraction: { level: 1, unlockedAt: now },
      },
      updatedAt: now,
    }));
    localStorage.setItem('dungeon-veil-relics-v2', JSON.stringify({
      version: 2,
      owned: ['ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core'],
      equipped: 'marked-claw',
      consumedHeartRuns: [],
      activatedWorldCoreRuns: [],
      relicMisses: { hunt: 0, boss: 0 },
      crownRunStacks: {},
    }));
    localStorage.setItem('dungeon-veil-player-profile-v1', JSON.stringify({
      version: 1,
      selectedTitle: 'world-savior',
      selectedCard: 'worldboss',
      selectedAvatar: 'worldboss-seal',
      stats: { runsStarted: 44, roomsCleared: 420, enemiesDefeated: 2200, bossesDefeated: 52, totalDamage: 180000, itemsFound: 85, questsCompleted: 31, playTimeMs: 259200000, highestChapter: 10, highestRoom: 50 },
      updatedAt: now,
    }));
    localStorage.removeItem('dungeon-veil-active-session-v1');
    if (online) {
      localStorage.setItem('dungeon-veil-supabase-session-v1', JSON.stringify({
        access_token: 'qa-access-token',
        refresh_token: 'qa-refresh-token',
        expires_at: 4102444800,
        token_type: 'bearer',
        user: { id: 'qa-owner', email: 'qa@dungeonveil.invalid' },
      }));
    }
  }, { online: signedIn });
}

async function installSocialMocks(page) {
  const guild = { id: 'qa-guild', name: 'Hüter des Schleiers', tag: 'VEIL', description: 'Gemeinsam durchbrechen wir den Schleier.', owner_id: 'qa-owner' };
  const profiles = [
    { id: 'qa-owner', display_name: 'Maxi', avatar_key: 'ranger', last_active_at: new Date().toISOString() },
    { id: 'qa-officer', display_name: 'Nyra', avatar_key: 'veil', last_active_at: new Date(Date.now() - 90_000).toISOString() },
    { id: 'qa-member', display_name: 'Torven', avatar_key: 'guardian', last_active_at: new Date(Date.now() - 22 * 60_000).toISOString() },
    { id: 'qa-away', display_name: 'Liora', avatar_key: 'ember', last_active_at: new Date(Date.now() - 28 * 60 * 60_000).toISOString() },
  ];
  const members = [
    { user_id: 'qa-owner', role: 'owner', joined_at: '2026-06-12T18:00:00.000Z' },
    { user_id: 'qa-officer', role: 'officer', joined_at: '2026-06-18T19:30:00.000Z' },
    { user_id: 'qa-member', role: 'member', joined_at: '2026-07-02T20:10:00.000Z' },
    { user_id: 'qa-away', role: 'member', joined_at: '2026-07-08T11:20:00.000Z' },
  ];
  const messages = [
    { id: 'qa-chat-3', guild_id: guild.id, user_id: 'qa-member', body: 'Bin dabei. Meine Rüstung ist jetzt Stufe 4.', created_at: '2026-07-21T12:08:00.000Z' },
    { id: 'qa-chat-2', guild_id: guild.id, user_id: 'qa-owner', body: 'Ich starte danach einen Duo-Run.', created_at: '2026-07-21T12:07:00.000Z' },
    { id: 'qa-chat-1', guild_id: guild.id, user_id: 'qa-officer', body: 'Raum 30 ist frei.', created_at: '2026-07-21T12:05:00.000Z' },
  ];

  await page.route(`${SUPABASE_REST}**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const resource = url.pathname.split('/').pop() || '';
    const select = url.searchParams.get('select') || '';
    let body = [];
    if (resource === 'guild_members' && url.searchParams.has('user_id')) body = [{ role: 'owner', guilds: guild }];
    else if (resource === 'guild_members' && url.searchParams.has('guild_id')) body = members;
    else if (resource === 'guild_invites') body = [];
    else if (resource === 'guild_messages') body = request.method() === 'GET' ? messages : null;
    else if (resource === 'profiles' && select.includes('last_active_at')) body = profiles.map(({ id, last_active_at }) => ({ id, last_active_at }));
    else if (resource === 'profiles') body = profiles;
    else if (resource.startsWith('rpc')) body = [];
    await route.fulfill({
      status: request.method() === 'POST' && resource === 'guild_messages' ? 204 : 200,
      contentType: 'application/json',
      body: body === null ? '' : JSON.stringify(body),
    });
  });
}

async function gotoMenu(page, url = APP_URL) {
  page.__dungeonVeilIntentionalNavigation = true;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const boot = page.getByTestId('app-boot-loading-screen');
    if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
    await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
    const liveScene = page.getByTestId('live-hybrid-main-menu-scene');
    if (await liveScene.count()) {
      await expect.poll(
        () => liveScene.getAttribute('data-ranger-loaded'),
        { timeout: 60_000, intervals: [100, 200, 350, 500, 750, 1_000] },
      ).toBe('true');
      await expect.poll(
        async () => Number(await liveScene.getAttribute('data-animation-frames') || 0),
        { timeout: 20_000, intervals: [100, 200, 350, 500, 750] },
      ).toBeGreaterThan(0);
    }
  } finally {
    page.__dungeonVeilIntentionalNavigation = false;
  }
}

async function pointer(locator) {
  await expect(locator).toBeVisible({ timeout: 30_000 });
  await locator.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0, isPrimary: true });
}

async function capture(page, name, projectName) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
  await page.screenshot({ path: `test-results/autopilot-${name}-${projectName}.png`, fullPage: false });
}

async function closeStandardOverlay(page) {
  const close = page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).last();
  await pointer(close);
}

test('signed-out hub, solo run and duo entry remain functional', async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  const issues = runtimeMonitor(page);
  await seedBaseState(page);
  await gotoMenu(page);
  await capture(page, 'signed-out-main-menu', testInfo.project.name);

  await pointer(page.getByTestId('npc-guildmaster'));
  await expect(page.getByTestId('guild-signed-out-panel')).toBeVisible();
  await capture(page, 'signed-out-guild', testInfo.project.name);
  await pointer(page.getByTestId('guild-close-button'));

  await pointer(page.getByTestId('npc-postmaster'));
  await expect(page.getByTestId('mailbox-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  await capture(page, 'signed-out-mailbox', testInfo.project.name);
  await closeStandardOverlay(page);

  await pointer(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await expect(page.getByText(/Spielmodus wählen|Choose game mode/i)).toBeVisible();
  await capture(page, 'play-mode-picker', testInfo.project.name);
  await pointer(page.getByRole('button', { name: /Duo-Run|Duo Run/i }));
  await expect(page.getByTestId('coop-lobby-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: /Online & Cloud/i })).toBeVisible();
  await capture(page, 'signed-out-duo', testInfo.project.name);

  await gotoMenu(page);
  await pointer(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await pointer(page.getByRole('button', { name: /Solo-Run|Solo Run/i }));
  const runHud = page.getByTestId('run-hud');
  const namePrompt = page.getByTestId('run-name-prompt');
  await expect(namePrompt.or(runHud).first()).toBeVisible({ timeout: 60_000 });
  if (await namePrompt.isVisible()) {
    const nameInput = page.getByTestId('run-name-input');
    const confirmName = page.getByTestId('run-name-confirm');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Autopilot Ranger');
    await expect(confirmName).toBeEnabled();
    await pointer(confirmName);
  }
  await expect(runHud).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('run-joystick')).toBeVisible();
  await capture(page, 'solo-run-started', testInfo.project.name);
  expect(issues, issues.join('\n')).toEqual([]);
});

test('equipment, relic and companion upgrades and optional slots persist', async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  const issues = runtimeMonitor(page);
  await seedBaseState(page);
  await gotoMenu(page);
  await pointer(page.getByTestId('main-menu-equipment-navigation').getByRole('button'));
  await expect(page.getByTestId('equipment-category-tabs')).toBeVisible({ timeout: 60_000 });

  const assertLocalPreview = async kind => {
    const preview = page.getByTestId('equipment-model-preview');
    await expect(preview).toHaveAttribute('data-three-runtime', 'local-pinned');
    await expect(preview).toHaveAttribute('data-equipment-preview-kind', kind);
  };

  const upgradeEquipment = async (tab, id, kind) => {
    await page.getByTestId(`inventory-tab-${tab}`).click();
    await assertLocalPreview(kind);
    const before = await page.evaluate(itemId => JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}').owned?.[itemId]?.level ?? 0, id);
    await page.getByTestId('equipment-upgrade-button').click();
    await expect.poll(() => page.evaluate(itemId => JSON.parse(localStorage.getItem('dungeon-veil-meta') || '{}').owned?.[itemId]?.level ?? 0, id)).toBe(before + 1);
    await capture(page, `${tab}-upgraded`, testInfo.project.name);
  };

  await upgradeEquipment('bow', 'ash-bow', 'bow');
  await upgradeEquipment('armor', 'ranger-cloak', 'armor');

  await page.getByTestId('inventory-tab-quiver').click();
  await assertLocalPreview('quiver');
  await expect(page.getByTestId('equipment-unequip-button')).toBeVisible();
  await pointer(page.getByTestId('equipment-unequip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-optional-equipment-v1') || '{}').equipped?.quiver)).toBe(false);
  await capture(page, 'quiver-unequipped', testInfo.project.name);
  await pointer(page.getByTestId('equipment-equip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-optional-equipment-v1') || '{}').equipped?.quiver)).toBe(true);

  await page.getByTestId('inventory-tab-relic').click();
  await pointer(page.getByTestId('relic-unequip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-relics-v2') || '{}').equipped ?? null)).toBeNull();
  await capture(page, 'relic-unequipped', testInfo.project.name);
  await pointer(page.getByTestId('relic-equip-button'));

  await page.getByTestId('inventory-tab-companion').click();
  const activeCard = page.getByTestId('companion-role-single-target');
  const beforeCompanion = await page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}').companions?.['single-target']?.level ?? 0);
  await activeCard.getByRole('button', { name: /VERBESSERN|UPGRADE/i }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-companion-collection-v5') || '{}').companions?.['single-target']?.level ?? 0)).toBe(beforeCompanion + 1);
  await capture(page, 'companion-upgraded', testInfo.project.name);
  await pointer(page.getByTestId('companion-unequip-button'));
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'none');
  const alternate = page.getByTestId('companion-role-critical-support');
  await alternate.getByRole('button', { name: /AUSWÄHLEN|SELECT/i }).click();
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'critical-support');
  await capture(page, 'companion-reselected', testInfo.project.name);
  expect(issues, issues.join('\n')).toEqual([]);
});

test('signed-in guild, mailbox and duo controls are reviewable', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const issues = runtimeMonitor(page);
  await installSocialMocks(page);
  await seedBaseState(page, { signedIn: true });
  await gotoMenu(page, qaUrl('filled-social'));

  await pointer(page.getByTestId('npc-guildmaster'));
  await expect(page.getByTestId('guild-panel-shell')).toBeVisible();
  await capture(page, 'signed-in-guild-overview', testInfo.project.name);
  await page.getByRole('button', { name: /^Chat$/i }).click();
  await capture(page, 'signed-in-guild-chat', testInfo.project.name);
  await page.getByRole('button', { name: /Mitglieder|Members/i }).click();
  await capture(page, 'signed-in-guild-members', testInfo.project.name);
  await page.getByRole('button', { name: /Einladen|Invite/i }).click();
  await capture(page, 'signed-in-guild-invite', testInfo.project.name);
  await page.getByRole('button', { name: /Gilde schließen|Close guild/i }).click();

  await pointer(page.getByTestId('npc-postmaster'));
  await expect(page.getByTestId('mailbox-message-card')).toHaveCount(4);
  await capture(page, 'signed-in-mailbox', testInfo.project.name);
  await page.getByTestId('mailbox-delete-qa-completed-message').click();
  await expect(page.getByTestId('mailbox-message-card')).toHaveCount(3);
  await capture(page, 'signed-in-mailbox-deleted', testInfo.project.name);
  await closeStandardOverlay(page);

  await pointer(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await pointer(page.getByRole('button', { name: /Duo-Run|Duo Run/i }));
  await expect(page.getByTestId('coop-create-lobby')).toBeVisible();
  await expect(page.getByTestId('coop-join-lobby')).toBeVisible();
  await capture(page, 'signed-in-duo-controls', testInfo.project.name);
  expect(issues, issues.join('\n')).toEqual([]);
});

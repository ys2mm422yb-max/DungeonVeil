import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const SUPABASE_REST = 'https://hfndwqfghyomwapqsked.supabase.co/rest/v1/';

function qaUrl(mode) {
  const url = new URL(APP_URL);
  url.searchParams.set('visualQa', mode);
  return url.toString();
}

function attachRuntimeMonitor(page) {
  const issues = [];
  const origin = new URL(APP_URL).origin;
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon/i.test(text)) return;
    issues.push(`console: ${text}`);
  });
  page.on('response', response => {
    if (response.url().startsWith(origin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

function neutralSocialCard(id, displayName, avatarKey, guildName = null, guildTag = null) {
  return {
    id,
    display_name: displayName,
    avatar_key: avatarKey,
    friend_code: `DV-${id.replace('qa-', '').toUpperCase()}`,
    current_chapter: 1,
    current_rank: 1,
    character_key: 'archer',
    last_active_at: new Date().toISOString(),
    guild_name: guildName,
    guild_tag: guildTag,
    joined_at: '2026-06-01T10:00:00.000Z',
    account_level: 1,
    lifetime_world_boss_damage: 0,
    world_boss_events: 0,
    friend_count: 1,
    achievement_keys: [],
    activity_state: 'menu',
    activity_chapter: 1,
    activity_room: 1,
    highest_chapter: 1,
    highest_room: 1,
    rooms_cleared: 0,
    enemies_defeated: 0,
    bosses_defeated: 0,
    quests_completed: 0,
    play_time_ms: 0,
    total_damage: 0,
    items_found: 0,
    equipped_items: [],
  };
}

async function installGuildApiMocks(page, observedProfileIds = new Set()) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': new URL(APP_URL).origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    Vary: 'Origin',
  };
  const guild = {
    id: 'qa-guild',
    name: 'Hüter des Schleiers',
    tag: 'VEIL',
    description: 'Gemeinsam durchbrechen wir den Schleier. Aktive Runs, faire Beute und Hilfe für neue Waldläufer.',
    owner_id: 'qa-owner',
  };
  const profiles = [
    { id: 'qa-owner', display_name: 'Maxi', avatar_key: 'ranger', created_at: '2026-06-01T10:00:00.000Z', updated_at: '2026-07-21T12:00:00.000Z', last_active_at: new Date().toISOString() },
    { id: 'qa-officer', display_name: 'Nyra', avatar_key: 'veil', created_at: '2026-06-02T10:00:00.000Z', updated_at: '2026-07-21T12:00:00.000Z', last_active_at: new Date(Date.now() - 90_000).toISOString() },
    { id: 'qa-member', display_name: 'Torven', avatar_key: 'guardian', created_at: '2026-06-03T10:00:00.000Z', updated_at: '2026-07-21T12:00:00.000Z', last_active_at: new Date(Date.now() - 22 * 60_000).toISOString() },
    { id: 'qa-away', display_name: 'Liora', avatar_key: 'ember', created_at: '2026-06-04T10:00:00.000Z', updated_at: '2026-07-21T12:00:00.000Z', last_active_at: new Date(Date.now() - 28 * 60 * 60_000).toISOString() },
  ];
  const members = [
    { user_id: 'qa-owner', role: 'owner', joined_at: '2026-06-12T18:00:00.000Z' },
    { user_id: 'qa-officer', role: 'officer', joined_at: '2026-06-18T19:30:00.000Z' },
    { user_id: 'qa-member', role: 'member', joined_at: '2026-07-02T20:10:00.000Z' },
    { user_id: 'qa-away', role: 'member', joined_at: '2026-07-08T11:20:00.000Z' },
  ];
  const messages = [
    { id: 'qa-chat-3', guild_id: guild.id, user_id: 'qa-member', body: 'Bin dabei. Meine Rüstung ist jetzt Stufe 4.', created_at: '2026-07-21T12:08:00.000Z' },
    { id: 'qa-chat-2', guild_id: guild.id, user_id: 'qa-owner', body: 'Ich starte danach einen Duo-Run. Einladung kommt gleich.', created_at: '2026-07-21T12:07:00.000Z' },
    { id: 'qa-chat-1', guild_id: guild.id, user_id: 'qa-officer', body: 'Raum 30 ist frei. Wer braucht noch den Wächter?', created_at: '2026-07-21T12:05:00.000Z' },
  ];

  await page.route(`${SUPABASE_REST}**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const url = new URL(request.url());
    const resource = url.pathname.split('/').pop() || '';
    const select = url.searchParams.get('select') || '';
    let status = 200;
    let body = [];
    let requestBody = {};
    if (request.method() === 'POST' && request.postData()) {
      try {
        requestBody = request.postDataJSON();
      } catch {
        requestBody = {};
      }
    }

    if (resource === 'get_my_social_profile') {
      body = [{
        id: 'qa-owner',
        display_name: 'Maxi',
        avatar_key: 'ranger',
        friend_code: 'DV-MAXI',
        current_chapter: 1,
        current_rank: 1,
        character_key: 'archer',
        last_active_at: new Date().toISOString(),
      }];
    } else if (resource === 'list_friends_v2') {
      body = [{
        user_id: 'qa-member',
        display_name: 'Torven',
        avatar_key: 'guardian',
        friend_code: 'DV-TORVEN',
        current_chapter: 1,
        current_rank: 1,
        character_key: 'archer',
        friends_since: '2026-07-02T20:10:00.000Z',
        last_active_at: new Date().toISOString(),
      }];
    } else if (resource === 'list_friend_requests' || resource === 'list_friend_requests_v2') {
      body = [];
    } else if (resource === 'get_social_profile_card') {
      const requestedId = requestBody?.p_user_id;
      observedProfileIds.add(requestedId);
      const cards = {
        'qa-owner': neutralSocialCard('qa-owner', 'Maxi', 'ranger', guild.name, guild.tag),
        'qa-member': neutralSocialCard('qa-member', 'Torven', 'guardian', guild.name, guild.tag),
        'qa-officer': neutralSocialCard('qa-officer', 'Nyra', 'veil', guild.name, guild.tag),
      };
      body = [cards[requestedId] ?? neutralSocialCard(requestedId || 'qa-missing', 'Unbekannt', 'ranger')];
    } else if (resource === 'guild_members' && url.searchParams.has('user_id')) {
      body = [{ role: 'owner', guilds: guild }];
    } else if (resource === 'guild_members' && url.searchParams.has('guild_id')) {
      body = members;
    } else if (resource === 'guild_invites') {
      body = [];
    } else if (resource === 'guild_messages') {
      if (request.method() === 'GET') body = messages;
      else {
        status = 204;
        body = null;
      }
    } else if (resource === 'upsert_guarded_game_save') {
      body = { accepted: true, payload: null };
    } else if (resource === 'profiles' && request.method() === 'PATCH' && request.headers().prefer?.includes('return=minimal')) {
      status = 204;
      body = null;
    } else if (resource === 'profiles' && select.includes('last_active_at')) {
      body = profiles.map(({ id, last_active_at }) => ({ id, last_active_at }));
    } else if (resource === 'profiles') {
      body = profiles;
    } else if (url.pathname.includes('/rpc/')) {
      body = [];
    }

    await route.fulfill(body === null
      ? { status, headers: corsHeaders }
      : { status, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function seedUxState(page, projectName) {
  await page.addInitScript(({ ipad }) => {
    localStorage.clear();
    sessionStorage.clear();
    const now = Date.now();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'standard', textSize: 'standard', updatedAt: now }));
    localStorage.setItem('dungeon-veil-supabase-session-v1', JSON.stringify({
      access_token: 'qa-access-token',
      refresh_token: 'qa-refresh-token',
      expires_at: 4102444800,
      token_type: 'bearer',
      user: { id: 'qa-owner', email: 'qa@dungeonveil.invalid' },
    }));
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({ version: 2, initialized: true, equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'], relics: ['ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core'], announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'], announcedRelics: ['ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core'] }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 20,
      xp: 420,
      dust: 9840,
      gold: 24850,
      owned: {
        'ash-bow': { level: 4, copies: 4 },
        'ranger-quiver': { level: 3, copies: 3 },
        'ranger-cloak': { level: 4, copies: 3 },
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
        'single-target': { level: 4, unlockedAt: now },
        'critical-support': { level: 3, unlockedAt: now },
        shield: { level: 3, unlockedAt: now },
        'loot-comfort': { level: 2, unlockedAt: now },
        distraction: { level: 2, unlockedAt: now },
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
      stats: { runsStarted: 44, roomsCleared: 420, enemiesDefeated: 2200, bossesDefeated: 52, totalDamage: 180000, itemsFound: 85, questsCompleted: 31, playTimeMs: 72 * 3600000, highestChapter: 10, highestRoom: 50 },
      updatedAt: now,
    }));
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, { ipad: projectName.includes('ipad') });
}

async function gotoMenu(page, projectName) {
  await installGuildApiMocks(page);
  await seedUxState(page, projectName);
  await page.goto(qaUrl('filled-social'), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
}

async function gotoSocialMenu(page, projectName, observedProfileIds) {
  await installGuildApiMocks(page, observedProfileIds);
  await seedUxState(page, projectName);
  const url = new URL(APP_URL);
  url.searchParams.delete('visualQa');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 20_000 });
}

async function pointer(locator) {
  await expect(locator).toBeVisible({ timeout: 30_000 });
  await locator.tap();
}

async function capture(page, name, projectName) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(4);
  await page.screenshot({ path: `test-results/${name}-${projectName}.png`, fullPage: false });
}

async function closeStandardOverlay(page) {
  const close = page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).last();
  await pointer(close);
}

async function captureNeutralSocialProfile(page, kind, projectName, expectedName) {
  const card = page.getByTestId('player-profile-card');
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('public-player-profile-header')).toContainText(expectedName);
  await expect(card).toContainText(/Rang\s*1|Rank\s*1/i);
  const progress = page.getByTestId('public-player-profile-best-progress');
  await expect(progress).toContainText(/Kapitel\s*1|Chapter\s*1/i);
  await expect(progress).toContainText(/Raum\s*1|Room\s*1/i);
  await expect(page.getByTestId('public-player-profile-cosmetics')).toBeVisible();
  await capture(page, `visual-social-trust-${kind}-identity-progress`, projectName);

  const equipment = page.getByTestId('public-player-profile-equipment');
  await equipment.scrollIntoViewIfNeeded();
  await expect(equipment).toContainText('0/3');
  for (const slot of ['bow', 'quiver', 'armor']) {
    await expect(page.getByTestId(`public-player-profile-equipment-slot-${slot}`)).toHaveAttribute('data-equipped', 'false');
  }
  const achievements = page.getByTestId('public-player-profile-achievements');
  await achievements.scrollIntoViewIfNeeded();
  await expect(achievements).toContainText(/Noch keine öffentlichen Erfolge|No public achievements/i);
  await capture(page, `visual-social-trust-${kind}-neutral-loadout`, projectName);
}

test('filled guild, mailbox, shop and options views are functional and reviewable', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await gotoMenu(page, testInfo.project.name);

  await pointer(page.getByTestId('main-menu-gold-button'));
  const goldShop = page.getByTestId('main-menu-shop-panel');
  await expect(goldShop).toBeVisible();
  await expect(page.getByTestId('main-menu-shop-gold-balance')).toContainText('24.850');
  await expect(page.getByTestId('main-menu-shop-dust-balance')).toContainText('9.840');
  const [goldBox, shopBox] = await Promise.all([page.getByTestId('main-menu-gold-button').boundingBox(), goldShop.boundingBox()]);
  expect(goldBox).not.toBeNull();
  expect(shopBox).not.toBeNull();
  expect(shopBox.y).toBeGreaterThanOrEqual(goldBox.y + goldBox.height - 2);
  expect(Math.abs((shopBox.x + shopBox.width) - (page.viewportSize().width - 12))).toBeLessThanOrEqual(6);
  await capture(page, 'visual-shop-gold', testInfo.project.name);
  await pointer(page.getByRole('button', { name: /Shop schließen|Close shop/i }));

  await pointer(page.getByTestId('main-menu-dust-button'));
  await expect(page.getByTestId('main-menu-shop-panel')).toBeVisible();
  await expect(page.getByTestId('main-menu-options-panel')).toHaveCount(0);
  await capture(page, 'visual-shop-dust', testInfo.project.name);
  await pointer(page.getByRole('button', { name: /Shop schließen|Close shop/i }));

  await pointer(page.getByTestId('main-menu-settings-button'));
  await expect(page.getByTestId('main-menu-options-panel')).toBeVisible();
  await expect(page.getByText('Online & Cloud', { exact: true })).toBeVisible();
  await expect(page.getByText(/Tutorial wiederholen|Replay tutorial/i)).toBeVisible();
  await expect(page.getByTestId('main-menu-shop-panel')).toHaveCount(0);
  await capture(page, 'visual-options-menu', testInfo.project.name);
  await pointer(page.getByRole('button', { name: /Optionsmenü schließen|Close options menu/i }));

  await pointer(page.getByTestId('npc-postmaster'));
  await expect(page.getByTestId('mailbox-panel')).toBeVisible();
  await expect(page.getByTestId('mailbox-message-card')).toHaveCount(4);
  await capture(page, 'visual-mailbox-filled', testInfo.project.name);
  await page.getByTestId('mailbox-delete-qa-completed-message').click();
  await expect(page.getByTestId('mailbox-message-card')).toHaveCount(3);
  await capture(page, 'visual-mailbox-after-delete', testInfo.project.name);
  await closeStandardOverlay(page);

  await pointer(page.getByTestId('npc-guildmaster'));
  await expect(page.getByTestId('guild-panel-shell')).toBeVisible();
  await expect(page.getByTestId('guild-overview-tab')).toBeVisible({ timeout: 30_000 });
  await capture(page, 'visual-guild-overview-filled', testInfo.project.name);

  await page.getByRole('button', { name: /^Chat$/i }).click();
  await expect(page.getByTestId('guild-chat-message')).toHaveCount(3, { timeout: 30_000 });
  await capture(page, 'visual-guild-chat-filled', testInfo.project.name);

  await page.getByRole('button', { name: /Mitglieder|Members/i }).click();
  await expect(page.getByTestId('guild-member-card')).toHaveCount(4, { timeout: 30_000 });
  await capture(page, 'visual-guild-members-filled', testInfo.project.name);

  await page.getByRole('button', { name: /Einladen|Invite/i }).click();
  await expect(page.getByTestId('guild-invite-link-card')).toBeVisible();
  await capture(page, 'visual-guild-invite-filled', testInfo.project.name);
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

test('profile cosmetics and optional equipment can be inspected and unequipped', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await gotoMenu(page, testInfo.project.name);

  await pointer(page.getByTestId('main-menu-profile-badge'));
  await expect(page.getByTestId('player-profile-panel')).toBeVisible();
  await capture(page, 'visual-profile-refined-overview', testInfo.project.name);
  for (const [label, suffix] of [['Titel', 'titles'], ['Visitenkarten', 'cards'], ['Avatare', 'avatars']]) {
    await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
    await capture(page, `visual-profile-refined-${suffix}`, testInfo.project.name);
  }
  await page.getByRole('button', { name: /Profil schließen|Close profile/i }).click();

  await pointer(page.getByTestId('main-menu-equipment-navigation').getByRole('button'));
  await expect(page.getByTestId('equipment-category-tabs')).toBeVisible();
  await page.getByTestId('inventory-tab-quiver').click();
  await expect(page.getByTestId('equipment-unequip-button')).toBeVisible();
  await capture(page, 'visual-equipment-quiver-equipped', testInfo.project.name);
  await pointer(page.getByTestId('equipment-unequip-button'));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dungeon-veil-optional-equipment-v1') || '{}').equipped?.quiver)).toBe(false);
  await capture(page, 'visual-equipment-quiver-unequipped', testInfo.project.name);

  await page.getByTestId('inventory-tab-relic').click();
  await expect(page.getByTestId('relic-unequip-button')).toBeVisible();
  await pointer(page.getByTestId('relic-unequip-button'));
  await expect(page.getByTestId('relic-active-badge')).toHaveCount(0);
  await capture(page, 'visual-equipment-relic-unequipped', testInfo.project.name);

  await page.getByTestId('inventory-tab-companion').click();
  await expect(page.getByTestId('companion-unequip-button')).toBeVisible();
  await pointer(page.getByTestId('companion-unequip-button'));
  await expect(page.getByTestId('companion-active-role')).toHaveAttribute('data-companion-role', 'none');
  await capture(page, 'visual-equipment-companion-unequipped', testInfo.project.name);
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});


test('neutral server social projection is visible for self, friend and guild peer', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  const observedProfileIds = new Set();
  await gotoSocialMenu(page, testInfo.project.name, observedProfileIds);

  await pointer(page.getByTestId('npc-scout'));
  await expect(page.getByTestId('friends-panel')).toBeVisible({ timeout: 30_000 });
  await pointer(page.getByTestId('friends-self-profile').getByRole('button').first());
  await captureNeutralSocialProfile(page, 'self', testInfo.project.name, 'Maxi');
  await pointer(page.getByTestId('public-player-profile-close'));

  await pointer(page.getByTestId('friend-card').filter({ hasText: 'Torven' }).getByTestId('friend-profile-button'));
  await captureNeutralSocialProfile(page, 'friend', testInfo.project.name, 'Torven');
  await pointer(page.getByTestId('public-player-profile-close'));

  await pointer(page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).last());
  await expect(page.getByTestId('friends-panel')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible({ timeout: 30_000 });

  await pointer(page.getByTestId('npc-guildmaster'));
  await expect(page.getByTestId('guild-panel-shell')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Mitglieder|Members/i }).click();
  await expect(page.getByTestId('guild-member-card')).toHaveCount(4, { timeout: 30_000 });
  await pointer(page.getByTestId('guild-member-profile-button').filter({ hasText: 'Nyra' }).first());
  await captureNeutralSocialProfile(page, 'guild-peer', testInfo.project.name, 'Nyra');

  expect([...observedProfileIds].sort()).toEqual(['qa-member', 'qa-officer', 'qa-owner']);
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

test('actual equipment and relic drops render together in one local Three canvas', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  await page.goto(qaUrl('loot'), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const host = page.getByTestId('loot-visual-qa-host');
  await expect(host).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
  await expect(host).toHaveAttribute('data-actual-model-count', '4');
  await expect(page.locator('canvas')).toHaveCount(1);
  await waitForPaintedCanvas(page, page.getByTestId('loot-visual-qa-canvas'));
  await page.waitForTimeout(1_200);
  await capture(page, 'visual-loot-actual-models', testInfo.project.name);
  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const SUPABASE_REST = 'https://hfndwqfghyomwapqsked.supabase.co/rest/v1/';

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('visualQa', 'filled-social');
  return url.toString();
}

function monitorRuntime(page) {
  const issues = [];
  const origin = new URL(APP_URL).origin;
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|websocket|realtime/i.test(text)) return;
    issues.push(`console: ${text}`);
  });
  page.on('response', response => {
    if (response.url().startsWith(origin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

function makeRaidController(currentUserId, withIncoming = false) {
  const guild = { id: 'qa-guild', name: 'Hüter des Schleiers', tag: 'VEIL', description: 'Vier Plätze. Ein Schwur.', owner_id: 'qa-owner' };
  const profiles = [
    { id: 'qa-owner', display_name: 'Maxi', avatar_key: 'ranger', created_at: '2026-06-01T10:00:00.000Z', updated_at: '2026-07-26T08:00:00.000Z', last_active_at: new Date().toISOString() },
    { id: 'qa-officer', display_name: 'Nyra', avatar_key: 'veil', created_at: '2026-06-02T10:00:00.000Z', updated_at: '2026-07-26T08:00:00.000Z', last_active_at: new Date().toISOString() },
    { id: 'qa-member', display_name: 'Torven', avatar_key: 'guardian', created_at: '2026-06-03T10:00:00.000Z', updated_at: '2026-07-26T08:00:00.000Z', last_active_at: new Date().toISOString() },
    { id: 'qa-away', display_name: 'Liora', avatar_key: 'ember', created_at: '2026-06-04T10:00:00.000Z', updated_at: '2026-07-26T08:00:00.000Z', last_active_at: new Date().toISOString() },
  ];
  const guildMembers = [
    { user_id: 'qa-owner', role: 'owner', joined_at: '2026-06-01T10:00:00.000Z' },
    { user_id: 'qa-officer', role: 'officer', joined_at: '2026-06-02T10:00:00.000Z' },
    { user_id: 'qa-member', role: 'member', joined_at: '2026-06-03T10:00:00.000Z' },
    { user_id: 'qa-away', role: 'member', joined_at: '2026-06-04T10:00:00.000Z' },
  ];
  const state = {
    currentUserId,
    version: 1,
    status: 'forming',
    leaderUserId: 'qa-owner',
    runId: null,
    members: withIncoming ? [{ userId: 'qa-owner', slot: 1, ready: false }] : [],
    invitations: [],
    incoming: withIncoming ? [{ invitationId: 'qa-incoming', lobbyId: 'qa-raid-lobby', guildId: guild.id, guildName: guild.name, guildTag: guild.tag, leaderUserId: 'qa-owner', leaderName: 'Maxi', expiresAt: new Date(Date.now() + 25 * 60_000).toISOString() }] : [],
    startCount: 0,
  };
  const profile = id => profiles.find(item => item.id === id);
  const guildRole = id => guildMembers.find(item => item.user_id === id)?.role ?? 'member';
  const bump = () => { state.version += 1; };
  const resetReady = () => { state.members.forEach(member => { member.ready = false; }); state.status = 'forming'; };
  const snapshot = () => {
    if (!state.members.some(member => member.userId === state.currentUserId)) return null;
    const readyCount = state.members.filter(member => member.ready).length;
    return {
      lobbyId: 'qa-raid-lobby', guildId: guild.id, guildName: guild.name, guildTag: guild.tag,
      leaderUserId: state.leaderUserId, status: state.status, raidRunId: state.runId, version: state.version,
      expiresAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(), serverNow: new Date().toISOString(),
      viewerUserId: state.currentUserId, viewerIsLeader: state.currentUserId === state.leaderUserId,
      memberCount: state.members.length, readyCount,
      canStart: state.currentUserId === state.leaderUserId && state.members.length === 4 && readyCount === 4 && state.status === 'ready',
      members: state.members.map(member => ({
        userId: member.userId, slot: member.slot, status: member.ready ? 'ready' : 'joined', ready: member.ready,
        joinedAt: '2026-07-26T08:00:00.000Z', displayName: profile(member.userId)?.display_name ?? 'Abenteurer',
        avatarKey: profile(member.userId)?.avatar_key ?? null, guildRole: guildRole(member.userId), isLeader: member.userId === state.leaderUserId,
      })),
      invitations: state.invitations.map(invitation => ({
        invitationId: invitation.id, targetUserId: invitation.userId,
        displayName: profile(invitation.userId)?.display_name ?? 'Abenteurer', avatarKey: profile(invitation.userId)?.avatar_key ?? null,
        status: 'pending', expiresAt: new Date(Date.now() + 25 * 60_000).toISOString(),
      })),
    };
  };
  return {
    guild, profiles, guildMembers, state, snapshot,
    fillLobby() {
      state.members = [
        { userId: 'qa-owner', slot: 1, ready: false }, { userId: 'qa-officer', slot: 2, ready: false },
        { userId: 'qa-member', slot: 3, ready: false }, { userId: 'qa-away', slot: 4, ready: false },
      ];
      state.invitations = [];
      resetReady();
      bump();
    },
    readyOthers() {
      state.members.filter(member => member.userId !== state.currentUserId).forEach(member => { member.ready = true; });
      state.status = state.members.length === 4 && state.members.every(member => member.ready) ? 'ready' : 'forming';
      bump();
    },
    handleRpc(name, body) {
      if (name === 'guild_raid_get_snapshot') return snapshot();
      if (name === 'guild_raid_list_my_invitations') return state.incoming;
      if (name === 'guild_raid_create_lobby') {
        if (!state.members.some(member => member.userId === state.currentUserId)) state.members = [{ userId: state.currentUserId, slot: 1, ready: false }];
        state.leaderUserId = state.currentUserId; state.status = 'forming'; bump(); return snapshot();
      }
      if (name === 'guild_raid_invite_member') {
        const userId = String(body.p_target_user_id);
        if (!state.invitations.some(invitation => invitation.userId === userId)) state.invitations.push({ id: `invite-${userId}`, userId });
        resetReady(); bump(); return snapshot();
      }
      if (name === 'guild_raid_cancel_invite') { state.invitations = state.invitations.filter(invitation => invitation.id !== body.p_invitation_id); bump(); return snapshot(); }
      if (name === 'guild_raid_respond_invite') {
        const accept = Boolean(body.p_accept); state.incoming = [];
        if (!accept) return { accepted: false, lobbyId: 'qa-raid-lobby' };
        if (!state.members.some(member => member.userId === state.currentUserId)) {
          const used = new Set(state.members.map(member => member.slot));
          state.members.push({ userId: state.currentUserId, slot: [1, 2, 3, 4].find(candidate => !used.has(candidate)), ready: false });
        }
        resetReady(); bump(); return snapshot();
      }
      if (name === 'guild_raid_set_ready') {
        const member = state.members.find(item => item.userId === state.currentUserId);
        if (member) member.ready = Boolean(body.p_ready);
        state.status = state.members.length === 4 && state.members.every(item => item.ready) ? 'ready' : 'forming'; bump(); return snapshot();
      }
      if (name === 'guild_raid_remove_member') { state.members = state.members.filter(member => member.userId !== body.p_target_user_id); resetReady(); bump(); return snapshot(); }
      if (name === 'guild_raid_leave_lobby') {
        state.members = state.members.filter(member => member.userId !== state.currentUserId);
        let newLeaderUserId = null;
        if (state.currentUserId === state.leaderUserId && state.members.length) { state.members.sort((a, b) => a.slot - b.slot); state.leaderUserId = state.members[0].userId; newLeaderUserId = state.leaderUserId; }
        resetReady(); bump(); return { left: true, lobbyId: 'qa-raid-lobby', dissolved: state.members.length === 0, newLeaderUserId, leaderRule: 'lowest_occupied_slot' };
      }
      if (name === 'guild_raid_dissolve_lobby') { state.members = []; state.invitations = []; state.status = 'dissolved'; bump(); return { dissolved: true }; }
      if (name === 'guild_raid_start') {
        if (!state.runId) { state.runId = 'qa-raid-run-exactly-once'; state.status = 'started'; state.startCount += 1; bump(); }
        return snapshot();
      }
      return [];
    },
  };
}

async function installApiMocks(page, controller) {
  await page.route(`${SUPABASE_REST}**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const resource = url.pathname.split('/').pop() || '';
    const select = url.searchParams.get('select') || '';
    let body = [];
    if (resource === 'guild_members' && url.searchParams.has('user_id')) body = [{ role: controller.state.currentUserId === 'qa-owner' ? 'owner' : 'officer', guilds: controller.guild }];
    else if (resource === 'guild_members' && url.searchParams.has('guild_id')) body = controller.guildMembers;
    else if (resource === 'guild_invites' || resource === 'guild_messages') body = [];
    else if (resource === 'profiles' && select.includes('last_active_at')) body = controller.profiles.map(({ id, last_active_at }) => ({ id, last_active_at }));
    else if (resource === 'profiles') body = controller.profiles;
    else if (url.pathname.includes('/rpc/')) {
      let requestBody = {};
      try { requestBody = request.postDataJSON() ?? {}; } catch {}
      body = controller.handleRpc(resource, requestBody);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function seedState(page, userId) {
  await page.addInitScript(({ userId }) => {
    localStorage.clear(); sessionStorage.clear(); const now = Date.now();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({ version: 2, contrast: 'standard', textSize: 'standard', updatedAt: now }));
    localStorage.setItem('dungeon-veil-supabase-session-v1', JSON.stringify({ access_token: 'qa-access-token', refresh_token: 'qa-refresh-token', expires_at: 4102444800, token_type: 'bearer', user: { id: userId, email: `${userId}@dungeonveil.invalid` } }));
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({ version: 2, initialized: true, equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'], relics: ['ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core'], announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'], announcedRelics: ['ash-eye', 'marked-claw', 'night-hunt-sigil', 'veil-heart', 'broken-guardian-crown', 'depth-rune-shard', 'world-core'] }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({ version: 4, rank: 20, xp: 420, dust: 9840, gold: 24850, owned: {}, equipped: {}, rewardLedger: [], currentRunId: '' }));
    class FakeWebSocket {
      static OPEN = 1;
      constructor() { this.readyState = 0; this.closed = false; setTimeout(() => { if (!this.closed) { this.readyState = 1; this.onopen?.({}); } }, 0); }
      send(raw) { const message = JSON.parse(raw); if (message.event === 'phx_join') setTimeout(() => this.onmessage?.({ data: JSON.stringify({ topic: message.topic, event: 'phx_reply', payload: { status: 'ok', response: { postgres_changes: [{ id: 1 }] } }, ref: message.ref, join_ref: message.join_ref }) }), 0); }
      close() { this.closed = true; this.readyState = 3; }
    }
    Object.defineProperty(window, 'WebSocket', { configurable: true, writable: true, value: FakeWebSocket });
  }, { userId });
}

async function gotoGuildRaid(page, controller) {
  await installApiMocks(page, controller);
  await seedState(page, controller.state.currentUserId);
  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-profile-badge')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('npc-guildmaster').tap();
  await expect(page.getByTestId('guild-panel-shell')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('guild-raid-entry').tap();
  await expect(page.getByTestId('guild-raid-lobby-panel')).toBeVisible({ timeout: 30_000 });
}

async function capture(page, state, projectName) {
  const overflow = await page.evaluate(() => ({
    document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
    panel: (() => { const node = document.querySelector('[data-testid="guild-raid-lobby-panel"]'); return node ? node.scrollWidth - node.clientWidth : 999; })(),
  }));
  expect(overflow.document).toBeLessThanOrEqual(4);
  expect(overflow.panel).toBeLessThanOrEqual(2);
  await page.screenshot({ path: `test-results/autopilot-guild-raid-${state}-${projectName}.png`, fullPage: false });
}

async function assertTouchTarget(locator, minimum = 44) {
  await expect(locator).toBeVisible();
  const height = await locator.evaluate(element => element.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(minimum);
}

test('leader forms four-player guild raid lobby and creates one server run', async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const issues = monitorRuntime(page);
  const controller = makeRaidController('qa-owner');
  await gotoGuildRaid(page, controller);
  await expect(page.getByTestId('guild-raid-create')).toBeVisible();
  await assertTouchTarget(page.getByTestId('guild-raid-create'), 48);
  await capture(page, 'empty', testInfo.project.name);
  await page.getByTestId('guild-raid-create').tap();
  await expect(page.getByTestId('guild-raid-slot-1')).toContainText('Maxi');
  await expect(page.getByTestId('guild-raid-slots').locator('article')).toHaveCount(4);

  for (let index = 0; index < 3; index += 1) {
    const invite = page.getByTestId('guild-raid-invite-member').first();
    await assertTouchTarget(invite);
    await invite.tap();
    await expect(page.getByTestId('guild-raid-pending-invite')).toHaveCount(index + 1);
  }
  await capture(page, 'invites-pending', testInfo.project.name);

  controller.fillLobby();
  await page.getByTestId('guild-raid-refresh').tap();
  await expect(page.getByTestId('guild-raid-summary')).toContainText('4/4');
  await page.getByTestId('guild-raid-ready-toggle').tap();
  controller.readyOthers();
  await page.getByTestId('guild-raid-refresh').tap();
  await expect(page.getByTestId('guild-raid-summary')).toContainText('4/4');
  const start = page.getByTestId('guild-raid-start');
  await expect(start).toBeEnabled();
  await assertTouchTarget(start, 48);
  await capture(page, 'four-ready', testInfo.project.name);
  await start.tap();
  await expect(page.getByTestId('guild-raid-started-handoff')).toContainText('qa-raid-run-exactly-once');
  expect(controller.state.startCount).toBe(1);
  await capture(page, 'started', testInfo.project.name);

  await page.reload({ waitUntil: 'domcontentloaded' });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await page.getByTestId('npc-guildmaster').tap();
  await page.getByTestId('guild-raid-entry').tap();
  await expect(page.getByTestId('guild-raid-started-handoff')).toContainText('qa-raid-run-exactly-once');
  expect(controller.state.startCount).toBe(1);

  const portrait = page.viewportSize();
  await page.setViewportSize({ width: Math.max(portrait.width, portrait.height), height: Math.min(portrait.width, portrait.height) });
  await expect(page.getByTestId('guild-raid-landscape-blocker')).toBeVisible();
  await capture(page, 'landscape-blocked', testInfo.project.name);
  await page.setViewportSize(portrait);
  await expect(page.getByTestId('guild-raid-landscape-blocker')).toHaveCount(0);
  await expect(page.getByTestId('guild-raid-started-handoff')).toContainText('qa-raid-run-exactly-once');
  expect(issues, issues.join('\n')).toEqual([]);
});

test('invited non-leader can accept but cannot use leader controls', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const issues = monitorRuntime(page);
  const controller = makeRaidController('qa-officer', true);
  await gotoGuildRaid(page, controller);
  await expect(page.getByTestId('guild-raid-incoming-invitations')).toBeVisible();
  await capture(page, 'incoming-invite', testInfo.project.name);
  const accept = page.getByTestId('guild-raid-invite-accept');
  await assertTouchTarget(accept);
  await accept.tap();
  await expect(page.getByTestId('guild-raid-slot-2')).toContainText('Nyra');
  await expect(page.getByTestId('guild-raid-invite-section')).toHaveCount(0);
  await expect(page.getByTestId('guild-raid-dissolve')).toHaveCount(0);
  await expect(page.getByTestId('guild-raid-start')).toBeDisabled();
  await capture(page, 'nonleader-joined', testInfo.project.name);
  expect(issues, issues.join('\n')).toEqual([]);
});

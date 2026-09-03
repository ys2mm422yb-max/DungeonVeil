import { writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const SUPABASE_REST = 'https://hfndwqfghyomwapqsked.supabase.co/rest/v1/';
const RUNTIME_EVIDENCE_MARKER = 'dungeon-veil-runtime-evidence-v1';
const POST_DEATH_ATTACK_BLOCK_WINDOW_MS = 750;
const DUO_LOBBY_ID = 'qa-duo-lobby';
const DUO_RUN_SEED = 424242;
const DUO_PARTNER_ID = 'qa-partner';
const DUO_REVIVE_HOLD_OBSERVATION_MS = 3_200;
const DUO_MOCK_PRESENCE_HEARTBEAT_MS = 500;
const DUO_TEAM_DEFEAT_VIDEO_HOLD_MS = 1_000;

test.use({ video: 'on' });

async function pressPointerUi(locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

async function openMenu(page, projectName, { language = 'de', signedIn = false } = {}) {
  await page.addInitScript(({ ipad, runtimeEvidenceMarker, selectedLanguage, online }) => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem(runtimeEvidenceMarker, '1');
    localStorage.setItem('dungeon-veil-language', selectedLanguage);
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    if (online) {
      localStorage.setItem('dungeon-veil-supabase-session-v1', JSON.stringify({
        access_token: 'qa-access-token',
        refresh_token: 'qa-refresh-token',
        expires_at: 4102444800,
        token_type: 'bearer',
        user: { id: 'qa-owner', email: 'qa@dungeonveil.invalid' },
      }));
    }
    if (ipad) Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  }, {
    ipad: projectName.includes('ipad'),
    runtimeEvidenceMarker: RUNTIME_EVIDENCE_MARKER,
    selectedLanguage: language,
    online: signedIn,
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

async function installDuoProductHarness(page) {
  let created = false;
  let hostReady = false;
  let started = false;
  let remoteSequence = 0;
  const harnessOpenedAt = Date.now();
  const harnessIsoAt = (offsetMs = 0) => new Date(harnessOpenedAt + offsetMs).toISOString();
  const freshNowIso = () => new Date().toISOString();
  const harness = {
    joinedSockets: new Set(),
    localPresence: null,
    reviveConfirms: [],
    revivedPresence: null,
    downedHeartbeat: null,
  };

  const lobby = () => ({
    lobby_id: DUO_LOBBY_ID,
    invite_code: 'QA4242',
    status: started ? 'in_run' : hostReady ? 'ready' : 'waiting',
    run_seed: DUO_RUN_SEED,
    role: 'host',
    ready: hostReady,
    host_user_id: 'qa-owner',
    created_at: harnessIsoAt(-60_000),
    expires_at: harnessIsoAt(4 * 60 * 60_000),
    started_at: started ? harnessIsoAt() : null,
    server_now: freshNowIso(),
  });

  const members = () => [
    {
      user_id: 'qa-owner',
      role: 'host',
      ready: hostReady,
      display_name: 'Ranger QA',
      avatar_key: 'ranger',
      joined_at: harnessIsoAt(-60_000),
      last_seen_at: freshNowIso(),
    },
    {
      user_id: DUO_PARTNER_ID,
      role: 'guest',
      ready: true,
      display_name: 'Nyra',
      avatar_key: 'veil',
      joined_at: harnessIsoAt(-55_000),
      last_seen_at: freshNowIso(),
    },
  ];

  await page.route(`${SUPABASE_REST}**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const rpcName = url.pathname.includes('/rpc/') ? url.pathname.split('/rpc/')[1] : '';
    let body = [];

    if (rpcName === 'get_my_coop_lobby') body = created ? [lobby()] : [];
    else if (rpcName === 'create_coop_lobby') {
      created = true;
      body = [lobby()];
    } else if (rpcName === 'list_my_coop_lobby_members') body = created ? members() : [];
    else if (rpcName === 'list_coop_invite_candidates') body = [];
    else if (rpcName === 'set_coop_lobby_ready') {
      hostReady = Boolean(JSON.parse(request.postData() || '{}').p_ready);
      body = [lobby()];
    } else if (rpcName === 'start_coop_lobby') {
      started = true;
      body = [lobby()];
    } else if (rpcName === 'get_my_coop_run_checkpoint') body = [];
    else if (rpcName === 'save_my_coop_run_checkpoint') body = [{ run_attempt: 1, revision: 1, updated_at: new Date().toISOString() }];
    else if (rpcName === 'list_my_pending_coop_room_rewards') body = [];
    else if (rpcName === 'get_my_coop_room_reward_state') body = [];
    else if (rpcName === 'prepare_coop_room_rewards') body = 0;
    else if (rpcName === 'heartbeat_coop_lobby' || rpcName === 'leave_coop_lobby' || rpcName === 'ack_coop_room_reward') body = true;

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  const stopDownedHeartbeat = () => {
    if (!harness.downedHeartbeat) return;
    clearInterval(harness.downedHeartbeat);
    harness.downedHeartbeat = null;
  };

  await page.routeWebSocket('**/realtime/v1/websocket**', socket => {
    socket.onMessage(message => {
      let parsed;
      try { parsed = JSON.parse(String(message)); }
      catch { return; }
      if (parsed.event === 'phx_join') {
        if (parsed.topic === `realtime:duo-run:${DUO_LOBBY_ID}`) harness.joinedSockets.add(socket);
        socket.send(JSON.stringify({
          topic: parsed.topic,
          event: 'phx_reply',
          payload: { status: 'ok', response: {} },
          ref: parsed.ref,
        }));
        return;
      }
      if (parsed.event === 'phx_leave') {
        harness.joinedSockets.delete(socket);
        return;
      }
      if (parsed.event !== 'broadcast') return;
      if (parsed.payload?.event === 'player_state') harness.localPresence = parsed.payload.payload;
      if (parsed.payload?.event === 'revive_confirm') {
        const confirm = parsed.payload.payload;
        harness.reviveConfirms.push(confirm);
        stopDownedHeartbeat();
        if (harness.reviveConfirms.length === 1 && confirm?.targetUserId === DUO_PARTNER_ID) {
          const maxHp = Math.max(1, Number(harness.localPresence?.maxHp) || 100);
          harness.revivedPresence = harness.sendRemotePresence({
            lifeState: 'alive',
            revivesUsed: 1,
            hp: Math.max(1, Math.ceil(maxHp * 0.35)),
          });
        }
      }
    });
  });

  harness.sendRemotePresence = ({ lifeState, revivesUsed, hp }) => {
    expect(harness.joinedSockets.size, 'Duo realtime mock must have at least one joined Duo socket').toBeGreaterThan(0);
    expect(harness.localPresence, 'Duo realtime mock must observe authoritative local presence before injecting a teammate').toBeTruthy();
    const local = harness.localPresence;
    const maxHp = Math.max(1, Number(local.maxHp) || 100);
    const payload = {
      version: 1,
      lobbyId: DUO_LOBBY_ID,
      runSeed: DUO_RUN_SEED,
      userId: DUO_PARTNER_ID,
      displayName: 'Nyra',
      chapter: Number(local.chapter) || 1,
      room: Number(local.room) || 1,
      x: Number(local.x) || 0,
      y: Number(local.y) || 0,
      facingX: 0,
      facingY: -1,
      state: 'idle',
      lifeState,
      revivesUsed,
      downedUntil: lifeState === 'downed' ? Date.now() + 20_000 : 0,
      hp: lifeState === 'alive' ? Math.max(1, hp ?? maxHp) : 0,
      maxHp,
      defense: 0,
      lastAttackTime: 0,
      lastDodgeTime: 0,
      sequence: ++remoteSequence,
      sentAt: Date.now(),
    };
    const message = JSON.stringify({
      topic: `realtime:duo-run:${DUO_LOBBY_ID}`,
      event: 'broadcast',
      payload: { type: 'broadcast', event: 'player_state', payload },
      ref: null,
    });
    for (const joinedSocket of harness.joinedSockets) joinedSocket.send(message);
    return payload;
  };

  harness.keepRemoteDownedFreshUntilRevived = () => {
    stopDownedHeartbeat();
    harness.sendRemotePresence({ lifeState: 'downed', revivesUsed: 0, hp: 0 });
    harness.downedHeartbeat = setInterval(() => {
      if (harness.reviveConfirms.length > 0) {
        stopDownedHeartbeat();
        return;
      }
      harness.sendRemotePresence({ lifeState: 'downed', revivesUsed: 0, hp: 0 });
    }, DUO_MOCK_PRESENCE_HEARTBEAT_MS);
    return stopDownedHeartbeat;
  };

  return harness;
}

async function startDuoRun(page) {
  await pressPointerUi(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await expect(page.getByText(/Spielmodus wählen|Choose game mode/i)).toBeVisible({ timeout: 20_000 });
  await pressPointerUi(page.getByRole('button', { name: /Duo-Run|Duo Run/i }));
  await expect(page.getByTestId('coop-create-lobby')).toBeVisible({ timeout: 20_000 });
  await pressPointerUi(page.getByTestId('coop-create-lobby'));
  await expect(page.getByTestId('coop-lobby-members')).toBeVisible({ timeout: 20_000 });
  await pressPointerUi(page.getByTestId('coop-ready-toggle'));
  await expect(page.getByTestId('coop-start-run')).toBeEnabled({ timeout: 20_000 });
  await pressPointerUi(page.getByTestId('coop-start-run'));
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 90_000 });
  const skipIntro = page.getByRole('button', { name: /ÜBERSPRINGEN|SKIP/i });
  if (await skipIntro.isVisible({ timeout: 8_000 }).catch(() => false)) await skipIntro.click({ force: true });
  await expect(skipIntro).toBeHidden({ timeout: 20_000 });
}

async function captureDuo(page, testInfo, language, state) {
  await page.screenshot({
    path: `test-results/autopilot-duo-${language}-${state}-${testInfo.project.name}.png`,
    fullPage: false,
  });
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
    const states = [];
    let settledAt = null;
    let finished = false;

    const recordState = (element) => {
      if (!(element instanceof HTMLElement) || element.dataset.testid !== 'game-over-screen') return;
      const state = element.getAttribute('data-death-sequence');
      if (state && states.at(-1) !== state) states.push(state);
      if (state === 'settled' && settledAt === null) settledAt = performance.now() - startedAt;
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
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-death-sequence'],
    });

    window.__dungeonVeilRuntimeEvidence.forcePlayerDeath();

    while (!finished) {
      const overlay = document.querySelector('[data-testid="game-over-screen"]');
      if (overlay instanceof HTMLElement) recordState(overlay);
      if (settledAt !== null) break;
      if (performance.now() - startedAt >= 2_000) {
        finished = true;
        break;
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    observer.disconnect();
    return {
      states,
      state: states.at(-1) ?? null,
      sawSettling: states.includes('settling'),
      elapsedMs: settledAt ?? performance.now() - startedAt,
    };
  });

  expect(deathSequenceObservation.sawSettling, 'death overlay must expose the explicit visual settling state before final defeat').toBe(true);
  expect(deathSequenceObservation.state, 'death overlay must transition from the visual death beat to a settled defeat state').toBe('settled');
  expect(deathSequenceObservation.elapsedMs, 'death overlay must settle within the unchanged 2 s acceptance window').toBeLessThanOrEqual(2_000);

  const overlay = page.getByTestId('game-over-screen');
  await expect(overlay).toBeVisible();

  const playerRenderer = page.locator('[data-player-death-state="active"]');
  await expect(playerRenderer, 'renderer must publish an active death-state instead of freezing in idle/run').toBeVisible({ timeout: 2_000 });

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
    deathSequenceStates: deathSequenceObservation.states,
    deathSequenceObservedMs: deathSequenceObservation.elapsedMs,
    rendererDeathState,
    postDeathAttackObservedMs: postDeathAttackAfterWindow.elapsedMs,
    postDeathAttackBlocked: true,
  }, null, 2));
  await page.screenshot({ path: testInfo.outputPath(`player-death-solo-${testInfo.project.name}.png`), fullPage: true });
});

test.describe('compact Duo lifecycle screenshots', () => {
  for (const language of ['de', 'en']) {
    test(`duo ${language} renders downed, revive, fallen and final team defeat through the real lifecycle bridge`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const harness = await installDuoProductHarness(page);
      await openMenu(page, testInfo.project.name, { language, signedIn: true });
      await startDuoRun(page);

      await expect.poll(() => Boolean(harness.localPresence), {
        timeout: 20_000,
        message: 'Duo run must publish authoritative local presence after the realtime join',
      }).toBe(true);

      harness.sendRemotePresence({ lifeState: 'downed', revivesUsed: 0, hp: 0 });
      const teammatePanel = page.getByTestId('coop-team-health-panel');
      await expect(teammatePanel).toHaveAttribute('data-life-state', 'downed', { timeout: 5_000 });
      await expect(page.getByTestId('coop-revive-proximity')).toHaveAttribute('data-in-range', 'true');
      const reviveControl = page.getByTestId('coop-revive-control');
      await expect(reviveControl).toBeVisible();
      await expect(teammatePanel).toContainText(language === 'de' ? 'NIEDERGESCHLAGEN' : 'DOWNED');
      await expect(reviveControl).toContainText(language === 'de' ? 'WIEDERBELEBEN HALTEN' : 'HOLD TO REVIVE');
      await captureDuo(page, testInfo, language, 'downed-revive-ready');

      harness.sendRemotePresence({ lifeState: 'downed', revivesUsed: 0, hp: 0 });
      await reviveControl.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, buttons: 1 });
      const stopKeepDownedFresh = harness.keepRemoteDownedFreshUntilRevived();
      await page.waitForTimeout(DUO_REVIVE_HOLD_OBSERVATION_MS);
      await expect(reviveControl, 'Completed full hold must consume the revive control before a release event can target it').toHaveCount(0);
      expect(harness.reviveConfirms, 'Host must publish exactly one authoritative revive confirmation after the full production hold').toHaveLength(1);
      expect(harness.reviveConfirms[0]?.targetUserId).toBe(DUO_PARTNER_ID);
      stopKeepDownedFresh();

      const maxHp = Math.max(1, Number(harness.localPresence?.maxHp) || 100);
      const revivedHp = Math.max(1, Math.ceil(maxHp * 0.35));
      expect(harness.revivedPresence, 'Mock peer must acknowledge the first authoritative revive confirmation immediately with fresh alive presence').toBeTruthy();
      expect(Number(harness.revivedPresence?.hp), 'Mock peer revive acknowledgement must use the exact production 35% HP contract').toBe(revivedHp);
      await expect(teammatePanel).toHaveAttribute('data-life-state', 'alive', { timeout: 5_000 });
      await expect(reviveControl).toHaveCount(0);
      await captureDuo(page, testInfo, language, 'revived-35-percent');

      harness.sendRemotePresence({ lifeState: 'fallen', revivesUsed: 1, hp: 0 });
      await expect(teammatePanel).toHaveAttribute('data-life-state', 'fallen', { timeout: 5_000 });
      await expect(teammatePanel).toContainText(language === 'de' ? 'GEFALLEN' : 'FALLEN');
      await expect(reviveControl).toHaveCount(0);
      await captureDuo(page, testInfo, language, 'fallen-revive-spent');

      const capability = await page.evaluate(() => ({
        forcePlayerDeath: typeof window.__dungeonVeilRuntimeEvidence?.forcePlayerDeath === 'function',
      }));
      expect(capability.forcePlayerDeath, 'Duo evidence must use the real lethal runtime transition for the local player').toBe(true);
      await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.forcePlayerDeath());

      const teamDefeat = page.getByTestId('coop-team-game-over');
      await expect(teamDefeat).toBeVisible({ timeout: 5_000 });
      await expect(teamDefeat).toContainText(language === 'de' ? 'BEIDE GEFALLEN' : 'BOTH HAVE FALLEN');
      const retry = page.getByTestId('coop-team-retry');
      await expect(retry).toBeVisible();
      await expect(retry).toContainText(language === 'de' ? 'GEMEINSAM NEU STARTEN' : 'RESTART TOGETHER');
      await captureDuo(page, testInfo, language, 'team-defeat');
      await page.waitForTimeout(DUO_TEAM_DEFEAT_VIDEO_HOLD_MS);
      await expect(teamDefeat, 'Final Team Defeat must remain visibly rendered through the video evidence tail').toBeVisible();
      await expect(teamDefeat).toContainText(language === 'de' ? 'BEIDE GEFALLEN' : 'BOTH HAVE FALLEN');
    });
  }
});
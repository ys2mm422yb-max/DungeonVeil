import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const SUPABASE_REST = 'https://hfndwqfghyomwapqsked.supabase.co/rest/v1/';

test.use({ video: 'on' });

const copy = {
  de: {
    mode: 'Gildenraid',
    lobby: 'Vierer-Lobby',
    lobbyLabel: 'Gildenraid-Lobby',
    enter: 'Raid-Raum betreten',
    runClose: 'Raid schließen',
  },
  en: {
    mode: 'Guild Raid',
    lobby: 'Four-player lobby',
    lobbyLabel: 'Guild raid lobby',
    enter: 'Enter raid room',
    runClose: 'Close raid',
  },
};

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('visualQa', 'filled-social');
  return url.toString();
}

function monitorRuntime(page) {
  const issues = [];
  const origin = new URL(APP_URL).origin;
  page.__dungeonVeilIntentionalNavigation = false;
  const intentionallyNavigating = () => page.__dungeonVeilIntentionalNavigation === true;
  page.on('pageerror', error => {
    if (!intentionallyNavigating()) issues.push(`pageerror: ${error.message}`);
  });
  page.on('console', message => {
    if (message.type() !== 'error' || intentionallyNavigating()) return;
    const text = message.text();
    if (/favicon|websocket|realtime/i.test(text)) return;
    const location = message.location().url;
    issues.push(`console: ${text}${location ? ` @ ${location}` : ''}`);
  });
  page.on('response', response => {
    if (intentionallyNavigating()) return;
    if (response.url().startsWith(origin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

async function installApiMocks(page) {
  const guild = { id: 'qa-guild', name: 'Hüter des Schleiers', tag: 'VEIL', description: 'Vier Plätze. Ein Schwur.', owner_id: 'qa-owner' };
  const headers = {
    'access-control-allow-origin': new URL(APP_URL).origin,
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, apikey, content-profile, content-type, prefer, x-client-info',
    vary: 'Origin',
  };
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route(`${SUPABASE_REST}**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers, body: '' });
      return;
    }
    const url = new URL(request.url());
    const resource = url.pathname.split('/').pop() ?? '';
    let body = [];
    if (resource === 'guild_members' && url.searchParams.has('user_id')) body = [{ role: 'owner', guilds: guild }];
    else if (resource === 'guild_raid_get_snapshot') body = null;
    else if (resource === 'guild_raid_list_my_invitations') body = [];
    await route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function seedState(page, language) {
  await page.addInitScript(initialLanguage => {
    if (!localStorage.getItem('dungeon-veil-language')) localStorage.setItem('dungeon-veil-language', initialLanguage);
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-supabase-session-v1', JSON.stringify({
      access_token: 'qa-access-token',
      refresh_token: 'qa-refresh-token',
      expires_at: 4102444800,
      token_type: 'bearer',
      user: { id: 'qa-owner', email: 'qa-owner@dungeonveil.invalid' },
    }));
    class FakeWebSocket {
      static OPEN = 1;
      constructor() {
        this.readyState = 0;
        this.closed = false;
        setTimeout(() => {
          if (!this.closed) {
            this.readyState = 1;
            this.onopen?.({});
          }
        }, 0);
      }
      send(raw) {
        const message = JSON.parse(raw);
        if (message.event !== 'phx_join') return;
        setTimeout(() => this.onmessage?.({ data: JSON.stringify({ topic: message.topic, event: 'phx_reply', payload: { status: 'ok', response: { postgres_changes: [{ id: 1 }] } }, ref: message.ref, join_ref: message.join_ref }) }), 0);
      }
      close() {
        this.closed = true;
        this.readyState = 3;
      }
    }
    Object.defineProperty(window, 'WebSocket', { configurable: true, writable: true, value: FakeWebSocket });
  }, language);
}

async function waitForMainMenu(page, language) {
  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: language === 'de' ? /Spielen/ : /Play/ }).tap();
  await expect(page.getByTestId('main-menu-guild-raid-mode')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-guild-raid-mode')).toBeEnabled({ timeout: 30_000 });
}

async function installRunHandoff(page) {
  await page.evaluate(() => {
    document.querySelector('[data-qa-language-run-handoff]')?.remove();
    const handoff = document.createElement('section');
    handoff.dataset.qaLanguageRunHandoff = 'true';
    handoff.dataset.testid = 'guild-raid-started-handoff';
    handoff.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:140;padding:12px;background:#111;color:#fff';
    const id = document.createElement('div');
    id.className = 'font-mono';
    id.textContent = 'qa-language-run';
    handoff.append(id);
    document.body.append(handoff);
  });
  await expect(page.getByTestId('guild-raid-enter-run')).toBeVisible();
}

async function setLanguage(page, language) {
  await page.evaluate(nextLanguage => {
    const key = 'dungeon-veil-language';
    const oldValue = localStorage.getItem(key);
    localStorage.setItem(key, nextLanguage);
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      oldValue,
      newValue: nextLanguage,
      storageArea: localStorage,
      url: window.location.href,
    }));
  }, language);
}

async function assertPortalCopy(page, language) {
  await expect(page.getByTestId('main-menu-guild-raid-mode')).toContainText(copy[language].mode);
  await expect(page.getByTestId('guild-raid-enter-run')).toHaveText(copy[language].enter);

  await page.getByTestId('main-menu-guild-raid-mode').tap();
  const lobby = page.getByTestId('guild-raid-lobby-panel');
  await expect(lobby).toBeVisible();
  await expect(lobby).toHaveAttribute('aria-label', copy[language].lobbyLabel);
  await expect(lobby.getByRole('heading', { level: 2 })).toHaveText(copy[language].lobby);
  await page.getByTestId('guild-raid-close').tap();

  await page.getByTestId('guild-raid-enter-run').tap();
  await expect(page.getByTestId('guild-raid-run-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: copy[language].runClose })).toBeVisible();
  await page.getByRole('button', { name: copy[language].runClose }).tap();
}

for (const initialLanguage of ['de', 'en']) {
  test(`${initialLanguage.toUpperCase()} cold load, mounted switch and persisted reopen keep both Guild Raid portals synchronized`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const issues = monitorRuntime(page);
    await installApiMocks(page);
    await seedState(page, initialLanguage);
    await waitForMainMenu(page, initialLanguage);
    await installRunHandoff(page);
    await assertPortalCopy(page, initialLanguage);

    const switchedLanguage = initialLanguage === 'de' ? 'en' : 'de';
    await setLanguage(page, switchedLanguage);
    await assertPortalCopy(page, switchedLanguage);
    await page.screenshot({ path: `test-results/guild-raid-language-portals-${initialLanguage}-to-${switchedLanguage}-${testInfo.project.name}.png` });

    page.__dungeonVeilIntentionalNavigation = true;
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
    } finally {
      page.__dungeonVeilIntentionalNavigation = false;
    }
    const boot = page.getByTestId('app-boot-loading-screen');
    if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
    await page.getByRole('button', { name: switchedLanguage === 'de' ? /Spielen/ : /Play/ }).tap();
    await expect(page.getByTestId('main-menu-guild-raid-mode')).toBeEnabled({ timeout: 30_000 });
    await installRunHandoff(page);
    await assertPortalCopy(page, switchedLanguage);
    expect(issues, issues.join('\n')).toEqual([]);
  });
}

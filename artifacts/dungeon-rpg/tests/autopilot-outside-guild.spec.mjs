import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const SUPABASE_REST = 'https://hfndwqfghyomwapqsked.supabase.co/rest/v1/';

function monitorRuntime(page) {
  const issues = [];
  const origin = new URL(APP_URL).origin;
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*(?:401|403)/i.test(text)) return;
    issues.push(`console: ${text}`);
  });
  page.on('request', request => {
    if (/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/i.test(request.url())) issues.push(`external runtime request: ${request.url()}`);
  });
  page.on('response', response => {
    if (response.url().startsWith(origin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

async function seedSignedInOutsideGuild(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    const now = Date.now();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      relics: [],
      announcedRelics: [],
    }));
    localStorage.setItem('dungeon-veil-meta', JSON.stringify({
      version: 4,
      rank: 8,
      xp: 120,
      dust: 2400,
      gold: 24850,
      owned: {
        'ash-bow': { level: 2, copies: 2 },
        'ranger-quiver': { level: 2, copies: 2 },
        'ranger-cloak': { level: 2, copies: 2 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-optional-equipment-v1', JSON.stringify({ version: 1, equipped: { quiver: true }, updatedAt: now }));
    localStorage.setItem('dungeon-veil-supabase-session-v1', JSON.stringify({
      access_token: 'autopilot-access-token',
      refresh_token: 'autopilot-refresh-token',
      expires_at: 4102444800,
      token_type: 'bearer',
      user: { id: 'autopilot-outside-guild', email: 'outside-guild@dungeonveil.invalid' },
    }));
  });

  await page.route(`${SUPABASE_REST}**`, async route => {
    const method = route.request().method();
    await route.fulfill({
      status: method === 'GET' ? 200 : 204,
      contentType: 'application/json',
      body: method === 'GET' ? '[]' : '',
    });
  });
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

async function openMenu(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('unlock-presentation-layer')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
}

test('signed-in player outside a guild sees creation, mailbox and duo controls', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const issues = monitorRuntime(page);
  await seedSignedInOutsideGuild(page);
  await openMenu(page);

  await pointer(page.getByTestId('npc-guildmaster'));
  const guild = page.getByTestId('guild-panel-shell');
  await expect(guild).toBeVisible();
  await expect(guild.getByText(/Gilde gründen|Create a guild/i)).toBeVisible();
  await expect(guild.getByText(/24\.850 \/ 10\.000|24,850 \/ 10,000/)).toBeVisible();
  const create = guild.getByRole('button', { name: /Für .* Gold gründen|Create for .* gold/i });
  await expect(create).toBeEnabled();
  await guild.getByPlaceholder(/Gildenname|Guild name/i).fill('Hüter des Tests');
  await guild.getByPlaceholder(/Kürzel|Tag/i).fill('QA');
  await guild.getByPlaceholder(/Beschreibung|Description/i).fill('Automatisch geprüfter Gildenzustand.');
  await capture(page, 'signed-in-outside-guild', testInfo.project.name);
  await page.getByTestId('guild-close-button').click({ force: true });
  await expect(guild).toHaveCount(0);

  await pointer(page.getByTestId('npc-postmaster'));
  const mailbox = page.getByTestId('mailbox-panel');
  await expect(mailbox).toBeVisible();
  await expect(page.getByText(/Keine Nachrichten|No messages/i)).toBeVisible();
  await capture(page, 'signed-in-empty-mailbox', testInfo.project.name);
  await pointer(page.getByRole('button', { name: /SCHLIESSEN|CLOSE/i }).last());

  await pointer(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await pointer(page.getByRole('button', { name: /Duo-Run|Duo Run/i }));
  await expect(page.getByTestId('coop-lobby-panel')).toBeVisible();
  await expect(page.getByTestId('coop-create-lobby')).toBeVisible();
  await expect(page.getByTestId('coop-invite-code-input')).toBeVisible();
  await expect(page.getByTestId('coop-join-lobby')).toBeDisabled();
  await capture(page, 'signed-in-outside-guild-duo', testInfo.project.name);

  expect(issues, issues.join('\n')).toEqual([]);
});

import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

function qaUrl(parameters) {
  const url = new URL(APP_URL);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}

function attachRuntimeMonitor(page) {
  const issues = [];
  const appOrigin = new URL(APP_URL).origin;
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|supabase.*401|supabase.*403/i.test(text)) return;
    if (/TypeError|ReferenceError|Cannot read|WebGL.*lost|failed to initialize|failed to load|module script failed/i.test(text)) issues.push(`console: ${text}`);
  });
  page.on('response', response => {
    if (response.url().startsWith(appOrigin) && response.status() >= 400) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  return issues;
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(geometry.document, geometry.body) - geometry.viewport, JSON.stringify(geometry)).toBeLessThanOrEqual(4);
}

async function capture(page, path) {
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path, fullPage: false });
}

async function openQa(page, parameters) {
  await page.goto(qaUrl(parameters), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.bringToFront();
}

test('pause, level-up, game-over, new-run and unlock surfaces produce unobscured evidence', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const runtimeIssues = attachRuntimeMonitor(page);
  const states = [
    ['pause', async () => expect(page.getByText('PAUSE', { exact: true })).toBeVisible()],
    ['levelup', async () => expect(page.locator('[data-testid^="gift-choice-"]')).toHaveCount(3)],
    ['gameover', async () => expect(page.getByTestId('button-retry')).toBeVisible()],
    ['new-run', async () => expect(page.getByTestId('new-run-confirm-dialog')).toBeVisible()],
    ['unlock', async () => expect(page.getByTestId('unlock-presentation-layer')).toBeVisible({ timeout: 30_000 })],
  ];

  for (const [state, ready] of states) {
    await openQa(page, { qa: 'states', state });
    await expect(page.getByTestId('transient-ui-visual-qa')).toHaveAttribute('data-qa-state', state);
    await ready();
    await capture(page, `test-results/visual-${state}-${testInfo.project.name}.png`);
  }

  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

test('tutorial and own/public profile QA surfaces stay readable without test controls', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const runtimeIssues = attachRuntimeMonitor(page);

  await page.addInitScript(() => {
    localStorage.removeItem('dungeon-veil-tutorial-completed-v1');
    localStorage.setItem('dungeon-veil-language', 'de');
  });
  await openQa(page, { qa: 'tutorial' });
  await expect(page.getByTestId('tutorial-overlay')).toBeVisible({ timeout: 30_000 });
  await capture(page, `test-results/visual-tutorial-${testInfo.project.name}.png`);

  for (const profile of ['own', 'public']) {
    await openQa(page, { qa: 'profiles', profile, capture: '1' });
    const root = page.getByTestId('profile-layout-qa');
    await expect(root).toHaveAttribute('data-profile-view', profile);
    if (profile === 'own') await expect(page.getByTestId('player-profile-panel')).toBeVisible();
    else await expect(page.getByTestId('player-profile-card')).toBeVisible();
    await expect(page.getByTestId('profile-qa-own')).toHaveCount(0);
    await expect(page.getByTestId('profile-qa-public')).toHaveCount(0);
    await capture(page, `test-results/visual-profile-${profile}-qa-${testInfo.project.name}.png`);
  }

  expect(runtimeIssues, runtimeIssues.join('\n')).toEqual([]);
});

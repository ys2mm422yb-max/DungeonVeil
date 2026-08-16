import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';

function qaUrl() {
  const url = new URL(APP_URL);
  url.searchParams.set('qa', 'runtime');
  return url.toString();
}

async function startSolo(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('dungeon-veil-runtime-evidence-v1', '1');
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-seen-unlocks-v1', JSON.stringify({
      version: 2,
      initialized: true,
      equipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      relics: ['ash-eye', 'marked-claw', 'veil-heart'],
      announcedEquipment: ['ash-bow', 'ranger-quiver', 'ranger-cloak'],
      announcedRelics: ['ash-eye', 'marked-claw', 'veil-heart'],
    }));
  });

  await page.goto(qaUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: /Spielen|Play/i }).first().click({ force: true });
  await expect(page.getByText(/Spielmodus wählen|Choose game mode/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Solo-Run|Solo Run/i }).first().click({ force: true });

  const input = page.getByRole('textbox').first();
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill('Gift Authority');
  const confirm = page.getByTestId('run-name-confirm');
  if (await confirm.count()) await confirm.click({ force: true });
  else await page.getByRole('button', { name: /Run starten|Start Game/i }).first().click({ force: true });

  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 60_000 });
  await expect.poll(
    () => page.evaluate(() => Boolean(window.__dungeonVeilRuntimeEvidence)),
    { timeout: 60_000 },
  ).toBe(true);
}

test('level-up shows authoritative gifts and choosing the first resumes the run', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await startSolo(page);

  await page.evaluate(() => {
    window.__dungeonVeilRuntimeEvidence.loadRoom(3, 'solo');
    window.__dungeonVeilRuntimeEvidence.killLivingEnemies();
  });
  await expect.poll(
    () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.roomClearReady),
    { timeout: 30_000, intervals: [100, 200, 350, 500, 750, 1_000] },
  ).toBe(true);

  await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.moveToExit());
  await expect.poll(
    () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.status),
    { timeout: 30_000, intervals: [100, 200, 350, 500, 750, 1_000] },
  ).toBe('levelup');

  const heading = page.getByText(/WÄHLE DEINE GABE|CHOOSE YOUR GIFT/i);
  await expect(heading).toBeVisible({ timeout: 30_000 });
  const choices = page.locator('[data-testid^="gift-choice-"]');
  await expect(choices).toHaveCount(3);
  await expect(choices.first()).toBeVisible();

  // Evidence must wait for three fully visible cards whose geometry has stopped
  // moving. Intentional card glow/filter effects are part of the settled design and
  // therefore are not treated as evidence of an unfinished entrance animation.
  const readChoiceSnapshot = () => choices.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      opacity: Number.parseFloat(style.opacity || '1'),
      visibility: style.visibility,
    };
  }));
  await expect.poll(async () => {
    const first = await readChoiceSnapshot();
    await page.evaluate(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    const second = await readChoiceSnapshot();
    return first.length === 3 && second.length === 3 && first.every((item, index) => {
      const next = second[index];
      return Boolean(next) &&
        item.width > 0 && item.height > 0 && next.width > 0 && next.height > 0 &&
        item.opacity >= 0.99 && next.opacity >= 0.99 &&
        item.visibility === 'visible' && next.visibility === 'visible' &&
        Math.abs(item.x - next.x) <= 1 && Math.abs(item.y - next.y) <= 1 &&
        Math.abs(item.width - next.width) <= 1 && Math.abs(item.height - next.height) <= 1;
    });
  }, { timeout: 30_000, intervals: [100, 200, 350, 500, 750] }).toBe(true);
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }));

  await page.screenshot({
    path: `test-results/autopilot-gift-levelup-${testInfo.project.name}.png`,
    fullPage: false,
  });

  const selected = await page.evaluate(() => window.__dungeonVeilRuntimeEvidence.chooseFirstGift());
  expect(selected?.status, JSON.stringify(selected)).toBe('playing');
  await expect.poll(
    () => page.evaluate(() => window.__dungeonVeilRuntimeEvidence.snapshot()?.status),
    { timeout: 10_000 },
  ).toBe('playing');
  await expect(heading).toBeHidden({ timeout: 10_000 });
  await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 10_000 });
});

test('Fire Arrow reapplication preserves the scheduled burn tick at every real autofire cadence', async () => {
  const runEngine = await readFile(new URL('../src/game/runEngine.ts', import.meta.url), 'utf8');

  expect(runEngine).toContain('const hadActiveBurnSchedule = Boolean(enemy.burnUntil && enemy.nextBurnTick && time < enemy.burnUntil);');
  expect(runEngine).toContain('if (!hadActiveBurnSchedule) enemy.nextBurnTick = time + 520;');
  expect(runEngine).not.toContain('enemy.burnUntil = time + ticks * 520;\n      enemy.nextBurnTick = time + 520;');

  const cadencesMs = [270, 226.8, 189, 156.6];
  for (const cadenceMs of cadencesMs) {
    let burnUntil = 0;
    let nextBurnTick = 0;
    let ticks = 0;
    for (let time = 0; time <= 4_000; time += 1) {
      if (Math.abs(time / cadenceMs - Math.round(time / cadenceMs)) < 0.003) {
        const hadActiveBurnSchedule = burnUntil > time && nextBurnTick > 0;
        burnUntil = time + 3 * 520;
        if (!hadActiveBurnSchedule) nextBurnTick = time + 520;
      }
      if (burnUntil > time && nextBurnTick > 0 && time >= nextBurnTick) {
        ticks += 1;
        nextBurnTick += 520;
      }
    }
    expect(ticks, `cadence ${cadenceMs}ms should produce burn ticks under continuous fire`).toBeGreaterThan(0);
    expect(ticks, `cadence ${cadenceMs}ms must not stack/explode burn ticks`).toBeLessThanOrEqual(8);
  }
});

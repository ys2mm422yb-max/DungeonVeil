import { test, expect } from '@playwright/test';
import { waitForPaintedCanvas } from './visual-render-readiness.mjs';

const APP_URL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const ROLES = ['single-target', 'critical-support', 'shield', 'loot-comfort', 'distraction'];
const CORE_VARIANTS = [
  { role: 'single-target', level: 1, prestige: 'none', particles: 0 },
  { role: 'critical-support', level: 2, prestige: 'none', particles: 0 },
  { role: 'shield', level: 3, prestige: 'refined', particles: 2 },
  { role: 'loot-comfort', level: 4, prestige: 'strong', particles: 4 },
  { role: 'distraction', level: 5, prestige: 'maximum', particles: 6 },
];
const MAX_ROLE_VARIANTS = ROLES.slice(0, -1).map(role => ({
  role,
  level: 5,
  prestige: 'maximum',
  particles: 6,
}));

test.use({ video: 'on' });

function companionState(role, level) {
  const now = Date.now();
  return {
    version: 1,
    activeId: role,
    companions: Object.fromEntries(ROLES.map(id => [id, {
      level: id === role ? level : 5,
      unlockedAt: now - 60_000,
    }])),
    updatedAt: now,
  };
}

async function tap(locator) {
  await expect(locator).toBeVisible({ timeout: 60_000 });
  await locator.tap();
}

async function waitForStableRoom(page) {
  const roomTitles = page.getByText(/VERSORGUNGSPOSTEN|SUPPLY POST/i);
  let hiddenSince = 0;
  await expect.poll(async () => {
    const count = await roomTitles.count();
    for (let index = 0; index < count; index += 1) {
      if (await roomTitles.nth(index).isVisible()) {
        hiddenSince = 0;
        return false;
      }
    }
    if (hiddenSince === 0) hiddenSince = Date.now();
    return Date.now() - hiddenSince >= 1_200;
  }, {
    timeout: 120_000,
    intervals: [100, 250, 500],
    message: 'room title must be continuously hidden before prestige evidence capture',
  }).toBe(true);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function seedInitialState(page, role, level) {
  await page.addInitScript(({ activeRole, activeLevel, roles }) => {
    const now = Date.now();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('dungeon-veil-language', 'de');
    localStorage.setItem('dungeon-veil-tutorial-completed-v1', '1');
    localStorage.setItem('dungeon-veil-accessibility-v1', JSON.stringify({
      version: 2,
      contrast: 'standard',
      textSize: 'standard',
      updatedAt: now,
    }));
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
      rank: 20,
      xp: 420,
      dust: 999999,
      gold: 999999,
      owned: {
        'ash-bow': { level: 1, copies: 1 },
        'ranger-quiver': { level: 1, copies: 1 },
        'ranger-cloak': { level: 1, copies: 1 },
      },
      equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', armor: 'ranger-cloak' },
      cosmeticUnlocks: [],
      migrationCompensation: { gold: 0, dust: 0, copies: 0 },
      rewardLedger: [],
      currentRunId: '',
    }));
    localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify({
      version: 1,
      activeId: activeRole,
      companions: Object.fromEntries(roles.map(id => [id, {
        level: id === activeRole ? activeLevel : 5,
        unlockedAt: now - 60_000,
      }])),
      updatedAt: now,
    }));
  }, { activeRole: role, activeLevel: level, roles: ROLES });
}

async function enterFreshRun(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const boot = page.getByTestId('app-boot-loading-screen');
  if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('main-menu-control-stack')).toBeVisible({ timeout: 60_000 });
  await tap(page.getByRole('button', { name: /Spielen|Play/i }).first());
  await tap(page.getByRole('button', { name: /Solo-Run|Solo Run/i }));

  const runHud = page.getByTestId('run-hud');
  const namePrompt = page.getByTestId('run-name-prompt');
  await expect(namePrompt.or(runHud).first()).toBeVisible({ timeout: 60_000 });
  if (await namePrompt.isVisible()) {
    await page.getByTestId('run-name-input').fill('Prestige QA');
    await tap(page.getByTestId('run-name-confirm'));
  }
  await expect(runHud).toBeVisible({ timeout: 120_000 });
  await page.waitForTimeout(4_000);
  await waitForPaintedCanvas(page, page.locator('canvas').first(), 120_000);
}

async function activateVariant(page, variant, reload) {
  if (reload) {
    await page.evaluate(({ state }) => {
      localStorage.setItem('dungeon-veil-companion-collection-v5', JSON.stringify(state));
      sessionStorage.setItem('dungeon-veil-active-run-session', '1');
    }, { state: companionState(variant.role, variant.level) });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    const boot = page.getByTestId('app-boot-loading-screen');
    if (await boot.count()) await expect(boot).toBeHidden({ timeout: 60_000 });
    await expect(page.getByTestId('run-hud')).toBeVisible({ timeout: 120_000 });
    await waitForPaintedCanvas(page, page.locator('canvas').first(), 120_000);
  }

  const marker = page.getByTestId('run-companion-scene');
  await expect(marker).toHaveAttribute('data-local-role', variant.role, { timeout: 60_000 });
  await expect(marker).toHaveAttribute('data-local-level', String(variant.level));
  await expect.poll(async () => Number(await marker.getAttribute('data-visible-count') ?? 0), {
    timeout: 60_000,
    message: `${variant.role} tier ${variant.level} must be visible in the actual shared renderer`,
  }).toBeGreaterThan(0);

  const telemetry = async key => page.evaluate(name => document.documentElement.dataset[name], key);
  await expect.poll(() => telemetry('dungeonVeilCompanionUpgradeBinding'), { timeout: 60_000 })
    .toBe('in-run-companion-combat-mesh');
  await expect.poll(() => telemetry('dungeonVeilCompanionUpgradeRole')).toBe(variant.role);
  await expect.poll(() => telemetry('dungeonVeilCompanionUpgradeTier')).toBe(String(variant.level));
  await expect.poll(() => telemetry('dungeonVeilCompanionUpgradePrestige')).toBe(variant.prestige);
  await expect.poll(() => telemetry('dungeonVeilCompanionUpgradeParticleCount')).toBe(String(variant.particles));
  await expect.poll(() => telemetry('dungeonVeilCompanionUpgradeStaticFallback')).toBe('false');
  await expect.poll(() => telemetry('dungeonVeilCompanionUpgradeParticlesActive'))
    .toBe(variant.level >= 3 ? 'true' : 'false');

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(550);
  await page.keyboard.up('ArrowRight');
  await page.evaluate(({ role, level }) => {
    window.dispatchEvent(new CustomEvent('dungeon-veil-companion-action-v4', {
      detail: { ownerPlayerId: 'player', role, level, kind: 'attack', at: performance.now() },
    }));
  }, variant);
  await page.waitForTimeout(900);
  await waitForStableRoom(page);
}

test('all companion roles and tiers keep prestige bound to the real combat model', async ({ page }, testInfo) => {
  test.setTimeout(720_000);
  const first = CORE_VARIANTS[0];
  await seedInitialState(page, first.role, first.level);
  await enterFreshRun(page);

  let reload = false;
  for (const variant of CORE_VARIANTS) {
    await activateVariant(page, variant, reload);
    await page.screenshot({
      path: `test-results/visual-upgrade-prestige-tier-${variant.level}-${variant.role}-${testInfo.project.name}.png`,
      fullPage: false,
    });
    reload = true;
  }

  for (const variant of MAX_ROLE_VARIANTS) {
    await activateVariant(page, variant, true);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilCompanionUpgradeStaticFallback))
    .toBe('true');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilCompanionUpgradeParticlesActive))
    .toBe('false');
  await page.screenshot({
    path: `test-results/visual-upgrade-prestige-reduced-motion-${testInfo.project.name}.png`,
    fullPage: false,
  });

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilCompanionUpgradeStaticFallback))
    .toBe('false');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilCompanionUpgradeParticlesActive))
    .toBe('true');

  await page.evaluate(() => {
    document.documentElement.dataset.dungeonVeilRendererRecovery = '1';
    window.dispatchEvent(new Event('dungeon-veil-renderer-lost'));
  });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilCompanionUpgradeStaticFallback))
    .toBe('true');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilCompanionUpgradeParticlesActive))
    .toBe('false');
  await page.screenshot({
    path: `test-results/visual-upgrade-prestige-recovery-${testInfo.project.name}.png`,
    fullPage: false,
  });

  await page.evaluate(() => {
    delete document.documentElement.dataset.dungeonVeilRendererRecovery;
    window.dispatchEvent(new Event('dungeon-veil-renderer-ready'));
  });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilCompanionUpgradeStaticFallback))
    .toBe('false');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.dungeonVeilCompanionUpgradeParticlesActive))
    .toBe('true');
});

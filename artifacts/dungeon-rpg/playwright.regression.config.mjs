import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

const baseURL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const outputDir = process.env.DUNGEON_VEIL_RUNTIME_MONITOR_NEGATIVE_PROBE === '1'
  ? `${process.env.RUNNER_TEMP || '/tmp'}/dungeon-veil-runtime-monitor-negative-probe-${process.env.BROWSER_PROJECT || 'probe'}`
  : 'test-results';

const PRODUCT_AUTOPILOT_SPECS = [
  'autopilot-product-journeys.spec.mjs',
  'run-gift-authority.spec.mjs',
  'autopilot-outside-guild.spec.mjs',
  'guild-mail-equipment-visual.spec.mjs',
  'mobile-resource-upgrade.spec.mjs',
  'companion-runtime.spec.mjs',
  'companion-free-movement-evidence.spec.mjs',
  'spectator-performance.spec.mjs',
  'spectator-death-state.spec.mjs',
  'player-death-state.spec.mjs',
  'upgrade-prestige-visual.spec.mjs',
  'upgrade-prestige-mobile-hotfix.spec.mjs',
  'visible-upgrade-prestige.spec.mjs',
  'kaykit-chapter-evidence.spec.mjs',
  'guild-raid-lobby-mobile.spec.mjs',
  'armor-cloud-restore-render.spec.mjs',
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function adaptiveProductAutopilotIgnore() {
  if (process.env.DUNGEON_VEIL_RUNTIME_MONITOR_NEGATIVE_PROBE === '1') {
    console.log('Product Autopilot adaptive selection: runtime-monitor negative probe explicitly bypasses PR spec filtering.');
    return [];
  }
  if (process.env.GITHUB_WORKFLOW !== 'Product Autopilot QA' || process.env.GITHUB_EVENT_NAME !== 'pull_request') {
    return [];
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    console.warn('Product Autopilot adaptive selection: event payload unavailable; using full fail-closed suite.');
    return [];
  }

  const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const body = payload?.pull_request?.body ?? '';
  const startMarker = '<!-- product-autopilot-selection:start -->';
  const endMarker = '<!-- product-autopilot-selection:end -->';
  const start = body.indexOf(startMarker);
  const end = body.indexOf(endMarker);

  if (start < 0 || end < 0 || end <= start) {
    console.log('Product Autopilot adaptive selection: declaration missing; using full fail-closed suite.');
    return [];
  }

  const block = body.slice(start + startMarker.length, end);
  if (/\bFULL_PRODUCT_AUTOPILOT\b/.test(block)) {
    console.log('Product Autopilot adaptive selection: explicit full suite requested.');
    return [];
  }

  const selectedPaths = [...block.matchAll(/`tests\/([A-Za-z0-9._/-]+\.spec\.mjs)`/g)].map((match) => match[1]);
  if (selectedPaths.length === 0) {
    throw new Error('Product Autopilot adaptive selection block contains no test spec.');
  }

  const selected = new Set();
  for (const spec of selectedPaths) {
    if (spec.includes('/')) {
      throw new Error(`Nested Product Autopilot spec is not allowed: ${spec}`);
    }
    if (!PRODUCT_AUTOPILOT_SPECS.includes(spec)) {
      throw new Error(`Unknown Product Autopilot spec in PR body: ${spec}`);
    }
    selected.add(spec);
  }

  const ignored = PRODUCT_AUTOPILOT_SPECS.filter((spec) => !selected.has(spec));
  console.log(`Product Autopilot adaptive selection: ${selected.size}/${PRODUCT_AUTOPILOT_SPECS.length} specs selected; ${ignored.length} unrelated specs ignored for this PR.`);
  console.log(`Selected: ${[...selected].join(', ')}`);
  return ignored.map((spec) => new RegExp(`${escapeRegex(spec)}$`));
}

const productAutopilotTestIgnore = adaptiveProductAutopilotIgnore();

export default defineConfig({
  testDir: './tests',
  outputDir,
  testMatch: /(?:full-game-smoke|account-profile-smoke|armor-balance-smoke|new-run-preload-deadline|worldboss-block1|spectator-performance|spectator-death-state|profile-layout|companion-runtime|companion-free-movement-evidence|player-death-state|loading-continuity|codex-visual-library|main-menu-reference|block-20-main-menu|visual-audit|visual-room-chunks|transient-ui-visual-audit|equipment-responsive|reduced-motion-menu|guild-mail-equipment-visual|mobile-resource-upgrade|upgrade-prestige-visual|upgrade-prestige-mobile-hotfix|visible-upgrade-prestige|autopilot-product-journeys|autopilot-outside-guild|kaykit-chapter-evidence|guild-raid-lobby-mobile|run-gift-authority)\.spec\.mjs/,
  testIgnore: productAutopilotTestIgnore,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/full-game-results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iphone-webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'android-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/604.1',
      },
    },
    {
      name: 'ipad-portrait-webkit',
      grepInvert: /new run renders responsive combat controls and stays stable/,
      use: {
        browserName: 'webkit',
        viewport: { width: 820, height: 1180 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'android-tablet-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 800, height: 1280 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
      },
    },
  ],
});
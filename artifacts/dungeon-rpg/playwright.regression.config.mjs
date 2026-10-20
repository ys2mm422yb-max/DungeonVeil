import { defineConfig } from '@playwright/test';
import { PRODUCT_AUTOPILOT_SPECS } from '../../.github/scripts/select-product-autopilot-specs.mjs';

const baseURL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';
const outputDir = process.env.DUNGEON_VEIL_RUNTIME_MONITOR_NEGATIVE_PROBE === '1'
  ? `${process.env.RUNNER_TEMP || '/tmp'}/dungeon-veil-runtime-monitor-negative-probe-${process.env.BROWSER_PROJECT || 'probe'}`
  : 'test-results';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NON_PRODUCT_REGRESSION_SPECS = [
  'full-game-smoke.spec.mjs',
  'account-profile-smoke.spec.mjs',
  'armor-balance-smoke.spec.mjs',
  'new-run-preload-deadline.spec.mjs',
  'worldboss-block1.spec.mjs',
  'profile-layout.spec.mjs',
  'loading-continuity.spec.mjs',
  'codex-visual-library.spec.mjs',
  'main-menu-reference.spec.mjs',
  'block-20-main-menu.spec.mjs',
  'visual-audit.spec.mjs',
  'visual-room-chunks.spec.mjs',
  'transient-ui-visual-audit.spec.mjs',
  'equipment-responsive.spec.mjs',
  'reduced-motion-menu.spec.mjs',
];

const regressionSpecNames = [
  ...NON_PRODUCT_REGRESSION_SPECS,
  ...PRODUCT_AUTOPILOT_SPECS.map((spec) => spec.replace(/^tests\//, '')),
];
const regressionTestMatch = new RegExp(
  `(?:${regressionSpecNames.map(escapeRegex).join('|')})$`,
);

export default defineConfig({
  testDir: './tests',
  outputDir,
  testMatch: regressionTestMatch,
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
        userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36',
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

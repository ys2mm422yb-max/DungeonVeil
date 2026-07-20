import { defineConfig } from '@playwright/test';

const baseURL = process.env.DUNGEON_VEIL_URL || 'https://ys2mm422yb-max.github.io/DungeonVeil/';

export default defineConfig({
  testDir: './tests',
  testMatch: /(?:full-game-smoke|account-profile-smoke|armor-balance-smoke|new-run-preload-deadline|worldboss-block1|spectator-performance|profile-layout|companion-runtime|loading-continuity|codex-visual-library|main-menu-reference|visual-audit|equipment-responsive)\.spec\.mjs/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  retries: 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/full-game-results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
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
      name: 'ipad-landscape-webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 1180, height: 820 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Version/18.6 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      },
    },
  ],
});

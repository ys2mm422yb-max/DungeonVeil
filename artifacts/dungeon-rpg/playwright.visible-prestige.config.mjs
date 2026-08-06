import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.DUNGEON_VEIL_URL || 'http://127.0.0.1:4173/DungeonVeil/';

export default defineConfig({
  testDir: './tests',
  testMatch: /(?:visible-upgrade-prestige|upgrade-prestige-visual)\.spec\.mjs/,
  timeout: 420_000,
  expect: { timeout: 120_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/visible-prestige-results.json' }]],
  use: {
    baseURL,
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'on',
  },
  projects: [
    {
      name: 'iphone-webkit',
      use: {
        ...devices['iPhone 13'],
        browserName: 'webkit',
      },
    },
    {
      name: 'android-chromium',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
      },
    },
    {
      name: 'ipad-portrait-webkit',
      use: {
        ...devices['iPad Pro 11'],
        browserName: 'webkit',
        viewport: { width: 834, height: 1194 },
      },
    },
    {
      name: 'android-tablet-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 800, height: 1280 },
        screen: { width: 800, height: 1280 },
        deviceScaleFactor: 1.5,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36',
      },
    },
  ],
});

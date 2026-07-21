import { defineConfig } from '@playwright/test';
import regressionConfig from './playwright.regression.config.mjs';

export default defineConfig({
  ...regressionConfig,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/motion-results.json' }],
    ['html', { outputFolder: 'playwright-motion-report', open: 'never' }],
  ],
  use: {
    ...regressionConfig.use,
    screenshot: 'on',
    trace: 'on',
    video: 'on',
  },
});

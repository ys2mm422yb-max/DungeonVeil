import baseConfig from './playwright.regression.config.mjs';

export default {
  ...baseConfig,
  outputDir: 'temporal-test-results',
  reporter: [
    ['list'],
    ['json', { outputFile: 'temporal-test-results/companion-temporal-results.json' }],
  ],
  use: {
    ...baseConfig.use,
    video: 'on',
  },
};

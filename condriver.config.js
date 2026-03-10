// ===========================================
// PLAYWRIGHT CONFIGURATION — ConDriver
// ===========================================
// https://ttc-eun-uat-c-employee-as.azurewebsites.net/
//
// HOW TO RUN:
// npx playwright test --config=condriver.config.js
// ===========================================

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({

  testDir: './ConDriver-accessibility-tests',

  globalSetup: './utils/condriver-setup.js',
  globalTeardown: './utils/condriver-teardown.js',

  outputDir: './ConDriver-accessibility-tests/ConDriver-dev-debug',

  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 60000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'ConDriver-accessibility-tests/ConDriver-html-report', open: 'never' }],
  ],

  use: {
    storageState: 'condriver-auth.json',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});

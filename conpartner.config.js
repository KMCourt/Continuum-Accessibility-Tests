// ===========================================
// PLAYWRIGHT CONFIGURATION — ConPartner
// ===========================================
// https://ttc-eun-uat-c-partner-hub-as.azurewebsites.net/
//
// HOW TO RUN:
// npx playwright test --config=conpartner.config.js
// ===========================================

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({

  testDir: './ConPartner-accessibility-tests',

  globalSetup: './utils/conpartner-setup.js',
  globalTeardown: './utils/conpartner-teardown.js',

  outputDir: './ConPartner-accessibility-tests/ConPartner-dev-debug',

  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 60000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'ConPartner-accessibility-tests/ConPartner-html-report', open: 'never' }],
  ],

  use: {
    storageState: 'conpartner-auth.json',
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

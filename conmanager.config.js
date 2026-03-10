// ===========================================
// PLAYWRIGHT CONFIGURATION — ConManager
// ===========================================
// https://ttc-eun-uat-c-manager-hub-as.azurewebsites.net/
//
// HOW TO RUN:
// npx playwright test --config=conmanager.config.js
// ===========================================

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({

  testDir: './ConManager-accessibility-tests',

  globalSetup: './utils/conmanager-setup.js',
  globalTeardown: './utils/conmanager-teardown.js',

  outputDir: './ConManager-accessibility-tests/ConManager-dev-debug',

  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 60000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'ConManager-accessibility-tests/ConManager-html-report', open: 'never' }],
  ],

  use: {
    storageState: 'conmanager-auth.json',
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

/**
 * ===========================================
 * ACCESSIBILITY SCAN TEST — CONTINUUM MANAGER
 * ===========================================
 * Runs axe-core accessibility scans against all pages
 * in Chrome, Firefox and Edge.
 *
 * Generates ONE consolidated HTML report at:
 *   ConManager-results/YYYY-MM-DD/report.html
 *
 * HOW TO RUN:
 * All browsers:   npx playwright test --config=conmanager.config.js
 * One browser:    npx playwright test --config=conmanager.config.js --project=chromium
 * One page:       npx playwright test --config=conmanager.config.js --grep "Login Page"
 * ===========================================
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { test } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');
const path = require('path');
const { getPreviousCounts, recordRun, isRegression } = require('../../utils/trend-tracker');

// -------------------------------------------
// PAGES TO SCAN
// Add new pages here as needed.
// -------------------------------------------
const PAGES = [
  {
    name: 'Login Page',
    url: 'https://ttc-eun-uat-c-manager-hub-as.azurewebsites.net/login',
    requiresAuth: false,
  },
  {
    name: 'Dashboard',
    url: 'https://ttc-eun-uat-c-manager-hub-as.azurewebsites.net/dashboard',
    requiresAuth: true,
  },
  {
    name: 'Contact Us Modal',
    url: 'https://ttc-eun-uat-c-manager-hub-as.azurewebsites.net/',
    requiresAuth: true,
    scanScope: '[role="dialog"]',
    setup: async (page) => {
      // Click the "CONTACT US" header nav link (not the floating chat widget)
      await page.locator('header a:has-text("CONTACT US"), header button:has-text("CONTACT US"), nav a:has-text("CONTACT US")').first().click();
      // Wait for the MUI Dialog paper (not the Drawer which is always present in the DOM)
      await page.locator('.MuiDialog-paper').waitFor({ state: 'visible' });
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'Virtual Assistant Chat Widget',
    url: 'https://ttc-eun-uat-c-manager-hub-as.azurewebsites.net/',
    requiresAuth: true,
    // scanScope omitted — axe-core cannot pierce shadow DOM via include(),
    // so the full page is scanned with the chat widget open
    setup: async (page) => {
      // The LiveSDK launcher lives inside a shadow DOM (#livesdk__campaign)
      // Use JS to find and click the first visible non-close button inside the shadow root
      await page.evaluate(() => {
        const host = document.querySelector('#livesdk__campaign');
        const root = host?.shadowRoot;
        if (!root) return;
        const buttons = [...root.querySelectorAll('button')];
        const launcher = buttons.find(b => {
          const cls = b.className || '';
          return !cls.includes('close') && !cls.includes('submit') &&
                 b.offsetWidth > 0 && b.offsetHeight > 0;
        });
        if (launcher) launcher.click();
      });
      // Wait for the chat window to open
      await page.waitForTimeout(2000);
    },
  },
  {
    name: 'Support Page',
    url: 'https://ttc-eun-uat-support-c.azurewebsites.net/',
  },
];

// -------------------------------------------
// RESULTS FOLDER SETUP
// -------------------------------------------
const today = new Date().toISOString().split('T')[0];
const resultsDir = path.join(__dirname, '..', 'ConManager-results', today);
const screenshotsDir = path.join(resultsDir, 'screenshots');
const jsonDir = path.join(resultsDir, 'json');

[resultsDir, screenshotsDir, jsonDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});


test.setTimeout(60000);

test.describe('Accessibility Scan', () => {

  for (const pageDef of PAGES) {
    test(`Scan: ${pageDef.name}`, async ({ page }, testInfo) => {
      const projectName = testInfo.project.name;

      if (pageDef.timeout) test.setTimeout(pageDef.timeout);

      if (!pageDef.requiresAuth) {
        await page.context().clearCookies();
        await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
      }

      await page.goto(pageDef.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      if (pageDef.setup) {
        await pageDef.setup(page);
        await page.waitForTimeout(1000);
      }

      const actualUrl = page.url();

      const safeName = pageDef.name.replace(/\s+/g, '_').toLowerCase();
      const screenshotFile = `${safeName}_${projectName}.png`;
      const screenshotPath = path.join(screenshotsDir, screenshotFile);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const axeBuilder = new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'wcag2aaa', 'best-practice']);
      if (pageDef.scanScope) axeBuilder.include(pageDef.scanScope);
      const results = await axeBuilder.analyze();

      const elementScreenshots = {};
      for (const violation of results.violations) {
        elementScreenshots[violation.id] = [];
        for (let i = 0; i < violation.nodes.length; i++) {
          const target = violation.nodes[i].target?.[0];
          if (target) {
            try {
              const element = page.locator(target).first();
              const shotFile = `${safeName}_${projectName}_${violation.id}_${i}.png`;
              const shotPath = path.join(screenshotsDir, shotFile);
              await element.screenshot({ path: shotPath, timeout: 5000 });
              elementScreenshots[violation.id].push(shotFile);
            } catch {
              elementScreenshots[violation.id].push(null);
            }
          }
        }
      }

      const counts = {
        total:    results.violations.length,
        critical: results.violations.filter(v => v.impact === 'critical').length,
        serious:  results.violations.filter(v => v.impact === 'serious').length,
        moderate: results.violations.filter(v => v.impact === 'moderate').length,
        minor:    results.violations.filter(v => v.impact === 'minor').length,
      };

      const previousCounts = getPreviousCounts(pageDef.name, projectName);
      recordRun({ page: pageDef.name, browser: projectName, counts });

      const jsonPath = path.join(jsonDir, `${safeName}_${projectName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify({
        page: pageDef.name,
        url: actualUrl,
        browser: projectName,
        scannedAt: new Date().toISOString(),
        summary: counts,
        previousCounts,
        regression: isRegression(previousCounts, counts.total),
        screenshotFile,
        elementScreenshots,
        violations: results.violations,
        incomplete: results.incomplete,
      }, null, 2));

      console.log(`\n========================================`);
      console.log(`PAGE    : ${pageDef.name}`);
      console.log(`BROWSER : ${projectName}`);
      console.log(`========================================`);
      console.log(`Total    : ${counts.total}`);
      console.log(`Critical : ${counts.critical}`);
      console.log(`Serious  : ${counts.serious}`);
      console.log(`Moderate : ${counts.moderate}`);
      console.log(`Minor    : ${counts.minor}`);
    });
  }

});
// Report generation and Teams notification are handled by utils/conmanager-teardown.js
// which runs after ALL tests across ALL browsers complete.

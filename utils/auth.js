/**
 * Shared B2C login helper.
 * Logs in via the Azure B2C flow and saves browser storage state to disk.
 * Called by each app's globalSetup before tests run.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { chromium } = require('@playwright/test');

async function loginAndSave(url, email, password, storageStatePath) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Go to the app — landing page has a "sign in" link
  await page.goto(url.trim());

  // Dismiss Cookiebot consent banner if present
  const cookieAccept = page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
  if (await cookieAccept.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cookieAccept.click();
    await page.waitForTimeout(500);
  }

  await page.locator('a[href="/account/signin"]').click();

  // B2C step 1: enter email
  await page.waitForURL(/b2clogin\.com/);
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Next' }).click();

  // B2C step 2: enter password
  await page.waitForSelector('#password');
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait until redirected back to the app
  const appHost = new URL(url.trim()).hostname;
  await page.waitForURL(new RegExp(appHost), { timeout: 30000 });

  // Save cookies + localStorage so tests can reuse the session
  await context.storageState({ path: storageStatePath });
  await browser.close();
}

module.exports = { loginAndSave };
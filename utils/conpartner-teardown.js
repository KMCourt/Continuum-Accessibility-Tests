/**
 * ===========================================
 * GLOBAL TEARDOWN — ConPartner
 * ===========================================
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { generateConsolidatedReport } = require('./report-generator');
const { postToTeams } = require('./teams-notify');
const { generateCombinedReport } = require('../generate-report');

const RETENTION_DAYS = 90;

function pruneOldReports(baseDir) {
  if (!fs.existsSync(baseDir)) return;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(baseDir)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry)) continue;
    const folderPath = path.join(baseDir, entry);
    const folderDate = new Date(entry).getTime();
    if (!isNaN(folderDate) && folderDate < cutoff) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log(`Removed old report: ${entry}`);
    }
  }
}

module.exports = async function globalTeardown() {
  const today = new Date().toISOString().split('T')[0];
  const baseResultsDir = path.join(__dirname, '..', 'ConPartner-accessibility-tests', 'ConPartner-results');
  const resultsDir = path.join(baseResultsDir, today);

  pruneOldReports(baseResultsDir);

  const jsonDir = path.join(resultsDir, 'json');
  const reportPath = path.join(resultsDir, 'report.html');

  if (!fs.existsSync(jsonDir)) {
    console.log('\nNo JSON results found — skipping report generation.');
    return;
  }

  const jsonFiles = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
  if (jsonFiles.length === 0) {
    console.log('\nNo JSON results found — skipping report generation.');
    return;
  }

  const allResults = jsonFiles.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(jsonDir, f), 'utf8'));
    return {
      page:               data.page,
      url:                data.url,
      browser:            data.browser,
      counts:             data.summary,
      previousCounts:     data.previousCounts,
      violations:         data.violations,
      screenshotFile:     data.screenshotFile,
      elementScreenshots: data.elementScreenshots || {},
    };
  });

  const regressions = jsonFiles
    .map(f => JSON.parse(fs.readFileSync(path.join(jsonDir, f), 'utf8')))
    .filter(d => d.regression)
    .map(d => ({ page: d.page, browser: d.browser }));

  if (regressions.length > 0) {
    console.log('\n⚠️  REGRESSIONS DETECTED:');
    regressions.forEach(r => console.log(`   - ${r.page} (${r.browser})`));
  }

  generateConsolidatedReport({
    allResults, regressions, reportPath, today,
    reportLabel: 'TTC Continuum — ConPartner Accessibility Report',
  });

  const totals = allResults.reduce(
    (acc, r) => {
      acc.total    += r.counts.total    || 0;
      acc.critical += r.counts.critical || 0;
      acc.serious  += r.counts.serious  || 0;
      acc.moderate += r.counts.moderate || 0;
      acc.minor    += r.counts.minor    || 0;
      return acc;
    },
    { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 }
  );

  console.log('\n========================================');
  console.log('  CONPARTNER SCAN COMPLETE');
  console.log('========================================');
  console.log(`  Total    : ${totals.total}`);
  console.log(`  Critical : ${totals.critical}`);
  console.log(`  Serious  : ${totals.serious}`);
  console.log(`  Moderate : ${totals.moderate}`);
  console.log(`  Minor    : ${totals.minor}`);
  console.log('========================================');
  console.log(`\n✅ Report: ConPartner-accessibility-tests/ConPartner-results/${today}/report.html`);

  const summaryData = allResults.map(r => ({
    page: r.page, url: r.url, browser: r.browser, ...r.counts,
  }));

  await postToTeams({
    webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    summaryData, today, regressions,
    label: 'ConPartner Accessibility Scan',
  });

  generateCombinedReport(today);
};

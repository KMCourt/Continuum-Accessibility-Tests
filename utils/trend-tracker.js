/**
 * ===========================================
 * TREND TRACKER — Continuum
 * ===========================================
 * Tracks accessibility violation counts over time.
 * Saves a history JSON file and compares runs to
 * detect regressions (more violations than last run).
 * ===========================================
 */

const fs = require('fs');
const path = require('path');

// Stored at project root so it is tracked by git
// and not lost if the results folders are cleared.
const HISTORY_FILE = path.join(__dirname, '..', 'trend-history.json');

function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveHistory(history) {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

function getPreviousCounts(pageName, browserName) {
  const history = loadHistory();
  const key = `${pageName}__${browserName}`;
  const runs = history[key];
  if (!runs || runs.length === 0) return null;
  return runs[runs.length - 1].counts;
}

function recordRun({ page, browser, counts }) {
  const history = loadHistory();
  const key = `${page}__${browser}`;
  if (!history[key]) history[key] = [];
  history[key].push({
    date: new Date().toISOString(),
    counts,
  });
  if (history[key].length > 10) history[key] = history[key].slice(-10);
  saveHistory(history);
}

function isRegression(previousCounts, currentTotal) {
  if (!previousCounts) return false;
  return currentTotal > previousCounts.total;
}

module.exports = { getPreviousCounts, recordRun, isRegression };

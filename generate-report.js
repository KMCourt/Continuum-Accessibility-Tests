/**
 * generate-report.js
 * Builds scan-results-2026-03-10.html from all axe-core JSON result files.
 * Run: node generate-report.js
 */

const fs   = require('fs');
const path = require('path');

const DATE = '2026-03-10';

const APPS = [
  {
    name:       'ConManager',
    shortName:  'CM',
    dir:        'ConManager-accessibility-tests',
    resultsDir: `ConManager-accessibility-tests/ConManager-results/${DATE}`,
    color:      '#1976D2',
    lightColor: '#E3F2FD',
    url:        'https://ttc-eun-uat-c-manager-hub-as.azurewebsites.net',
  },
  {
    name:       'ConPartner',
    shortName:  'CP',
    dir:        'ConPartner-accessibility-tests',
    resultsDir: `ConPartner-accessibility-tests/ConPartner-results/${DATE}`,
    color:      '#388E3C',
    lightColor: '#E8F5E9',
    url:        'https://ttc-eun-uat-c-partner-hub-as.azurewebsites.net',
  },
  {
    name:       'ConDriver',
    shortName:  'CD',
    dir:        'ConDriver-accessibility-tests',
    resultsDir: `ConDriver-accessibility-tests/ConDriver-results/${DATE}`,
    color:      '#F57C00',
    lightColor: '#FFF3E0',
    url:        'https://ttc-eun-uat-c-employee-as.azurewebsites.net',
  },
];

const BROWSERS = ['chromium', 'firefox', 'edge'];

const BROWSER_ICONS = {
  chromium: '🌐',
  firefox:  '🦊',
  edge:     '🔷',
};

const IMPACT_COLORS = {
  critical: { bg: '#FFEBEE', text: '#B71C1C', border: '#EF5350' },
  serious:  { bg: '#FFF3E0', text: '#E65100', border: '#FF9800' },
  moderate: { bg: '#FFF9C4', text: '#F57F17', border: '#FDD835' },
  minor:    { bg: '#F3E5F5', text: '#4A148C', border: '#AB47BC' },
};

const RULE_DESCRIPTIONS = {
  'button-name':                  'Buttons must have discernible text so screen readers can announce their purpose to users.',
  'region':                       'All page content should be contained within landmark regions (main, nav, header, footer, etc.).',
  'aria-dialog-name':             'Elements with role="dialog" must have an accessible name via aria-label or aria-labelledby.',
  'color-contrast':               'Text must have a contrast ratio of at least 4.5:1 (normal text) or 3:1 (large text) against its background.',
  'color-contrast-enhanced':      'For enhanced (AAA) compliance, text must have a contrast ratio of at least 7:1 (normal) or 4.5:1 (large).',
  'heading-order':                'Heading levels (h1–h6) should only increase by one level at a time; skipping levels confuses screen reader navigation.',
  'landmark-one-main':            'Each page should have exactly one <main> landmark to help users navigate to primary content.',
  'page-has-heading-one':         'Each page should have at least one h1 heading to clearly identify its primary topic.',
  'image-alt':                    'Images must have meaningful alternative text so screen readers can convey the image content.',
  'aria-command-name':            'Interactive elements with command roles (button, link, menuitem) must have an accessible name.',
  'landmark-main-is-top-level':   'The <main> landmark should not be nested inside other landmark regions.',
  'landmark-no-duplicate-main':   'Each page must have at most one <main> landmark to avoid confusing screen reader navigation.',
  'landmark-unique':              'Each landmark region type should appear at most once, or have a unique accessible name to distinguish it.',
  'link-name':                    'Links must have discernible text so screen readers can announce where the link will take users.',
  'list':                         'List elements (<ul>, <ol>) must only contain <li> items or <script>/<template> elements.',
  'listitem':                     '<li> elements must be direct children of a <ul> or <ol> to maintain valid list structure.',
  'nested-interactive':           'Interactive elements (buttons, links) must not be nested inside other interactive elements.',
};

function toImgTag(relPath, alt, cls = '') {
  const exists = fs.existsSync(relPath);
  if (!exists) return '';
  const encoded = relPath.split('/').map(encodeURIComponent).join('/');
  return `<img src="${encoded}" alt="${alt}" class="screenshot ${cls}" loading="lazy" onclick="openLightbox(this.src)">`;
}

function impactBadge(impact) {
  const c = IMPACT_COLORS[impact] || { bg: '#eee', text: '#333', border: '#ccc' };
  return `<span class="badge" style="background:${c.bg};color:${c.text};border:1px solid ${c.border}">${impact.toUpperCase()}</span>`;
}

function truncate(html, max = 180) {
  if (!html || html.length <= max) return html;
  return html.slice(0, max) + '…';
}

// ─── Collect data ─────────────────────────────────────────────────────────────

const appData = [];

for (const app of APPS) {
  const jsonDir = path.join(app.resultsDir, 'json');
  if (!fs.existsSync(jsonDir)) { appData.push({ ...app, pages: [] }); continue; }

  const pageMap = {};

  for (const file of fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(jsonDir, file), 'utf8'));

    const key = raw.page;
    if (!pageMap[key]) {
      pageMap[key] = {
        name:        raw.page,
        url:         raw.url,
        regression:  false,
        summary:     { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 },
        browsers:    {},
      };
    }

    if (raw.regression) pageMap[key].regression = true;

    for (const k of Object.keys(raw.summary)) {
      pageMap[key].summary[k] = (pageMap[key].summary[k] || 0) + raw.summary[k];
    }

    const screenshotBase = path.join(app.resultsDir, 'screenshots');

    pageMap[key].browsers[raw.browser] = {
      summary:      raw.summary,
      violations:   raw.violations || [],
      screenshot:   path.join(screenshotBase, raw.screenshotFile || `${raw.page.toLowerCase().replace(/\s+/g, '_')}_${raw.browser}.png`).replace(/\\/g, '/'),
      elementShots: raw.elementScreenshots || {},
      screenshotBase: screenshotBase.replace(/\\/g, '/'),
    };
  }

  // Sort pages: Login first, then alphabetical
  const pages = Object.values(pageMap).sort((a, b) => {
    if (a.name === 'Login Page') return -1;
    if (b.name === 'Login Page') return  1;
    return a.name.localeCompare(b.name);
  });

  appData.push({ ...app, pages });
}

// ─── Totals ───────────────────────────────────────────────────────────────────

const grandTotal = { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 };
for (const app of appData) {
  app.totals = { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const page of app.pages) {
    // sum across browsers (divide by browser count to avoid triple-counting the display total)
    // Actually we show per-browser, so just sum for the app card display
    for (const b of BROWSERS) {
      const bd = page.browsers[b];
      if (!bd) continue;
      for (const k of Object.keys(app.totals)) app.totals[k] += bd.summary[k] || 0;
    }
  }
  for (const k of Object.keys(grandTotal)) grandTotal[k] += app.totals[k];
}

// ─── HTML generation helpers ──────────────────────────────────────────────────

function renderViolationCards(violations, elementShots, screenshotBase) {
  if (!violations || violations.length === 0) return '<p class="no-issues">No violations detected ✓</p>';
  return violations.map(v => {
    const desc = RULE_DESCRIPTIONS[v.id] || v.description || '';
    const shots = (elementShots[v.id] || []).filter(f => f).map((f, i) =>
      toImgTag(path.join(screenshotBase, f).replace(/\\/g, '/'), `${v.id} element ${i + 1}`, 'elem-shot')
    ).join('');

    const nodeRows = (v.nodes || []).slice(0, 3).map(n => `
      <tr>
        <td class="mono">${escHtml(truncate(n.html, 200))}</td>
        <td class="mono">${escHtml((n.target || []).join(', '))}</td>
        <td>${escHtml(n.failureSummary ? n.failureSummary.replace(/^Fix any of the following:\n\s*/i, '') : '')}</td>
      </tr>`).join('');

    const moreCount = (v.nodes || []).length - 3;

    return `
    <div class="violation-card impact-${v.impact}">
      <div class="vcard-header">
        ${impactBadge(v.impact)}
        <span class="rule-id">${escHtml(v.id)}</span>
        <a class="rule-link" href="${escHtml(v.helpUrl)}" target="_blank" rel="noopener">Deque docs ↗</a>
      </div>
      <p class="vcard-desc">${escHtml(desc)}</p>
      ${shots ? `<div class="elem-shots">${shots}</div>` : ''}
      <details class="node-details">
        <summary>${v.nodes.length} affected element${v.nodes.length !== 1 ? 's' : ''}</summary>
        <div class="table-wrap">
          <table class="node-table">
            <thead><tr><th>HTML snippet</th><th>Selector</th><th>How to fix</th></tr></thead>
            <tbody>${nodeRows}${moreCount > 0 ? `<tr><td colspan="3" class="more-row">… and ${moreCount} more element${moreCount !== 1 ? 's' : ''}</td></tr>` : ''}</tbody>
          </table>
        </div>
      </details>
    </div>`;
  }).join('');
}

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBrowserSection(pageName, browserName, bd, appColor) {
  if (!bd) return '';
  const pageImg = toImgTag(bd.screenshot, `${pageName} — ${browserName} screenshot`, 'page-shot');

  return `
  <div class="browser-section">
    <div class="browser-header" style="border-left:4px solid ${appColor}">
      <span class="browser-icon">${BROWSER_ICONS[browserName] || '🌐'}</span>
      <span class="browser-name">${browserName.charAt(0).toUpperCase() + browserName.slice(1)}</span>
      <div class="browser-pills">
        ${bd.summary.critical ? `<span class="pill critical">${bd.summary.critical} Critical</span>` : ''}
        ${bd.summary.serious  ? `<span class="pill serious">${bd.summary.serious} Serious</span>` : ''}
        ${bd.summary.moderate ? `<span class="pill moderate">${bd.summary.moderate} Moderate</span>` : ''}
        ${bd.summary.minor    ? `<span class="pill minor">${bd.summary.minor} Minor</span>` : ''}
        ${bd.summary.total === 0 ? `<span class="pill pass">✓ No violations</span>` : ''}
      </div>
    </div>
    ${pageImg ? `<div class="page-screenshot-wrap">${pageImg}</div>` : ''}
    <div class="violations-wrap">
      ${renderViolationCards(bd.violations, bd.elementShots, bd.screenshotBase)}
    </div>
  </div>`;
}

function renderPageSection(page, app) {
  const reg = page.regression
    ? `<span class="regression-tag">⚠ REGRESSION</span>`
    : '';

  const browserTabs = BROWSERS.filter(b => page.browsers[b]).map(b => `
    <button class="tab-btn" data-tab="tab-${sanitize(page.name)}-${b}" onclick="switchTab(this)">
      ${BROWSER_ICONS[b]} ${b.charAt(0).toUpperCase() + b.slice(1)}
      ${page.browsers[b]?.summary.total > 0
        ? `<span class="tab-count">${page.browsers[b].summary.total}</span>`
        : ''}
    </button>`).join('');

  const browserPanes = BROWSERS.filter(b => page.browsers[b]).map((b, i) => `
    <div class="tab-pane ${i === 0 ? 'active' : ''}" id="tab-${sanitize(page.name)}-${b}">
      ${renderBrowserSection(page.name, b, page.browsers[b], app.color)}
    </div>`).join('');

  return `
  <div class="page-section" id="${sanitize(app.name)}-${sanitize(page.name)}">
    <div class="page-header">
      <h3>${escHtml(page.name)} ${reg}</h3>
      <div class="page-meta">
        <span class="page-url">🔗 <a href="${escHtml(page.url)}" target="_blank" rel="noopener">${escHtml(page.url)}</a></span>
        <span class="page-summary">
          ${page.summary.critical ? `<span class="pill critical">${page.summary.critical} Critical</span>` : ''}
          ${page.summary.serious  ? `<span class="pill serious">${page.summary.serious} Serious</span>` : ''}
          ${page.summary.moderate ? `<span class="pill moderate">${page.summary.moderate} Moderate</span>` : ''}
          ${page.summary.minor    ? `<span class="pill minor">${page.summary.minor} Minor</span>` : ''}
        </span>
      </div>
    </div>
    <div class="tabs">
      <div class="tab-bar">${browserTabs}</div>
      ${browserPanes}
    </div>
  </div>`;
}

function renderAppSection(app) {
  const pagesSections = app.pages.map(p => renderPageSection(p, app)).join('');
  const hasReg = app.pages.some(p => p.regression);

  return `
<section class="app-section" id="app-${sanitize(app.name)}">
  <div class="app-section-header" style="background:${app.color}">
    <div class="app-title-row">
      <h2>${escHtml(app.name)}</h2>
      ${hasReg ? '<span class="regression-banner">⚠ Regressions detected</span>' : ''}
    </div>
    <div class="app-header-stats">
      <div class="stat-chip"><span class="stat-num">${app.totals.critical}</span><span class="stat-label">Critical</span></div>
      <div class="stat-chip"><span class="stat-num">${app.totals.serious}</span><span class="stat-label">Serious</span></div>
      <div class="stat-chip"><span class="stat-num">${app.totals.moderate}</span><span class="stat-label">Moderate</span></div>
      <div class="stat-chip"><span class="stat-num">${app.totals.minor}</span><span class="stat-label">Minor</span></div>
      <div class="stat-chip total"><span class="stat-num">${app.totals.total}</span><span class="stat-label">Total</span></div>
    </div>
  </div>
  <div class="app-body">${pagesSections}</div>
</section>`;
}

function sanitize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

function renderNav() {
  return appData.map(app => {
    const items = app.pages.map(p => `
      <li><a href="#${sanitize(app.name)}-${sanitize(p.name)}">${escHtml(p.name)}
        ${p.regression ? '<span class="nav-reg">!</span>' : ''}
      </a></li>`).join('');
    return `
    <li class="nav-app">
      <a href="#app-${sanitize(app.name)}" class="nav-app-link" style="color:${app.color}">
        ${escHtml(app.name)}
      </a>
      <ul>${items}</ul>
    </li>`;
  }).join('');
}

// ─── Assemble final HTML ──────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Continuum Accessibility Scan — ${DATE}</title>
<style>
  :root {
    --radius: 8px;
    --shadow: 0 2px 8px rgba(0,0,0,.12);
    --font: 'Segoe UI', system-ui, sans-serif;
    --mono: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: #F5F7FA; color: #212121; display: flex; min-height: 100vh; }

  /* ── Sidebar ── */
  #sidebar {
    width: 220px; min-width: 220px; background: #fff; border-right: 1px solid #E0E0E0;
    padding: 16px 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; z-index: 100;
  }
  #sidebar h1 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
    color: #757575; padding: 0 16px 12px; border-bottom: 1px solid #E0E0E0; }
  #sidebar ul { list-style: none; padding: 8px 0; }
  #sidebar li { padding: 0; }
  #sidebar a { display: block; padding: 5px 16px; font-size: 13px; color: #424242; text-decoration: none;
    border-radius: 0 20px 20px 0; transition: background .15s; }
  #sidebar a:hover { background: #F5F5F5; }
  .nav-app-link { font-weight: 600; font-size: 13px !important; margin-top: 6px; }
  .nav-app ul { padding-left: 12px; }
  .nav-app ul a { font-size: 12px; color: #616161; }
  .nav-reg { display:inline-block; background:#FF5722; color:#fff; border-radius:50%; width:14px;
    height:14px; font-size:9px; text-align:center; line-height:14px; margin-left:4px; }

  /* ── Main ── */
  #main { flex: 1; padding: 24px; overflow-x: hidden; }

  /* ── Page header ── */
  .report-header { background: linear-gradient(135deg, #1565C0 0%, #0D47A1 100%);
    color: #fff; border-radius: var(--radius); padding: 28px 32px; margin-bottom: 24px;
    box-shadow: var(--shadow); }
  .report-header h1 { font-size: 26px; font-weight: 700; letter-spacing: -.02em; }
  .report-header p  { margin-top: 6px; opacity: .85; font-size: 14px; }
  .header-meta { margin-top: 16px; display: flex; gap: 24px; flex-wrap: wrap; }
  .meta-item { background: rgba(255,255,255,.15); border-radius: 6px; padding: 8px 14px; font-size: 13px; }
  .meta-item strong { display: block; font-size: 22px; font-weight: 700; }

  /* ── Overview cards ── */
  .overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .overview-card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow);
    overflow: hidden; }
  .overview-card-header { padding: 14px 18px; color: #fff; font-weight: 600; font-size: 15px; }
  .overview-card-body { padding: 14px 18px; }
  .ov-row { display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0; border-bottom: 1px solid #F5F5F5; font-size: 13px; }
  .ov-row:last-child { border-bottom: none; }
  .ov-count { font-weight: 700; font-size: 15px; }

  /* ── App sections ── */
  .app-section { margin-bottom: 36px; border-radius: var(--radius); overflow: hidden;
    box-shadow: var(--shadow); }
  .app-section-header { padding: 18px 24px; color: #fff; }
  .app-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .app-title-row h2 { font-size: 20px; font-weight: 700; }
  .regression-banner { background: rgba(255,255,255,.25); border-radius: 4px; padding: 3px 10px;
    font-size: 12px; font-weight: 600; }
  .app-header-stats { display: flex; gap: 10px; flex-wrap: wrap; }
  .stat-chip { background: rgba(255,255,255,.18); border-radius: 6px; padding: 6px 14px;
    text-align: center; min-width: 70px; }
  .stat-chip.total { background: rgba(255,255,255,.32); }
  .stat-num   { display: block; font-size: 22px; font-weight: 700; }
  .stat-label { display: block; font-size: 11px; opacity: .85; text-transform: uppercase; }
  .app-body { background: #fff; }

  /* ── Page sections ── */
  .page-section { border-top: 1px solid #E0E0E0; padding: 20px 24px; }
  .page-header { margin-bottom: 12px; }
  .page-header h3 { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .page-meta { margin-top: 6px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px; }
  .page-url a { color: #1565C0; text-decoration: none; word-break: break-all; }
  .page-url a:hover { text-decoration: underline; }
  .page-summary { display: flex; gap: 6px; }

  /* ── Tabs ── */
  .tab-bar { display: flex; gap: 4px; border-bottom: 2px solid #E0E0E0; margin-bottom: 16px; flex-wrap: wrap; }
  .tab-btn { border: none; background: none; cursor: pointer; padding: 8px 16px; font-size: 13px;
    color: #757575; border-radius: 4px 4px 0 0; font-family: var(--font); transition: background .15s;
    display: flex; align-items: center; gap: 6px; }
  .tab-btn:hover { background: #F5F5F5; color: #212121; }
  .tab-btn.active { background: #E3F2FD; color: #1565C0; border-bottom: 2px solid #1565C0; font-weight: 600; }
  .tab-count { background: #EF5350; color: #fff; border-radius: 10px; padding: 1px 6px; font-size: 11px; font-weight: 700; }
  .tab-pane { display: none; }
  .tab-pane.active { display: block; }

  /* ── Browser section ── */
  .browser-section { margin-bottom: 8px; }
  .browser-header { display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: #FAFAFA; border-radius: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  .browser-icon { font-size: 18px; }
  .browser-name { font-weight: 600; font-size: 14px; }
  .browser-pills { display: flex; gap: 6px; flex-wrap: wrap; }

  /* ── Badges / Pills ── */
  .badge, .pill {
    display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px;
    font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  }
  .pill.critical, .badge.critical { background: #FFEBEE; color: #B71C1C; border: 1px solid #EF5350; }
  .pill.serious,  .badge.serious  { background: #FFF3E0; color: #E65100; border: 1px solid #FF9800; }
  .pill.moderate, .badge.moderate { background: #FFF9C4; color: #F57F17; border: 1px solid #FDD835; }
  .pill.minor,    .badge.minor    { background: #F3E5F5; color: #4A148C; border: 1px solid #AB47BC; }
  .pill.pass { background: #E8F5E9; color: #1B5E20; border: 1px solid #66BB6A; }
  .regression-tag { background: #FF5722; color: #fff; border-radius: 4px; padding: 2px 8px;
    font-size: 11px; font-weight: 700; }

  /* ── Violation cards ── */
  .violations-wrap { display: flex; flex-direction: column; gap: 12px; }
  .violation-card { border-radius: 6px; padding: 14px 16px; border-left: 4px solid; }
  .violation-card.impact-critical { background: #FFEBEE; border-color: #EF5350; }
  .violation-card.impact-serious  { background: #FFF3E0; border-color: #FF9800; }
  .violation-card.impact-moderate { background: #FFFDE7; border-color: #FDD835; }
  .violation-card.impact-minor    { background: #F3E5F5; border-color: #AB47BC; }
  .vcard-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .rule-id { font-family: var(--mono); font-size: 13px; font-weight: 600; }
  .rule-link { margin-left: auto; font-size: 12px; color: #1565C0; text-decoration: none; white-space: nowrap; }
  .rule-link:hover { text-decoration: underline; }
  .vcard-desc { font-size: 13px; color: #424242; margin-bottom: 10px; line-height: 1.5; }
  .no-issues { color: #2E7D32; font-size: 13px; padding: 8px 0; }

  /* ── Screenshots ── */
  .page-screenshot-wrap { margin-bottom: 14px; }
  .screenshot { border: 1px solid #E0E0E0; border-radius: 6px; cursor: pointer;
    transition: box-shadow .15s; display: block; }
  .screenshot:hover { box-shadow: 0 4px 16px rgba(0,0,0,.2); }
  .page-shot { max-width: 100%; max-height: 320px; object-fit: contain; }
  .elem-shots { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .elem-shot { max-width: 280px; max-height: 160px; object-fit: contain; }

  /* ── Node table ── */
  .node-details summary { cursor: pointer; font-size: 13px; color: #1565C0; padding: 4px 0;
    user-select: none; }
  .node-details summary:hover { text-decoration: underline; }
  .table-wrap { overflow-x: auto; margin-top: 8px; }
  .node-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .node-table th { background: #ECEFF1; padding: 6px 10px; text-align: left;
    font-weight: 600; white-space: nowrap; }
  .node-table td { padding: 6px 10px; border-top: 1px solid #E0E0E0;
    vertical-align: top; word-break: break-word; max-width: 400px; line-height: 1.4; }
  .mono { font-family: var(--mono); font-size: 11px; }
  .more-row td { color: #757575; font-style: italic; text-align: center; }

  /* ── Lightbox ── */
  #lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.85);
    z-index: 9999; align-items: center; justify-content: center; }
  #lightbox.open { display: flex; }
  #lightbox img { max-width: 92vw; max-height: 92vh; border-radius: 6px;
    box-shadow: 0 8px 40px rgba(0,0,0,.5); }
  #lightbox-close { position: absolute; top: 16px; right: 24px; color: #fff;
    font-size: 32px; cursor: pointer; line-height: 1; }

  @media (max-width: 720px) {
    #sidebar { display: none; }
    #main { padding: 12px; }
  }
</style>
</head>
<body>

<nav id="sidebar">
  <h1>Navigation</h1>
  <ul>${renderNav()}</ul>
</nav>

<div id="main">

  <div class="report-header">
    <h1>Continuum Accessibility Scan Report</h1>
    <p>WCAG 2.0 / 2.1 / 2.2 AA · axe-core 4.11 · Playwright · ${DATE}</p>
    <div class="header-meta">
      <div class="meta-item"><strong>${grandTotal.total}</strong>Total Issues</div>
      <div class="meta-item"><strong>${grandTotal.critical}</strong>Critical</div>
      <div class="meta-item"><strong>${grandTotal.serious}</strong>Serious</div>
      <div class="meta-item"><strong>${grandTotal.moderate}</strong>Moderate</div>
      <div class="meta-item"><strong>3</strong>Apps Scanned</div>
      <div class="meta-item"><strong>3</strong>Browsers</div>
    </div>
  </div>

  <div class="overview-grid">
    ${appData.map(app => `
    <div class="overview-card">
      <div class="overview-card-header" style="background:${app.color}">${escHtml(app.name)}</div>
      <div class="overview-card-body">
        <div class="ov-row"><span>Pages scanned</span><span class="ov-count">${app.pages.length}</span></div>
        <div class="ov-row"><span>Critical</span><span class="ov-count" style="color:#B71C1C">${app.totals.critical}</span></div>
        <div class="ov-row"><span>Serious</span><span class="ov-count" style="color:#E65100">${app.totals.serious}</span></div>
        <div class="ov-row"><span>Moderate</span><span class="ov-count" style="color:#F57F17">${app.totals.moderate}</span></div>
        <div class="ov-row"><span>Minor</span><span class="ov-count" style="color:#4A148C">${app.totals.minor}</span></div>
        <div class="ov-row"><span><strong>Total</strong></span><span class="ov-count"><strong>${app.totals.total}</strong></span></div>
      </div>
    </div>`).join('')}
  </div>

  ${appData.map(renderAppSection).join('')}

</div><!-- /#main -->

<div id="lightbox" onclick="closeLightbox()">
  <span id="lightbox-close" onclick="closeLightbox()">×</span>
  <img id="lightbox-img" src="" alt="Screenshot">
</div>

<script>
  // Tab switching
  function switchTab(btn) {
    const tabId = btn.dataset.tab;
    const tabBar = btn.closest('.tab-bar');
    tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tabs = btn.closest('.tabs');
    tabs.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const pane = document.getElementById(tabId);
    if (pane) pane.classList.add('active');
  }

  // Activate first tab in each tab group on load
  document.querySelectorAll('.tab-bar').forEach(bar => {
    const first = bar.querySelector('.tab-btn');
    if (first) first.classList.add('active');
  });

  // Lightbox
  function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.add('open');
  }
  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
</script>
</body>
</html>`;

fs.writeFileSync('scan-results-2026-03-10.html', html, 'utf8');
console.log('✅  scan-results-2026-03-10.html written —', Math.round(html.length / 1024), 'KB');
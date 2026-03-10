/**
 * ===========================================
 * HTML REPORT GENERATOR — Continuum
 * ===========================================
 * Generates a single consolidated HTML report
 * containing all pages, all browsers, all
 * violations and copy-ready bug tickets.
 *
 * Pass reportLabel to customise the header title
 * e.g. 'TTC Continuum — ConPartner'
 * ===========================================
 */

const fs = require('fs');
const path = require('path');

function toBase64(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
}

function generateConsolidatedReport({ allResults, regressions, reportPath, today, reportLabel = 'TTC Continuum Accessibility' }) {
  const date = new Date().toLocaleString('en-GB');
  const screenshotsDir = path.join(path.dirname(reportPath), 'screenshots');

  const pageGroups = {};
  const pageOrder = [];
  for (const r of allResults) {
    if (!pageGroups[r.page]) {
      pageGroups[r.page] = [];
      pageOrder.push(r.page);
    }
    pageGroups[r.page].push(r);
  }

  const totalViolations  = allResults.reduce((s, r) => s + r.counts.total,    0);
  const totalCritical    = allResults.reduce((s, r) => s + r.counts.critical,  0);
  const totalSerious     = allResults.reduce((s, r) => s + r.counts.serious,   0);
  const totalModerate    = allResults.reduce((s, r) => s + r.counts.moderate,  0);
  const totalMinor       = allResults.reduce((s, r) => s + r.counts.minor,     0);

  const navLinks = pageOrder.map(pageName => {
    const results  = pageGroups[pageName];
    const pageId   = pageName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const pageTot  = results.reduce((s, r) => s + r.counts.total,    0);
    const pageCrit = results.reduce((s, r) => s + r.counts.critical,  0);
    const pageSer  = results.reduce((s, r) => s + r.counts.serious,   0);
    const isReg    = regressions.some(x => x.page === pageName);
    const colour   = pageTot === 0 ? '#2e7d32' : pageCrit > 0 ? '#cc0000' : pageSer > 0 ? '#e65100' : '#f9a825';
    const browsers = results.map(r => r.browser).join(' · ');
    return `
      <a href="#${pageId}" style="display:block;padding:7px 12px;text-decoration:none;color:#222;border-radius:4px;font-size:13px;border-left:3px solid ${colour};margin-bottom:4px;background:white;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='white'">
        ${isReg ? '⚠️ ' : ''}<strong>${pageName}</strong><br>
        <span style="font-size:11px;color:#888;">${pageTot} issue${pageTot !== 1 ? 's' : ''} &nbsp;·&nbsp; ${browsers}</span>
      </a>`;
  }).join('');

  function buildBrowserPanel(r, pageId) {
    const isReg = regressions.some(x => x.page === r.page && x.browser === r.browser);

    const trend = r.previousCounts
      ? r.counts.total > r.previousCounts.total
        ? `<span style="color:#cc0000">▲ +${r.counts.total - r.previousCounts.total} from last run</span>`
        : r.counts.total < r.previousCounts.total
        ? `<span style="color:#2e7d32">▼ -${r.previousCounts.total - r.counts.total} from last run</span>`
        : `<span style="color:#555">= Same as last run</span>`
      : `<span style="color:#555">First run</span>`;

    const cardStyle = (bg, border) =>
      `background:${bg};border:2px solid ${border};border-radius:6px;padding:14px 20px;text-align:center;min-width:110px;flex:1;`;

    const summaryCards = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:18px 0;">
        <div style="${cardStyle('#f5f5f5','#aaa')}"><div style="font-size:28px;font-weight:bold;">${r.counts.total}</div><div style="font-size:12px;font-weight:bold;color:#555;">Total</div></div>
        <div style="${cardStyle('#ffe0e0','#cc0000')}"><div style="font-size:28px;font-weight:bold;color:#cc0000;">${r.counts.critical}</div><div style="font-size:12px;font-weight:bold;color:#cc0000;">Critical</div></div>
        <div style="${cardStyle('#fff3e0','#e65100')}"><div style="font-size:28px;font-weight:bold;color:#e65100;">${r.counts.serious}</div><div style="font-size:12px;font-weight:bold;color:#e65100;">Serious</div></div>
        <div style="${cardStyle('#fffde7','#f9a825')}"><div style="font-size:28px;font-weight:bold;color:#f9a825;">${r.counts.moderate}</div><div style="font-size:12px;font-weight:bold;color:#f9a825;">Moderate</div></div>
        <div style="${cardStyle('#f1f8e9','#558b2f')}"><div style="font-size:28px;font-weight:bold;color:#558b2f;">${r.counts.minor}</div><div style="font-size:12px;font-weight:bold;color:#558b2f;">Minor</div></div>
      </div>`;

    const violationsHtml = r.violations.length === 0
      ? '<div style="background:#e8f5e9;border-left:5px solid #2e7d32;padding:18px;border-radius:4px;font-weight:bold;color:#2e7d32;">✅ No violations found</div>'
      : r.violations.map((v, index) => {
          const impactColour = { critical:'#cc0000', serious:'#e65100', moderate:'#f9a825', minor:'#558b2f' }[v.impact] || '#555';
          const wcagTags = v.tags?.filter(t => t.startsWith('wcag')).join(', ') || 'N/A';
          const helpUrl  = v.helpUrl || '';

          const nodesHtml = v.nodes.map(n => `
            <div style="background:#f5f5f5;padding:10px;border-radius:4px;margin:6px 0;font-size:12px;line-height:1.6;">
              <strong>Target:</strong> <code>${n.target?.join(', ') || 'N/A'}</code><br>
              <strong>HTML:</strong> <code style="word-break:break-all;">${(n.html || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code><br>
              ${n.failureSummary ? `<strong>Fix:</strong> ${n.failureSummary}` : ''}
            </div>`).join('');

          const elementShotHtml = (r.elementScreenshots[v.id] || [])
            .filter(Boolean)
            .map(f => {
              const src = toBase64(path.join(screenshotsDir, f));
              return src ? `<img src="${src}" alt="Element screenshot" style="max-width:100%;border:1px solid #ddd;margin:4px 0;border-radius:4px;">` : '';
            }).join('');

          const ticketText = `TITLE: [Accessibility] ${v.id} — ${r.page} (${r.browser})

TYPE: Accessibility Bug
SEVERITY: ${(v.impact||'').toUpperCase()}
WCAG CRITERION: ${wcagTags}
PAGE: ${r.page}
URL: ${r.url}
BROWSER: ${r.browser}
DETECTED: ${date}

DESCRIPTION:
${v.description}

STEPS TO REPRODUCE:
1. Open ${r.url} in ${r.browser}
2. Inspect the element(s) listed below using browser DevTools or a screen reader
3. Observe that the accessibility requirement is not met

AFFECTED ELEMENTS (${v.nodes.length}):
${v.nodes.map((n,i) => `  Element ${i+1}:\n  Target: ${n.target?.join(', ')||'N/A'}\n  HTML: ${n.html||'N/A'}\n  Fix: ${n.failureSummary||'N/A'}`).join('\n\n')}

EXPECTED BEHAVIOUR:
${v.description}

ACTUAL BEHAVIOUR:
${v.nodes[0]?.failureSummary || 'Element does not meet the required accessibility standard.'}

SUGGESTED FIX:
${v.nodes.map(n=>n.failureSummary).filter(Boolean).join('\n') || 'See WCAG guidance.'}

REFERENCE: ${helpUrl}`;

          const ticketId = `ticket-${pageId}-${r.browser}-${index}`;

          return `
            <div style="border:1px solid #ddd;border-left:4px solid ${impactColour};border-radius:4px;padding:16px;margin-bottom:16px;background:white;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                <div>
                  <strong style="font-size:14px;">${v.id}</strong>
                  ${helpUrl ? `<a href="${helpUrl}" target="_blank" style="font-size:11px;color:#0b3c6e;margin-left:8px;">WCAG guidance ↗</a>` : ''}
                </div>
                <span style="background:${impactColour};color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:bold;text-transform:uppercase;white-space:nowrap;">${v.impact}</span>
              </div>
              <p style="margin:4px 0 8px;color:#444;font-size:13px;">${v.description}</p>
              <p style="margin:0;font-size:12px;color:#666;"><strong>WCAG:</strong> ${wcagTags} &nbsp;|&nbsp; <strong>Affected elements:</strong> ${v.nodes.length}</p>

              <details style="margin-top:12px;">
                <summary style="cursor:pointer;font-size:13px;color:#0b3c6e;font-weight:bold;padding:4px 0;">▶ View affected elements</summary>
                <div style="margin-top:8px;">${nodesHtml}${elementShotHtml}</div>
              </details>

              <details style="margin-top:8px;">
                <summary style="cursor:pointer;font-size:13px;color:#0b3c6e;font-weight:bold;padding:4px 0;">📋 Copy bug ticket</summary>
                <div style="margin-top:10px;position:relative;">
                  <button onclick="copyTicket('${ticketId}')" style="position:absolute;top:8px;right:8px;background:#0b3c6e;color:white;border:none;border-radius:4px;padding:6px 14px;font-size:12px;cursor:pointer;">Copy</button>
                  <pre id="${ticketId}" style="background:#f8f8f8;border:1px solid #e0e0e0;border-radius:4px;padding:14px;font-size:11px;white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.7;">${ticketText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
                </div>
              </details>
            </div>`;
        }).join('');

    return `
      <div style="padding:20px;background:#fafafa;">
        <table style="width:100%;font-size:13px;margin-bottom:4px;">
          <tr><td style="width:130px;font-weight:bold;padding:4px 0;color:#555;">URL</td><td><a href="${r.url}" target="_blank" style="color:#0b3c6e;">${r.url}</a></td></tr>
          <tr><td style="font-weight:bold;padding:4px 0;color:#555;">Standard</td><td>WCAG 2.2 AA</td></tr>
          <tr><td style="font-weight:bold;padding:4px 0;color:#555;">Scanned</td><td>${date}</td></tr>
          <tr><td style="font-weight:bold;padding:4px 0;color:#555;">Trend</td><td>${trend}</td></tr>
          ${isReg ? `<tr><td style="font-weight:bold;padding:4px 0;color:#cc0000;">Status</td><td style="color:#cc0000;font-weight:bold;">⚠️ Regression detected</td></tr>` : ''}
        </table>

        ${summaryCards}

        ${r.screenshotFile ? `
        <details style="margin-bottom:16px;">
          <summary style="cursor:pointer;font-size:13px;color:#0b3c6e;font-weight:bold;padding:4px 0;">🖼 Page screenshot</summary>
          <img src="${toBase64(path.join(screenshotsDir, r.screenshotFile)) || ''}" alt="Screenshot of ${r.page}" style="max-width:100%;border:1px solid #ddd;border-radius:6px;margin-top:8px;">
        </details>` : ''}

        <h3 style="font-size:15px;border-bottom:1px solid #e0e0e0;padding-bottom:6px;color:#0b3c6e;">Violations (${r.counts.total})</h3>
        ${violationsHtml}
      </div>`;
  }

  const pageSections = pageOrder.map(pageName => {
    const results  = pageGroups[pageName];
    const pageId   = pageName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const isReg    = regressions.some(x => x.page === pageName);
    const pageTot  = results.reduce((s, r) => s + r.counts.total, 0);

    const tabButtons = results.map((r, i) => {
      const tabColour = r.counts.total === 0 ? '#2e7d32' : r.counts.critical > 0 ? '#cc0000' : r.counts.serious > 0 ? '#e65100' : '#f9a825';
      const active = i === 0;
      return `
        <button
          id="tab-btn-${pageId}-${r.browser}"
          onclick="showTab('${pageId}','${r.browser}')"
          style="padding:9px 18px;border:none;border-bottom:3px solid ${active ? '#0b3c6e' : 'transparent'};background:${active ? 'white' : '#f0f2f5'};color:${active ? '#0b3c6e' : '#555'};cursor:pointer;font-size:13px;font-weight:${active ? 'bold' : 'normal'};border-radius:4px 4px 0 0;margin-right:2px;transition:background 0.15s;">
          ${r.browser}
          <span style="display:inline-block;margin-left:6px;background:${tabColour};color:white;border-radius:10px;padding:1px 7px;font-size:11px;font-weight:bold;">${r.counts.total}</span>
        </button>`;
    }).join('');

    const tabPanels = results.map((r, i) => `
      <div id="panel-${pageId}-${r.browser}" style="display:${i === 0 ? 'block' : 'none'};border:1px solid #ddd;border-radius:0 4px 4px 4px;">
        ${buildBrowserPanel(r, pageId)}
      </div>`).join('');

    return `
      <section id="${pageId}" style="margin-bottom:48px;">
        <div style="background:#0b3c6e;color:white;padding:16px 20px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h2 style="margin:0;font-size:18px;color:white;border:none;padding:0;">${pageName} ${isReg ? '⚠️' : ''}</h2>
            <span style="font-size:12px;opacity:0.8;">${pageTot} violation${pageTot !== 1 ? 's' : ''} across ${results.length} browser${results.length !== 1 ? 's' : ''}</span>
          </div>
          <a href="#top" style="color:#aad4f5;font-size:12px;text-decoration:none;">↑ Back to top</a>
        </div>
        <div style="background:#f0f2f5;padding:8px 8px 0;border:1px solid #ddd;border-top:none;">
          ${tabButtons}
        </div>
        ${tabPanels}
      </section>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report — ${today}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; color: #222; background: #f0f2f5; }
    a { color: #0b3c6e; }
    code { background: #f4f4f4; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
    details > summary { list-style: none; }
    details > summary::-webkit-details-marker { display: none; }
    #top { display: flex; min-height: 100vh; }
    #sidebar { width: 280px; min-width: 280px; background: #f8f9fb; border-right: 1px solid #e0e0e0; padding: 20px 16px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    #main { flex: 1; padding: 28px 32px; max-width: 900px; }
    #header { background: #0b3c6e; color: white; padding: 18px 24px; border-radius: 8px; margin-bottom: 24px; }
    #header h1 { margin: 0; font-size: 20px; }
    #header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  </style>
</head>
<body>
<div id="top">

  <div id="sidebar">
    <div style="margin-bottom:20px;">
      <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:8px;">Total violations</div>
      <div style="font-size:36px;font-weight:bold;color:${totalViolations === 0 ? '#2e7d32' : '#cc0000'};">${totalViolations}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;font-size:12px;">
      <span style="background:#ffe0e0;color:#cc0000;padding:3px 8px;border-radius:4px;font-weight:bold;">${totalCritical} Critical</span>
      <span style="background:#fff3e0;color:#e65100;padding:3px 8px;border-radius:4px;font-weight:bold;">${totalSerious} Serious</span>
      <span style="background:#fffde7;color:#f9a825;padding:3px 8px;border-radius:4px;font-weight:bold;">${totalModerate} Moderate</span>
      <span style="background:#f1f8e9;color:#558b2f;padding:3px 8px;border-radius:4px;font-weight:bold;">${totalMinor} Minor</span>
    </div>
    <div style="font-size:11px;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:10px;">Pages scanned</div>
    ${navLinks}
    <div style="margin-top:20px;font-size:11px;color:#aaa;border-top:1px solid #e0e0e0;padding-top:12px;">
      ${regressions.length > 0
        ? `<span style="color:#cc0000;">⚠️ ${regressions.length} regression${regressions.length > 1 ? 's' : ''} detected</span>`
        : `<span style="color:#2e7d32;">✅ No regressions</span>`}
    </div>
  </div>

  <div id="main">
    <div id="header">
      <h1>♿ ${reportLabel}</h1>
      <p>WCAG 2.2 AA &nbsp;|&nbsp; Chrome, Firefox, Edge &nbsp;|&nbsp; ${date}</p>
    </div>

    <p style="font-size:13px;color:#666;margin-bottom:24px;background:white;padding:12px 16px;border-radius:6px;border:1px solid #e0e0e0;">
      Use the sidebar to jump to any page. Click the browser tabs within each section to switch between results.
      Each violation has a <strong>📋 Copy bug ticket</strong> section — expand it and click <strong>Copy</strong> to get a pre-filled ticket ready to paste into your tracking tool.
    </p>

    ${pageSections}

    <p style="color:#aaa;font-size:11px;text-align:center;margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;">
      Generated by TTC Accessibility Test Suite — ${date}
    </p>
  </div>
</div>

<script>
  function showTab(pageId, browser) {
    document.querySelectorAll('[id^="panel-' + pageId + '-"]').forEach(p => p.style.display = 'none');
    document.querySelectorAll('[id^="tab-btn-' + pageId + '-"]').forEach(btn => {
      btn.style.borderBottom = '3px solid transparent';
      btn.style.background = '#f0f2f5';
      btn.style.color = '#555';
      btn.style.fontWeight = 'normal';
    });
    const panel = document.getElementById('panel-' + pageId + '-' + browser);
    if (panel) panel.style.display = 'block';
    const tab = document.getElementById('tab-btn-' + pageId + '-' + browser);
    if (tab) {
      tab.style.borderBottom = '3px solid #0b3c6e';
      tab.style.background = 'white';
      tab.style.color = '#0b3c6e';
      tab.style.fontWeight = 'bold';
    }
  }

  function copyTicket(id) {
    const el = document.getElementById(id);
    navigator.clipboard.writeText(el.innerText).then(() => {
      const btn = el.previousElementSibling;
      btn.textContent = '✓ Copied!';
      btn.style.background = '#2e7d32';
      setTimeout(() => { btn.textContent = 'Copy'; btn.style.background = '#0b3c6e'; }, 2000);
    });
  }
</script>
</body>
</html>`;

  fs.writeFileSync(reportPath, html, 'utf8');
}

module.exports = { generateConsolidatedReport };

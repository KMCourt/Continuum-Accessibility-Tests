/**
 * ===========================================
 * TEAMS NOTIFICATION — Continuum
 * ===========================================
 * Posts accessibility scan results to a
 * Microsoft Teams channel via Power Automate webhook.
 * ===========================================
 */

async function postToTeams({ webhookUrl, summaryData, today, regressions, label = 'Accessibility Scan', topRule }) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (!webhookUrl) {
    console.log('\n⚠️  No Teams webhook URL found — skipping notification.');
    console.log('   Add TEAMS_WEBHOOK_URL to your .env file to enable Teams notifications.');
    return;
  }

  const totalViolations = summaryData.reduce((s, r) => s + (r.total    || 0), 0);
  const totalCritical   = summaryData.reduce((s, r) => s + (r.critical || 0), 0);
  const totalSerious    = summaryData.reduce((s, r) => s + (r.serious  || 0), 0);
  const totalModerate   = summaryData.reduce((s, r) => s + (r.moderate || 0), 0);
  const totalMinor      = summaryData.reduce((s, r) => s + (r.minor    || 0), 0);

  const passCount = summaryData.filter(r => r.total === 0).length;
  const passRate  = summaryData.length > 0 ? Math.round((passCount / summaryData.length) * 100) : 0;

  const hasRegressions  = regressions && regressions.length > 0;
  const regressionNames = hasRegressions
    ? regressions.map(r => `${r.page} (${r.browser})`).join(', ')
    : 'None';

  const resultRows = summaryData.map(r => {
    const isRegression = regressions?.some(x => x.page === r.page && x.browser === r.browser);

    let trend = '→';
    let trendColor = 'Default';
    if (r.previousCounts && r.previousCounts.total !== undefined) {
      if (r.total > r.previousCounts.total)      { trend = '↑'; trendColor = 'Attention'; }
      else if (r.total < r.previousCounts.total) { trend = '↓'; trendColor = 'Good'; }
    }

    return {
      type: 'ColumnSet',
      columns: [
        { type: 'Column', width: 'stretch', items: [{ type: 'TextBlock', text: `${r.page} — ${r.browser}`, wrap: true, size: 'Small' }] },
        { type: 'Column', width: 'auto',    items: [{ type: 'TextBlock', text: String(r.total),    color: r.total    > 0 ? 'Warning'   : 'Good',      size: 'Small' }] },
        { type: 'Column', width: 'auto',    items: [{ type: 'TextBlock', text: String(r.critical), color: r.critical > 0 ? 'Attention' : 'Good',      size: 'Small' }] },
        { type: 'Column', width: 'auto',    items: [{ type: 'TextBlock', text: trend,              color: trendColor,                                  size: 'Small' }] },
        { type: 'Column', width: 'auto',    items: [{ type: 'TextBlock', text: isRegression ? '⚠️' : '✅',                                             size: 'Small' }] },
      ],
      separator: true,
    };
  });

  const facts = [
    { title: 'Total violations', value: String(totalViolations) },
    { title: 'Critical',         value: String(totalCritical) },
    { title: 'Serious',          value: String(totalSerious) },
    { title: 'Moderate',         value: String(totalModerate) },
    { title: 'Minor',            value: String(totalMinor) },
    { title: 'Pass rate',        value: `${passRate}% (${passCount} of ${summaryData.length} scans clean)` },
    { title: 'Regressions',      value: regressionNames },
    { title: 'Pages scanned',    value: String(summaryData.length) },
  ];

  if (topRule) facts.push({ title: 'Top issue', value: topRule });

  const card = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: `♿ ${label} — ${today} at ${time}`,
        weight: 'Bolder',
        size: 'Large',
        color: hasRegressions ? 'Warning' : 'Accent',
        wrap: true,
      },
      {
        type: 'FactSet',
        facts,
      },
      {
        type: 'TextBlock',
        text: 'Results by page & browser',
        weight: 'Bolder',
        size: 'Small',
        spacing: 'Medium',
      },
      {
        type: 'ColumnSet',
        columns: [
          { type: 'Column', width: 'stretch', items: [{ type: 'TextBlock', text: 'Page — Browser', weight: 'Bolder', size: 'Small' }] },
          { type: 'Column', width: 'auto',    items: [{ type: 'TextBlock', text: 'Total',          weight: 'Bolder', size: 'Small' }] },
          { type: 'Column', width: 'auto',    items: [{ type: 'TextBlock', text: 'Crit',           weight: 'Bolder', size: 'Small' }] },
          { type: 'Column', width: 'auto',    items: [{ type: 'TextBlock', text: 'Trend',          weight: 'Bolder', size: 'Small' }] },
          { type: 'Column', width: 'auto',    items: [{ type: 'TextBlock', text: 'OK?',            weight: 'Bolder', size: 'Small' }] },
        ],
      },
      ...resultRows,
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    if (response.ok) {
      console.log('\n✅ Teams notification sent successfully.');
    } else {
      const text = await response.text().catch(() => '');
      console.log(`\n⚠️  Teams notification failed — status: ${response.status} ${text}`);
    }
  } catch (err) {
    console.log(`\n⚠️  Teams notification error: ${err.message}`);
  }
}

module.exports = { postToTeams };

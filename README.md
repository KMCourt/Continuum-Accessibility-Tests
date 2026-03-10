# TTC Continuum Accessibility Testing

Automated and manual accessibility tests for the **TTC Continuum Platform** — covering **ConPartner**, **ConManager**, and **ConDriver**.

Tests check against **WCAG 2.2 AA** — covering the full standard through automated axe-core scans and manual checklists.

---

## Project Structure

```
continuum-accessibility-testing/
│
├── ConPartner-accessibility-tests/
│   ├── accessibility-scan.spec.js      ← Automated scan — Chrome, Firefox, Edge
│   └── ConPartner-results/             ← Generated reports (gitignored)
│       └── YYYY-MM-DD/
│           ├── report.html
│           ├── json/
│           └── screenshots/
│
├── ConManager-accessibility-tests/
│   ├── accessibility-scan.spec.js      ← Automated scan — Chrome, Firefox, Edge
│   └── ConManager-results/             ← Generated reports (gitignored)
│       └── YYYY-MM-DD/
│           ├── report.html
│           ├── json/
│           └── screenshots/
│
├── ConDriver-accessibility-tests/
│   ├── accessibility-scan.spec.js      ← Automated scan — Chrome, Firefox, Edge
│   └── ConDriver-results/              ← Generated reports (gitignored)
│       └── YYYY-MM-DD/
│           ├── report.html
│           ├── json/
│           └── screenshots/
│
├── utils/
│   ├── conpartner-teardown.js          ← Builds HTML report after ConPartner tests
│   ├── conmanager-teardown.js          ← Builds HTML report after ConManager tests
│   ├── condriver-teardown.js           ← Builds HTML report after ConDriver tests
│   ├── report-generator.js             ← HTML report template
│   ├── trend-tracker.js                ← Tracks violation counts over time
│   ├── teams-notify.js                 ← Posts results summary to MS Teams
│   └── testmail.js                     ← Retrieves OTP codes from testmail.app
│
├── trend-history.json                  ← Violation trend history (tracked in git)
├── conpartner.config.js                ← Playwright config for ConPartner
├── conmanager.config.js                ← Playwright config for ConManager
├── condriver.config.js                 ← Playwright config for ConDriver
├── .env                                ← Your local credentials (gitignored — see .env.example)
└── .env.example                        ← Template for setting up .env
```

---

## Applications Under Test

| Project | URL |
|---------|-----|
| ConPartner | https://ttc-eun-uat-c-partner-hub-as.azurewebsites.net/ |
| ConManager | https://ttc-eun-uat-c-manager-hub-as.azurewebsites.net/ |
| ConDriver  | https://ttc-eun-uat-c-employee-as.azurewebsites.net/ |

---

## Accessibility Standards Covered

| Standard | Automated | Manual checklist |
|----------|-----------|-----------------|
| WCAG 2.0 A | ✅ | ✅ |
| WCAG 2.0 AA | ✅ | ✅ |
| WCAG 2.1 AA | ✅ | ✅ |
| WCAG 2.2 AA | ✅ | ✅ |

---

## Understanding the Reports

After each run a report is generated per project:

| Project | Report location |
|---------|----------------|
| ConPartner | `ConPartner-accessibility-tests/ConPartner-results/YYYY-MM-DD/report.html` |
| ConManager | `ConManager-accessibility-tests/ConManager-results/YYYY-MM-DD/report.html` |
| ConDriver  | `ConDriver-accessibility-tests/ConDriver-results/YYYY-MM-DD/report.html` |

Each report groups results by page. Every violation includes a description, a screenshot of the affected element, and a pre-written bug ticket ready to copy into Jira.

### Severity levels

| Level | Meaning |
|-------|---------|
| 🔴 Critical | Blocks users entirely — fix immediately |
| 🟠 Serious | Significantly impairs use — fix as soon as possible |
| 🟡 Moderate | Causes difficulty — fix in next sprint |
| ⚪ Minor | Minor annoyance — fix when convenient |

---

## Questions or Issues

Speak to the QA team lead or raise an issue in the [GitHub repository](https://github.com/KMCourt/Continuum-Accessibility-Tests).

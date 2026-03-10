# Continuum Accessibility Testing — VS Code Setup Guide

---

## Prerequisites

- [Node.js](https://nodejs.org) LTS version
- [VS Code](https://code.visualstudio.com)
- Testmail.app credentials (contact the QA team lead)
- Microsoft Teams webhook URL (contact the QA team lead)

---

## First-Time Setup

**1. Clone the repository**
```bash
git clone https://github.com/KMCourt/Continuum-Accessibility-Tests.git
cd continuum-accessibility-testing
```

**2. Install Node dependencies**
```bash
npm install
```

**3. Install desktop browsers**
```bash
npx playwright install chromium firefox msedge
```

**4. Configure environment variables**
```bash
cp .env.example .env
```
Open `.env` in VS Code and fill in the values — contact the QA team lead for credentials:
```
TESTMAIL_API_KEY=your-key-here
TESTMAIL_NAMESPACE=your-namespace
TESTMAIL_TAG=test
TEAMS_WEBHOOK_URL=your-power-automate-url
```

---

## Running ConPartner Tests

```bash
npx playwright test --config=conpartner.config.js
```

### Single browser
```bash
npx playwright test --config=conpartner.config.js --project=chromium
npx playwright test --config=conpartner.config.js --project=firefox
npx playwright test --config=conpartner.config.js --project=edge
```

### Specific page
```bash
npx playwright test --config=conpartner.config.js --grep "Home Page"
```

**Report saved to:**
```
ConPartner-accessibility-tests/ConPartner-results/YYYY-MM-DD/report.html
```

---

## Running ConManager Tests

```bash
npx playwright test --config=conmanager.config.js
```

### Single browser
```bash
npx playwright test --config=conmanager.config.js --project=chromium
npx playwright test --config=conmanager.config.js --project=firefox
npx playwright test --config=conmanager.config.js --project=edge
```

**Report saved to:**
```
ConManager-accessibility-tests/ConManager-results/YYYY-MM-DD/report.html
```

---

## Running ConDriver Tests

```bash
npx playwright test --config=condriver.config.js
```

### Single browser
```bash
npx playwright test --config=condriver.config.js --project=chromium
npx playwright test --config=condriver.config.js --project=firefox
npx playwright test --config=condriver.config.js --project=edge
```

**Report saved to:**
```
ConDriver-accessibility-tests/ConDriver-results/YYYY-MM-DD/report.html
```

---

## Results Folder Structure

```
ConPartner-results/   (or ConManager / ConDriver)
  YYYY-MM-DD/
    report.html       ← Open this for results
    json/             ← Raw data files
    screenshots/      ← Page and element screenshots
```

Reports older than 90 days are deleted automatically on each run.

---

## Useful Tips

- Always run commands from the `continuum-accessibility-testing/` root folder
- Each config runs its own project in isolation — ConPartner, ConManager, and ConDriver are fully independent
- A Teams notification card is sent automatically when a run completes
- The `*-dev-debug/` folders contain Playwright's internal debug output — use the `*-results/` folders for reports

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `OTP not received` | Check testmail.app dashboard — verify namespace/tag in `.env` |
| `Teams notification not sent` | Check `TEAMS_WEBHOOK_URL` in `.env` |
| Tests time out | Increase `timeout` in the relevant config file |

/**
 * Generates the Tester Setup Guide Word document — Continuum
 * Run: node utils/create-tester-guide.js
 * Output: Continuum-Tester-Setup-Guide.docx
 */

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, NumberFormat, convertInchesToTwip,
  LevelFormat, UnderlineType, PageBreak,
} = require('docx');
const fs = require('fs');

// ─── Colours ─────────────────────────────────────────────────────────────────
const NAVY   = '0B3C6E';
const ORANGE = 'E65100';
const GREEN  = '2E7D32';
const LGREY  = 'F0F2F5';
const WHITE  = 'FFFFFF';
const DGREY  = '444444';
const YELLOW = 'FFF8E1';
const YELLOW_BORDER = 'F9A825';

// ─── Reusable helpers ─────────────────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 36,
        color: WHITE,
        font: 'Calibri',
      }),
    ],
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    indent: { left: convertInchesToTwip(0.15) },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY } },
    children: [
      new TextRun({ text, bold: true, size: 28, color: NAVY, font: 'Calibri' }),
    ],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    children: [
      new TextRun({ text, bold: true, size: 24, color: NAVY, font: 'Calibri' }),
    ],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: opts.color || DGREY,
        bold: opts.bold || false,
        italics: opts.italic || false,
        font: 'Calibri',
      }),
    ],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: convertInchesToTwip(0.3 + level * 0.25), hanging: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: (level === 0 ? '•  ' : '◦  ') + text, size: 22, color: DGREY, font: 'Calibri' }),
    ],
  });
}

function numberedStep(num, title, detail) {
  return [
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [
        new TextRun({ text: `Step ${num}:  `, bold: true, size: 22, color: NAVY, font: 'Calibri' }),
        new TextRun({ text: title, bold: true, size: 22, color: DGREY, font: 'Calibri' }),
      ],
    }),
    ...(detail ? [body(detail, { italic: true })] : []),
  ];
}

function code(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: convertInchesToTwip(0.3) },
    shading: { type: ShadingType.SOLID, color: '1E1E1E', fill: '1E1E1E' },
    children: [
      new TextRun({ text, font: 'Courier New', size: 20, color: '00FF90' }),
    ],
  });
}

function tip(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    border: {
      left:   { style: BorderStyle.THICK, size: 12, color: YELLOW_BORDER },
      top:    { style: BorderStyle.SINGLE, size: 2,  color: YELLOW_BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 2,  color: YELLOW_BORDER },
      right:  { style: BorderStyle.SINGLE, size: 2,  color: YELLOW_BORDER },
    },
    shading: { type: ShadingType.SOLID, color: YELLOW, fill: YELLOW },
    children: [
      new TextRun({ text: '💡  ' + text, size: 21, color: '5D4037', font: 'Calibri', italics: true }),
    ],
  });
}

function important(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    border: {
      left:   { style: BorderStyle.THICK, size: 12, color: GREEN },
      top:    { style: BorderStyle.SINGLE, size: 2,  color: GREEN },
      bottom: { style: BorderStyle.SINGLE, size: 2,  color: GREEN },
      right:  { style: BorderStyle.SINGLE, size: 2,  color: GREEN },
    },
    shading: { type: ShadingType.SOLID, color: 'E8F5E9', fill: 'E8F5E9' },
    children: [
      new TextRun({ text: '✅  ' + text, size: 21, color: '2E7D32', font: 'Calibri', bold: true }),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun('')] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── Software table ───────────────────────────────────────────────────────────
function softwareTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['Software', 'Purpose', 'Download Link'].map(t =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
            children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
          })
        ),
      }),
      ...rows.map((row, i) =>
        new TableRow({
          children: row.map(cell =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE, fill: i % 2 === 0 ? LGREY : WHITE },
              children: [new Paragraph({ children: [new TextRun({ text: cell, font: 'Calibri', size: 20, color: DGREY })] })],
            })
          ),
        })
      ),
    ],
  });
}

// ─── Extension table ─────────────────────────────────────────────────────────
function extensionTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['Extension Name', 'What it does', 'Required?'].map(t =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
            children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
          })
        ),
      }),
      ...rows.map((row, i) =>
        new TableRow({
          children: row.map((cell, ci) =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE, fill: i % 2 === 0 ? LGREY : WHITE },
              children: [new Paragraph({
                children: [new TextRun({
                  text: cell,
                  font: 'Calibri',
                  size: 20,
                  color: ci === 2 && cell === 'Required' ? GREEN : DGREY,
                  bold: ci === 2 && cell === 'Required',
                })],
              })],
            })
          ),
        })
      ),
    ],
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════

const doc = new Document({
  creator: 'TTC Group — QA Team',
  title: 'Continuum Accessibility Testing — Tester Setup Guide',
  description: 'Step-by-step guide for testers to set up their local machine and start contributing to the Continuum accessibility testing project.',
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: DGREY },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(1.0),
            right: convertInchesToTwip(1.0),
          },
        },
      },
      children: [

        // ── Cover ─────────────────────────────────────────────────────────────
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 200 },
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          children: [
            new TextRun({ text: 'TTC Group', bold: true, size: 28, color: 'A8C4E8', font: 'Calibri', break: 0 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          children: [
            new TextRun({ text: 'Continuum Accessibility Testing', bold: true, size: 48, color: WHITE, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          children: [
            new TextRun({ text: 'Tester Setup Guide', size: 32, color: 'A8C4E8', font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 600 },
          shading: { type: ShadingType.SOLID, color: ORANGE, fill: ORANGE },
          children: [
            new TextRun({ text: 'How to set up your local machine and start contributing', size: 22, color: WHITE, font: 'Calibri', italics: true }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 800 },
          children: [
            new TextRun({ text: 'Audience: Testers and QA team members', size: 20, color: '888888', font: 'Calibri', italics: true }),
          ],
        }),

        pageBreak(),

        // ── Section 1: Overview ───────────────────────────────────────────────
        h1('1.  Overview'),
        spacer(),
        body('This guide will walk you through everything you need to install and configure on your local machine to work on the Continuum Accessibility Testing project.'),
        spacer(),
        body('The Continuum project covers three applications:'),
        bullet('ConManager — the manager-facing application'),
        bullet('ConPartner — the partner-facing application'),
        bullet('ConDriver — the driver-facing application'),
        spacer(),
        body('By the end of this guide you will be able to:'),
        bullet('Open and edit the test project in VS Code'),
        bullet('Run the automated accessibility tests locally'),
        bullet('Open the HTML report to review results'),
        bullet('Use Claude Code (AI assistant) to help you write and fix tests'),
        bullet('Pull the latest changes from the shared GitHub repository'),
        bullet('Make changes safely without affecting the main codebase'),
        spacer(),
        important('Your local machine is your own safe copy of the project. Nothing you do will affect the main shared codebase unless you deliberately push and it is reviewed and approved first.'),
        spacer(),

        pageBreak(),

        // ── Section 2: What to Install ────────────────────────────────────────
        h1('2.  What to Install'),
        spacer(),
        body('Install the following software on your machine. Everything listed here is free.'),
        spacer(),

        softwareTable([
          ['Node.js (LTS)', 'Runs the test scripts and installs packages', 'nodejs.org — choose the LTS version'],
          ['VS Code', 'Code editor — where you will view and edit the tests', 'code.visualstudio.com'],
          ['Claude Code', 'AI assistant that helps you write, fix and understand tests', 'Installed via terminal — see Section 4'],
        ]),
        spacer(),

        h2('2.1  GitHub Repositories'),
        body('The team already has Git installed. The two repositories you will need are:'),
        spacer(),
        body('Alaska Accessibility Testing', { bold: true }),
        code('https://github.com/KMCourt/Alaska-Accessibility-Testing.git'),
        spacer(),
        body('Continuum Accessibility Testing', { bold: true }),
        code('https://github.com/KMCourt/Continuum-Accessibility-Tests.git'),
        spacer(),

        h2('2.2  Installing Node.js'),
        ...numberedStep(1, 'Go to nodejs.org'),
        ...numberedStep(2, 'Click the LTS (Long Term Support) download button'),
        ...numberedStep(3, 'Run the installer — accept all defaults'),
        ...numberedStep(4, 'Verify the installation:'),
        code('node --version'),
        code('npm --version'),
        body('Both commands should print a version number (e.g. v22.0.0 and 10.0.0).'),
        spacer(),

        h2('2.3  Installing VS Code'),
        ...numberedStep(1, 'Go to code.visualstudio.com'),
        ...numberedStep(2, 'Download and run the Windows installer'),
        ...numberedStep(3, 'During installation, tick the option "Add to PATH" if shown'),
        ...numberedStep(4, 'Open VS Code once installed — you will see a welcome screen'),
        spacer(),

        pageBreak(),

        // ── Section 3: VS Code Extensions ────────────────────────────────────
        h1('3.  VS Code Extensions'),
        spacer(),
        body('Extensions add extra features to VS Code. Install these to make working on the project easier.'),
        spacer(),
        body('To install any extension:', { bold: true }),
        bullet('Open VS Code'),
        bullet('Press Ctrl + Shift + X to open the Extensions panel'),
        bullet('Search for the extension name and click Install'),
        spacer(),

        extensionTable([
          ['Playwright Test for VS Code', 'Run and debug individual tests with a single click from inside VS Code. Shows results inline.', 'Required'],
          ['GitLens', 'See who changed each line of code, view git history, and compare versions side by side.', 'Required'],
          ['ESLint', 'Highlights code mistakes as you type — underlines errors before you even run anything.', 'Required'],
          ['Prettier', 'Automatically formats code to keep it consistent and readable.', 'Recommended'],
          ['Git Graph', 'Visual diagram of the git branch history — helpful to understand what has changed.', 'Recommended'],
          ['indent-rainbow', 'Colours indentation levels to make code structure easier to read.', 'Optional'],
          ['Better Comments', 'Colour-codes different types of comments (TODO, warning, note, etc.).', 'Optional'],
        ]),
        spacer(),

        tip('After installing Playwright Test for VS Code, you will see a flask icon (🧪) in the left sidebar. Click it to see all tests listed and run them with one click — no terminal needed.'),
        spacer(),

        pageBreak(),

        // ── Section 4: Claude Code ────────────────────────────────────────────
        h1('4.  Installing Claude Code (AI Assistant)'),
        spacer(),
        body('Claude Code is an AI assistant that runs inside VS Code and your terminal. It can help you:'),
        bullet('Understand what a test does'),
        bullet('Fix failing tests'),
        bullet('Write new test steps'),
        bullet('Explain error messages in plain English'),
        bullet('Answer questions about accessibility and WCAG standards'),
        spacer(),
        body('You do not need to understand code to use Claude Code. You can ask it questions in plain English.', { italic: true }),
        spacer(),

        h2('4.1  Install Claude Code'),
        ...numberedStep(1, 'Open a terminal in VS Code', 'In VS Code go to: Terminal → New Terminal (or press Ctrl + ` )'),
        ...numberedStep(2, 'Run this command to install Claude Code globally:'),
        code('npm install -g @anthropic/claude-code'),
        ...numberedStep(3, 'Verify it installed:'),
        code('claude --version'),
        spacer(),

        h2('4.2  How to Use Claude Code'),
        ...numberedStep(1, 'Open a terminal inside the project folder in VS Code'),
        ...numberedStep(2, 'Type claude and press Enter to start a session'),
        code('claude'),
        ...numberedStep(3, 'Ask it anything in plain English. For example:'),
        bullet('"Why is the ConManager test failing?"'),
        bullet('"What does the region violation mean in the report?"'),
        bullet('"Add a test for the new ConDriver page"'),
        bullet('"Explain what axe-core does"'),
        spacer(),
        tip('Claude Code can read all the files in the project automatically. You do not need to paste code into it — just describe what you want and it will find the right files itself.'),
        spacer(),

        pageBreak(),

        // ── Section 5: Getting the project ────────────────────────────────────
        h1('5.  Getting a Copy of the Project'),
        spacer(),
        body('The project lives on GitHub. You will create your own local copy (called a "clone") on your machine.'),
        spacer(),
        important('This is a READ-ONLY copy to start with. Your changes stay on your machine until you explicitly push them. Nothing you do locally will affect the shared project.'),
        spacer(),

        h2('5.1  Step-by-Step: Clone the Repositories'),
        ...numberedStep(1, 'Open VS Code'),
        ...numberedStep(2, 'Open the terminal', 'Terminal → New Terminal (or press Ctrl + ` )'),
        ...numberedStep(3, 'Navigate to where you want to save the projects', 'For example, to save in your Documents folder:'),
        code('cd C:\\Users\\YourName\\Documents'),
        ...numberedStep(4, 'Clone the Alaska repository:'),
        code('git clone https://github.com/KMCourt/Alaska-Accessibility-Testing.git'),
        ...numberedStep(5, 'Clone the Continuum repository:'),
        code('git clone https://github.com/KMCourt/Continuum-Accessibility-Tests.git'),
        ...numberedStep(6, 'Move into the Alaska project folder and install dependencies:'),
        code('cd Alaska-Accessibility-Testing'),
        code('npm install'),
        code('npx playwright install'),
        ...numberedStep(7, 'Then do the same for Continuum:'),
        code('cd ..\\Continuum-Accessibility-Tests'),
        code('npm install'),
        code('npx playwright install'),
        spacer(),

        h2('5.2  Open the Project in VS Code'),
        ...numberedStep(1, 'In VS Code go to: File → Open Folder'),
        ...numberedStep(2, 'Navigate to and select the Continuum-Accessibility-Tests folder you cloned'),
        ...numberedStep(3, 'VS Code will open the project — you will see the file tree on the left side'),
        spacer(),

        h2('5.3  Set Up Your Environment File'),
        body('The tests need a credentials file (.env) to log in. This file is not stored on GitHub for security reasons.'),
        spacer(),
        ...numberedStep(1, 'In the terminal, copy the example file:'),
        code('cp .env.example .env'),
        ...numberedStep(2, 'Open the .env file in VS Code (click it in the file tree)'),
        ...numberedStep(3, 'Replace the placeholder values with the real credentials', 'Contact the QA team lead to get the credentials and Teams webhook URL.'),
        spacer(),
        tip('The .env file is listed in .gitignore which means git will never include it when you push changes. Your credentials are safe.'),
        spacer(),

        pageBreak(),

        // ── Section 6: Running the tests ──────────────────────────────────────
        h1('6.  Running the Tests'),
        spacer(),
        body('Once setup is complete you can run the tests from the terminal or from VS Code directly.'),
        spacer(),

        h2('6.1  From the Terminal'),
        body('Run all tests across all three Continuum applications:'),
        code('npx playwright test'),
        spacer(),
        body('Run a specific application (e.g. ConManager only):'),
        code('npx playwright test --project=ConManager-chromium'),
        spacer(),
        body('Run a single page by name:'),
        code('npx playwright test --grep "Dashboard"'),
        spacer(),

        h2('6.2  From VS Code (Playwright Extension)'),
        ...numberedStep(1, 'Click the flask icon (🧪) in the left sidebar'),
        ...numberedStep(2, 'You will see tests grouped by application (ConManager, ConPartner, ConDriver)'),
        ...numberedStep(3, 'Click the ▶ play button next to any test to run just that one'),
        ...numberedStep(4, 'A green tick means it passed — a red cross means it failed'),
        spacer(),

        h2('6.3  Viewing the Reports'),
        body('After the tests finish, each application generates its own HTML report:'),
        code('ConManager-accessibility-tests\\ConManager-results\\YYYY-MM-DD\\report.html'),
        code('ConPartner-accessibility-tests\\ConPartner-results\\YYYY-MM-DD\\report.html'),
        code('ConDriver-accessibility-tests\\ConDriver-results\\YYYY-MM-DD\\report.html'),
        body('A combined report covering all three applications is also generated at the root level:'),
        code('scan-results-YYYY-MM-DD.html'),
        body('Open any report in a browser (right-click → Open with → your browser) to see results.'),
        spacer(),

        pageBreak(),

        // ── Section 7: Git workflow ───────────────────────────────────────────
        h1('7.  How Git Works — Your Local Copy is Safe'),
        spacer(),
        body('Understanding git is important. Here is how it works in plain English:'),
        spacer(),

        h2('7.1  The Key Concept'),
        important('Your local copy is completely independent. You can change, break, and experiment with anything. The main shared codebase on GitHub is not affected until you push AND it is reviewed and approved.'),
        spacer(),

        body('Think of it like this:', { bold: true }),
        bullet('GitHub is the official filing cabinet — the single source of truth for the team'),
        bullet('Your local copy is your personal desk — you work freely here'),
        bullet('Pushing = putting a document in the filing cabinet — requires approval first'),
        spacer(),

        h2('7.2  Getting the Latest Changes'),
        body('When someone else on the team has made changes and pushed them, you pull them down to your machine:'),
        code('git pull'),
        body('Do this at the start of each working session to make sure you have the latest version.'),
        spacer(),

        h2('7.3  Seeing What You Have Changed'),
        body('To see which files you have changed on your local machine:'),
        code('git status'),
        body('Green files have been staged (ready to push). Red files have been changed but not yet staged.'),
        spacer(),

        h2('7.4  Saving Your Changes (Committing)'),
        body('A commit is a saved snapshot of your changes with a message describing what you did.'),
        ...numberedStep(1, 'Stage the files you want to save:'),
        code('git add filename.js'),
        body('Or to stage all changed files:'),
        code('git add .'),
        ...numberedStep(2, 'Create the commit with a message:'),
        code('git commit -m "Add test for new ConManager page"'),
        spacer(),
        tip('Write commit messages in plain English describing what you changed and why — not how. Good example: "Fix ConDriver login test timing out on Firefox"'),
        spacer(),

        h2('7.5  Pushing Changes (Sending to GitHub)'),
        body('Once you are happy with your changes and want to share them with the team:'),
        code('git push origin main'),
        spacer(),
        important('A code review process will be put in place before this becomes the standard workflow. For now, speak to the QA team lead before pushing any changes to main.'),
        spacer(),

        h2('7.6  If Something Goes Wrong'),
        body('If you have made changes you want to undo and go back to the last saved version:'),
        code('git restore .'),
        body('This resets all uncommitted changes. Your committed history is always safe.'),
        spacer(),
        tip('If you are ever unsure, ask Claude Code: type claude in the terminal and ask "how do I undo my last change?" — it will give you the exact command for your situation.'),
        spacer(),

        pageBreak(),

        // ── Section 8: Code Review ────────────────────────────────────────────
        h1('8.  Code Review Process (Coming Soon)'),
        spacer(),
        body('A formal code review process will be introduced to ensure the quality and safety of all changes before they are merged into the main codebase. This section will be updated when that process is in place.'),
        spacer(),
        body('What this will mean for testers:'),
        bullet('You will work on your own branch (a separate copy of the code) — not directly on main'),
        bullet('When your changes are ready you will raise a Pull Request on GitHub'),
        bullet('A reviewer will check your changes and either approve them or request edits'),
        bullet('Only approved changes will be merged into the main codebase'),
        spacer(),
        body('In the meantime:', { bold: true }),
        bullet('Always speak to the QA team lead before pushing changes'),
        bullet('Describe what you changed and why so it can be reviewed informally'),
        bullet('Use Claude Code to sense-check your changes before sharing them'),
        spacer(),
        tip('You can ask Claude Code to review your changes before submitting them. Type: "review my changes and tell me if anything could break" — it will check your code and flag any concerns.'),
        spacer(),

        pageBreak(),

        // ── Section 9: Folder Structure ───────────────────────────────────────
        h1('9.  Understanding the Folder Structure'),
        spacer(),
        body('When you open the Continuum project in VS Code you will see these folders and files:'),
        spacer(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['Folder / File', 'What it contains'].map(t =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
                })
              ),
            }),
            ...[
              ['ConManager-accessibility-tests/', 'Accessibility test spec files for the ConManager application'],
              ['ConPartner-accessibility-tests/', 'Accessibility test spec files for the ConPartner application'],
              ['ConDriver-accessibility-tests/', 'Accessibility test spec files for the ConDriver application'],
              ['ConManager-results/', 'Auto-generated output for ConManager — JSON, HTML report, screenshots. NOT stored in git.'],
              ['ConPartner-results/', 'Auto-generated output for ConPartner — JSON, HTML report, screenshots. NOT stored in git.'],
              ['ConDriver-results/', 'Auto-generated output for ConDriver — JSON, HTML report, screenshots. NOT stored in git.'],
              ['utils/', 'Helper scripts: report generator, trend tracker, Teams notifications, teardown scripts'],
              ['generate-report.js', 'Generates the combined scan-results HTML report covering all three applications'],
              ['.env', 'Your private credentials file — NEVER commit this. Copy from .env.example and fill in real values.'],
              ['.env.example', 'Template showing which credentials are needed — safe to share, contains no real values'],
              ['playwright.config.js', 'Playwright configuration — browser list, timeouts, test directories'],
              ['package.json', 'Lists all project dependencies. Run npm install after pulling to ensure packages are up to date.'],
            ].map((row, i) =>
              new TableRow({
                children: row.map((cell, ci) =>
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE, fill: i % 2 === 0 ? LGREY : WHITE },
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: cell,
                        font: ci === 0 ? 'Courier New' : 'Calibri',
                        size: ci === 0 ? 18 : 20,
                        color: ci === 0 ? '1E5128' : DGREY,
                        bold: ci === 0,
                      })],
                    })],
                  })
                ),
              })
            ),
          ],
        }),
        spacer(),
        tip('The results folders are in .gitignore — they will never be committed to git. Test output is generated fresh each run.'),
        spacer(),

        pageBreak(),

        // ── Section 10: Understanding the Report ─────────────────────────────
        h1('10.  How to Read the Accessibility Report'),
        spacer(),
        body('After running the tests, open the HTML report in your browser. Here is how to interpret what you see.'),
        spacer(),

        h2('10.1  Report Layout'),
        bullet('Each application (ConManager, ConPartner, ConDriver) has its own report'),
        bullet('The combined scan-results file shows all three side by side'),
        bullet('Each page has browser tabs — Chrome, Firefox, and Edge — so you can compare results'),
        bullet('Each violation shows a severity level: Critical, Serious, Moderate, or Minor'),
        spacer(),

        h2('10.2  Severity Levels'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['Severity', 'What it means', 'Priority'].map(t =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
                })
              ),
            }),
            ...[
              ['Critical', 'Blocks users completely — cannot use the feature at all', 'Fix immediately'],
              ['Serious', 'Significant barrier — very difficult to use', 'Fix this sprint'],
              ['Moderate', 'Causes difficulty but there is a workaround', 'Fix soon'],
              ['Minor', 'Small annoyance — best practice improvement', 'Fix when time allows'],
            ].map((row, i) =>
              new TableRow({
                children: row.map(cell =>
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE, fill: i % 2 === 0 ? LGREY : WHITE },
                    children: [new Paragraph({ children: [new TextRun({ text: cell, font: 'Calibri', size: 20, color: DGREY })] })],
                  })
                ),
              })
            ),
          ],
        }),
        spacer(),

        h2('10.3  Trend Tracking'),
        body('The report shows whether violations have increased or decreased since the last run. A regression (more violations than before) is flagged. This helps the team spot if a code change has introduced new accessibility problems.'),
        spacer(),
        tip('If you see a violation you do not understand, ask Claude Code: "What does the [rule name] violation mean and how do we fix it?" — it will explain it in plain English with examples.'),
        spacer(),

        pageBreak(),

        // ── Section 11: What NOT to Commit ────────────────────────────────────
        h1('11.  What NOT to Commit to Git'),
        spacer(),
        body('Some files must never be pushed to GitHub. Committing these files would either expose sensitive credentials, clutter the repository, or break things for other team members.'),
        spacer(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['File / Folder', 'Why NOT to commit it'].map(t =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: ORANGE, fill: ORANGE },
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
                })
              ),
            }),
            ...[
              ['.env', 'Contains real credentials. If pushed to GitHub, anyone can see them. This file is gitignored — but never manually force-add it.'],
              ['node_modules/', 'Contains thousands of auto-installed files. Never commit this — it is always regenerated by running npm install.'],
              ['ConManager-results/', 'Auto-generated test output. Too large and changes every run. Regenerate locally instead.'],
              ['ConPartner-results/', 'Auto-generated test output. Too large and changes every run. Regenerate locally instead.'],
              ['ConDriver-results/', 'Auto-generated test output. Too large and changes every run. Regenerate locally instead.'],
              ['scan-results-*.html', 'Generated combined report — kept locally only. Regenerated automatically after each full run.'],
            ].map((row, i) =>
              new TableRow({
                children: row.map((cell, ci) =>
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE, fill: i % 2 === 0 ? LGREY : WHITE },
                    children: [new Paragraph({ children: [new TextRun({ text: cell, font: ci === 0 ? 'Courier New' : 'Calibri', size: ci === 0 ? 18 : 20, color: ci === 0 ? '8B0000' : DGREY, bold: ci === 0 })] })],
                  })
                ),
              })
            ),
          ],
        }),
        spacer(),
        tip('Run "git status" before committing to see exactly what you are about to include. If you see any of the above files listed in red, do NOT run git add on them.'),
        spacer(),

        pageBreak(),

        // ── Section 12: First Day Checklist ───────────────────────────────────
        h1('12.  First Day Setup Checklist'),
        spacer(),
        body('Use this checklist to confirm your environment is ready. Tick each item off before running your first test.'),
        spacer(),

        h2('Software Installed'),
        bullet('Node.js is installed — node --version shows a version number'),
        bullet('npm is installed — npm --version shows a version number'),
        bullet('VS Code is installed and open'),
        bullet('Claude Code is installed — claude --version shows a version number'),
        spacer(),

        h2('Project Set Up'),
        bullet('Continuum repository cloned successfully — project folder visible in VS Code'),
        bullet('npm install completed with no errors'),
        bullet('npx playwright install completed — Chrome, Firefox, Edge browsers downloaded'),
        bullet('.env file created from .env.example and filled with real credentials'),
        spacer(),

        h2('VS Code Extensions'),
        bullet('Playwright Test for VS Code installed — flask icon visible in sidebar'),
        bullet('GitLens installed'),
        bullet('ESLint installed'),
        spacer(),

        h2('First Test Run'),
        bullet('Ran npx playwright test — tests started without errors'),
        bullet('Reports generated in ConManager-results/, ConPartner-results/, ConDriver-results/'),
        bullet('Opened a report.html in browser and can see violation results'),
        spacer(),

        h2('Git Setup'),
        bullet('git pull runs without errors'),
        bullet('git status shows "nothing to commit, working tree clean"'),
        spacer(),
        important('If any item above fails, see Section 13 (Troubleshooting) or ask Claude Code for help.'),
        spacer(),

        pageBreak(),

        // ── Section 13: Troubleshooting ───────────────────────────────────────
        h1('13.  Troubleshooting Common Issues'),
        spacer(),
        body('Below are the most common problems new testers encounter and how to fix them.'),
        spacer(),

        h2('"npm install" fails or shows errors'),
        bullet('Make sure Node.js is installed: run node --version'),
        bullet('Delete the node_modules folder and try again:'),
        code('rm -rf node_modules && npm install'),
        bullet('If you see "permission denied" errors on Windows, open the terminal as Administrator'),
        bullet('If errors persist, ask Claude Code: "npm install is failing with this error: [paste error message]"'),
        spacer(),

        h2('"npx playwright install" fails or browsers do not launch'),
        bullet('Make sure you ran npm install first'),
        bullet('Try reinstalling the browsers:'),
        code('npx playwright install --with-deps'),
        bullet('On Windows, some corporate firewalls block browser downloads — speak to IT if downloads fail'),
        spacer(),

        h2('Tests time out or fail with "Page not found"'),
        bullet('The test environment may be temporarily offline — wait a few minutes and try again'),
        bullet('Check you are connected to the internet / corporate VPN if required'),
        bullet('Some pages require login — make sure your .env file has the correct credentials'),
        spacer(),

        h2('"git pull" fails with "merge conflict"'),
        body('This means someone else changed the same file you changed. To resolve:'),
        ...numberedStep(1, 'Run git status to see which files have conflicts'),
        ...numberedStep(2, 'Open the conflicting files in VS Code — you will see conflict markers (<<<<<<)'),
        ...numberedStep(3, 'VS Code shows "Accept Current Change / Accept Incoming Change" buttons — choose the correct version'),
        ...numberedStep(4, 'After resolving, run: git add . && git commit -m "Resolve merge conflict"'),
        body('If unsure, ask Claude Code: "I have a merge conflict in [filename], help me resolve it."'),
        spacer(),

        h2('Report does not generate or is empty'),
        bullet('Make sure at least one test ran successfully before opening the report'),
        bullet('Check that the results folders were created — they are generated automatically'),
        bullet('Re-run the tests: npx playwright test'),
        spacer(),

        h2('Claude Code is not responding or shows errors'),
        bullet('Make sure you are in the correct project folder in the terminal'),
        bullet('Try restarting the Claude session: press Ctrl+C then run claude again'),
        bullet('Check your internet connection — Claude Code requires internet access'),
        spacer(),

        pageBreak(),

        // ── Section 14: Quick Reference ───────────────────────────────────────
        h1('14.  Quick Reference — Common Commands'),
        spacer(),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['What you want to do', 'Command'].map(t =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
                  children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: WHITE, font: 'Calibri', size: 20 })] })],
                })
              ),
            }),
            ...[
              ['Get the latest code from GitHub',          'git pull'],
              ['See what you have changed',                'git status'],
              ['Run all tests (all applications)',         'npx playwright test'],
              ['Run ConManager tests only',                'npx playwright test ConManager-accessibility-tests'],
              ['Run one test by name',                     'npx playwright test --grep "Page Name"'],
              ['Open the AI assistant',                    'claude'],
              ['Install dependencies after a git pull',   'npm install'],
              ['Save your changes locally',               'git add . && git commit -m "your message"'],
              ['Undo all uncommitted changes',             'git restore .'],
              ['Check what branch you are on',            'git branch'],
            ].map((row, i) =>
              new TableRow({
                children: row.map((cell, ci) =>
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: i % 2 === 0 ? LGREY : WHITE, fill: i % 2 === 0 ? LGREY : WHITE },
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: cell,
                        font: ci === 1 ? 'Courier New' : 'Calibri',
                        size: ci === 1 ? 18 : 20,
                        color: ci === 1 ? '1E5128' : DGREY,
                        bold: ci === 1,
                      })],
                    })],
                  })
                ),
              })
            ),
          ],
        }),
        spacer(),

        pageBreak(),

        // ── Section 15: Getting Help ──────────────────────────────────────────
        h1('15.  Getting Help'),
        spacer(),
        body('There are several ways to get help if you are stuck:'),
        spacer(),

        h2('Claude Code (AI Assistant)'),
        body('The fastest way to get help. Ask it anything in plain English:'),
        bullet('Run claude in the terminal'),
        bullet('"Why is this test failing?"'),
        bullet('"Explain this error message to me"'),
        bullet('"What does WCAG 2.2 AA mean?"'),
        bullet('"How do I add a new page to the ConManager tests?"'),
        spacer(),
        tip('Claude Code has full access to the project files and understands the context of this specific project. It is the best first stop for any question.'),
        spacer(),

        h2('The QA Team Lead'),
        body('For questions about credentials (.env setup), push permissions, or the code review process, contact the QA team lead directly.'),
        spacer(),

        h2('GitHub Repositories'),
        body('Alaska Accessibility Testing:'),
        code('https://github.com/KMCourt/Alaska-Accessibility-Testing'),
        body('Continuum Accessibility Testing:'),
        code('https://github.com/KMCourt/Continuum-Accessibility-Tests'),
        spacer(),
        spacer(),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
          shading: { type: ShadingType.SOLID, color: LGREY, fill: LGREY },
          children: [
            new TextRun({ text: 'TTC Group  |  Continuum Accessibility Testing  |  QA Team', size: 18, color: '888888', font: 'Calibri', italics: true }),
          ],
        }),
      ],
    },
  ],
});

// ─── Write file ───────────────────────────────────────────────────────────────
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('Continuum-Tester-Setup-Guide.docx', buffer);
  console.log('✅  Saved: Continuum-Tester-Setup-Guide.docx');
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

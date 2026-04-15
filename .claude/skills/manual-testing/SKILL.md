---
name: manual-testing
description: >
  Perform manual browser testing of the budget management app using playwright-cli.
  Use when verifying UI changes, testing user flows, taking screenshots, or validating
  that code changes work end-to-end in the browser.
  Triggers: "test this manually", "check if this works in the browser", "take a screenshot",
  "verify the UI", "test the flow", "open the app and check", "verify the fix",
  "תבדוק בדפדפן", "תפתח את האפליקציה", "בדיקה ידנית", "תאמת שהתיקון עובד",
  "תעשה וריפיקציה", "תבדוק שזה עובד". Use this skill proactively after fixing bugs
  or implementing features that affect the UI — don't wait for the user to ask.
---

# Manual Testing with playwright-cli

Use `playwright-cli` shell commands to interact with the running budget app through a real headless browser. Output stays on disk — not injected into context — saving tokens vs MCP.

## Prerequisites

### 1. Services must be running

The app runs on Docker. Start if needed and verify:

```bash
docker compose up -d
# Wait a few seconds, then verify:
curl -s http://localhost:4567/api/auth/me  # Should return {"error":"Access token required"}
curl -s http://localhost:3456/ > /dev/null && echo "Frontend OK"
```

| Service    | Port | URL                        |
|-----------|------|----------------------------|
| Frontend  | 3456 | `http://localhost:3456/`    |
| Backend   | 4567 | `http://localhost:4567/api` |
| PostgreSQL| 5433 | `localhost:5433`            |

### 2. Chromium sandbox config

The `.playwright/cli.config.json` must exist in the project root with sandbox disabled (needed for root environments):

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "channel": "chrome",
      "chromiumSandbox": false
    }
  }
}
```

If `playwright-cli open` fails with a sandbox error, create this file.

## Critical: Always `open` First

**Every session requires a browser to be open.** Always start with:

```bash
playwright-cli open                    # default session
playwright-cli -s=my-session open      # named session
```

If you skip `open`, all commands will fail with `The browser 'X' is not open`.

## Core Workflow: Snapshot-Based Interaction

playwright-cli uses an accessibility snapshot model — not CSS selectors. The flow is:

1. **Open** with `playwright-cli open`
2. **Navigate** with `playwright-cli goto <url>`
3. **Snapshot** with `playwright-cli snapshot` — saves full accessibility tree to a `.yml` file
4. **Read the .yml file** to find `ref` values for interactive elements
5. **Interact** using `ref` values (e.g., `playwright-cli fill <ref> <value>`, `playwright-cli click <ref>`)
6. **Snapshot again** to verify the result

Each new page load or navigation invalidates previous refs. Always take a fresh snapshot before interacting.

## Test Users

All users share the same password: `123456`

| Role             | Email                   | Description            |
|-----------------|-------------------------|------------------------|
| Circle Treasurer | `gizbar@circle.com`     | Full access — all budgets, all groups |
| Group A Treasurer| `gizbar.a@circle.com`   | Group treasurer for קבוצה א |
| Group B Treasurer| `gizbar.b@circle.com`   | Group treasurer for קבוצה ב |
| Regular Member   | `member1@circle.com`    | Member of קבוצה א |

### Login Flow

```bash
playwright-cli open
playwright-cli goto http://localhost:3456/login
playwright-cli snapshot
# Read the .yml file to find refs for email (textbox), password (textbox), submit (button)
playwright-cli fill <email-ref> "gizbar.a@circle.com"
playwright-cli fill <password-ref> "123456"
playwright-cli click <submit-ref>
playwright-cli run-code 'async (page) => { await page.waitForTimeout(2000); return "URL: " + page.url(); }'
playwright-cli snapshot
# Verify URL changed to /dashboard
```

### Batch Login with run-code

For faster login without needing to snapshot first:

```bash
playwright-cli run-code 'async (page) => {
  await page.goto("http://localhost:3456/login");
  await page.waitForSelector("input", { timeout: 5000 });
  await page.fill("input[type=\"email\"]", "gizbar.a@circle.com");
  await page.fill("input[type=\"password\"]", "123456");
  await page.click("button[type=\"submit\"]");
  await page.waitForTimeout(3000);
  return "URL: " + page.url();
}'
```

> **run-code syntax rules:**
> - Must be an `async (page) => { ... }` arrow function
> - Use `return` to get output (NOT `console.log`)
> - Use single quotes for the outer string, escaped double quotes inside

## Auth State Reuse

Save login state after authenticating to skip the login flow in future sessions:

```bash
# After logging in successfully, save the auth state
playwright-cli state-save /home/sagizo/Desktop/budget-app/.claude/screenshots/group-treasurer-auth.json

# Later — load auth state in a new session (no login needed)
playwright-cli -s=reuse open
playwright-cli -s=reuse state-load /home/sagizo/Desktop/budget-app/.claude/screenshots/group-treasurer-auth.json
playwright-cli -s=reuse goto http://localhost:3456/dashboard
```

## Named Sessions (Multi-Agent Isolation)

Use `-s=<name>` to run isolated browser sessions. Each session has its own cookies and state — no conflicts between agents.

```bash
# Agent 1: test as circle treasurer
playwright-cli -s=circle open
playwright-cli -s=circle goto http://localhost:3456/login

# Agent 2: test as group treasurer (completely isolated)
playwright-cli -s=group open
playwright-cli -s=group goto http://localhost:3456/login

# List active sessions
playwright-cli list

# Clean up
playwright-cli close-all
```

## App Pages and Navigation

After login, the user lands on `/dashboard`. Key pages:

| Page               | URL Path              | Who can access              |
|--------------------|-----------------------|-----------------------------|
| Dashboard          | `/dashboard`          | Everyone                    |
| My Reimbursements  | `/my-reimbursements`  | Everyone                    |
| Budgets            | `/budgets`            | Everyone (view varies by role) |
| Incomes            | `/incomes`            | Treasurers                  |
| Approve Reimburse. | `/reimbursements`     | Treasurers                  |
| Payment Transfers  | `/payment-transfers`  | Treasurers                  |
| Reports            | `/reports`            | Everyone                    |

## Screenshots

Save screenshots to `.claude/screenshots/` (gitignored):

```bash
mkdir -p .claude/screenshots
playwright-cli screenshot --filename /home/sagizo/Desktop/budget-app/.claude/screenshots/my-screenshot.png
```

Use descriptive filenames like `login-page.png`, `direct-expense-form.png`.

> **Note:** Use `--filename <path>`, NOT a positional argument.

## Common Testing Patterns

### Verify a Page Renders

```bash
playwright-cli open
playwright-cli goto http://localhost:3456/<page>
playwright-cli snapshot
# Read .yml to verify key elements (headings, buttons, data)
playwright-cli screenshot --filename /home/sagizo/Desktop/budget-app/.claude/screenshots/<page>.png
```

### Test a Form Submission

```bash
playwright-cli open
# Login first (see login flow above)
playwright-cli goto http://localhost:3456/<page-with-form>
playwright-cli snapshot
# Read .yml to get refs for form fields
playwright-cli fill <field-ref> "value"
playwright-cli select <dropdown-ref> "option text"
playwright-cli click <submit-ref>
playwright-cli run-code 'async (page) => { await page.waitForTimeout(2000); }'
playwright-cli snapshot
# Verify: modal closed, data appeared in table, toast shown, etc.
```

### Verify Toast Messages

Toasts are transient. Use run-code to check:

```bash
playwright-cli run-code 'async (page) => {
  const toastContainer = page.locator("[style*=\"z-index: 9999\"]");
  const count = await toastContainer.count();
  if (count > 0) {
    const text = await toastContainer.innerText();
    return "Toast: " + text;
  }
  return "No toast visible";
}'
```

### Test API Directly (for setup/teardown)

Use curl for quick API checks or to clean up test data:

```bash
# Get a token
TOKEN=$(curl -s -X POST http://localhost:4567/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gizbar.a@circle.com","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Use the token
curl -s http://localhost:4567/api/<endpoint> -H "Authorization: Bearer $TOKEN"
```

## RTL and Hebrew

- The app is RTL (right-to-left)
- All UI text is in Hebrew
- Navigation sidebar is on the right side
- Use `playwright-cli snapshot` and read the `.yml` file for text content — don't try to guess element positions

## Session Cleanup

Always close the browser when done:

```bash
playwright-cli close        # close default session
playwright-cli close-all    # close all sessions
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `playwright-cli: command not found` | Install globally |
| Chromium sandbox error | Create `.playwright/cli.config.json` (see Prerequisites) |
| `The browser 'X' is not open` | Run `playwright-cli open` first |
| Refs not found after navigation | Take a fresh `playwright-cli snapshot` |
| Services not running | Run `docker compose up -d` |
| Login fails | Verify password is `123456` and email is correct |
| Stale sessions | Run `playwright-cli close-all` |

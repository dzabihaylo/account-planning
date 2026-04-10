# Grid Dynamics Prospect Intelligence Hub
## Project Brief for Claude Code

---

## What This Is

A Node.js web application that serves a multi-account sales intelligence dashboard for Grid Dynamics, a publicly traded enterprise AI and digital transformation consultancy. The app is used by the GTM Automotive team (Dave Zabihaylo, Senior Director GTM Automotive, based in Detroit) and colleagues to research and prepare for enterprise prospect engagements.

Each account in the hub has tabs covering company overview, financials, technology stack, talent signals, outsourcing landscape, key executives, and a live AI chat interface that answers questions about that specific account using Claude as the backend.

---

## Project Owner

Dave Zabihaylo
Senior Director GTM Automotive, Grid Dynamics
Based in Ferndale, Michigan (Detroit area)
Owns the Ford account. Building the automotive go-to-market.

---

## Directory Location

The project lives at:
```
/users/davezabihaylo/documents/Grid_Accounts/
```

---

## File Structure

```
Grid_Accounts/
├── server.js        - Node.js proxy server (no npm dependencies)
├── index.html       - The full single-page application (all 13 accounts)
├── package.json     - Minimal, no dependencies beyond Node built-ins
├── railway.toml     - Railway deployment config
├── README.md        - Setup and deployment instructions
└── .gitignore       - Excludes .env and node_modules
```

---

## How It Works

### server.js
A plain Node.js HTTP server using only built-in modules (no npm packages needed). It does three things:

1. **Password protection** - Serves a login page at `/`. On successful login, sets a cookie (`gd_auth`) containing the password. All routes check this cookie before serving content. Unauthenticated requests are redirected to the login page.

2. **Serves the app** - On `GET /`, reads and serves `index.html` from the same directory.

3. **Proxies AI requests** - On `POST /api/claude`, forwards the request body to `https://api.anthropic.com/v1/messages`, injecting the Anthropic API key from the environment server-side. The API key never reaches the browser.

### index.html
A single self-contained HTML file (~108KB) with all CSS, JavaScript, and account data inline. No build step, no framework, no external dependencies beyond Google Fonts and Chart.js (loaded from CDN).

The app has:
- A sticky top nav with a search bar that filters the sidebar
- A left sidebar listing all 13 accounts grouped by industry category
- A main panel per account with multiple tabs
- A live AI chat tab per account, wired to `/api/claude` with that account's full intelligence context pre-loaded as a system prompt

### AI Chat
Each account's Ask AI tab sends POST requests to `/api/claude`. The server forwards these to the Anthropic API with:
- Model: `claude-sonnet-4-20250514`
- Max tokens: 1000
- System prompt: Grid Dynamics context + full account intelligence for the selected account

Chat history is maintained in browser memory per account session (not persisted across page reloads).

---

## Environment Variables

Three environment variables are required. In Railway these are set in the Variables tab. Locally they are set in the shell before running.

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key from console.anthropic.com |
| `APP_PASSWORD` | Password shown to users on the login screen |
| `PORT` | Port to listen on (Railway sets this automatically, do not override) |

---

## Current Accounts (13 total)

### Automotive OEM
- General Motors (NYSE: GM) - Active engagement, $187.4B revenue
- Mercedes-Benz Group AG (DAX: MBG) - $160B revenue
- Volvo Group (Stockholm: VOLV) - $49.6B revenue, existing Nova Bus relationship
- Rivian Automotive (NASDAQ: RIVN) - $4.97B revenue, VW JV

### Automotive Tier 1
- MAHLE GmbH - $12.6B revenue, former Provectus account
- Magna International (NYSE: MGA) - $42.8B revenue, Troy MI HQ
- Forvia SE (Euronext: FRVIA) - $29.8B revenue, Auburn Hills MI HQ
- Robert Bosch GmbH - $99.7B revenue, Farmington Hills MI NA HQ
- HARMAN International (Samsung subsidiary) - $11B revenue, new CEO Apr 2025
- Detroit Manufacturing Systems (now Voltava) - ~$600M, Detroit

### Financial Services
- Rocket Companies (NYSE: RKT) - $5.1B revenue, Detroit
- United Wholesale Mortgage (NYSE: UWMC) - ~$3.5B, Pontiac MI

### Energy & Utilities
- DTE Energy (NYSE: DTE) - $12.5B revenue, Detroit

---

## Deployment: Railway (current production)

The app is live on Railway at:
```
account-planning-production.up.railway.app
```

Linked to GitHub repo: `dzabihaylo/account-planning`

Railway watches the `main` branch and auto-deploys on every push. Deploy time is approximately 30 seconds.

### To deploy changes:
```bash
cd /users/davezabihaylo/documents/Grid_Accounts
git add .
git commit -m "describe what changed"
git push origin main
```

### To change the password:
Go to Railway dashboard > service > Variables > update `APP_PASSWORD`. Takes effect immediately, no redeployment needed.

### To add new accounts:
1. Update `index.html` - add sidebar entry, account panel HTML, and entry in the `ACCOUNTS` JS object
2. Push to GitHub - Railway redeploys automatically

---

## Running Locally

```bash
cd /users/davezabihaylo/documents/Grid_Accounts
export ANTHROPIC_API_KEY=sk-ant-...
export APP_PASSWORD=yourpassword
node server.js
```

Then open `http://localhost:3000`.

---

## Git Setup

Remote: `https://github.com/dzabihaylo/account-planning.git`
Branch: `main`

Standard workflow:
```bash
git add .
git commit -m "message"
git push origin main
```

---

## Adding a New Account: Step-by-Step

When Dave provides a new company name, the process is:

1. Research the company (revenue, employees, tech stack, executives, outsourcing partners, strategic signals) using web search
2. Determine the correct industry category for the sidebar
3. In `index.html`, make three additions:

   **A. Sidebar entry** - find the correct `sidebar-section` and add a `sidebar-item` button following the existing pattern, with appropriate dot color and revenue

   **B. Account panel HTML** - add a `<div class="account-panel" id="panel-{id}">` block following the existing structure. Each panel has: acct-header (KPIs), acct-tabs, and tab panes for overview, tech, signals, execs, and ai

   **C. ACCOUNTS data object** - add an entry to the `const ACCOUNTS = {...}` JS object with: name, sector, hq, revenue, employees, and a detailed `context` string (this is what gets sent to Claude as account intelligence)

4. Update the account count in `.topnav-count` (currently `13 accounts`)
5. Push to GitHub

---

## Known Issues / Notes

- The `PORT` environment variable must NOT be hardcoded in Railway. Railway assigns it dynamically. The server reads `process.env.PORT` automatically.
- The `.gitignore` excludes `.env` files. Do not commit API keys.
- The login cookie stores the password value directly. This is intentional for simplicity given the internal team use case. It is not suitable for public-facing applications with sensitive data.
- Chart.js is loaded from cdnjs.cloudflare.com. Google Fonts are loaded from fonts.googleapis.com. Both require internet access.
- The AI chat history is in-memory only and resets on page reload. There is no persistence layer.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Runtime | Node.js (built-ins only, no npm packages) |
| Frontend | Vanilla HTML/CSS/JS, Chart.js 4.4.1 |
| Fonts | DM Sans, DM Mono (Google Fonts) |
| AI | Anthropic Claude claude-sonnet-4-20250514 via REST API |
| Hosting | Railway (railway.app) |
| Source control | GitHub (dzabihaylo/account-planning) |
| Auth | Cookie-based password, server-side validation |

---

## Context on Grid Dynamics

Grid Dynamics (NASDAQ: GDYN) is a publicly traded enterprise AI and digital transformation consultancy. Key differentiators vs large Indian SIs (HCL, Cognizant, Infosys): AI-native delivery, senior engineering talent, consultancy model rather than body-shop, Google Cloud partnership.

Dave Zabihaylo joined Grid Dynamics March 1, 2026 as Senior Director GTM Automotive after departing Provectus. He owns the Ford account and is building the automotive go-to-market from the Detroit area. The accounts in this hub represent his active prospect list.

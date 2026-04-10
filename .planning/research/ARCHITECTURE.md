# Architecture Patterns

**Domain:** Sales pursuit intelligence dashboard (lightweight Node.js, single-user team)
**Researched:** 2026-04-10
**Confidence:** HIGH — based on current Node.js docs, Railway documentation, and verified Anthropic API docs

---

## Current Architecture (Baseline)

The existing app is a three-layer system with no persistence:

```
Browser (index.html)
    ↕ HTTP (cookie auth)
Node.js server (server.js)
    ↕ HTTPS
Anthropic Claude API
```

All account data lives in a JavaScript object in `index.html`. All chat state lives in browser memory. Nothing survives a page reload or server restart.

The new features (persistence, contact intelligence, pursuit logs, dynamic account management, AI-driven strategy extraction) require one new layer and several new server endpoints — but the architecture does not need to change shape.

---

## Recommended Architecture (Evolved)

Add a persistence layer beneath the server. Extend the server with a small REST API. Keep the frontend pattern (single HTML file, fetch calls) but replace hardcoded data with server-fetched data.

```
Browser (index.html — one file, no build step)
    ↕ HTTP (cookie auth, existing pattern)
Node.js server (server.js — extended)
    ↕ sync reads/writes
SQLite database (data.db — persisted on Railway volume)
    ↕ HTTPS proxy (existing)
Anthropic Claude API
```

No new runtime. No new frameworks. One new dependency (better-sqlite3 or the native node:sqlite module once stable). One new file.

---

## Component Boundaries

### 1. Browser Layer (index.html)

**Responsibility:** Render UI, manage active tab/account selection, send fetch requests to server, display server responses.

**What it owns:**
- Visual state (which account is selected, which tab is active)
- In-progress chat input text
- Temporary UI transitions

**What it no longer owns (moved to server):**
- Account data objects (ACCOUNTS) — fetched from `GET /api/accounts`
- Chat history — persisted to `POST /api/chat/:accountId`
- Contact records — fetched from `GET /api/contacts/:accountId`
- Pursuit log entries — fetched from `GET /api/log/:accountId`

**Communicates with:** Server Layer only (no direct CDN calls for data; Chart.js and Google Fonts still CDN)

**Build constraint:** No build step. All JS inline in HTML. Fetch calls replace hardcoded objects.

---

### 2. Server Layer (server.js)

**Responsibility:** Authentication enforcement, static file serving, Anthropic API proxy, data API (CRUD for accounts, contacts, pursuit logs, chat history), background refresh scheduling.

**Existing routes (keep as-is):**
- `POST /login` — password validation, set cookie
- `GET /` — serve index.html
- `POST /api/claude` — Anthropic proxy

**New routes to add (priority order):**
- `GET /api/accounts` — return all account records from DB
- `GET /api/accounts/:id` — return single account record
- `POST /api/accounts` — create new account (replaces HTML editing)
- `PUT /api/accounts/:id` — update account intelligence
- `DELETE /api/accounts/:id` — remove account
- `GET /api/contacts/:accountId` — return contacts for account
- `POST /api/contacts/:accountId` — add contact
- `PUT /api/contacts/:contactId` — update contact
- `GET /api/log/:accountId` — return pursuit log entries
- `POST /api/log/:accountId` — append log entry
- `GET /api/chat/:accountId` — return persisted chat history
- `POST /api/chat/:accountId` — append message to history
- `POST /api/debrief/:accountId` — trigger AI extraction from debrief text
- `POST /api/refresh/:accountId` — trigger AI-powered intelligence refresh

**Route dispatch pattern:** Extend the existing if/else chain in the `http.createServer` callback using pathname + method matching. No router library needed. Parameterized routes (`/api/contacts/:accountId`) handled by regex or `pathname.split('/')`.

**Communicates with:** Database Layer (sync), Anthropic API (async HTTPS)

---

### 3. Database Layer (data.db — SQLite)

**Responsibility:** Persist all mutable application state. Single file. Survives deploys via Railway volume mount.

**Why SQLite over JSON files:**
JSON file persistence (lowdb, plain fs.writeFileSync) works for simple key-value stores but creates race conditions on concurrent writes and is harder to query selectively. SQLite handles concurrent reads safely, supports transactions, and lets you fetch exactly what you need without loading all data into memory. For this app's size (13–50 accounts, hundreds of contacts, thousands of log entries), SQLite performs identically to a remote database with none of the operational overhead.

**Why not node:sqlite (Node.js built-in):**
As of 2026, the `node:sqlite` module is still marked experimental in Node.js docs and requires the `--experimental-sqlite` flag. Not appropriate for production. Use `better-sqlite3` instead — it uses synchronous APIs (matching this app's existing blocking-style patterns), ships prebuilt binaries for Railway's Linux environment, and requires only `npm install better-sqlite3`.

**Schema (four tables):**

```sql
-- Static account records (replaces ACCOUNTS object in index.html)
CREATE TABLE accounts (
  id          TEXT PRIMARY KEY,       -- 'gm', 'mahle', 'rocket', etc.
  name        TEXT NOT NULL,
  sector      TEXT NOT NULL,
  hq          TEXT,
  revenue     TEXT,
  employees   TEXT,
  context     TEXT,                   -- full intelligence string for Claude prompt
  updated_at  INTEGER                 -- unix timestamp
);

-- Contact records per account
CREATE TABLE contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  name        TEXT NOT NULL,
  title       TEXT,
  linkedin    TEXT,
  influence   TEXT,                   -- 'decision_maker', 'influencer', 'champion'
  reachability TEXT,                  -- 'warm', 'cold', 'unknown'
  notes       TEXT,
  created_at  INTEGER
);

-- Pursuit log: meeting notes, debriefs, strategy updates
CREATE TABLE pursuit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  entry_type  TEXT NOT NULL,          -- 'debrief', 'note', 'strategy_update'
  raw_text    TEXT,                   -- original user input
  ai_summary  TEXT,                   -- Claude-extracted summary
  created_at  INTEGER
);

-- Chat history: persisted per account across reloads
CREATE TABLE chat_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  role        TEXT NOT NULL,          -- 'user' | 'assistant'
  content     TEXT NOT NULL,
  created_at  INTEGER
);
```

**Communicates with:** Server Layer only. Browser has no direct database access.

---

### 4. AI Extraction Sub-system (within server.js)

**Responsibility:** Use Claude's structured output API to extract structured data from unstructured debrief text and update the database accordingly.

**Two AI call types:**

**Type A — Debrief extraction** (`POST /api/debrief/:accountId`):
User pastes or types meeting notes. Server sends them to Claude with a JSON schema requesting extraction of: contacts mentioned, key takeaways, strategy updates, next steps. Server writes extracted data to `contacts` and `pursuit_log` tables.

**Type B — Intelligence refresh** (`POST /api/refresh/:accountId`):
Server sends current account context to Claude with a prompt to identify what public signals (earnings changes, exec moves, strategic pivots) should be updated. Returns updated context string. Server overwrites `accounts.context`. This is on-demand for now (triggered by user); scheduled auto-refresh is a later phase.

**Structured output format (Claude API, no SDK required):**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "messages": [...],
  "output_config": {
    "format": {
      "type": "json_schema",
      "schema": { ... }
    }
  }
}
```

This is supported on `claude-sonnet-4-6` (the current model in use) and works with raw HTTP requests — no SDK needed. Response is in `content[0].text` as guaranteed-valid JSON. [HIGH confidence — verified against official Anthropic docs]

---

## Data Flow

### Account Load Flow (new)

```
Browser requests GET /api/accounts
    → Server queries: SELECT * FROM accounts ORDER BY sector, name
    → Server returns JSON array
    → Browser builds sidebar + account panels dynamically from data
    → (No longer reads hardcoded ACCOUNTS object)
```

### Chat Flow (updated)

```
Browser sends message → POST /api/chat/:accountId (append user message)
    → Server writes to chat_history
    → Server fetches last N messages from chat_history
    → Server calls Anthropic API with history + account context
    → Server writes AI reply to chat_history
    → Server returns reply to browser
    → Browser displays reply
```

Chat history now survives page reloads. History loaded on account select via `GET /api/chat/:accountId`.

### Debrief / Pursuit Log Flow (new)

```
User types meeting debrief in AI chat or dedicated input
    → POST /api/debrief/:accountId with {text: "..."}
    → Server calls Claude with structured output schema:
        { contacts: [...], takeaways: [...], strategy_updates: [...], next_steps: [...] }
    → Server writes to pursuit_log (raw_text + ai_summary)
    → Server upserts any new contacts to contacts table
    → Server returns extraction result to browser
    → Browser updates pursuit log display + contacts panel
```

### Dynamic Account Management Flow (new)

```
User fills add-account form in browser
    → POST /api/accounts with {name, sector, hq, revenue, employees, context}
    → Server inserts into accounts table
    → Server returns new account record
    → Browser appends new sidebar item + panel (rendered from template, not hardcoded HTML)
```

---

## Suggested Build Order

Dependencies drive this order. Each phase produces something usable before the next begins.

**Phase 1 — Persistence foundation (unlocks everything)**
Add SQLite (`better-sqlite3`), initialize schema, migrate existing 13 accounts from `index.html` ACCOUNTS object into `accounts` table, add `GET /api/accounts` endpoint, update frontend to fetch accounts from server instead of reading hardcoded object. Chat history moves to DB. This phase alone delivers: chat history survives reloads, accounts live in a database.

**Phase 2 — Dynamic account management (unblocked by Phase 1)**
Add `POST/PUT/DELETE /api/accounts` endpoints, add account creation UI (a simple form in the sidebar), remove the need to edit HTML to add accounts. Depends on: Phase 1 DB schema and account fetch pattern.

**Phase 3 — Contact intelligence (unblocked by Phase 1)**
Add contacts table + `GET/POST/PUT /api/contacts/:accountId` endpoints, add Contacts tab to account panels, build contact cards UI. Depends on: Phase 1 DB.

**Phase 4 — Pursuit log + AI debrief extraction (unblocked by Phase 3)**
Add pursuit_log table + `POST /api/debrief/:accountId` with structured output extraction. This is where the AI conversation-as-input-method pattern becomes real. Depends on: Phase 1 DB, Phase 3 contacts (extraction writes to contacts table).

**Phase 5 — Intelligence refresh (unblocked by Phase 1)**
Add `POST /api/refresh/:accountId` as on-demand trigger. Prompt engineering for account context update. Optional: scheduled refresh using `setInterval` in server startup. Depends on: Phase 1 accounts table (needs account context to refresh).

**Phase 6 — Briefing view (unblocked by Phases 3 + 4)**
Generate a printable/shareable account briefing by composing data from accounts + contacts + pursuit_log. Can be a new tab in the account panel or a dedicated `GET /api/briefing/:accountId` endpoint that returns rendered HTML. Depends on: Phases 3 and 4 having data to compose.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Introducing Express or a router library
**What it looks like:** `npm install express` to handle new routes more cleanly.
**Why bad:** Adds a dependency, changes the deployment artifact, requires migration of existing route logic. The existing if/else dispatch handles 3 routes. It will handle 12 routes fine.
**Instead:** Extend the existing route dispatch with helper functions for path parsing. Extract a `parseRoute(pathname)` helper that returns `{resource, id, subresource}` from paths like `/api/contacts/gm`.

### Anti-Pattern 2: Storing everything in JSON files
**What it looks like:** `fs.writeFileSync('data.json', JSON.stringify(allData))` as a persistence layer.
**Why bad:** Race conditions on concurrent writes (two requests hitting simultaneously corrupt the file), no partial reads (must load entire dataset for every query), no transactions for multi-table updates (debrief extraction writes to two tables atomically).
**Instead:** SQLite with better-sqlite3. Single file, no server, atomic transactions built in.

### Anti-Pattern 3: Re-fetching full account context with every chat message
**What it looks like:** `GET /api/accounts/:id` on every chat turn to rebuild the system prompt.
**Why bad:** Unnecessary DB reads; at 50 accounts with large context strings this adds latency.
**Instead:** Cache account context in server memory on first load (a simple JS object). Invalidate on `PUT /api/accounts/:id`. Memory is cheap; this data rarely changes.

### Anti-Pattern 4: Migrating account data incrementally from HTML
**What it looks like:** Adding DB for new accounts but keeping existing 13 in index.html as fallback.
**Why bad:** Two sources of truth. Browser code must handle both. Merge conflicts on updates.
**Instead:** Phase 1 migration is a one-time seed script: read the ACCOUNTS object from index.html, write it to SQLite. After that, delete the hardcoded ACCOUNTS object from index.html entirely.

### Anti-Pattern 5: Using Claude for every request
**What it looks like:** Every page load triggers an intelligence refresh call to Claude.
**Why bad:** Token costs spike, latency increases, Railway egress adds up.
**Instead:** AI calls are triggered explicitly (user requests debrief extraction, user requests refresh). Auto-refresh is scheduled weekly at most, not per-request.

---

## Scalability Considerations

This app will never need horizontal scaling. It serves one team of ~5 people. The considerations here are about maintainability and operational simplicity over time.

| Concern | Current | After Phase 1-6 |
|---------|---------|-----------------|
| Accounts | 13, hardcoded in HTML | Unlimited, in SQLite |
| Adding account | Edit HTML, push to GitHub | Fill form in UI |
| Chat history | Lost on reload | Persisted in DB |
| Contact records | None | Stored in DB, shown in UI |
| Pursuit logs | None | Append-only log in DB |
| Deploy impact on data | Data in HTML, survives deploy | Data in Railway volume, survives deploy |
| DB size at 50 accounts / 2yr usage | N/A | ~20MB (trivial for SQLite) |

---

## Railway Deployment Notes

SQLite needs a Railway Volume to survive deploys. Without a volume, the DB file is written to ephemeral container storage and lost on every deploy.

Setup:
1. In Railway dashboard, attach a Volume to the service
2. Set mount path to `/data`
3. In server.js, open DB at `/data/data.db` (using `process.env.RAILWAY_VOLUME_MOUNT_PATH` or hardcoded `/data`)
4. For local dev, use `./data.db` as path (check `process.env.NODE_ENV`)

The `RAILWAY_VOLUME_MOUNT_PATH` environment variable is automatically set by Railway when a volume is attached. [MEDIUM confidence — documented in Railway help station; volume mount mechanism verified]

---

## Sources

- Node.js SQLite module status: https://betterstack.com/community/guides/scaling-nodejs/nodejs-sqlite/
- Node.js official sqlite docs: https://nodejs.org/api/sqlite.html
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- Railway volume persistence for SQLite: https://station.railway.com/questions/how-do-i-use-volumes-to-make-a-sqlite-da-34ea0372
- Anthropic structured outputs (verified GA on claude-sonnet-4-6): https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Vanilla Node.js routing patterns: https://www.section.io/engineering-education/a-raw-nodejs-rest-api-without-frameworks-such-as-express/

---

*Architecture analysis: 2026-04-10*

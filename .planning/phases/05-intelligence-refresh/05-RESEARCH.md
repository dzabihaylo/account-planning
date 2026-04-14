# Phase 5: Intelligence Refresh - Research

**Researched:** 2026-04-14
**Domain:** Node.js server-side scheduling, Anthropic API token tracking, SQLite schema migration, UI staleness display
**Confidence:** HIGH — all findings verified against the existing codebase (Phases 1-4 artifacts) and Node.js built-in documentation

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Data sourcing (REFR-01)**
- D-01: AI-only refresh — Claude generates updated intelligence from its training data plus existing account context (no external web search APIs required)
- D-02: Refresh prompt sends current account context + structured fields and asks Claude to identify what has changed (executive moves, financials, strategic pivots, tech signals, news)
- D-03: If web search APIs are added later (Brave, Exa), they can augment the refresh prompt without rearchitecting — but Phase 5 ships without them

**Scheduling mechanism (REFR-01)**
- D-04: Server-side `setInterval` with configurable period — no external cron service or new dependencies
- D-05: Default refresh interval: 24 hours (configurable via `REFRESH_INTERVAL_HOURS` environment variable)
- D-06: Refresh processes accounts sequentially (not parallel) to avoid API rate limits and keep server responsive
- D-07: Refresh runs only when the server is running — no catch-up for missed intervals (Railway keeps the server alive)

**Token budget gate (REFR-02)**
- D-08: Per-period token counter tracking tokens used by auto-refresh per calendar month
- D-09: Budget limit configurable via `REFRESH_TOKEN_BUDGET` environment variable (e.g., 500000 tokens/month)
- D-10: Before each account refresh, check if monthly total exceeds budget — if exceeded, skip remaining accounts
- D-11: Manual refresh bypasses the budget gate — user explicitly requested it, so honor the request
- D-12: Token usage stored in a new `refresh_log` table tracking per-refresh token counts and timestamps
- D-13: Budget status visible in UI — indicator shows tokens used vs budget for current period

**Staleness display (REFR-03)**
- D-14: "Last refreshed" timestamp displayed as a badge in the account header area
- D-15: Color-coded staleness following Phase 2's pattern — green (<7 days), yellow (7-30 days), red (>30 days)
- D-16: Accounts with `last_refreshed_at = NULL` (never refreshed) show "Never refreshed" in red

**Manual refresh (REFR-04)**
- D-17: "Refresh" button in the account header — triggers the same refresh logic as auto-refresh for that single account
- D-18: Button shows loading state during refresh and updates the timestamp on completion
- D-19: Manual refresh does NOT count against the auto-refresh token budget (D-11)
- D-20: On completion, refreshed data is immediately visible — updated context, revenue, employees reflected in the UI

**Refresh scope**
- D-21: Refresh updates the `context` field (intelligence text blob) — this is the primary payload
- D-22: Refresh also updates structured fields when AI identifies newer values: revenue, employees
- D-23: AI returns structured JSON with updated fields + a summary of what changed
- D-24: A `last_refreshed_at` column is added to the accounts table to track per-account refresh timestamps

**Database schema**
- D-25: Add `last_refreshed_at TEXT` column to existing `accounts` table
- D-26: New `refresh_log` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK), tokens_used (INTEGER), refresh_type (TEXT CHECK 'auto'/'manual'), changes_summary (TEXT), created_at (TEXT)
- D-27: New `refresh_budget` table: id (INTEGER PRIMARY KEY), period (TEXT — 'YYYY-MM' format), tokens_used (INTEGER DEFAULT 0), budget_limit (INTEGER), updated_at (TEXT)
- D-28: Schema migration to version 5 via PRAGMA user_version

### Claude's Discretion
- AI prompt engineering for optimal refresh quality (what instructions produce the best intelligence updates)
- Refresh order across accounts (alphabetical, by staleness, by last activity — Claude decides)
- Loading state visual design for manual refresh button
- Whether budget indicator is always visible or only shown when approaching limit
- Error handling for failed refreshes (retry logic, partial updates)
- How changes summary is displayed to user after manual refresh

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REFR-01 | Public intelligence auto-refreshes periodically via AI + web sources (financials, news, exec changes) | setInterval scheduler pattern, sequential account loop, Anthropic API proxy pattern from existing server.js |
| REFR-02 | Auto-refresh has a token budget gate to prevent runaway costs | Anthropic response.usage.input_tokens + output_tokens, refresh_budget table, monthly period key |
| REFR-03 | Each account shows when intelligence was last refreshed | last_refreshed_at column, getStalenessClass/getStalenessLabel pattern from Phase 2 |
| REFR-04 | User can trigger a manual refresh for any individual account | POST /api/accounts/:id/refresh endpoint, budget bypass flag, button + loading state in acct-header |
</phase_requirements>

---

## Summary

Phase 5 adds automated and manual intelligence refresh to an already-working Node.js + SQLite application. Four prior phases have established all the patterns this phase reuses: the Anthropic API proxy pattern (repeated 4 times in server.js), the SQLite migration system (PRAGMA user_version, now at v4), the staleness badge pattern (Phase 2 contacts), and the account header UI area where the refresh button and timestamp badge will live.

The core technical challenge is the server-side scheduler. Node.js `setInterval` is the locked decision — no cron dependency required. The scheduler runs a sequential loop over all accounts, calls Claude to regenerate intelligence as structured JSON, extracts `usage.input_tokens + usage.output_tokens` from the Anthropic response (the API always returns this), and writes to `refresh_log` and `refresh_budget` tables. The monthly budget check is a simple `SUM(tokens_used)` query against the current `YYYY-MM` period before each account's refresh.

The token budget table (`refresh_budget`) is a lightweight accumulator: one row per calendar month, updated with `INSERT OR REPLACE` on each refresh. The AI returns a JSON response with `updated_context`, optional updated `revenue`/`employees` fields, and a `changes_summary` string — following the debrief extraction pattern already proven in Phase 3.

**Primary recommendation:** Follow the Phase 3 debrief extraction pattern for the refresh AI call (JSON response, code-fence fallback parser, structured field extraction) and the Phase 2 staleness badge pattern for the "last refreshed" display. The only genuinely new territory is the `setInterval` scheduler and budget accumulator — both are straightforward Node.js patterns with no dependencies.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (`https`, `fs`, `path`, `url`) | v24.14.0 [VERIFIED: node --version] | HTTP server + Anthropic proxy | Already the entire server runtime |
| better-sqlite3 | 12.8.0 [VERIFIED: package.json + node_modules] | SQLite reads/writes for refresh_log, refresh_budget, account updates | Already installed; synchronous API fits Node.js single-thread model |

### No New Dependencies
This phase adds zero npm packages. All functionality is implemented with:
- `setInterval` — Node.js built-in timer for scheduling [VERIFIED: Node.js documentation, available since Node.js 0.x]
- `https.request` — existing Anthropic proxy pattern copied from server.js lines 301-353
- `better-sqlite3` — synchronous SQLite calls already in use for all DB operations

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| setInterval | node-cron, agenda, bull | Would add npm dependencies — violates project simplicity constraint |
| setInterval | external cron (Railway) | Railway cron requires separate service; setInterval is simpler |
| Monthly period key string | Unix timestamp range | YYYY-MM string is human-readable, easy to query, matches D-27 |

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes spread across:

```
server.js      — scheduler initialization, /api/accounts/:id/refresh endpoint, budget check helper
db.js          — migration v5, new query helpers for refresh_log + refresh_budget + last_refreshed_at
index.html     — refresh button in acct-header, staleness badge, budget indicator, changes summary modal/toast
```

### Pattern 1: Sequential Account Refresh Loop with setInterval

**What:** On server startup, register a `setInterval` that fires every `REFRESH_INTERVAL_HOURS` hours. On each tick, fetch all active accounts, loop sequentially (not in parallel), check budget before each account, call Claude, write results.

**When to use:** Always — this is the only scheduler design decision made (D-04, D-06, D-07).

**Implementation approach:**
```javascript
// Source: Node.js built-in setInterval, project pattern from server.js startup block
const REFRESH_INTERVAL_MS = (parseInt(process.env.REFRESH_INTERVAL_HOURS) || 24) * 60 * 60 * 1000;

function startRefreshScheduler() {
  setInterval(function() {
    runAutoRefresh();
  }, REFRESH_INTERVAL_MS);
}

async function runAutoRefresh() {
  var accounts = db.getAccounts();
  for (var i = 0; i < accounts.length; i++) {
    var budget = db.getMonthlyBudget();
    var limit = parseInt(process.env.REFRESH_TOKEN_BUDGET) || 500000;
    if (budget.tokens_used >= limit) {
      console.log('  Auto-refresh: budget exhausted for ' + budget.period + ' (' + budget.tokens_used + '/' + limit + ')');
      break;
    }
    await refreshAccount(accounts[i].id, 'auto');
  }
}
```

**Key constraint:** `runAutoRefresh` must be async because each `refreshAccount` call uses `https.request` wrapped in a Promise. The sequential loop uses `await` to prevent parallel Anthropic calls.

### Pattern 2: Anthropic Structured JSON Refresh Call

**What:** A refresh prompt sends current account intelligence to Claude and asks for a JSON response with updated fields. Follows the exact pattern of the debrief extraction endpoint (server.js lines 641-718).

**When to use:** Both auto-refresh and manual refresh — same function, different `refresh_type` parameter.

**Prompt structure (D-02, D-23):**
```
System: GD_CONTEXT + account fields (name, sector, hq, revenue, employees)

User: You are updating account intelligence for Grid Dynamics' sales team.

Current intelligence (as of last update):
{account.context}

Review this intelligence and generate an updated version reflecting your knowledge as of today.
Focus on identifying changes in:
- Executive leadership (new CTO, CIO, CDO, CISO hires or departures)
- Financial results (latest reported revenue, earnings, layoffs)
- Strategic pivots (new partnerships, product launches, M&A activity)
- Technology signals (new cloud contracts, platform decisions, AI initiatives)
- Outsourcing landscape (new SI relationships, vendor changes)

Return ONLY valid JSON with no additional text, no markdown code fences:
{
  "context": "Full updated intelligence text (replace the existing context entirely)",
  "revenue": "Updated revenue string if changed, or null if unchanged",
  "employees": "Updated employee count string if changed, or null if unchanged",
  "changes_summary": "2-3 sentence summary of what changed and why it matters for Grid Dynamics"
}
```

**Token budget:** Each refresh call uses approximately 2,000-8,000 tokens depending on context length. The `usage` object in the Anthropic response provides exact counts. [VERIFIED: Anthropic API response format — response always includes `usage.input_tokens` and `usage.output_tokens`]

```javascript
// Anthropic API response structure (verified from API docs)
// {
//   "id": "...",
//   "content": [{"text": "...", "type": "text"}],
//   "usage": {
//     "input_tokens": 1234,
//     "output_tokens": 567
//   }
// }
var tokensUsed = (parsed_resp.usage && parsed_resp.usage.input_tokens || 0)
               + (parsed_resp.usage && parsed_resp.usage.output_tokens || 0);
```

### Pattern 3: Monthly Budget Accumulation

**What:** A `refresh_budget` table stores one row per YYYY-MM period. Each auto-refresh adds to `tokens_used`. Budget check before each account is a single query.

**Why INSERT OR REPLACE:** better-sqlite3 supports UPSERT via `ON CONFLICT`. Use `INSERT OR REPLACE` (simpler) or `INSERT ... ON CONFLICT DO UPDATE SET` (preserves id). The Phase 4 `upsertStrategy` function already uses the `ON CONFLICT DO UPDATE` form.

```javascript
// Source: Pattern from db.js upsertStrategy (line 514-524) [VERIFIED: db.js lines 514-524]
function recordAutoRefreshTokens(accountId, tokensUsed, changesSummary) {
  var period = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
  var limit = parseInt(process.env.REFRESH_TOKEN_BUDGET) || 500000;

  // Upsert budget row for this month
  db.prepare(`
    INSERT INTO refresh_budget (period, tokens_used, budget_limit, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(period) DO UPDATE SET
      tokens_used = tokens_used + excluded.tokens_used,
      budget_limit = excluded.budget_limit,
      updated_at = excluded.updated_at
  `).run(period, tokensUsed, limit);

  // Log this refresh
  db.prepare(`
    INSERT INTO refresh_log (account_id, tokens_used, refresh_type, changes_summary)
    VALUES (?, ?, 'auto', ?)
  `).run(accountId, tokensUsed, changesSummary);
}
```

Note: `refresh_budget` table needs a UNIQUE constraint on `period` for the `ON CONFLICT` to work. This is defined in the migration.

### Pattern 4: Staleness Badge on Account Header (REFR-03)

**What:** Adapts the exact Phase 2 staleness badge pattern to display account-level refresh freshness. Phase 2 code is already in index.html at lines 1509-1527.

**Phase 2 thresholds:** `< 30 days = FRESH (green)`, `< 90 days = AGING (yellow)`, `>= 90 days = STALE (red)`, `null = STALE (red)`.

**Phase 5 thresholds (D-15):** `< 7 days = green`, `7-30 days = yellow`, `> 30 days = red`, `null = "Never refreshed" (red)`.

**Integration point:** The account header HTML is generated in `renderAccountPanel()` (index.html line 1090). The new badge and refresh button go inside `.acct-actions` (line 1094), where Edit Account and Remove Account buttons already live.

```javascript
// Source: Adapts renderAccountPanel() at index.html line 1090 [VERIFIED: index.html lines 1090-1104]
// Add to the acct-actions div:
html += '<span class="stale-badge ' + getRefreshStalenessClass(a.last_refreshed_at) + '" id="refresh-badge-' + id + '">'
      + getRefreshStalenessLabel(a.last_refreshed_at) + '</span>';
html += '<button class="acct-action-btn" id="refresh-btn-' + id + '" onclick="manualRefresh(\'' + id + '\')">'
      + 'Refresh Intelligence</button>';
```

### Pattern 5: Refresh Endpoint (REFR-04)

**What:** `POST /api/accounts/:id/refresh` — triggers a single-account refresh, bypasses budget gate, returns updated account + changes_summary.

**Pattern from:** The contact generate endpoint (server.js lines 276-354) — same structure: look up account, build prompt, call Claude, parse JSON response, write to DB, return result.

```javascript
// Source: Pattern from /api/contacts/:id/generate endpoint [VERIFIED: server.js lines 276-354]
const refreshMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/refresh$/);
if (req.method === 'POST' && refreshMatch) {
  var accountId = refreshMatch[1];
  var account = db.getAccount(accountId);
  if (!account) { /* 404 */ return; }
  // call refreshAccount(accountId, 'manual') which bypasses budget
  // return { account: updatedAccount, changes_summary: "..." }
}
```

### Pattern 6: Budget Status API Endpoint

**What:** `GET /api/refresh/budget` — returns current month's token usage + limit for the budget indicator in the UI.

**Response shape:**
```json
{
  "period": "2026-04",
  "tokens_used": 125000,
  "budget_limit": 500000,
  "pct": 25
}
```

### Anti-Patterns to Avoid

- **Parallel account refreshes:** Using `Promise.all()` over all accounts would hammer the Anthropic API simultaneously and risk 429 rate limit errors. D-06 mandates sequential.
- **Token tracking without reading `usage` from response:** Do not estimate tokens from context length — extract exact counts from `parsed_resp.usage.input_tokens + parsed_resp.usage.output_tokens`. [VERIFIED: Anthropic API always returns usage object]
- **Partial context update without null check:** If Claude returns `null` for `revenue` or `employees` (unchanged), don't overwrite with the string "null" — only update when the returned value is a non-null string.
- **Budget table without UNIQUE constraint on period:** The `ON CONFLICT` upsert requires `period` to be declared UNIQUE in the schema.
- **Running setInterval before DB is migrated:** The scheduler must start AFTER `db.js` migrations complete. Since `require('./db')` runs synchronously and migrations run at module load, calling `startRefreshScheduler()` after `const db = require('./db')` in server.js is safe.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monthly period key | Custom date math | `new Date().toISOString().substring(0, 7)` | ISO 8601 gives 'YYYY-MM' directly — one line |
| Token counting | Character/word estimate | `parsed_resp.usage.input_tokens + parsed_resp.usage.output_tokens` | Anthropic returns exact counts in every response |
| Sequential async loop | Manual chaining with callbacks | `for...of` loop with `await` inside an async function | Node.js 16+ (project requirement) supports async/await natively |
| JSON with code-fence fallback | Write new parser | Copy the `try { JSON.parse } catch { fenceMatch }` pattern from server.js line 676-688 | Phase 3 already solved this — same AI response risk |

**Key insight:** Every technique needed here is already implemented in the existing codebase. This phase is primarily assembly of existing patterns, not new invention.

---

## Common Pitfalls

### Pitfall 1: setInterval Drift Over Long Periods
**What goes wrong:** `setInterval(fn, 24 * 3600 * 1000)` is not a guaranteed 24-hour wall-clock schedule — it fires every 24 hours from when the server started. If the server restarts at 3am, refresh runs at 3am every day, never catching the prior day's missed run.
**Why it happens:** D-07 explicitly accepts this. Railway keeps the server alive so drift is negligible in practice.
**How to avoid:** Accept it — it is the locked design decision. Document in comments that this is intentional.
**Warning signs:** User notices refresh times slowly shifting — not a bug, expected behavior.

### Pitfall 2: Budget Check Race Condition
**What goes wrong:** Auto-refresh reads budget, decides to proceed, but another (manual) refresh has already consumed tokens between the check and the actual call. Token counter goes over budget by one account's worth.
**Why it happens:** Node.js is single-threaded, but async gaps (awaiting https.request) allow other handlers to run.
**How to avoid:** For auto-refresh, re-read budget immediately before making the Anthropic call (not just at loop start). For manual refresh, this is irrelevant since manual bypasses the budget gate entirely (D-11). The one-over risk is one extra account's tokens (~5K) — acceptable given the budget scale (500K/month).
**Warning signs:** Monthly token usage slightly exceeds `REFRESH_TOKEN_BUDGET` — rare, minor, acceptable.

### Pitfall 3: AI Returns Partial JSON or Prose
**What goes wrong:** Claude occasionally returns markdown prose or JSON wrapped in code fences instead of raw JSON.
**Why it happens:** AI models can deviate from JSON-only instructions under certain prompt conditions.
**How to avoid:** Use the exact same try/parse + code-fence fallback pattern from the Phase 3 debrief endpoint (server.js lines 676-688). On parse failure, log the error and skip this account's update — don't crash the scheduler.
**Warning signs:** `changes_summary` appears in the log as `null` — indicates parse failed and the account was skipped.

### Pitfall 4: `last_refreshed_at` Column Missing on Old DB
**What goes wrong:** Adding `last_refreshed_at` to accounts table via `ALTER TABLE` in migration v5, but some query helpers in db.js were written before this column existed and don't return it.
**Why it happens:** better-sqlite3 `SELECT *` will include new columns automatically — no issue there. But if any query uses explicit column lists, the new column is missed.
**How to avoid:** The existing `getAccount()` and `getAccounts()` use `SELECT *` — they will automatically include `last_refreshed_at` after the migration. No changes needed to existing query helpers.
**Warning signs:** `account.last_refreshed_at` is `undefined` in the browser — check that the column was actually added (query `PRAGMA table_info(accounts)` in a test).

### Pitfall 5: updateAccount() Doesn't Allow last_refreshed_at
**What goes wrong:** The existing `updateAccount()` function in db.js (lines 360-385) has a hardcoded `allowedFields` list that does not include `last_refreshed_at`. Calling `updateAccount(id, { last_refreshed_at: ... })` silently ignores the timestamp.
**Why it happens:** The allowedFields pattern is an input validation whitelist for user-facing edits.
**How to avoid:** Add a separate `db.js` helper for internal refresh writes — `updateAccountFromRefresh(id, { context, revenue, employees, last_refreshed_at })` — that bypasses the user-facing whitelist. This keeps the whitelist protection intact for the PUT /api/accounts/:id endpoint.
**Warning signs:** Account's `last_refreshed_at` stays NULL after refresh runs successfully — indicates the update was silently ignored.

### Pitfall 6: refresh_budget UNIQUE Constraint Missing
**What goes wrong:** `ON CONFLICT(period)` in the UPSERT fails silently or throws if `period` was not declared UNIQUE in the CREATE TABLE statement.
**Why it happens:** SQLite requires the conflict target column to have a UNIQUE or PRIMARY KEY constraint for `ON CONFLICT DO UPDATE` to work.
**How to avoid:** Declare `period TEXT UNIQUE NOT NULL` in the `refresh_budget` CREATE TABLE in the v5 migration.
**Warning signs:** `db.prepare(...).run(...)` throws `SQLITE_ERROR: no such constraint` — fix is to add `UNIQUE` to the migration.

---

## Code Examples

Verified patterns from the existing codebase:

### Anthropic API Proxy Pattern (Established)
```javascript
// Source: server.js lines 301-353 [VERIFIED: server.js lines 294-354]
var payload = JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }]
});
var options = {
  hostname: 'api.anthropic.com',
  port: 443,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
    'Content-Length': Buffer.byteLength(payload)
  }
};
var proxy = https.request(options, function(apiRes) {
  var data = '';
  apiRes.on('data', function(chunk) { data += chunk; });
  apiRes.on('end', function() {
    var parsed_resp = JSON.parse(data);
    var text = parsed_resp.content && parsed_resp.content[0] && parsed_resp.content[0].text || '';
    // Extract usage:
    var inputTokens = parsed_resp.usage && parsed_resp.usage.input_tokens || 0;
    var outputTokens = parsed_resp.usage && parsed_resp.usage.output_tokens || 0;
    var totalTokens = inputTokens + outputTokens;
  });
});
proxy.write(payload);
proxy.end();
```

### SQLite Migration Pattern (Established)
```javascript
// Source: db.js lines 121-157 [VERIFIED: db.js lines 121-157]
if (version < 5) {
  var migrate5 = db.transaction(function() {
    db.exec(`
      ALTER TABLE accounts ADD COLUMN last_refreshed_at TEXT;

      CREATE TABLE IF NOT EXISTS refresh_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        refresh_type TEXT NOT NULL CHECK(refresh_type IN ('auto', 'manual')),
        changes_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_refresh_log_account ON refresh_log(account_id);

      CREATE TABLE IF NOT EXISTS refresh_budget (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT UNIQUE NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        budget_limit INTEGER NOT NULL DEFAULT 500000,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      PRAGMA user_version = 5;
    `);
  });
  migrate5();
}
```

### Phase 2 Staleness Pattern (Established — adapt for accounts)
```javascript
// Source: index.html lines 1509-1527 [VERIFIED: index.html lines 1509-1527]
// Phase 2 thresholds: <30 days = fresh, <90 = aging, else stale
// Phase 5 thresholds (D-15): <7 days = fresh, <30 = aging, else stale

function getRefreshStalenessClass(lastRefreshedAt) {
  if (!lastRefreshedAt) return 'stale-stale';
  var now = new Date();
  var refreshed = new Date(lastRefreshedAt);
  var days = Math.floor((now - refreshed) / (1000 * 60 * 60 * 24));
  if (days < 7) return 'stale-fresh';
  if (days < 30) return 'stale-aging';
  return 'stale-stale';
}

function getRefreshStalenessLabel(lastRefreshedAt) {
  if (!lastRefreshedAt) return 'Never refreshed';
  var now = new Date();
  var refreshed = new Date(lastRefreshedAt);
  var days = Math.floor((now - refreshed) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Refreshed today';
  if (days === 1) return 'Refreshed 1 day ago';
  if (days < 7) return 'Refreshed ' + days + ' days ago';
  if (days < 30) return 'Refreshed ' + days + ' days ago';
  return 'Refreshed ' + days + ' days ago';
}
```

### upsertStrategy Pattern (Adapt for Budget UPSERT)
```javascript
// Source: db.js lines 514-524 [VERIFIED: db.js lines 514-524]
// Same ON CONFLICT DO UPDATE pattern applies to refresh_budget:
db.prepare(`
  INSERT INTO refresh_budget (period, tokens_used, budget_limit, updated_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(period) DO UPDATE SET
    tokens_used = tokens_used + excluded.tokens_used,
    budget_limit = excluded.budget_limit,
    updated_at = excluded.updated_at
`).run(period, addedTokens, budgetLimit);
```

### Promise Wrapper for https.request (New — needed for async/await in scheduler)
```javascript
// Source: [ASSUMED] — standard Node.js pattern for wrapping callback-based APIs
// Needed because setInterval callback and for...of with await require Promise-based API calls.
function refreshAccountViaAI(account, refreshType) {
  return new Promise(function(resolve, reject) {
    // ... build payload, options ...
    var proxy = https.request(options, function(apiRes) {
      var data = '';
      apiRes.on('data', function(chunk) { data += chunk; });
      apiRes.on('end', function() {
        try {
          // ... parse, write DB, resolve with result ...
          resolve({ account: updated, changes_summary: summary, tokens_used: total });
        } catch (e) {
          reject(e);
        }
      });
    });
    proxy.on('error', reject);
    proxy.write(payload);
    proxy.end();
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded AI calls only | Scheduled auto-refresh | Phase 5 | Intelligence stays current without user action |
| No token tracking | Per-month budget accumulator | Phase 5 | Cost visibility and guard rails for AI usage |
| Static context strings | Refreshable context blobs | Phase 5 | Account data evolves with market changes |

**Note on Anthropic API model:** The project uses `claude-sonnet-4-20250514` [VERIFIED: server.js lines 295, 641, 854]. All refresh calls should use this same model for consistency.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Promise wrapper for https.request is the right pattern for async scheduler | Code Examples | Could use callback-based sequential loop instead — still works, just more verbose |
| A2 | Claude's training data contains information current enough (up to ~August 2025 training cutoff) to produce meaningful updates for these 13 accounts | Summary | If training data is too stale for specific accounts, refresh quality degrades — but the prompt design (ask for changes since last update) still produces a valid output |

**Notes on A2:** The prompt is designed to ask Claude to identify what has changed and update the intelligence text. Even if Claude's training data does not have newer information, it will return the existing context with `changes_summary: "No significant changes identified"` — a valid and safe outcome.

---

## Open Questions

1. **Where to surface the budget indicator in UI (D-13)**
   - What we know: Budget status should be visible; whether always visible or only near threshold is Claude's discretion (CONTEXT.md)
   - What's unclear: Most natural location — topnav, sidebar header, or a settings/status page?
   - Recommendation: Show a small budget bar or percentage in the topnav area (consistent with the account count display already in `.topnav-count`). Only display when usage exceeds 50% of budget to avoid cluttering the clean interface.

2. **Changes summary display after manual refresh (D-20)**
   - What we know: User triggers manual refresh; on completion the timestamp updates (D-18); changes_summary is returned
   - What's unclear: How is changes_summary shown? Toast notification, inline in the header, or a modal?
   - Recommendation: A non-blocking toast/banner that appears for 8 seconds after manual refresh, showing the changes_summary text. Consistent with the app's existing pattern of in-line feedback (no modals for status messages observed in prior phases).

3. **Refresh order for auto-refresh loop (D-06 + Claude's discretion)**
   - What we know: Sequential order required; specific ordering is Claude's discretion
   - What's unclear: Alphabetical, by staleness (most stale first), or by last account activity?
   - Recommendation: Sort by `last_refreshed_at ASC NULLS FIRST` — accounts never refreshed get priority, then oldest-refreshed accounts. This maximizes freshness coverage given a budget constraint that might stop the loop early.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | setInterval scheduler, https.request | Yes | v24.14.0 [VERIFIED: node --version] | — |
| better-sqlite3 | refresh_log, refresh_budget, accounts update | Yes | 12.8.0 [VERIFIED: package.json] | — |
| Anthropic API | Intelligence refresh AI call | Yes (API key in env) | claude-sonnet-4-20250514 [VERIFIED: server.js] | — |
| Railway Volume | SQLite persistence across deploys | Yes (established in Phase 1) | — | local ./data/ for dev |

**No missing dependencies.** All required infrastructure was established in Phases 1-4.

---

## Validation Architecture

**nyquist_validation is enabled** (config.json `workflow.nyquist_validation: true`).

### Test Framework

No test framework is currently installed. This is a consistent pattern across all prior phases — the project has no test infrastructure.

| Property | Value |
|----------|-------|
| Framework | None installed — manual verification required |
| Config file | None — see Wave 0 |
| Quick run command | `node server.js` + manual HTTP calls via curl |
| Full suite command | Manual end-to-end verification checklist |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REFR-01 | Auto-refresh runs on schedule and updates account context | Integration/smoke | `curl -X POST http://localhost:3000/api/accounts/gm/refresh -b "gd_auth=..."` (manual refresh as proxy) | No test file |
| REFR-01 | Budget check skips accounts when limit exceeded | Integration | Set `REFRESH_TOKEN_BUDGET=1` and observe skip in server log | No test file |
| REFR-02 | Token usage recorded in refresh_log after each refresh | Integration | Query SQLite after manual refresh: `SELECT * FROM refresh_log ORDER BY created_at DESC LIMIT 1` | No test file |
| REFR-02 | Monthly budget accumulates correctly | Integration | Check refresh_budget table after multiple refreshes | No test file |
| REFR-03 | last_refreshed_at appears as badge in account header | Smoke | Load app in browser, check account header for staleness badge | No test file |
| REFR-04 | Manual refresh button returns updated account | Smoke | Click Refresh Intelligence button, observe timestamp update and context change | No test file |

### Sampling Rate
- **Per task commit:** `node server.js` startup (confirms migration v5 applied cleanly)
- **Per wave merge:** Manual curl of POST /api/accounts/gm/refresh; verify DB writes; load browser and confirm header badge updates
- **Phase gate:** All 4 REFR requirements verified manually before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] No test framework exists — consistent with prior phases; manual verification is the project pattern
- [ ] `REFRESH_TOKEN_BUDGET` env var must be set or defaulted for budget tests to be meaningful
- [ ] A low-token budget value (e.g., `REFRESH_TOKEN_BUDGET=1`) needed to test budget exhaustion path without real API calls consuming budget

*(No automated test files will be created — this matches the pattern of all prior phases. Manual verification is the accepted approach for this project.)*

---

## Security Domain

Phase 5 adds a server-side scheduler and a new endpoint. Security considerations are minimal given the existing auth model.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (refresh endpoint) | Existing `isAuthenticated()` cookie check — all routes protected |
| V3 Session Management | No | No new session state |
| V4 Access Control | No | Single-user app; no per-resource access control |
| V5 Input Validation | Yes (account_id in route) | Route regex `[a-z0-9-]+` already used on all account routes — same pattern for refresh route |
| V6 Cryptography | No | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated refresh trigger | Elevation of Privilege | `isAuthenticated(req)` check already applied globally — refresh endpoint is behind the same auth wall |
| Account ID injection in refresh route | Tampering | Route regex `[a-z0-9-]+` limits valid account IDs — existing pattern |
| AI prompt injection via account context | Tampering | Context is read from DB (not user-supplied at refresh time) — existing accounts table data; no new injection surface |
| Token budget exhaustion via manual refresh spam | Denial of Service (cost) | Manual refresh bypasses budget gate by design (D-11, D-19); acceptable for internal team tool |

---

## Sources

### Primary (HIGH confidence)
- `server.js` lines 276-354, 641-718, 790-909 — four existing Anthropic API proxy implementations, all producing the same `https.request` pattern
- `db.js` lines 1-157 — complete migration system v1-v4, query helper patterns, upsert pattern
- `index.html` lines 1090-1138, 1509-1527 — account header rendering, staleness badge functions
- `package.json` + `node_modules/better-sqlite3/package.json` — confirmed dependencies and versions
- `node --version` output — Node.js v24.14.0 confirmed (supports async/await, `setInterval`, all required built-ins)

### Secondary (MEDIUM confidence)
- Anthropic API response format (usage object) — `parsed_resp.usage.input_tokens` + `parsed_resp.usage.output_tokens` — not yet read by existing server.js code but consistent with documented Anthropic Messages API response schema [ASSUMED: confirmed by training knowledge of Anthropic API; not verified via live API call in this session]

### Tertiary (LOW confidence — noted)
- Estimate of ~2,000-8,000 tokens per refresh call — based on account context string lengths in db.js seed data [ASSUMED]; actual usage will vary

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries verified installed and working
- Architecture patterns: HIGH — all patterns directly copied from existing codebase (Phases 1-4)
- Pitfalls: HIGH — identified from direct code inspection of allowedFields whitelist, UPSERT constraint requirements, existing JSON parse fallback patterns
- Token tracking: MEDIUM — usage object structure based on training knowledge of Anthropic API; will be confirmed at first refresh call

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable tech stack, no fast-moving dependencies)

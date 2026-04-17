# Phase 7: Server Hardening - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** Auto-mode with chain (recommended defaults selected)

<domain>
## Phase Boundary

The server protects account data via automated SQLite backups, handles AI failures gracefully with user-facing error messages, rate limits AI endpoints to prevent cost runaway, and logs errors persistently for post-incident diagnosis.

</domain>

<decisions>
## Implementation Decisions

### SQLite backup (HARD-01)
- **D-01:** Scheduled file copy of the SQLite database file to a backup directory on Railway Volume (`/data/backups/`)
- **D-02:** Use `fs.copyFileSync` on a `setInterval` schedule — zero new dependencies
- **D-03:** Default backup interval: every 6 hours (configurable via `BACKUP_INTERVAL_HOURS` env var)
- **D-04:** Keep last 5 backups, rotate out oldest — prevents unbounded disk usage
- **D-05:** Backup filename includes ISO timestamp: `intel-backup-YYYY-MM-DDTHH-MM-SS.db`
- **D-06:** Log each backup to console and persistent error log

### Graceful AI error handling (HARD-02)
- **D-07:** All AI endpoint errors (Anthropic API failures, timeouts, JSON parse errors) return structured JSON: `{ error: "readable message", code: "ERROR_TYPE" }`
- **D-08:** Frontend displays AI errors as inline messages in the relevant panel (chat, briefing, strategy, refresh) — follows existing chat error pattern
- **D-09:** Timeout handling: set explicit request timeout on Anthropic API calls, catch timeout and return user-friendly message
- **D-10:** Never expose raw stack traces or API keys in error responses

### Rate limiting (HARD-03)
- **D-11:** Simple in-memory sliding window rate limiter — no dependencies (no express-rate-limit, no Redis)
- **D-12:** Applied to all AI endpoints: /api/claude (chat), /api/accounts/:id/briefing (POST), /api/accounts/:id/refresh (POST), /api/accounts/:id/debrief (POST), /api/accounts/:id/strategy/generate (POST)
- **D-13:** Default threshold: 10 AI requests per minute per session (configurable via `RATE_LIMIT_PER_MINUTE` env var)
- **D-14:** Rate limit exceeded returns HTTP 429 with JSON: `{ error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" }`
- **D-15:** Frontend handles 429 responses by showing the error message inline (same as D-08 pattern)
- **D-16:** Rate limit resets on server restart — in-memory only, no persistence needed

### Persistent error logging (HARD-04)
- **D-17:** Append-only JSON lines file at `/data/errors.log` on Railway Volume
- **D-18:** Each log entry: `{ timestamp, level, endpoint, error_type, message, account_id (if applicable) }`
- **D-19:** Log levels: "error" (failures), "warn" (rate limits, budget exceeded), "info" (backups, refresh completions)
- **D-20:** Log rotation: cap file at 10MB, rotate to `errors.log.1` (keep 1 rotated file)
- **D-21:** Existing `console.error` calls also write to the persistent log — dual output
- **D-22:** No admin UI for viewing logs — logs are accessed via Railway shell or volume mount

### Claude's Discretion
- Exact timeout values for Anthropic API calls
- Whether backup uses SQLite online backup API or simple file copy
- Error message wording for each error type
- Rate limiter implementation details (token bucket vs sliding window)
- Log rotation implementation approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/REQUIREMENTS.md` — HARD-01 through HARD-04 requirement definitions
- `.planning/ROADMAP.md` — Phase 7 success criteria (4 criteria that must be TRUE)
- `.planning/PROJECT.md` — Constraints: simplicity, zero-dependency preference, Railway hosting, budget sensitivity

### Existing codebase
- `server.js` — Current HTTP server, all API endpoints, existing console.error patterns, Anthropic API proxy
- `db.js` — Database module, SQLite file path, migration pattern
- `index.html` — Frontend error display patterns (chat error inline message)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `console.error` calls throughout server.js — can be wrapped to dual-output to persistent log
- Chat error handling in index.html — `catch` block shows inline error message, reusable pattern for all AI panels
- `readBody` helper in server.js — centralized request parsing, good place to add rate limit check

### Established Patterns
- Environment variables for configuration: `ANTHROPIC_API_KEY`, `APP_PASSWORD`, `PORT`, `REFRESH_INTERVAL_HOURS`, `REFRESH_TOKEN_BUDGET`
- `setInterval` for scheduled tasks (auto-refresh in server.js)
- Railway Volume at `/data` for persistent storage (SQLite DB already lives there)

### Integration Points
- `server.js` request handler — rate limiting check before AI endpoint processing
- All Anthropic API proxy calls — timeout and error handling wrapping
- `db.js` — backup source file path
- `index.html` — error display in briefing, strategy, and debrief panels (currently only chat has it)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for server hardening on Railway.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-server-hardening*
*Context gathered: 2026-04-17*

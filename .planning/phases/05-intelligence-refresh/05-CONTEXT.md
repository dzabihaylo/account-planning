# Phase 5: Intelligence Refresh - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** Auto-mode with chain (recommended defaults selected)

<domain>
## Phase Boundary

Public account intelligence stays current without manual HTML edits or runaway AI costs. Auto-refresh runs on a schedule using AI to regenerate account intelligence. A token budget gate prevents cost overruns. Each account shows when it was last refreshed. Users can trigger a manual refresh for any individual account at any time.

</domain>

<decisions>
## Implementation Decisions

### Data sourcing (REFR-01)
- **D-01:** AI-only refresh — Claude generates updated intelligence from its training data plus existing account context (no external web search APIs required)
- **D-02:** Refresh prompt sends current account context + structured fields and asks Claude to identify what's changed (executive moves, financials, strategic pivots, tech signals, news)
- **D-03:** If web search APIs are added later (Brave, Exa), they can augment the refresh prompt without rearchitecting — but Phase 5 ships without them

### Scheduling mechanism (REFR-01)
- **D-04:** Server-side `setInterval` with configurable period — no external cron service or new dependencies
- **D-05:** Default refresh interval: 24 hours (configurable via `REFRESH_INTERVAL_HOURS` environment variable)
- **D-06:** Refresh processes accounts sequentially (not parallel) to avoid API rate limits and keep server responsive
- **D-07:** Refresh runs only when the server is running — no catch-up for missed intervals (Railway keeps the server alive)

### Token budget gate (REFR-02)
- **D-08:** Per-period token counter tracking tokens used by auto-refresh per calendar month
- **D-09:** Budget limit configurable via `REFRESH_TOKEN_BUDGET` environment variable (e.g., 500000 tokens/month)
- **D-10:** Before each account refresh, check if monthly total exceeds budget — if exceeded, skip remaining accounts
- **D-11:** Manual refresh bypasses the budget gate — user explicitly requested it, so honor the request
- **D-12:** Token usage stored in a new `refresh_log` table tracking per-refresh token counts and timestamps
- **D-13:** Budget status visible in UI — indicator shows tokens used vs budget for current period

### Staleness display (REFR-03)
- **D-14:** "Last refreshed" timestamp displayed as a badge in the account header area
- **D-15:** Color-coded staleness following Phase 2's pattern — green (<7 days), yellow (7-30 days), red (>30 days)
- **D-16:** Accounts with `last_refreshed_at = NULL` (never refreshed) show "Never refreshed" in red

### Manual refresh (REFR-04)
- **D-17:** "Refresh" button in the account header — triggers the same refresh logic as auto-refresh for that single account
- **D-18:** Button shows loading state during refresh and updates the timestamp on completion
- **D-19:** Manual refresh does NOT count against the auto-refresh token budget (D-11)
- **D-20:** On completion, refreshed data is immediately visible — updated context, revenue, employees reflected in the UI

### Refresh scope
- **D-21:** Refresh updates the `context` field (intelligence text blob) — this is the primary payload
- **D-22:** Refresh also updates structured fields when AI identifies newer values: revenue, employees
- **D-23:** AI returns structured JSON with updated fields + a summary of what changed
- **D-24:** A `last_refreshed_at` column is added to the accounts table to track per-account refresh timestamps

### Database schema
- **D-25:** Add `last_refreshed_at TEXT` column to existing `accounts` table
- **D-26:** New `refresh_log` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK), tokens_used (INTEGER), refresh_type (TEXT CHECK 'auto'/'manual'), changes_summary (TEXT), created_at (TEXT)
- **D-27:** New `refresh_budget` table: id (INTEGER PRIMARY KEY), period (TEXT — 'YYYY-MM' format), tokens_used (INTEGER DEFAULT 0), budget_limit (INTEGER), updated_at (TEXT)
- **D-28:** Schema migration to version 5 via PRAGMA user_version

### Claude's Discretion
- AI prompt engineering for optimal refresh quality (what instructions produce the best intelligence updates)
- Refresh order across accounts (alphabetical, by staleness, by last activity — Claude decides)
- Loading state visual design for manual refresh button
- Whether budget indicator is always visible or only shown when approaching limit
- Error handling for failed refreshes (retry logic, partial updates)
- How changes summary is displayed to user after manual refresh

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/REQUIREMENTS.md` — REFR-01 through REFR-04 requirement definitions
- `.planning/ROADMAP.md` — Phase 5 success criteria (4 criteria that must be TRUE)
- `.planning/PROJECT.md` — Constraint: "Budget: Token costs matter — be smart about when and how much AI is used for auto-refresh"

### Prior phase artifacts
- `.planning/phases/01-persistence-account-management/01-CONTEXT.md` — SQLite patterns (D-01/D-02/D-03), accounts table schema, migration pattern
- `.planning/phases/02-contact-intelligence/02-CONTEXT.md` — AI on-demand pattern (D-05/D-06), staleness indicators (D-12/D-13), deferred auto-refresh to Phase 5 (D-14)
- `.planning/phases/04-pursuit-strategy/04-CONTEXT.md` — Strategy synthesis uses all account data (D-08) — refreshed intelligence feeds into strategy

### Existing codebase
- `db.js` — Database module with migration v4, accounts table with context field, query helper patterns
- `server.js` — Multiple Anthropic API proxy patterns (lines 295, 642, 855, 1004), API key injection, request handling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Anthropic API proxy pattern in `server.js` — multiple existing implementations to follow for refresh endpoint
- `db.js` migration system (PRAGMA user_version) — extend to v5 for new tables/columns
- Staleness badge pattern from Phase 2 contacts — adapt for account-level staleness display
- Account header area in `index.html` — integration point for refresh button and staleness badge

### Established Patterns
- AI requests use `claude-sonnet-4-20250514` model via `api.anthropic.com`
- JSON response parsing from AI endpoints (strategy synthesis, debrief extraction)
- Environment variable configuration (`process.env.*` pattern)
- Sequential database operations with `better-sqlite3` synchronous API

### Integration Points
- `accounts` table needs `last_refreshed_at` column added via migration
- Server startup needs `setInterval` registration for auto-refresh loop
- Account header UI needs refresh button and staleness badge
- `/api/claude` proxy pattern extended for refresh-specific endpoint
- Strategy synthesis (Phase 4) benefits from refreshed intelligence — no code change needed, just fresher data in context field

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-intelligence-refresh*
*Context gathered: 2026-04-14*

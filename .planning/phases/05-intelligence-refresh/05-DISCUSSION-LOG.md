# Phase 5: Intelligence Refresh - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 05-intelligence-refresh
**Areas discussed:** Data sourcing, Scheduling mechanism, Token budget implementation, Refresh scope & display
**Mode:** Auto (recommended defaults selected)

---

## Data Sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| AI-only | Claude generates from training data + existing context | :white_check_mark: |
| AI + web search API | Use Brave/Exa API for real-time web data | |
| Web scraping | Scrape public sources directly | |

**User's choice:** AI-only (auto-selected recommended default)
**Notes:** No web search API keys configured. Claude's training data covers public companies. External data sources can augment later without rearchitecting.

---

## Scheduling Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side setInterval | Configurable timer in Node.js process | :white_check_mark: |
| External cron service | Railway cron or external scheduler | |
| Manual-only | No auto-refresh, user triggers each time | |

**User's choice:** Server-side setInterval (auto-selected recommended default)
**Notes:** Railway runs long-lived Node.js process. setInterval is simplest — no external dependencies. Default 24-hour interval via REFRESH_INTERVAL_HOURS env var.

| Option | Description | Selected |
|--------|-------------|----------|
| Daily (24h) | Refresh once per day | :white_check_mark: |
| Weekly | Refresh once per week | |
| Hourly | Refresh every hour | |

**User's choice:** Daily (auto-selected recommended default)
**Notes:** Account intelligence changes quarterly at fastest. Daily catches news while being conservative on tokens. Manual refresh available for immediate updates.

---

## Token Budget Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Monthly counter with configurable limit | Track tokens per calendar month, env var limit | :white_check_mark: |
| Per-account budget | Individual limits per account | |
| No budget (rely on manual monitoring) | Trust user to watch costs | |

**User's choice:** Monthly counter with configurable limit (auto-selected recommended default)
**Notes:** Simple approach for 13 accounts. REFRESH_TOKEN_BUDGET env var. Manual refresh bypasses budget.

| Option | Description | Selected |
|--------|-------------|----------|
| Skip remaining + log + UI indicator | Graceful degradation with visibility | :white_check_mark: |
| Hard stop all refresh | Disable all refresh until next period | |
| Continue with warning only | Refresh anyway, just warn | |

**User's choice:** Skip remaining + log + UI indicator (auto-selected recommended default)
**Notes:** Already-refreshed accounts keep data. Remaining show staleness. Users can still manual-refresh.

---

## Refresh Scope & Display

| Option | Description | Selected |
|--------|-------------|----------|
| Context blob + structured fields | Update intelligence text AND revenue/employees | :white_check_mark: |
| Context blob only | Only update narrative intelligence | |
| All fields including exec/tech | Full refresh of every data point | |

**User's choice:** Context blob + structured fields (auto-selected recommended default)
**Notes:** Context field is primary intelligence payload for AI chat and strategy. Structured fields (revenue, employees) updated when AI finds newer values.

| Option | Description | Selected |
|--------|-------------|----------|
| Header badge with staleness colors | Timestamp in account header, green/yellow/red | :white_check_mark: |
| Sidebar indicator | Small dot/icon on sidebar items | |
| Separate dashboard view | Refresh status dashboard | |

**User's choice:** Header badge with staleness colors (auto-selected recommended default)
**Notes:** Follows Phase 2 staleness pattern. Green <7d, yellow 7-30d, red >30d. Never-refreshed shows red.

| Option | Description | Selected |
|--------|-------------|----------|
| Header refresh button, same logic | Single button, reuses auto-refresh code | :white_check_mark: |
| Separate manual refresh endpoint | Different logic for manual vs auto | |
| Refresh via AI chat command | Type "refresh" in chat | |

**User's choice:** Header refresh button, same logic (auto-selected recommended default)
**Notes:** Reuses auto-refresh logic. Bypasses budget gate. Shows loading state during refresh.

---

## Claude's Discretion

- AI prompt engineering for refresh quality
- Refresh order across accounts
- Loading state visual design
- Budget indicator visibility logic
- Error handling for failed refreshes
- Changes summary display after manual refresh

## Deferred Ideas

None — discussion stayed within phase scope

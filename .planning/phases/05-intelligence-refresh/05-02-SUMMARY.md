---
phase: 05-intelligence-refresh
plan: 02
subsystem: server
tags: [refresh, scheduler, api, anthropic, budget]
dependency_graph:
  requires: [db.js refresh helpers from 05-01]
  provides: [refreshAccount function, runAutoRefresh scheduler, POST /api/accounts/:id/refresh, GET /api/refresh/budget]
  affects: [server.js]
tech_stack:
  added: []
  patterns: [Promise-wrapped https.request, async/await for sequential processing, setInterval scheduler, code-fence JSON fallback]
key_files:
  created: []
  modified: [server.js]
decisions:
  - "refreshAccount always updates last_refreshed_at even on parse failure — prevents retry storm if AI returns unexpected format"
  - "runAutoRefresh re-checks budget before EACH account, not just at loop start — prevents overspend if a large account consumes most of the remaining budget"
  - "Manual refresh bypasses budget gate by design (D-11, D-19) — internal team tool, cost per refresh is ~$0.015"
  - "startRefreshScheduler() is called inside server.listen callback — ensures DB migrations complete before first interval fires"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-14"
  tasks_completed: 2
  files_modified: 1
---

# Phase 05 Plan 02: Refresh Engine Summary

**One-liner:** Auto-refresh scheduler and manual refresh API added to server.js — calls Claude for structured intelligence updates, tracks token usage against monthly budget, processes accounts sequentially by staleness.

---

## What Was Built

The core intelligence refresh engine in server.js: four new server-side capabilities that keep account intelligence current while enforcing cost controls.

### New Functions

| Function | Purpose |
|----------|---------|
| `refreshAccount(accountId, refreshType)` | Promise-wrapped Claude call — builds structured prompt with current account context, requests JSON update (context, revenue, employees, changes_summary), parses with code-fence fallback, updates DB |
| `runAutoRefresh()` | Async loop over all accounts sorted by staleness — re-checks monthly budget before each account, breaks on exhaustion, continues past per-account errors |
| `startRefreshScheduler()` | Wraps `setInterval(runAutoRefresh, REFRESH_INTERVAL_MS)` — called inside `server.listen` callback |
| `REFRESH_INTERVAL_MS` | Computed constant — `(parseInt(process.env.REFRESH_INTERVAL_HOURS) || 24) * 3600000` |

### New Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/accounts/:id/refresh` | POST | Required | Manual refresh for a single account — bypasses budget gate, returns `{account, changes_summary, tokens_used}` |
| `/api/refresh/budget` | GET | Required | Current month token budget status — returns `{period, tokens_used, budget_limit, pct}` |

---

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1. refreshAccount + scheduler | 2e8c1f0 | REFRESH_INTERVAL_MS constant, refreshAccount(), runAutoRefresh(), startRefreshScheduler(), startRefreshScheduler() call in server.listen |
| 2. Route handlers | 50242e9 | POST /api/accounts/:id/refresh and GET /api/refresh/budget with auth checks |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. Both endpoints are fully wired to db.js helpers and the Anthropic API.

---

## Threat Flags

No new trust boundary changes beyond what was specified in the plan's threat model. All new endpoints require `isAuthenticated(req)`. Account ID in refresh route is validated by regex `[a-z0-9-]+` and `db.getAccount()` returns null for nonexistent IDs.

---

## Self-Check: PASSED

- `function refreshAccount` exists in server.js: confirmed (line 95)
- `async function runAutoRefresh` exists in server.js: confirmed (line 204)
- `function startRefreshScheduler` exists in server.js: confirmed (line 228)
- `startRefreshScheduler()` called inside server.listen: confirmed (line 1232)
- `REFRESH_INTERVAL_MS` defined: confirmed (line 11)
- POST `/api/accounts/:id/refresh` route present: confirmed (line 415)
- GET `/api/refresh/budget` route present: confirmed (line 445)
- Commit 2e8c1f0 exists: confirmed
- Commit 50242e9 exists: confirmed
- Syntax check passes: confirmed

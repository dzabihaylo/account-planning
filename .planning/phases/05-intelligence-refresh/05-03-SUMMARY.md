---
phase: 05-intelligence-refresh
plan: 03
subsystem: frontend
tags: [refresh, ui, staleness, budget, toast, index.html]
dependency_graph:
  requires: [05-01 db schema v5, 05-02 refresh engine endpoints]
  provides: [staleness badge, refresh button, manualRefresh, loadBudgetStatus, showRefreshToast, budget indicator]
  affects: [index.html]
tech_stack:
  added: []
  patterns: [async/await fetch in vanilla JS, DOM mutation for badge/KPI update, setTimeout toast dismiss]
key_files:
  created: []
  modified: [index.html]
decisions:
  - "getRefreshStalenessClass uses 7-day (fresh) and 30-day (aging) thresholds — tighter than contact staleness (30/90) because intelligence data ages faster and refresh is cheaper"
  - "Budget indicator hidden below 50% to keep UI clean for the common case — appears only when spend is meaningful"
  - "manualRefresh bypasses budget gate by design (D-11, D-19) — matches server behavior; cost per refresh ~$0.015"
  - "showRefreshToast auto-dismisses after 8 seconds and is click-to-dismiss — matches typical toast UX without needing a close button"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-04-14"
  tasks_completed: 2
  files_modified: 1
---

# Phase 05 Plan 03: Frontend Refresh UI Summary

**One-liner:** Staleness badge, Refresh Intelligence button, changes-summary toast, and token budget indicator added to index.html — completing the end-to-end intelligence refresh system.

---

## What Was Built

All frontend UI components for the intelligence refresh system, wired to the server endpoints from Plan 05-02.

### New CSS Classes

| Class | Purpose |
|-------|---------|
| `.refresh-btn` | Blue accent button for manual refresh in account header |
| `.refresh-toast` | Fixed-position bottom-right toast for changes summary |
| `.refresh-toast-title` / `.refresh-toast-body` | Toast typography |
| `.budget-indicator` | Inline flex container in topnav for budget bar |
| `.budget-bar` / `.budget-fill` | Progress bar for token budget |
| `.budget-fill.ok` / `.warn` / `.danger` | Color states: green/gold/red |

### New JavaScript Functions

| Function | Purpose |
|----------|---------|
| `getRefreshStalenessClass(lastRefreshedAt)` | Returns `stale-fresh` (< 7 days), `stale-aging` (7-30), `stale-stale` (> 30 or null) |
| `getRefreshStalenessLabel(lastRefreshedAt)` | Returns human label: "Never refreshed", "Refreshed today", "Refreshed N days ago" |
| `manualRefresh(accountId)` | POST to `/api/accounts/:id/refresh`, loading state, badge update, overview re-render, KPI update, toast |
| `showRefreshToast(title, message)` | Fixed-position toast with 8s auto-dismiss and click-to-dismiss |
| `loadBudgetStatus()` | GET `/api/refresh/budget`, shows budget indicator only when pct >= 50 |

### HTML Changes

- `budgetIndicator` span added to topnav after `acctCount` (hidden by default)
- `renderAccountPanel` now includes staleness badge (`refresh-badge-{id}`) and Refresh button (`refresh-btn-{id}`) in the `acct-actions` div before Edit/Remove buttons

---

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1. Refresh UI (CSS + JS + HTML) | 9aba87b | All CSS, staleness functions, manualRefresh, showRefreshToast, loadBudgetStatus, topnav HTML, renderAccountPanel badge+button, init call |
| 2. Verify refresh flow | auto-approved | checkpoint:human-verify auto-approved in --auto mode |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. All functions are fully wired to live server endpoints (`/api/accounts/:id/refresh` and `/api/refresh/budget`). The badge and button render from real `last_refreshed_at` data loaded from the database.

---

## Threat Flags

No new trust boundary changes beyond what was specified in the plan's threat model:
- `manualRefresh` calls `POST /api/accounts/:id/refresh` — authenticated via cookie (gd_auth), sent automatically by browser fetch
- `loadBudgetStatus` calls `GET /api/refresh/budget` — same cookie auth
- Button is disabled during refresh (T-05-10 DoS mitigation applied)

---

## Self-Check: PASSED

- `getRefreshStalenessClass` present in index.html: confirmed (line 1551)
- `getRefreshStalenessLabel` present in index.html: confirmed (line 1561)
- `manualRefresh` present in index.html: confirmed (line 1572)
- `showRefreshToast` present in index.html: confirmed (line 1631)
- `loadBudgetStatus` present in index.html: confirmed (line 1651)
- `refresh-badge-` span in renderAccountPanel: confirmed (line 1114)
- `refresh-btn-` button in renderAccountPanel: confirmed (line 1115)
- `budgetIndicator` in topnav HTML: confirmed (line 882)
- `loadBudgetStatus()` called on init: confirmed (line 3289)
- CSS `.refresh-btn`, `.refresh-toast`, `.budget-indicator`, `.budget-bar`, `.budget-fill`: confirmed (lines 431-443)
- JS syntax check: PASSED
- Commit 9aba87b exists: confirmed

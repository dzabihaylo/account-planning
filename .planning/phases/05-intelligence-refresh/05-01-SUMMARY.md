---
phase: 05-intelligence-refresh
plan: 01
subsystem: database
tags: [database, migration, schema, refresh, sqlite]
dependency_graph:
  requires: []
  provides: [refresh_log table, refresh_budget table, last_refreshed_at column, getMonthlyBudget, recordRefreshTokens, updateAccountFromRefresh, getRefreshLog, getAccountsByRefreshPriority]
  affects: [db.js, server.js (future plans)]
tech_stack:
  added: []
  patterns: [SQLite migration with user_version PRAGMA, ON CONFLICT upsert pattern, null-safe field update]
key_files:
  created: []
  modified: [db.js]
decisions:
  - "updateAccountFromRefresh only accepts context, revenue, employees, last_refreshed_at — hardcoded field list, never exposed as user-facing API"
  - "refresh_budget uses ON CONFLICT(period) DO UPDATE with additive tokens_used to accumulate monthly spend"
  - "getAccountsByRefreshPriority sorts NULL last_refreshed_at first using SQLite IS NOT NULL boolean ordering"
metrics:
  duration: "~1 minute"
  completed_date: "2026-04-14"
  tasks_completed: 2
  files_modified: 1
---

# Phase 05 Plan 01: Database Schema v5 + Refresh Helpers Summary

**One-liner:** SQLite migration v5 adds refresh_log, refresh_budget tables and last_refreshed_at column, plus 5 exported query helpers for the refresh system.

---

## What Was Built

Migration v5 and all db.js query helpers required by the intelligence refresh system (Plans 05-02 and 05-03).

### Schema Changes

- `accounts.last_refreshed_at TEXT` — NULL means never refreshed; used for staleness ordering
- `refresh_log` table — audit trail of every refresh event (account_id FK, tokens_used, refresh_type CHECK, changes_summary)
- `refresh_budget` table — monthly token spend tracking with `period TEXT UNIQUE NOT NULL` for ON CONFLICT upsert
- Index `idx_refresh_log_account` on `refresh_log(account_id)`
- `PRAGMA user_version = 5`

### New Exported Functions

| Function | Purpose |
|----------|---------|
| `getMonthlyBudget()` | Returns current month budget row or default `{period, tokens_used:0, budget_limit}` |
| `recordRefreshTokens(accountId, tokensUsed, refreshType, changesSummary)` | Upserts refresh_budget (additive total) + inserts refresh_log entry |
| `updateAccountFromRefresh(id, fields)` | Updates context/revenue/employees/last_refreshed_at; skips null fields; bypasses user allowedFields whitelist |
| `getRefreshLog(accountId, limit)` | Returns refresh_log entries for account, most recent first, default limit 10 |
| `getAccountsByRefreshPriority()` | Returns non-deleted accounts with NULL last_refreshed_at first, then oldest-refreshed |

---

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1. Migration v5 | 710d6de | ALTER TABLE + CREATE TABLE refresh_log + CREATE TABLE refresh_budget + PRAGMA user_version = 5 |
| 2. Refresh helper functions | df260e8 | 5 new functions added before module.exports; all exported |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Security Notes

`updateAccountFromRefresh` uses a hardcoded `refreshFields` array (`['context', 'revenue', 'employees', 'last_refreshed_at']`) — it cannot be used to overwrite arbitrary columns even if called with unexpected fields. It is a server-side-only function, not wired to any user-facing API endpoint. This satisfies T-05-01 from the threat model.

---

## Known Stubs

None. This plan is purely schema and query helpers — no UI components or data-wiring stubs.

---

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes introduced in this plan.

---

## Self-Check: PASSED

- db.js exists and was modified: confirmed
- Migration v5 applied (PRAGMA user_version = 5): confirmed via `node -e` verification
- accounts table has last_refreshed_at column: confirmed
- refresh_log table exists: confirmed
- refresh_budget table exists: confirmed
- All 5 functions exported and callable: confirmed
- updateAccountFromRefresh skips null fields: confirmed via test
- getAccountsByRefreshPriority returns 13 accounts: confirmed
- Commits 710d6de and df260e8 exist: confirmed

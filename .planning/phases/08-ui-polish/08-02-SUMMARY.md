---
phase: 08-ui-polish
plan: "02"
subsystem: frontend-modal / api
tags: [category-dropdown, edit-modal, account-management, uipol-02]
dependency_graph:
  requires: [08-01]
  provides: [category-dropdown-in-edit-modal, GET-api-categories]
  affects: [index.html, db.js, server.js]
tech_stack:
  added: []
  patterns: [dropdown-populated-from-api, new-category-sentinel-pattern]
key_files:
  created: []
  modified:
    - db.js
    - server.js
    - index.html
decisions:
  - "Placed GET /api/categories after the isAuthenticated() gate (line 330) to match all other authenticated routes"
  - "Used '__new__' sentinel value for the 'New category...' option to distinguish it from real sector names"
  - "populateCategoryDropdown() handles the edge case where an account's current sector is not yet in the DB list by inserting it as a selected option above 'New category...'"
  - "saveAccount() validates empty new-category name before sending to API, matching existing client-side validation pattern"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-17"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
requirements_satisfied: [UIPOL-02]
---

# Phase 08 Plan 02: Category Dropdown in Edit Modal Summary

**One-liner:** Category dropdown in edit modal populated from live DB via GET /api/categories, with "New category..." option and sentinel validation in saveAccount().

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add getDistinctSectors() to db.js and GET /api/categories to server.js | a7bd545 | db.js, server.js |
| 2 | Replace sector free-text input with category dropdown in edit modal | 1ede7c8 | index.html |

## What Was Built

### GET /api/categories endpoint (server.js)
A new authenticated route returns a JSON array of distinct sector strings from the accounts table. Placed after the `isAuthenticated()` check at line 330, before the HTML serving block. Returns strings like `["Automotive OEM", "Automotive Tier 1", ...]` sorted alphabetically.

### getDistinctSectors() helper (db.js)
Queries `SELECT DISTINCT sector FROM accounts WHERE is_deleted = 0 AND sector != '' ORDER BY sector` and maps rows to a plain string array. Exported in `module.exports`.

### Category dropdown (index.html)
- `<select id="modalSector">` replaces the old `<input id="modalSector">` — same ID preserves all existing references
- Hidden `<input id="modalSectorNew">` appears when "New category..." is selected
- `populateCategoryDropdown(currentSector)` fetches `/api/categories`, builds options with the current sector pre-selected, appends "New category..." option, wires the `onchange` toggle
- `openAddModal()` and `openEditModal()` both call `populateCategoryDropdown()` instead of setting `.value` directly
- `saveAccount()` reads `modalSector.value`, detects `__new__` sentinel, reads `modalSectorNew.value`, validates non-empty before building payload

## Verification Results

```
node -e "const db = require('./db'); const s = db.getDistinctSectors(); console.log(Array.isArray(s) ? 'PASS: returns array of ' + s.length + ' sectors' : 'FAIL')"
PASS: returns array of 11 sectors
```

Acceptance criteria checks:
- `grep "getDistinctSectors" db.js` — function definition at line 659, module.exports entry at line 715
- `grep "/api/categories" server.js` — route handler at line 1560
- `grep "modalSectorNew" index.html` — 3 matches (HTML + 2 JS)
- `grep "populateCategoryDropdown" index.html` — 3 matches (definition + 2 call sites)
- `grep "__new__" index.html` — 3 matches (option creation, toggle, saveAccount guard)
- `grep "Industry Category" index.html` — label updated
- Route at line 1560 is after auth gate at line 330

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The dropdown is fully wired to live DB data via GET /api/categories.

## Threat Surface Scan

All security surfaces were in-scope per the plan's threat model:
- T-08-02: GET /api/categories placed after `isAuthenticated()` — unauthenticated requests redirected to login
- T-08-03: `__new__` sentinel validated in saveAccount(); empty new-category name rejected before API call
- T-08-04: `escapeHtml()` applied to all option values and text in `populateCategoryDropdown()`

No new threat surface beyond what was planned.

## Self-Check: PASSED

- db.js: FOUND
- server.js: FOUND
- index.html: FOUND
- SUMMARY.md: FOUND
- Commit a7bd545: FOUND
- Commit 1ede7c8: FOUND

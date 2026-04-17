---
phase: "08"
plan: "03"
subsystem: "frontend-rename / api"
tags: [category-rename, inline-edit, sidebar, uipol-03]
dependency_graph:
  requires: [08-01, 08-02]
  provides: [PUT-api-categories-rename, inline-sidebar-category-rename, showToast]
  affects: [index.html, db.js, server.js]
tech_stack:
  added: []
  patterns: [inline-edit-with-committed-guard, atomic-db-transaction, toast-notification]
key_files:
  created: []
  modified:
    - path: "db.js"
      description: "Added renameCategory(oldName, newName) using db.transaction for atomic bulk UPDATE"
    - path: "server.js"
      description: "Added PUT /api/categories/rename endpoint with input validation after isAuthenticated gate"
    - path: "index.html"
      description: "Added showToast(), startCategoryRename(), confirmCategoryRename(), dblclick wiring in renderSidebar(); also added missing .sidebar-rename-input and .gd-toast CSS classes"
decisions:
  - "Used db.transaction() wrapper for atomic bulk UPDATE so all accounts in a category update or none"
  - "committed boolean guard in startCategoryRename() prevents double-fire when both blur and Enter fire on mobile/fast clicks"
  - "sectionState updated optimistically before loadAccounts() so collapse state follows the renamed category without flicker"
  - "mainContent.innerHTML cleared before loadAccounts() to force all account panels to re-render with new sector name"
  - "Added .sidebar-rename-input and .gd-toast CSS classes inline (Rule 2 deviation) — these were defined in Plan 01 commit 89606cd but were not present in the eb2788af base due to cherry-pick scope"
metrics:
  duration_minutes: 20
  completed_date: "2026-04-18"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
requirements_satisfied: [UIPOL-03]
---

# Phase 08 Plan 03: Inline Category Rename Summary

**One-liner:** Inline sidebar category rename via double-click, backed by atomic PUT /api/categories/rename with db.transaction, plus showToast() for error feedback and a committed-guard preventing double-fire.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add renameCategory() to db.js and PUT /api/categories/rename to server.js | a762ccb | db.js, server.js |
| 2 | Add inline category rename and showToast() to index.html | 25a1e66 | index.html |
| 3 | Verify complete phase — visual consistency, category dropdown, and inline rename | (auto-approved) | — |

## What Was Built

### renameCategory() helper (db.js)

`renameCategory(oldName, newName)` wraps a parameterized `UPDATE accounts SET sector = ?` in `db.transaction()` for atomicity — all accounts in a category update together or none do. Returns a count of updated accounts via a follow-up `SELECT COUNT(*)`.

### PUT /api/categories/rename endpoint (server.js)

New authenticated route placed after the `isAuthenticated()` gate at line 1568. Validates `oldName` and `newName` as non-empty trimmed strings (400 on failure), calls `db.renameCategory()` in a try-catch (500 on DB error), returns `{ success: true, count: N }` on success.

### Inline rename interaction (index.html)

- **`showToast(message, variant)`** — creates a `.gd-toast` element at bottom-right, auto-removes after 3s with fade
- **`startCategoryRename(span)`** — replaces the sector label span with an `<input class="sidebar-rename-input">`, focuses and selects text. `committed` boolean guard prevents both `blur` and `Enter` from firing `confirmCategoryRename` twice.
- **`confirmCategoryRename(oldName, newName)`** — updates `sectionState` optimistically, PUTs to `/api/categories/rename`, clears `mainContent.innerHTML`, calls `loadAccounts()` and re-shows the current account. Reverts `sectionState` and shows error toast on failure.
- **dblclick wiring** — `renderSidebar()` attaches `dblclick` listeners to all `.sidebar-section > span:first-child` elements with `e.stopPropagation()` to prevent `toggleSection()` from firing.

### CSS classes (index.html — Rule 2 deviation)

`.sidebar-rename-input` and `.gd-toast` / `.gd-toast-error` / `.gd-toast-success` were added to the `<style>` block. These were defined in Plan 01 commit `89606cd` but were absent from the `eb2788af` base used by this worktree because the `eb2788af` fix cherry-pick only restored planning files, not the CSS from the worktree that ran Plans 01-02. The classes are required for correct operation of this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added .sidebar-rename-input and .gd-toast CSS classes**
- **Found during:** Task 2
- **Issue:** Plan 03 references `.sidebar-rename-input` and `.gd-toast` CSS classes defined in Plan 01. These were present in Plan 01's commits (89606cd, 64cb500) but not in the eb2788af base commit used by this worktree — the cherry-pick that created eb2788af only restored planning files, not index.html changes from the other worktree.
- **Fix:** Added both CSS class blocks directly before `</style>` in index.html as part of Task 2
- **Files modified:** index.html
- **Commit:** 25a1e66

## Verification Results

```
node -e "const db = require('./db'); console.log(typeof db.renameCategory)"
PASS: renameCategory is [Function]

grep "/api/categories/rename" server.js
PASS: route handler at line 1568

grep "startCategoryRename" index.html
PASS: function definition + dblclick call site

grep "showToast" index.html
PASS: function definition + error call site

grep "committed" index.html
PASS: double-fire guard present (5 occurrences)

grep "sectionState\[newName\]" index.html
PASS: collapse state transfer present

JS syntax check: PASS
```

## Known Stubs

None. The rename interaction is fully wired: double-click -> input -> PUT /api/categories/rename -> loadAccounts() re-render.

## Threat Surface Scan

All security surfaces were in-scope per the plan's threat model:
- T-08-05: PUT /api/categories/rename placed after `isAuthenticated()` check
- T-08-06: Server validates oldName/newName as non-empty trimmed strings; rejects empty with 400
- T-08-07: `escapeHtml()` already used in renderSidebar() for all sector text; toast uses `textContent` (not innerHTML); input.value assignment is safe

No new threat surface beyond what was planned.

## Self-Check: PASSED

- db.js modified: FOUND (renameCategory at line 667, exported at line 734)
- server.js modified: FOUND (PUT /api/categories/rename at line 1568)
- index.html modified: FOUND (showToast, startCategoryRename, confirmCategoryRename, dblclick wiring)
- SUMMARY.md: FOUND (this file)
- Commit a762ccb (Task 1): FOUND
- Commit 25a1e66 (Task 2): FOUND

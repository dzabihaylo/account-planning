---
phase: 01-persistence-account-management
plan: 02
subsystem: frontend-dynamic-rendering
tags: [dynamic-rendering, crud-modals, xss-protection, spa]
dependency_graph:
  requires: [db.js, /api/accounts, sqlite-schema-v1]
  provides: [dynamic-sidebar, account-modals, crud-ui]
  affects: [index.html]
tech_stack:
  added: []
  patterns: [dynamic-panel-rendering, escapeHtml-xss-mitigation, modal-overlay-pattern, sector-grouped-sidebar]
key_files:
  created: []
  modified: [index.html]
key_decisions:
  - "escapeHtml() utility for all innerHTML insertions per threat model T-02-01/T-02-02"
  - "Lazy panel rendering: panels created on first showAccount() call, not all at once"
  - "AI chat initial message uses UI-SPEC copy: Ask anything about [Account name]"
  - "account_id sent to /api/claude so server builds system prompt from DB data"
metrics:
  duration_seconds: 202
  completed: 2026-04-11T01:08:26Z
  tasks_completed: 1
  tasks_total: 2
  files_created: 0
  files_modified: 1
requirements: [ACCT-01, ACCT-02, ACCT-03, ACCT-04]
---

# Phase 01 Plan 02: Dynamic Rendering and Account CRUD UI Summary

Complete rewrite of index.html from 1226-line hardcoded SPA to ~530-line dynamic app rendering all accounts from API with add/edit/remove modals matching UI-SPEC design contract.

## What Was Done

### Task 1: Strip hardcoded account HTML and build dynamic rendering engine
**Commit:** `51b117c`

- Removed all 13 hardcoded account panels (~700 lines of HTML) and sidebar items
- Added `loadAccounts()` that fetches from `GET /api/accounts` on page load
- Added `renderSidebar()` with dynamic sector grouping and `+ Add Account` trigger
- Added `renderAccountPanel()` for lazy on-demand panel creation with Overview and Ask AI tabs
- Added `escapeHtml()` utility applied to all account data before innerHTML insertion (T-02-01, T-02-02)
- Added account add/edit modal with form validation (name required), loading state ("Saving..."), error feedback
- Added remove confirmation modal with soft-delete via `DELETE /api/accounts/:id`
- Added all new CSS: `.modal-overlay`, `.modal`, `.btn-primary`, `.btn-secondary`, `.btn-destructive`, `.sidebar-add`, `.acct-actions`, `.acct-action-btn`, `.form-group`, `.form-input`, `.form-error`, `.empty-state`
- Updated `sendMsg()` to send `account_id` in fetch body so server builds system prompt from DB
- Removed `const ACCOUNTS` object and `const GD_CONTEXT` (both now server-side from Plan 01)
- All copywriting matches UI-SPEC contract: "Discard Changes", "Remove this account?", "Save Account", "Save Changes", "+ Add Account", "No accounts yet"
- Preserved all existing CSS classes (topnav, sidebar base, acct-header, acct-tabs, AI panel, cards, etc.)
- `getShortName()` heuristic strips corporate suffixes for clean sidebar labels
- `filterAccounts()` works with dynamically rendered sidebar items
- Empty state rendered when no accounts exist

### Task 2: Verify full account management flow
**Status:** CHECKPOINT - Awaiting human verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Added escapeHtml to addMsg for chat messages**
- **Found during:** Task 1
- **Issue:** Chat messages rendered via innerHTML without escaping could allow XSS if AI response contained HTML
- **Fix:** Applied escapeHtml() to message text in addMsg() before bold/newline formatting
- **Files modified:** index.html
- **Commit:** 51b117c

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-02-01 | escapeHtml() applied to all account fields in renderAccountPanel() before innerHTML |
| T-02-02 | escapeHtml() applied to sidebar item name, revenue, sector, dot_color before innerHTML |

## Threat Flags

None - no new security surface beyond what was planned.

## Known Stubs

None - all CRUD operations are fully wired to API endpoints with real data flow.

## Self-Check: PENDING

Awaiting Task 2 human verification checkpoint before final self-check.

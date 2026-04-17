---
phase: 06-briefing-output
plan: 01
subsystem: briefing
tags: [briefing, db-migration, api-endpoints, frontend-tab, ai-generation, sqlite]
dependency_graph:
  requires: [05-01, 05-02, 05-03, 04-01, 04-02, 04-03, 03-01, 03-02, 02-01, 02-02, 01-01, 01-02, 01-03]
  provides: [briefings-table, briefing-api, briefing-tab-ui]
  affects: [db.js, server.js, index.html]
tech_stack:
  added: [briefings SQLite table]
  patterns: [upsert on UNIQUE account_id, lazy-load tab with dataset.loaded guard, escapeHtml-before-heading-detection XSS pattern]
key_files:
  created: []
  modified:
    - db.js
    - server.js
    - index.html
decisions:
  - "Briefing tab placed after Strategy, before Ask AI — synthesizes all prior tab data"
  - "max_tokens 3000 (not 4000) — briefing is a one-pager, tighter scope than strategy"
  - "escapeHtml() runs before ## detection in briefingTextToHtml — prevents XSS from AI-generated content"
  - "Code fence stripping applied server-side before DB storage — clean content always stored"
  - "No confirmation dialog on Regenerate — briefing has no is_edited field, nothing to protect"
metrics:
  duration: 8m
  completed: "2026-04-14"
  tasks: 2
  files: 3
---

# Phase 6 Plan 01: AI-Composed Briefing Tab Summary

**One-liner:** SQLite briefings table (migration v6), GET/POST /api/accounts/:id/briefing endpoints, and full frontend Briefing tab with lazy-load, auto-generate, render, and regenerate lifecycle.

---

## What Was Built

This plan delivers BREF-01: any team member can open a Briefing tab on any account and see an AI-composed one-pager covering company snapshot, key contacts, current strategy, recent activity, buying triggers, and recommended next steps.

### Task 1: Database migration v6 and briefing API endpoints

**db.js:**
- Added `if (version < 6)` migration block creating the `briefings` table with UNIQUE constraint on `account_id`, `content TEXT NOT NULL`, `tokens_used INTEGER`, and `generated_at TEXT`
- `PRAGMA user_version = 6` set inside migration transaction
- Added `getBriefing(accountId)` — returns row or undefined
- Added `saveBriefing(accountId, content, tokensUsed)` — upsert via `ON CONFLICT(account_id) DO UPDATE SET`
- Both exported from `module.exports`

**server.js:**
- Added `briefingMatch` regex: `/^\/api\/accounts\/([a-z0-9-]+)\/briefing$/`
- `GET /api/accounts/:id/briefing` — returns cached row or 404 if none
- `POST /api/accounts/:id/briefing` — gathers contacts (max 5), activities (max 10), intel (max 10), strategy summary (first 1000 chars), triggers; builds system prompt; calls Anthropic claude-sonnet-4-20250514 at max_tokens 3000; strips code fences from AI response before saving; stores tokens used

### Task 2: Briefing tab frontend

**index.html:**
- CSS: `.briefing-card`, `.briefing-meta`, `.briefing-content`, `.briefing-section-header`, `.briefing-actions` with primary/hover states
- Tab button: added between Strategy and Ask AI in `renderAccountPanel()`
- Tab pane: `<div class="tab-pane" id="{id}-briefing">` added after strategy pane
- `showTab()`: added `if (tab === 'briefing')` lazy-load block with `dataset.loaded` guard
- `briefingTextToHtml(text)`: splits on `\n`, calls `escapeHtml(line)` first, then detects `## ` headings — XSS-safe per T-06-01
- `loadBriefingTab(accountId)`: initializes card + actions bar HTML, calls `loadBriefing()`
- `loadBriefing(accountId)`: fetches cached briefing; on 404, auto-generates via `generateBriefing()`
- `generateBriefing(accountId)`: POSTs to briefing endpoint, renders on success, shows try-again on error
- `renderBriefing(accountId, briefing)`: renders `.briefing-card` with meta date and HTML content, shows actions bar
- `regenerateBriefing(accountId)`: clears card to loading state, hides actions, calls `generateBriefing()`

---

## Verification Results

```
Schema version: 6          ✓
getBriefing: function       ✓
saveBriefing: function      ✓
save works: true            ✓
get works: true             ✓
briefing references in index.html: 39   ✓ (> 10 required)
escapeHtml before indexOf check: ✓
Briefing tab after Strategy, before Ask AI: ✓
```

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Mitigations Applied

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-06-01 XSS in briefingTextToHtml | `escapeHtml(line)` called before any `indexOf` or string operations | Applied |
| T-06-02 Unauthenticated briefing access | Endpoint sits inside `isAuthenticated()` gate in server.js | Applied |
| T-06-03 account_id param tampering | Regex `[a-z0-9-]+` + `db.getAccount()` existence check | Applied |
| T-06-05 AI code fences in response | `text.replace(/\`\`\`(?:markdown)?\s*/g, '')` strip applied server-side | Applied |

---

## Self-Check: PASSED

- `/Users/davezabihaylo/Documents/Grid_Accounts/gd-intel-server/.claude/worktrees/agent-aafce8ab/db.js` — modified, contains `CREATE TABLE IF NOT EXISTS briefings` and `PRAGMA user_version = 6`
- `/Users/davezabihaylo/Documents/Grid_Accounts/gd-intel-server/.claude/worktrees/agent-aafce8ab/server.js` — modified, contains `/briefing` route regex and both GET/POST handlers
- `/Users/davezabihaylo/Documents/Grid_Accounts/gd-intel-server/.claude/worktrees/agent-aafce8ab/index.html` — modified, 39 briefing references, all 6 JS functions present
- Task 1 commit: `235a4f1`
- Task 2 commit: `5cfdcd4`

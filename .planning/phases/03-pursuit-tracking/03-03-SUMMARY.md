---
phase: 03-pursuit-tracking
plan: 03
subsystem: ai-debrief-review-gate
tags: [ai, debrief, review-gate, pursuit-tracking, anthropic-api]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [AI debrief extraction endpoint, human review gate UI]
  affects: []
tech_stack:
  added: []
  patterns: [AI structured extraction with JSON parsing, human-in-the-loop approval gate, sequential batch processing]
key_files:
  created: []
  modified: [server.js, index.html]
decisions:
  - "Debrief endpoint is read-only plus AI call; no DB writes per PURS-03"
  - "JSON parse with code-fence fallback handles inconsistent AI output formatting"
  - "Proposals stored in client-side pendingProposals variable, not DOM or localStorage"
  - "Approve All processes sequentially to avoid race conditions on DB writes"
  - "Contact updates that cannot match existing contacts by name are created as new"
metrics:
  duration: 185s
  completed: "2026-04-13T21:32:51Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 03 Plan 03: AI Debrief Review Gate Summary

AI debrief extraction endpoint with structured JSON output and human review gate UI for approve/edit/reject workflow per PURS-02 and PURS-03.

## Completed Tasks

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Debrief API endpoint in server.js | fc4a789 | POST /api/accounts/:id/debrief with AI extraction, no DB writes |
| 2 | AI debrief UI and review panel in index.html | 1f934c4 | Debrief textarea, Extract with AI, proposal cards, approve/reject flow |

## What Was Built

### Debrief API Endpoint (server.js)
- `POST /api/accounts/:id/debrief` sends narrative text to Anthropic API
- System prompt includes GD_CONTEXT, account info, recent activity (last 10), and known contacts
- User message requests structured JSON with activities and contact_updates arrays
- `max_tokens: 4000` for multi-entry structured output
- JSON parse with code-fence extraction fallback
- Returns 422 with raw text if AI response is unparseable
- Endpoint is strictly read-only: calls getAccount, getActivity, getContacts but never addActivity or any write function

### Debrief Extraction UI (index.html)
- Textarea with placeholder guidance, 10,000 char maxlength (T-03-11 mitigation)
- Character hint ("Recommended: 100 to 5,000 characters")
- Extract with AI button disabled until textarea has 50+ characters
- Loading state during AI processing with status messages
- 422 parse failure shows raw AI text with fallback guidance

### Human Review Gate (index.html)
- `renderProposals()` displays activity and contact proposals in editable cards
- Each activity proposal card has: editable type dropdown, date input, participants input, summary textarea
- Three actions per card: Approve (green), Reject (red outline)
- `approveEntry()` reads current field values, POSTs to /api/accounts/:id/activity with source=ai_debrief
- `rejectEntry()` removes card from DOM and nulls in pendingProposals without any API call
- `approveAll()` processes entries sequentially with "Saving N of M..." progress
- Approved entries prepend to activity timeline immediately with AI badge
- Contact update proposals show action (new/update), name, title, influence with approve/reject

### Client-Side State Management
- `pendingProposals` object keyed by accountId holds proposals until user acts
- `debriefOriginalText` preserves original debrief for ai_raw field on approved entries
- `checkReviewPanelEmpty()` cleans up review panel when all proposals are handled

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data paths are fully wired to API endpoints.

## Threat Surface

Threat mitigations applied per threat model:
- **T-03-09 (XSS):** All AI-generated fields passed through escapeHtml() before innerHTML injection
- **T-03-11 (DoS):** Textarea maxlength=10000 client-side, readBody() 1MB limit server-side, recent activity capped at 10
- **T-03-12 (Repudiation):** source field set to 'ai_debrief', ai_raw preserves original debrief text

## Self-Check: PASSED

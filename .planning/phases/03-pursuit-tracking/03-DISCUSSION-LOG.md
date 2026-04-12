# Phase 3: Pursuit Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 03-pursuit-tracking
**Areas discussed:** Activity log structure, AI debrief UX, Human review gate design
**Mode:** Auto (recommended defaults selected for all areas)

---

## Activity Log Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Reverse-chronological timeline | Timeline in Activity tab per account | ✓ |
| Grouped by date | Entries clustered by day/week | |
| Flat list with filters | Sortable/filterable table | |

**User's choice:** Reverse-chronological timeline in Activity tab (auto-selected)
**Notes:** Natural fit alongside existing Overview/Contacts/AI tabs. Fields: timestamp, type, participants, summary, linked contacts.

---

## AI Debrief UX

| Option | Description | Selected |
|--------|-------------|----------|
| Textarea + Extract button | Free text input with on-demand AI extraction | ✓ |
| Chat-style debrief | Conversational AI interview | |
| Structured form | Step-by-step guided entry | |

**User's choice:** Free-text textarea with "Extract with AI" button (auto-selected)
**Notes:** Minimal friction, reuses /api/claude proxy pattern. AI extracts date, type, participants, takeaways, action items.

---

## Human Review Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Per-entry approve/reject | Review panel with individual controls | ✓ |
| Batch approve only | All-or-nothing approval | |
| Edit-in-place | Inline editing before save | |

**User's choice:** Per-entry approve/edit/reject with "Approve All" batch option (auto-selected)
**Notes:** Core PURS-03 guarantee: nothing saved until user approves. Rejected entries discarded, user can re-extract.

---

## Claude's Discretion

- Activity timeline visual design
- AI prompt engineering for debrief extraction
- Review panel layout
- Textarea placeholder text

## Deferred Ideas

- Activity entry editing/deletion (audit trail integrity)
- Auto-creation from outreach logs
- Activity search/filtering
- Activity export

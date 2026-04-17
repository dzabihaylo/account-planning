# Phase 2: Contact Intelligence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 02-contact-intelligence
**Areas discussed:** Contact layout & display, AI-generated fields, Outreach logging, Staleness & lifecycle
**Mode:** Auto (recommended defaults selected for all areas)

---

## Contact Layout & Display

| Option | Description | Selected |
|--------|-------------|----------|
| Card grid by influence | Cards grouped by Champion/Evaluator/Blocker | ✓ |
| Table/list view | Sortable table with all contacts | |
| Ungrouped card grid | Cards without influence grouping | |

**User's choice:** Card grid grouped by influence level (auto-selected)
**Notes:** Maps naturally to the Champion/Evaluator/Blocker segmentation from CONT-01. Reuses modal pattern from Phase 1.

---

## AI-Generated Fields

| Option | Description | Selected |
|--------|-------------|----------|
| On-demand button | User clicks to generate per contact | ✓ |
| Auto on creation | AI runs when contact is added | |
| Background refresh | AI updates periodically | |

**User's choice:** On-demand button per contact (auto-selected)
**Notes:** Keeps token costs predictable. User controls when AI runs. Reuses existing /api/claude proxy pattern.

---

## Outreach Logging

| Option | Description | Selected |
|--------|-------------|----------|
| Inline form | Form within contact detail view | ✓ |
| Modal form | Separate modal for logging | |
| Chat-style | Natural language entry | |

**User's choice:** Inline form on contact detail (auto-selected)
**Notes:** Keeps user in context without modal-on-modal. Fields: date, channel, outcome, notes.

---

## Staleness & Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded badge | Green/yellow/red based on days | ✓ |
| Text label | "Fresh" / "Aging" / "Stale" text | |
| Days counter | Show exact days since research | |

**User's choice:** Color-coded badge — green (<30d), yellow (30-90d), red (>90d) (auto-selected)
**Notes:** Simple, visible, actionable. Manual refresh only — auto-refresh deferred to Phase 5.

---

## Claude's Discretion

- Contact card visual design details
- Contacts tab placement
- Inline detail view behavior (push vs overlay)
- AI prompt engineering
- Form field ordering and validation

## Deferred Ideas

- Auto-refresh of contact intelligence (Phase 5)
- Bulk import from CSV/LinkedIn
- Cross-account contact deduplication

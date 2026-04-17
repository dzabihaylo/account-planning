# Phase 6: Briefing & Output - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 06-briefing-output
**Areas discussed:** Briefing access point, Briefing content structure, AI generation approach, Print/PDF layout
**Mode:** Auto (recommended defaults selected)

---

## Briefing Access Point

| Option | Description | Selected |
|--------|-------------|----------|
| New "Briefing" tab | Follows existing tab pattern (Overview, Contacts, Activity, Strategy, Ask AI) | Yes |
| Button in account header | Separate action button, opens modal or overlay | |
| Separate page/route | Dedicated /briefing/:id route outside the account panel | |

**User's choice:** [auto] New "Briefing" tab (recommended — consistent with existing tab UX pattern)
**Notes:** Placed after Strategy, before Ask AI. Uses same showTab/tab-pane mechanics.

---

## Briefing Content Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Standard executive briefing | Account overview, key contacts, strategy, activity highlights, triggers, next steps | Yes |
| Minimal summary | Just strategy + next steps (lighter, faster to generate) | |
| Comprehensive report | All data from all tabs in full detail (multi-page, not a "one-pager") | |

**User's choice:** [auto] Standard executive briefing (recommended — maps to all data layers, achieves "2-minute briefing" goal)
**Notes:** Top 3-5 contacts by influence, last 5-10 activity entries, all active buying triggers.

---

## AI Generation Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Cache with regenerate | Store last briefing, display on tab open, "Regenerate" button for fresh version | Yes |
| Generate every time | No caching, fresh AI call on every tab open | |
| Scheduled generation | Auto-generate briefings on a schedule (like Phase 5 refresh) | |

**User's choice:** [auto] Cache with regenerate (recommended — follows Phase 4 strategy Regenerate pattern, avoids unnecessary AI calls)
**Notes:** Auto-generates on first load if no cached briefing exists.

---

## Print/PDF Layout

| Option | Description | Selected |
|--------|-------------|----------|
| CSS @media print | Hide nav/sidebar, format briefing for print, browser print-to-PDF | Yes |
| PDF generation library | Server-side PDF generation (puppeteer, PDFKit) | |
| Export as markdown/HTML file | Download briefing as a file rather than print | |

**User's choice:** [auto] CSS @media print (recommended — BREF-02 specifies browser print-to-PDF, CSS approach is simplest with zero new dependencies)
**Notes:** Print button triggers window.print(). White background, black text, DM Sans font.

---

## Claude's Discretion

- AI prompt engineering for briefing quality
- Exact formatting within sections
- Contact count and activity entry count
- Loading state design
- Regeneration confirmation behavior
- Print page break handling

## Deferred Ideas

None — discussion stayed within phase scope

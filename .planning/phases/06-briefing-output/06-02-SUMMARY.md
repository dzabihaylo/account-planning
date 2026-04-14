---
phase: 06-briefing-output
plan: 02
subsystem: frontend-css
tags: [print, css, briefing, media-query]
dependency_graph:
  requires: [06-01]
  provides: [BREF-02]
  affects: [index.html]
tech_stack:
  added: []
  patterns: ["@media print CSS override with !important specificity", "@page rule for A4 margins"]
key_files:
  created: []
  modified:
    - index.html
key_decisions:
  - "All print CSS overrides use !important to beat dark theme CSS variable specificity"
  - ".tab-pane hidden first, then .tab-pane.active shown -- order matters to ensure only active briefing tab prints"
  - "page-break-inside: avoid on .briefing-section-header prevents orphaned section headers across page breaks"
metrics:
  duration: "5m"
  completed: "2026-04-14"
  tasks_completed: 2
  files_modified: 1
requirements:
  - BREF-02
---

# Phase 6 Plan 02: Print-Ready Briefing Output Summary

**One-liner:** @media print CSS block transforms dark-themed SPA into clean white A4 briefing document via browser-native print-to-PDF.

---

## What Was Built

Added a `@media print` CSS block to `index.html` that enables the "Print / Save as PDF" button (from Plan 01) to produce a professional, clean printed briefing. The block hides all application chrome and overrides the dark theme with white-on-black formatting suitable for printing or PDF export.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add @media print CSS block for briefing print output | 47ccc38 | index.html |
| 2 | Verify briefing generation and print preview (checkpoint) | — | ⚡ Auto-approved |

---

## Implementation Details

The `@media print` block (lines 888-917 in index.html) contains:

**Hidden app chrome:**
- `.topnav`, `.sidebar`, `.acct-header`, `.acct-tabs`, `.briefing-actions`, `.stale-badge`, `.acct-actions` — all hidden with `display: none !important`

**Dark theme reset:**
- `body, html` — `background: #fff !important; color: #000 !important`
- `.main-content`, `.acct-content`, `.account-panel`, `.briefing-card` — white background, no borders/shadows

**Tab visibility:**
- `.tab-pane { display: none !important; }` — hides all tabs
- `.tab-pane.active { display: block !important; }` — shows only the active briefing tab (order is critical)

**Briefing typography:**
- `.briefing-content` — 12px font, 1.6 line-height, black text
- `.briefing-meta` — 11px, #666 gray
- `.briefing-section-header` — black text, light gray border-bottom, `page-break-inside: avoid`

**Page layout:**
- `@page { margin: 20mm; size: A4 portrait; }` — standard document margins

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Mitigations Applied

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-06-06 (Information Disclosure — hidden tab data in print) | `.tab-pane { display: none !important; }` hides all non-active tabs; only `.tab-pane.active` renders |
| T-06-07 (Tampering — CSS specificity failure leaving dark bg) | All print overrides use `!important`; explicit `background: #fff` on body, html, .main-content, .acct-content, .briefing-card |

---

## Known Stubs

None — the print CSS is fully wired to existing DOM structure from Plan 01.

---

## Self-Check: PASSED

- [x] index.html modified — FOUND: `@media print` block at line 888
- [x] Commit 47ccc38 exists — FOUND in git log
- [x] `grep -c "@media print" index.html` returns 1
- [x] `.tab-pane { display: none !important; }` precedes `.tab-pane.active { display: block !important; }`
- [x] `@page { margin: 20mm;` rule present
- [x] `page-break-inside: avoid` on `.briefing-section-header`

# Phase 8: UI Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-17
**Phase:** 08-ui-polish
**Areas discussed:** Category data model, Move-to-category UX, Category rename UX, Visual consistency
**Mode:** Auto (recommended defaults selected)

---

## Category Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Use existing `sector` field | No schema change, categories derived from distinct sector values | Yes |
| New `categories` table | Separate table with id/name, FK from accounts | |
| JSON config | Store categories in a config file, not DB | |

**User's choice:** [auto] Use existing `sector` field (recommended — already works in renderSidebar)

---

## Move-to-Category UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown in edit modal | Add category dropdown to existing account edit modal | Yes |
| Context menu on sidebar item | Right-click account to move | |
| Drag and drop | Drag account between sidebar groups | |

**User's choice:** [auto] Dropdown in edit modal (recommended — edit modal already exists)

---

## Category Rename UX

| Option | Description | Selected |
|--------|-------------|----------|
| Double-click inline edit | Double-click sidebar header, edit in place | Yes |
| Separate rename button | Icon button next to each category header | |
| Settings panel | Manage categories in a dedicated settings view | |

**User's choice:** [auto] Double-click inline edit (recommended — minimal UI additions)

---

## Visual Consistency

| Option | Description | Selected |
|--------|-------------|----------|
| Systematic token alignment | Define shared CSS classes, apply across tabs | Yes |
| Audit-only | Generate a report of inconsistencies, fix ad-hoc | |
| Full redesign | Redesign all tabs from scratch | |

**User's choice:** [auto] Systematic token alignment (recommended — actual work, not just report)

---

## Claude's Discretion

- CSS class names, audit methodology, animations, confirmation dialogs

## Deferred Ideas

None

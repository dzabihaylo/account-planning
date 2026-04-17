# Requirements: Grid Dynamics Prospect Intelligence Hub

**Defined:** 2026-04-10
**Core Value:** Every pursuit team member can open this tool and get a current, actionable briefing on any account — who to target, what to pitch, how to reach them, and what we've learned so far.

## v1 Requirements (Complete)

All 26 v1 requirements delivered across 6 phases. See v1 milestone archive for details.

## v2 Requirements

Requirements for v2.0: Production Hardening & UI Polish.

### Production Hardening

- [ ] **HARD-01**: SQLite database is backed up automatically on a schedule so account data survives Railway Volume failures
- [ ] **HARD-02**: AI endpoint errors (Anthropic API failures, timeouts) are caught and displayed gracefully to the user instead of silent failures
- [ ] **HARD-03**: AI endpoints have rate limiting to prevent runaway token costs from rapid repeated requests
- [ ] **HARD-04**: Server logs errors to a persistent location so issues can be diagnosed after the fact

### UI Polish

- [ ] **UIPOL-01**: Visual consistency pass — spacing, typography, card styles, and color usage are uniform across all 6 tabs (Overview, Contacts, Activity, Strategy, Briefing, Ask AI)
- [ ] **UIPOL-02**: User can move an account to a different industry category via the UI
- [ ] **UIPOL-03**: User can rename an existing industry category via the UI

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: User receives alerts when auto-refresh detects significant changes (exec departure, earnings miss, org restructure)
- **NOTF-02**: User receives reminders for stale contacts or accounts with no recent activity

### Analytics

- **ANLT-01**: Dashboard showing pursuit funnel metrics across all accounts (contacts mapped, meetings held, pipeline stage)
- **ANLT-02**: Win/loss analysis — patterns across successful vs failed pursuits

### Collaboration

- **COLB-01**: Multiple team members can add notes and contacts simultaneously
- **COLB-02**: Activity feed showing recent changes across all accounts

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| CRM integration (Salesforce/HubSpot sync) | Adds significant complexity; tool is more valuable standalone |
| Automated email / outreach sending | This is a strategy tool, not an outreach automation platform |
| Multi-user login / RBAC | Team is small; shared password is sufficient |
| Mobile native app | Web-first; responsive design handles mobile |
| Intent data / third-party signals feed | Requires paid subscriptions and data pipelines |
| Automated meeting scheduling | Out of scope — tool answers "who and what," not logistics |
| Version history / audit trail | Overkill for internal team; timestamps on entries suffice |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HARD-01 | TBD | Pending |
| HARD-02 | TBD | Pending |
| HARD-03 | TBD | Pending |
| HARD-04 | TBD | Pending |
| UIPOL-01 | TBD | Pending |
| UIPOL-02 | TBD | Pending |
| UIPOL-03 | TBD | Pending |

**Coverage:**
- v2 requirements: 7 total
- Mapped to phases: 0
- Unmapped: 7 (pending roadmap)

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-17 — v2.0 requirements defined*

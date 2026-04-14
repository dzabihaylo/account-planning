# Requirements: Grid Dynamics Prospect Intelligence Hub

**Defined:** 2026-04-10
**Core Value:** Every pursuit team member can open this tool and get a current, actionable briefing on any account — who to target, what to pitch, how to reach them, and what we've learned so far.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Persistence

- [ ] **PERS-01**: Account data stored in SQLite database on Railway Volume, not hardcoded in HTML
- [ ] **PERS-02**: SQLite database survives Railway deploys via mounted Volume at `/data`
- [ ] **PERS-03**: Database schema uses migration versioning (`PRAGMA user_version`) from day one
- [ ] **PERS-04**: Chat history persists across page reloads and server restarts

### Contact Intelligence

- [ ] **CONT-01**: User can view a contact map per account showing key decision-makers with role, title, and influence level (Champion/Evaluator/Blocker)
- [ ] **CONT-02**: Each contact has AI-generated outreach rationale — why this person would care about Grid Dynamics
- [ ] **CONT-03**: Each contact has a warm path / reachability field — how to reach them (mutual connections, referrals, channels)
- [ ] **CONT-04**: User can add, edit, and remove contacts per account
- [ ] **CONT-05**: User can log outreach attempts per contact — date, channel, outcome
- [ ] **CONT-06**: Contacts display a staleness indicator based on `researched_at` timestamp

### Pursuit Tracking

- [ ] **PURS-01**: Pursuit activity log with timestamped entries per account — what happened, who was involved, what was said
- [ ] **PURS-02**: AI debrief extraction — user describes a meeting in natural language, AI extracts structured log entries and updates strategy
- [ ] **PURS-03**: AI debrief uses human review gate — AI proposes, user confirms before writes hit the database

### Pursuit Strategy

- [ ] **STRT-01**: Each account has a private intel layer — user-contributed notes labeled as internal alongside public data
- [ ] **STRT-02**: Each account has an evolving strategy summary that the AI synthesizes from pursuit logs, private intel, chat history, and contact data
- [ ] **STRT-03**: User can manually edit the strategy summary to correct or refine AI suggestions
- [ ] **STRT-04**: "Why now" trigger tracking — tag buying triggers (CTO change, cost cuts, failed vendor) to account timeline

### Account Management

- [ ] **ACCT-01**: User can add new accounts via the UI without editing HTML
- [ ] **ACCT-02**: User can edit account details (name, sector, revenue, employees, HQ)
- [ ] **ACCT-03**: User can remove accounts from the dashboard
- [ ] **ACCT-04**: Existing 13 accounts are migrated from hardcoded HTML to the database

### Intelligence Refresh

- [x] **REFR-01**: Public intelligence auto-refreshes periodically via AI + web sources (financials, news, exec changes)
- [x] **REFR-02**: Auto-refresh has a token budget gate to prevent runaway costs
- [x] **REFR-03**: Each account shows when intelligence was last refreshed
- [x] **REFR-04**: User can trigger a manual refresh for any individual account

### Briefing & Output

- [ ] **BREF-01**: Team briefing view — AI-composed one-pager per account: status, key contacts, current strategy, next steps
- [ ] **BREF-02**: Briefing is printable / shareable (browser print-to-PDF)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

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
| PERS-01 | Phase 1 | Pending |
| PERS-02 | Phase 1 | Pending |
| PERS-03 | Phase 1 | Pending |
| PERS-04 | Phase 1 | Pending |
| ACCT-01 | Phase 1 | Pending |
| ACCT-02 | Phase 1 | Pending |
| ACCT-03 | Phase 1 | Pending |
| ACCT-04 | Phase 1 | Pending |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| CONT-05 | Phase 2 | Pending |
| CONT-06 | Phase 2 | Pending |
| PURS-01 | Phase 3 | Pending |
| PURS-02 | Phase 3 | Pending |
| PURS-03 | Phase 3 | Pending |
| STRT-01 | Phase 4 | Pending |
| STRT-02 | Phase 4 | Pending |
| STRT-03 | Phase 4 | Pending |
| STRT-04 | Phase 4 | Pending |
| REFR-01 | Phase 5 | Complete |
| REFR-02 | Phase 5 | Complete |
| REFR-03 | Phase 5 | Complete |
| REFR-04 | Phase 5 | Complete |
| BREF-01 | Phase 6 | Pending |
| BREF-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after roadmap creation — traceability complete*

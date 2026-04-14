# Roadmap: Grid Dynamics Prospect Intelligence Hub

**Milestone:** v1
**Granularity:** Standard
**Total v1 Requirements:** 26
**Coverage:** 26/26 ✓
**Created:** 2026-04-10

---

## Phases

- [ ] **Phase 1: Persistence & Account Management** - SQLite on Railway Volume replaces hardcoded HTML; all 13 accounts migrate to DB; users can add/edit/remove accounts via UI
- [ ] **Phase 2: Contact Intelligence** - Per-account contact maps with decision-maker roles, AI-generated outreach rationale, reachability paths, and outreach log
- [ ] **Phase 3: Pursuit Tracking** - Timestamped activity log per account; AI debrief extracts structured entries from natural language meeting descriptions with human review gate
- [ ] **Phase 4: Pursuit Strategy** - Private intel layer, AI-synthesized evolving strategy summary, manual editing, and "why now" trigger tracking
- [x] **Phase 5: Intelligence Refresh** - Auto-refresh of public intelligence via AI + web sources with token budget gate, staleness indicators, and manual refresh trigger (completed 2026-04-14)
- [ ] **Phase 6: Briefing & Output** - AI-composed team briefing view per account; printable/shareable one-pager

---

## Phase Details

### Phase 1: Persistence & Account Management
**Goal**: Account data lives in a real database that survives deploys, and users can manage the account list through the UI
**Depends on**: Nothing (first phase — this is the foundation)
**Requirements**: PERS-01, PERS-02, PERS-03, PERS-04, ACCT-01, ACCT-02, ACCT-03, ACCT-04
**Success Criteria** (what must be TRUE):
  1. All 13 existing accounts appear in the app after a Railway deploy and a server restart — no data lost
  2. User can add a new account (name, sector, revenue, employees, HQ) through the UI and it appears in the sidebar without touching HTML or code
  3. User can edit an existing account's details through the UI and changes persist across page reloads
  4. User can remove an account through the UI and it is gone from the sidebar on next load
  5. Chat history for an account is still present after a page reload (not reset to empty)
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md — Database foundation: SQLite schema, better-sqlite3 setup, REST API, seed 13 accounts
- [x] 01-02-PLAN.md — Dynamic frontend: rewrite index.html to render from API, add/edit/remove modals
- [x] 01-03-PLAN.md — Chat persistence: save and restore chat history across page reloads

**UI hint**: yes

### Phase 2: Contact Intelligence
**Goal**: For each account, users can see and manage a map of key decision-makers with AI-generated outreach guidance
**Depends on**: Phase 1 (contacts stored in DB per account)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06
**Success Criteria** (what must be TRUE):
  1. User can open any account and see a contact map listing decision-makers with their role, title, and influence label (Champion / Evaluator / Blocker)
  2. Each contact shows an AI-generated rationale explaining why that person would care about Grid Dynamics
  3. Each contact shows a warm path / reachability field (mutual connections, referral routes, channels)
  4. User can add a new contact, edit an existing contact, or delete a contact — changes persist
  5. User can log an outreach attempt per contact (date, channel, outcome) and see prior attempts
  6. Contacts show a staleness indicator when the researched_at date is old
**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md — Database schema v2 (contacts + outreach_log tables) and 7 REST API routes
- [x] 02-02-PLAN.md — Contacts tab UI: card grid, influence grouping, staleness badges, add/edit/delete modals
- [x] 02-03-PLAN.md — AI generation UI (rationale + warm path) and outreach logging inline form

**UI hint**: yes

### Phase 3: Pursuit Tracking
**Goal**: Users can log what happened during account pursuits and have AI extract structured entries from natural-language meeting debriefs
**Depends on**: Phase 1 (log entries stored in DB); Phase 2 beneficial (contacts referenced in logs)
**Requirements**: PURS-01, PURS-02, PURS-03
**Success Criteria** (what must be TRUE):
  1. User can view a chronological activity log per account showing timestamped entries — what happened, who was involved, what was said
  2. User can describe a meeting in natural language to the AI and the AI proposes structured log entries extracted from that description
  3. AI-proposed entries are shown for review before being committed — user can accept, edit, or reject each entry before it hits the database
**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md — Database schema v3 (activity_log table) and activity API routes (GET/POST)
- [x] 03-02-PLAN.md — Activity tab UI: timeline rendering, manual entry form, tab integration
- [x] 03-03-PLAN.md — AI debrief extraction endpoint, review panel with approve/edit/reject controls

**UI hint**: yes

### Phase 4: Pursuit Strategy
**Goal**: Each account has a living strategy layer — private intel, AI-synthesized strategy, and buying trigger tracking — that reflects cumulative pursuit learnings
**Depends on**: Phase 3 (strategy synthesizes from pursuit logs)
**Requirements**: STRT-01, STRT-02, STRT-03, STRT-04
**Success Criteria** (what must be TRUE):
  1. User can add private intel notes per account that are labeled as internal and stored separately from public data
  2. Each account displays an AI-synthesized strategy summary that draws on pursuit logs, private intel, chat history, and contact data
  3. User can manually edit the strategy summary to correct or refine AI suggestions — edits persist
  4. User can tag a buying trigger (e.g., CTO change, cost cuts, failed vendor) to an account and see it reflected in the account timeline
**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md — Database schema v4 (private_intel, strategy_summaries, buying_triggers tables) and 7 API routes including AI strategy synthesis
- [x] 04-02-PLAN.md — Strategy tab UI: private intel notes list/form and AI strategy summary card with edit/regenerate
- [x] 04-03-PLAN.md — Buying trigger badges, add trigger form, and Activity timeline integration

**UI hint**: yes

### Phase 5: Intelligence Refresh
**Goal**: Public account intelligence stays current — financials, news, exec changes — without manual HTML edits or runaway AI costs
**Depends on**: Phase 1 (accounts in DB to refresh); Phase 4 (strategy context to update)
**Requirements**: REFR-01, REFR-02, REFR-03, REFR-04
**Success Criteria** (what must be TRUE):
  1. Account intelligence refreshes automatically on a schedule using AI + web sources — new data appears without user action
  2. Auto-refresh stops (or skips accounts) when a configurable token budget threshold is reached for the period
  3. Each account shows a "last refreshed" timestamp so users know how current the data is
  4. User can trigger a manual refresh for any individual account at any time and see updated data
**Plans:** 3/3 plans complete

Plans:
- [x] 05-01-PLAN.md — Database schema v5 (refresh_log, refresh_budget tables, last_refreshed_at column) and refresh query helpers
- [x] 05-02-PLAN.md — Refresh engine: refreshAccount function, auto-refresh scheduler with budget gate, manual refresh and budget API endpoints
- [x] 05-03-PLAN.md — Refresh UI: staleness badges, refresh button, loading state, changes toast, budget indicator

### Phase 6: Briefing & Output
**Goal**: Any team member can generate a shareable, print-ready one-pager briefing for any account that captures current status, contacts, strategy, and next steps
**Depends on**: Phase 2 (contacts), Phase 3 (pursuit logs), Phase 4 (strategy)
**Requirements**: BREF-01, BREF-02
**Success Criteria** (what must be TRUE):
  1. User can open a briefing view for any account showing an AI-composed one-pager: status, key contacts, current strategy, and recommended next steps
  2. User can print the briefing or export it as a PDF using the browser's native print function — output is clean and readable
**Plans:** 2 plans

Plans:
- [ ] 06-01-PLAN.md — AI briefing tab: migration v6 (briefings table), GET/POST API endpoints, Briefing tab with generate/regenerate/render lifecycle
- [ ] 06-02-PLAN.md — Print-ready output: @media print CSS block, visual verification checkpoint

**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Persistence & Account Management | 3/3 | Complete | - |
| 2. Contact Intelligence | 0/3 | Planning complete | - |
| 3. Pursuit Tracking | 0/3 | Planning complete | - |
| 4. Pursuit Strategy | 0/3 | Planning complete | - |
| 5. Intelligence Refresh | 3/3 | Complete   | 2026-04-14 |
| 6. Briefing & Output | 0/2 | Planning complete | - |

---

## Coverage Map

| Requirement | Phase | Rationale |
|-------------|-------|-----------|
| PERS-01 | 1 | DB foundation must come first |
| PERS-02 | 1 | Railway Volume survival is part of DB setup |
| PERS-03 | 1 | Migration versioning established at schema creation time |
| PERS-04 | 1 | Chat persistence follows from DB existing |
| ACCT-01 | 1 | UI account creation requires DB to write to |
| ACCT-02 | 1 | UI account editing requires DB to update |
| ACCT-03 | 1 | UI account removal requires DB to delete from |
| ACCT-04 | 1 | 13 accounts migrate to DB as part of Phase 1 setup |
| CONT-01 | 2 | Contact map is Phase 2's core deliverable |
| CONT-02 | 2 | AI outreach rationale per contact |
| CONT-03 | 2 | Warm path / reachability per contact |
| CONT-04 | 2 | Add/edit/remove contacts |
| CONT-05 | 2 | Outreach attempt log per contact |
| CONT-06 | 2 | Staleness indicator per contact |
| PURS-01 | 3 | Pursuit activity log is Phase 3's core deliverable |
| PURS-02 | 3 | AI debrief extraction depends on log infrastructure |
| PURS-03 | 3 | Human review gate is part of debrief flow |
| STRT-01 | 4 | Private intel layer builds on persistent account data |
| STRT-02 | 4 | Strategy synthesis requires pursuit logs from Phase 3 |
| STRT-03 | 4 | Manual strategy editing is part of Phase 4 strategy layer |
| STRT-04 | 4 | "Why now" trigger tracking part of strategy layer |
| REFR-01 | 5 | Auto-refresh requires accounts in DB and strategy context |
| REFR-02 | 5 | Token budget gate is part of refresh infrastructure |
| REFR-03 | 5 | Staleness timestamp is part of refresh feature |
| REFR-04 | 5 | Manual refresh trigger is part of refresh feature |
| BREF-01 | 6 | Briefing requires contacts + logs + strategy to synthesize |
| BREF-02 | 6 | Print/PDF is part of briefing output |

---
*Roadmap created: 2026-04-10*
*Last updated: 2026-04-14 after Phase 6 planning*

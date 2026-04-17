# Roadmap: Grid Dynamics Prospect Intelligence Hub

**Milestone:** v2.0 — Production Hardening & UI Polish
**Granularity:** Standard
**Total v2 Requirements:** 7
**Coverage:** 7/7 ✓
**Created:** 2026-04-17

---

## Phases

- [ ] **Phase 7: Server Hardening** - SQLite backup, AI error handling, rate limiting, and persistent server-side error logging
- [ ] **Phase 8: UI Polish** - Visual consistency pass across all 6 tabs, plus account recategorization and category rename controls

---

## Phase Details

### Phase 7: Server Hardening
**Goal**: The server protects account data, handles AI failures gracefully, and leaves enough diagnostic trail to diagnose issues after the fact
**Depends on**: Phase 1 (SQLite DB exists on Railway Volume); Phase 5 (AI refresh endpoints); existing AI chat endpoint
**Requirements**: HARD-01, HARD-02, HARD-03, HARD-04
**Success Criteria** (what must be TRUE):
  1. Account data is still present after a simulated Railway Volume failure — automated SQLite backup has run and a restore path exists
  2. When the Anthropic API times out or returns an error, the user sees a readable error message in the UI instead of a silent failure or raw stack trace
  3. Rapidly submitting AI requests (chat, refresh, briefing generation) results in a rate-limit response after the threshold is exceeded — token runaway is prevented
  4. After triggering a server error, an administrator can find a timestamped log entry for that error in a persistent location (not just ephemeral stdout)
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — Persistent logger module + SQLite backup scheduler
- [x] 07-02-PLAN.md — Rate limiting + AI error handling + frontend error display

### Phase 8: UI Polish
**Goal**: The UI looks and feels consistent across every tab, and users can reorganize accounts into categories without touching code
**Depends on**: Phase 1 (accounts in DB with category field); Phase 2 (Contacts tab exists); Phase 3 (Activity tab exists); Phase 4 (Strategy tab exists); Phase 6 (Briefing tab exists)
**Requirements**: UIPOL-01, UIPOL-02, UIPOL-03
**Success Criteria** (what must be TRUE):
  1. Spacing, typography, card styles, and color usage are visually consistent when switching between Overview, Contacts, Activity, Strategy, Briefing, and Ask AI tabs for any account
  2. User can open an account, select "Move to category," pick a different industry group from a list, and the account immediately appears under the new group in the sidebar
  3. User can select an industry category from the sidebar, rename it inline, and the new name is reflected everywhere — sidebar heading, any account display that references it — after page reload
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 08-01-PLAN.md — CSS normalization + shared class definitions (visual consistency)
- [ ] 08-02-PLAN.md — Category dropdown in edit modal (account recategorization)
- [ ] 08-03-PLAN.md — Inline category rename on sidebar headers + toast component

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Server Hardening | 0/2 | Planning complete | - |
| 8. UI Polish | 0/3 | Planning complete | - |

---

## Coverage Map

| Requirement | Phase | Rationale |
|-------------|-------|-----------|
| HARD-01 | 7 | SQLite backup is a server-side infrastructure concern |
| HARD-02 | 7 | AI error handling is part of the server endpoint and client error display |
| HARD-03 | 7 | Rate limiting is applied at the server endpoint layer |
| HARD-04 | 7 | Persistent error logging is a server-side concern |
| UIPOL-01 | 8 | Visual consistency pass touches all tabs in the frontend |
| UIPOL-02 | 8 | Account recategorization requires UI controls and a DB category field |
| UIPOL-03 | 8 | Category rename requires UI controls and updates to the category table |

---

## v1 Phase Archive

Phases 1-6 were delivered in milestone v1. See git history for v1 ROADMAP.md.

| Phase | Name | Status |
|-------|------|--------|
| 1 | Persistence & Account Management | Complete |
| 2 | Contact Intelligence | Complete |
| 3 | Pursuit Tracking | Complete |
| 4 | Pursuit Strategy | Complete |
| 5 | Intelligence Refresh | Complete |
| 6 | Briefing & Output | Complete |

---

## Backlog

### Phase 999.1: LinkedIn Connection Graph (BACKLOG)

**Goal:** Show 1st and 2nd degree LinkedIn connection paths to target contacts alongside contact cards. The tool tells you WHO to reach — this tells you HOW to reach them through your network. Likely requires LinkedIn Sales Navigator API (TeamLink feature) or equivalent. Solves the core GTM bottleneck: getting meetings depends on warm paths, not just knowing names and titles.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

---

*Roadmap created: 2026-04-17*
*Last updated: 2026-04-17 — Phase 8 plans created*

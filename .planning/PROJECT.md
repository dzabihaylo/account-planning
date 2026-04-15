# Grid Dynamics Prospect Intelligence Hub

## What This Is

A pursuit intelligence dashboard for Grid Dynamics' GTM Automotive team that helps Dave Zabihaylo and his pursuit teams research enterprise prospects, identify the right contacts, plan outreach strategies, and evolve their approach based on real engagement outcomes. The tool serves as the single source of truth for account intelligence — combining auto-refreshed public data with private pursuit notes — so any team member can be briefed on any account at any time.

## Core Value

Every pursuit team member can open this tool and get a current, actionable briefing on any account — who to target, what to pitch, how to reach them, and what we've learned so far.

## Requirements

### Validated

- ✓ Multi-account dashboard with sidebar navigation — existing
- ✓ Per-account intelligence panels (overview, financials, tech stack, talent, outsourcing, executives) — existing
- ✓ AI chat per account with full account context as system prompt — existing
- ✓ Password-protected access with cookie-based auth — existing
- ✓ Server-side API key injection (key never reaches browser) — existing
- ✓ Search/filter across all accounts — existing
- ✓ Account data for 13 prospects across Automotive, Financial Services, and Energy — existing

### Active

- [ ] Contact intelligence per account — map key decision-makers with role, influence, and reachability
- [ ] Outreach strategy per contact — why they'd care about Grid Dynamics, warm paths to reach them, personalized talking points
- [ ] Pursuit activity log via AI conversation — debrief after meetings and the AI updates account strategy
- [ ] Evolving pursuit approach — account strategy reflects cumulative learnings from what's been pitched, what landed, what didn't
- ✓ Auto-refresh of public intelligence — financials, news, exec changes, tech signals updated periodically via AI + web sources — Validated in Phase 5: Intelligence Refresh
- [ ] Private intel layer — user-contributed meeting notes, relationship context, internal signals alongside public data
- ✓ Pursuit team briefing view — a consolidated, shareable summary of account status, strategy, and next steps — Validated in Phase 6: Briefing & Output
- [ ] Dynamic account management — add/remove/update accounts without manual HTML editing
- [ ] Data persistence — account intelligence, chat history, pursuit logs survive page reloads and server restarts

### Out of Scope

- Multi-user accounts with individual logins — team is small, single shared password is sufficient for now
- CRM integration (Salesforce, HubSpot) — tool is standalone; CRM sync adds complexity without clear near-term value
- Automated outreach/email sending — this is a research and strategy tool, not an outreach automation platform
- Mobile-native app — web-first, responsive design handles mobile access

## Context

- Existing codebase is a single HTML file (~1,226 lines) + a plain Node.js server with zero npm dependencies
- All account data is currently hardcoded as JavaScript objects in index.html
- No database, no build step, no framework — deployed on Railway with auto-deploy from GitHub
- Dave is the primary daily user; pursuit team members consume outputs he shares
- The biggest bottleneck is getting meetings — not knowing what to pitch, but getting in front of the right person
- Pursuit teams have mixed roles (technical, sales, delivery) with varying engagement levels
- Account list changes over time as new prospects are identified and old ones close or deprioritize
- Intelligence goes stale quickly — exec changes, earnings, strategic pivots happen quarterly

## Constraints

- **Hosting**: Railway (railway.app) — current deployment, auto-deploys from GitHub main branch
- **AI Backend**: Anthropic Claude API — already integrated, keep as primary AI engine
- **Simplicity**: Dave values the zero-dependency, no-build-step approach — don't over-engineer the stack
- **Security**: API keys must stay server-side; auth is simple but must exist
- **Budget**: Token costs matter — be smart about when and how much AI is used for auto-refresh

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Node.js with minimal dependencies | Existing stack works, team is small, simplicity is a feature | — Pending |
| AI conversation as the input method for pursuit learnings | More natural than structured forms; Dave can debrief verbally after meetings | — Pending |
| Auto-refresh public data + manual private intel | Public data can be automated; internal relationship context requires human input | — Pending |
| Data persistence needed | Current in-memory approach doesn't survive reloads; pursuit logs and strategy must persist | — Pending |

## Current Milestone: v2.0 Production Hardening & UI Polish

**Goal:** Make the tool production-grade and visually consistent — protect the data, handle errors gracefully, clean up the UI, and give users control over account categorization.

**Target features:**
- SQLite backup strategy (protect account data on Railway Volume)
- Error monitoring and graceful error handling for AI endpoints
- Rate limiting on AI endpoints (prevent abuse/runaway costs)
- UI consistency pass across all tabs (Overview, Contacts, Activity, Strategy, Briefing, Ask AI)
- Reclassify/recategorize accounts (move an account to a different industry group)
- Rename existing categories (change industry group names)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-15 after v2.0 milestone start*

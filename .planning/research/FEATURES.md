# Feature Landscape: Pursuit Intelligence Dashboard

**Domain:** Sales intelligence / pursuit management for enterprise B2B (internal tool, GTM team of ~5-10)
**Researched:** 2026-04-10
**Confidence:** MEDIUM-HIGH (verified against multiple sales intelligence platforms + practitioner sources)

---

## Context: What Kind of Tool This Is

This is NOT a sales engagement platform (Outreach, Salesloft), NOT a contact database (ZoomInfo, Apollo),
and NOT a CRM (Salesforce, HubSpot). It is an account intelligence and pursuit coordination tool — the
place where the team understands who to target, what to pitch, and how the pursuit is progressing.

The closest commercial analog is Salesmotion or Clari's account planning module, but stripped of CRM
dependency and built for a single team's workflow.

The primary bottleneck Dave has identified: getting meetings, not knowing what to pitch. Features must
serve that bottleneck first.

---

## Table Stakes

Features users expect. Missing = the tool feels incomplete or unusable for its core purpose.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Contact map per account | Users expect to know who to target; a company profile without names is useless | Medium | Role, seniority, why they matter to GD's pitch. Not just org-chart — strategic relevance. |
| Outreach rationale per contact | "Why would THIS person care?" is the question before every cold email or call | Low | Talking points derived from account intel + contact role. Can be AI-generated per-contact. |
| Warm path / reachability indicator | Enterprise selling is relationship-first; blind cold outreach is last resort | Medium | LinkedIn mutual connections, alumni networks, board relationships, existing GD client refs. Not automated lookup — human-curated field. |
| Pursuit activity log | Teams forget what's been done, what was said, and who knows whom | Medium | Timestamped notes per account. Survives page reloads. Input via AI debrief conversation. |
| Account strategy that evolves | Static "what to pitch" decays; users need the approach to reflect what's been learned | High | AI synthesizes log entries into a living strategy summary. Most complex feature. |
| Data persistence | Current in-memory state is a blocker; everything resets on reload | Medium | SQLite or file-based JSON on server is sufficient at this scale. |
| Private intel layer | Public data alone is incomplete; relationship context and internal signals are often what closes deals | Low | Free-text notes field per account, per contact. Labeled "private" vs public source. |
| Team briefing view | Colleagues joining a pursuit need to get up to speed fast; briefings save 45-60 min of manual research per call | Medium | Printable / shareable summary: account status, key contacts, current strategy, next steps. AI-generated from all accumulated intel. |

---

## Differentiators

Features that set this tool apart from a shared Notion doc or a CRM account record. Not expected at baseline, but high value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI debrief as input method | Talking through a meeting in natural language is faster and richer than filling a form; AI extracts structured learnings | High | Core innovation in the PROJECT.md design. User speaks/types what happened; AI updates strategy, flags key signals, logs the entry. |
| Auto-refresh of public intelligence | Exec changes, earnings misses, org restructures happen quarterly; stale intel is a credibility risk | High | Periodic AI + web fetch pull for each account. High token cost — must be triggered deliberately or on schedule, not per-page-load. |
| Contact influence scoring | Not all contacts are equal; understanding who has real budget/authority vs. who is a champion vs. who blocks deals is a differentiator | Medium | Qualitative field (Champion / Evaluator / Blocker / Bystander) + free-text rationale. Miller Heiman Blue Sheet model is the validated reference here. |
| "Why now" trigger tracking | Buying windows open and close; tracking triggers (CTO change, cost reduction initiative, failed vendor, new platform mandate) is what makes outreach timely | Medium | Tag triggers to account timeline. AI can surface these from log entries and news. |
| Dynamic account management | Accounts change as pipeline evolves; ability to add/remove/edit without touching HTML is essential past ~15 accounts | Medium | Admin interface or structured data file. Eliminates manual HTML editing. |
| Per-contact outreach history | Knowing what's already been sent prevents duplicate outreach and shows relationship depth | Low-Medium | Simple log of attempts per contact: date, channel, outcome. Not email tracking — manual entry. |

---

## Anti-Features

Features to deliberately NOT build. Either wrong scope, over-engineered for this team size, or create more friction than value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| CRM integration (Salesforce sync) | Adds significant integration complexity; GD's CRM hygiene may be inconsistent; tool is more valuable when standalone and fast | Keep as standalone; log key wins manually in CRM separately if required |
| Automated email / outreach sending | This is a strategy and research tool; outreach automation requires deliverability management, reply tracking, opt-outs — an entirely different problem | Provide talking points and draft messaging; send from existing tools |
| Multi-user login / RBAC | Team is 5-10 people; individual logins add auth complexity without clear benefit at this scale | Shared password is sufficient; if compliance demands change, revisit |
| Mobile native app | GTM work is done at desks and in meeting rooms with laptops; responsive web handles the edge case | Ensure responsive design; no native app |
| Intent data / third-party signals feed | ZoomInfo, Bombora intent data requires subscriptions and data pipeline integration; not achievable in this stack | Use AI-powered monitoring of public sources (news, earnings, job posts) as a proxy |
| Automated meeting scheduling | Out of scope; this tool answers "who and what to pitch," not logistics | Keep link to LinkedIn or Calendly per contact if useful |
| Gamification / leaderboards | Pursuit teams are senior; motivation mechanics are unnecessary and feel patronizing | None needed |
| Version history / audit trail | Overkill for a 5-10 person internal tool | Simple timestamp on log entries is sufficient |

---

## Feature Dependencies

```
Data persistence (SQLite/JSON)
  └── Required by ALL of the following:
        ├── Pursuit activity log
        ├── Private intel layer
        ├── Contact map (with notes)
        ├── Evolving account strategy
        └── Per-contact outreach history

Contact map (roles, contacts listed)
  └── Required by:
        ├── Outreach rationale per contact
        ├── Warm path / reachability
        └── Per-contact outreach history

Pursuit activity log (entries persist)
  └── Required by:
        ├── Evolving account strategy (AI synthesizes log)
        └── Team briefing view (draws from log + strategy)

AI debrief as input method
  └── Builds on:
        ├── Pursuit activity log (creates entries)
        └── Evolving account strategy (triggers re-synthesis)

Auto-refresh public intelligence
  └── Independent, but enhances:
        ├── "Why now" trigger tracking
        └── Team briefing view
```

---

## MVP Recommendation

For the first milestone adding pursuit intelligence, prioritize in this order:

**Must ship:**
1. Data persistence — nothing else works without it. SQLite is the right call at this scale.
2. Contact map per account — structured list of 3-6 key targets with role, influence type, and why they matter to the GD pitch.
3. Outreach rationale per contact — AI-generated, derived from account context + contact role. Solves the stated bottleneck immediately.
4. Pursuit activity log — timestamped entries per account, input via existing AI chat or a lightweight debrief interface.
5. Team briefing view — AI-generated one-pager pulling contact map + log + strategy. Directly addresses "any team member can get briefed" core value.

**Defer to next milestone:**
- Evolving AI strategy synthesis — depends on having enough log entries to synthesize; day-one value is low, complexity is high.
- Auto-refresh public intelligence — high token cost; validate the log/briefing loop first before adding automated data pipelines.
- Dynamic account management — current 13-account HTML is workable short-term; unblock pursuit features first.
- Warm path / reachability — high manual curation effort; add after contact map pattern is established.

**Never build:**
See anti-features above.

---

## Feature Complexity Reference

| Feature | Complexity | Primary Risk |
|---------|------------|--------------|
| Data persistence (SQLite) | Medium | Schema design affects every other feature; get it right first |
| Contact map | Medium | Data model must accommodate GD-specific fields (influence type, pitch angle) |
| Outreach rationale (AI-generated) | Low | Prompt engineering; builds on existing AI chat infrastructure |
| Pursuit activity log | Medium | UX for log entry input matters; forms feel like CRM overhead |
| AI debrief input method | High | Parsing natural language debrief into structured log entries reliably |
| Team briefing view | Medium | Composing from multiple data sources; formatting for print/share |
| Evolving strategy synthesis | High | AI must synthesize across many log entries without hallucinating; needs good prompt design |
| Auto-refresh public intelligence | High | Cost management, scheduling, conflict with manually-edited intel |
| Dynamic account management | Medium | Admin UI or structured data format; migration from hardcoded HTML |
| Per-contact outreach history | Low | Simple log; append-only is fine |
| "Why now" trigger tagging | Low | Tag field on log entries + contact records |
| Contact influence scoring | Low | Enum field + free text; Miller Heiman model is well-established |

---

## Sources

- [Contact Intelligence: The Missing Piece in Your Sales Stack | Salesmotion](https://salesmotion.io/blog/contact-intelligence-guide) — MEDIUM confidence
- [Account Planning for Enterprise Sales: The 2026 Playbook | Salesmotion](https://salesmotion.io/blog/enterprise-account-planning-2026) — MEDIUM confidence
- [A Winning Executive Briefing Template for B2B Sales Teams | Salesmotion](https://salesmotion.io/blog/executive-briefing-template) — MEDIUM confidence
- [How AI Debrief Agents Transform Sales Meeting Workflows in 2026 | Spotlight](https://www.spotlight.ai/post/how-ai-debrief-agents-transform-sales-meeting-workflows-in-2026) — LOW confidence (single source)
- [The 4 Guiding Principles of a Sales Opportunity Pursuit Strategy | Richardson](https://www.richardson.com/sales-resources/guiding-principles-sales-opportunity-pursuit-strategy) — MEDIUM confidence
- [12 AI Sales Intelligence Tools for Smart Prospecting in 2026 | Salesforge](https://www.salesforge.ai/blog/sales-intelligence-tools) — LOW confidence (survey article)
- [Best Account Intelligence Tools for B2B Sales (2026) | Salesmotion](https://salesmotion.io/blog/account-intelligence-tools-2026) — MEDIUM confidence
- PROJECT.md — Dave's stated bottleneck ("getting meetings") and explicit requirements list

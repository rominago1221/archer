# Archer - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Archer" — a legal tech AI platform for US and Belgium consumers. Law firm in your pocket.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, SVG charts, DOMPurify
- **Backend**: FastAPI (Python), modular: server.py, db.py, models.py, auth.py, storage.py, routes/
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth
- **Brand**: Archer (renamed from Jasper, Apr 13 2026)

## Completed Features
- Full Dashboard + Case Detail with 5-pass Claude analysis pipeline
- Document upload & library, Attorney onboarding portal
- Jurisdiction (USA/BE) & Language switching (EN/FR)
- James AI Clarification Q&A flow (James rename pending)
- Enhanced AI Findings, Next Actions, Case Stage Detection
- Attorney Letter Modal (Part 1), Global Letter Tone Distinction
- Case Delete, Performance Optimizations, Code Quality Fixes
- Score History Chart (ResizeObserver, HTML tooltip, fixed height)
- Pricing Page — /pricing, /en/pricing, /fr/pricing (7 sections)
- Win Wall — /winning-cases (3 versions)
- PublicNavbar, Jasper→Archer rename, 5 SVG logos
- **Archer Home Page V1+V2+V3** (Apr 13 2026) — 11-section rebuild:
  1. Hero (Meet Archer 128px, sparkle badge, trust bar)
  2. Pillars V2 (You upload / Archer analyzes / You choose + mini outputs)
  3. Intelligence (4 stats + 6 capabilities)
  4. **What We Handle** (NEW V3 - 8 case type cards in 2x4 grid)
  5. Attorney Letter (reframed: "ONE OF FOUR ACTIONS", $49.99, disclaimer)
  6. Live Counsel (split layout + video mockup)
  7. VS Old World (removed "First appointment", added DIY letter NEW row)
  8. Pricing Teaser (unlimited analyses, 3 members Family, add-ons strip)
  9. FAQ (8 questions)
  10. Final CTA (full-bleed blue)

## Prioritized Backlog
### P0
- James → Archer rename (remove James character, neutral voice)
### P1
- Attorney Letter Modal Part 2 — Stripe Payment
- Reduce Cyclomatic Complexity Python
- Component splitting (Dashboard.js, CaseDetail.js)
### P1 Upcoming
- Mobile Document Scanner, HelloSign, Stripe Connect, Deadline Alerts
### P2
- Streaming SSE, Full translation verification, server.py modularization

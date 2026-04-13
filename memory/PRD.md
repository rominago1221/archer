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
- **Pricing Page** — /pricing, /en/pricing, /fr/pricing (7 sections)
- **Win Wall** — /winning-cases (3 versions: US/$, BE-EN/€, BE-FR/€)
- **PublicNavbar** — Shared navbar for Pricing + Winning Cases
- **Jasper → Archer rename** — All UI, prompts, emails, meta, 5 SVG logos
- **NEW: Archer Home Page** (Apr 13 2026) — Complete 10-section rebuild:
  1. Hero (Meet Archer 128px, sparkle badge, trust bar)
  2. Pillars (Diagnosis → Strategy → Execution, animated arrows)
  3. Intelligence (4 stats 2.4M/60s/5/94%, 6 capabilities)
  4. Attorney Letter (split layout, letter mockup with VERIFIED seal)
  5. Live Counsel (split, video call mockup, pricing blocks)
  6. VS Old World (6-row comparison table)
  7. Pricing Teaser (3 plans, Family featured)
  8. FAQ (8 questions, 2x4 grid)
  9. Final CTA (full-bleed blue)
  - Full EN/FR bilingual via C.en/C.fr content objects
  - CSS animations: badge-glow, sparkle-twinkle, pulse-anim, draw-line, fade-in
  - Responsive: 1920px, 1100px, 640px breakpoints

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

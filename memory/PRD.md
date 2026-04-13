# Archer - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Archer" — a legal tech AI platform for US and Belgium consumers. Law firm in your pocket.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, SVG charts, DOMPurify
- **Backend**: FastAPI (Python), modular: server.py, db.py, models.py, auth.py, storage.py, routes/
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth

## Completed Features
- Full Dashboard + Case Detail with 5-pass Claude analysis pipeline
- Document upload & library, Attorney onboarding portal
- Jurisdiction (USA/BE) & Language switching (EN/FR)
- James AI Clarification Q&A flow (James rename pending)
- Score History Chart, Attorney Letter Modal (Part 1)
- Case Delete, Performance Optimizations, Code Quality Fixes
- **Marketing Pages**:
  - Home Page V2+V3 (11 sections with 4-action model)
  - Pricing Page (/pricing, /en/pricing, /fr/pricing)
  - Win Wall (/winning-cases, 3 versions)
  - **How It Works** (/how-it-works, /fr/how-it-works) — 8 sections:
    1. Hero (Look under the hood, 5 pipeline stats)
    2. Live Demo Dashboard (full mockup, 94% ring, 4 action buttons)
    3. Architecture (8-step DARK pipeline, monospace, CORE/HUMAN badges)
    4. Human Layer (80/20 split, 4 attorney cards)
    5. Timeline (bifurcated Path A 80% / Path B 20%)
    6. Safeguards (6 objection cards with stats)
    7. Real Cases (3 paths: DIY/Certified/Attorney)
    8. Final CTA (blue full-bleed)
  - PublicNavbar with How it works / Pricing / Winning cases
  - Jasper→Archer rename complete, 5 SVG logos

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

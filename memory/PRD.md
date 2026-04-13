# Archer - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Archer" — a legal tech AI platform for US and Belgium consumers.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn UI, DOMPurify
- **Backend**: FastAPI (Python), modular: server.py, db.py, models.py, auth.py, storage.py, routes/
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth

## Completed Features
- Full Dashboard + Case Detail with 5-pass Claude analysis pipeline
- Document upload & library, Attorney onboarding portal
- Jurisdiction (USA/BE) & Language switching (EN/FR)
- James AI Clarification Q&A flow (James rename pending)
- Score History Chart, Attorney Letter Modal (Part 1)
- Case Delete, Performance Optimizations, Code Quality
- **Marketing Pages**: Home V2+V3, Pricing V3 (Freemium Capture), How It Works, Win Wall, PublicNavbar
- Jasper→Archer rename complete, 5 SVG logos

### Cinematic Analysis — ALL 8 SCENES IMPLEMENTED (2026-04-13)
**Backend SSE:**
- `analyze_document_stream()` async generator with 8 SSE events
- `GET /api/analyze/stream` with asyncio.Queue (background task pattern)
- PASS2 prompts updated with `level` + `tagline`
- Upload supports `streaming=true`, duplicate stream protection, `already_complete` fast path

**Frontend — 8 Scenes:**
- Scene 00: Opening — Archer avatar, document icon, "EN LIGNE" pulse
- Scene 01: Reading — PDF mockup, facts with staggered animations
- Scene 02: Verification — Live jurisprudence counter (2475), VÉRIFIÉ/EN COURS states
- Scene 03: Verdict — Halo radial, 4 sub-scores with color coding, huge score (200px), risk pill, tagline
- Scene 04: Findings — Sequential reveal (2s per finding), red→green emotional arc
- Scene 05: Battle — 2-column layout, ARCHER vs PARQUET, animated score, verdict
- Scene 06: Strategy — 3-step roadmap, prediction bars, "LA PHRASE D'ARCHER" with animated 80%
- Scene 07: Landing — Dashboard summary with CTAs (Attorney Letter, DIY, Ask Archer)

**Supporting files:**
- `cinematic.json` (EN+FR complete, ES/NL partial)
- `pricing.js` (US/BE pricing config)
- `useUiLanguage.js` hook
- `useAnalysisStream.js` (hybrid SSE trigger + polling)

## Prioritized Backlog
### P0 (Next)
- James → Archer rename (user approved — PRIORITY 2)
### P1
- Attorney Letter Modal Part 2 — Stripe Payment (user approved — PRIORITY 3)
- Reduce Cyclomatic Complexity (server.py)
- Re-enable React StrictMode for production
### P1 Upcoming
- Mobile Document Scanner, HelloSign, Stripe Connect, Deadline Alerts
### P2
- Full translation verification, server.py modularization
- Refactor landing "Pillars" section

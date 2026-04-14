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
- Archer AI Clarification Q&A flow
- Score History Chart, Attorney Letter Modal (Part 1)
- Case Delete, Performance Optimizations, Code Quality
- **Marketing Pages**: Home V2+V3, Pricing V3 (Freemium Capture), How It Works, Win Wall, PublicNavbar
- **Rebranding Complete**: Archer→Archer rename done in ALL frontend pages + backend prompts + SVG logos

### Cinematic Analysis — ALL 8 SCENES IMPLEMENTED
**Backend SSE:**
- `analyze_document_stream()` async generator with 8 SSE events
- `GET /api/analyze/stream` with asyncio.Queue (background task)
- PASS2 prompts updated with `level` + `tagline`
- Upload supports `streaming=true`, duplicate stream protection, `already_complete` fast path

**Frontend — 8 Scenes (00-07):**
- Scene 00: Opening (Archer avatar 120px, document 140x180, "EN LIGNE")
- Scene 01: Reading (PDF 280x360, facts with staggered animations)
- Scene 02: Verification (counter 72px, verified/in-progress states)
- Scene 03: Verdict (halo radial, 4 sub-scores, 200px score, risk pill, tagline)
- Scene 04: Findings (sequential reveal 2s/finding, red→green arc)
- Scene 05: Battle (ARCHER vs PARQUET, 2 columns, verdict)
- Scene 06: Strategy (3-step roadmap, prediction bars, "LA PHRASE D'ARCHER")
- Scene 07: Landing (dashboard summary with CTAs)

### Bug Fixes (2026-04-13)
- BUG 1: Upload now redirects immediately to `/analyze/:caseId` (no fake delays)
- BUG 2: Already-analyzed cases redirect to `/cases/:caseId` via useEffect
- BUG 3: Scene elements enlarged 40-50% for immersive fullscreen feel
- BUG 4: Archer → Archer rename complete (Dashboard, CaseDetail, Chat, Backend prompts, Avatars J→A)
- BUG 5: "Made with Emergent" badge hidden

## Prioritized Backlog
### P0 (Immediate)
- Verify cinematic scene progression for new cases end-to-end
### P1
- Attorney Letter Modal Part 2 — Stripe Payment
- Re-enable React StrictMode for production
### P1 Upcoming
- Mobile Document Scanner, HelloSign, Stripe Connect, Deadline Alerts
### P2
- Full translation verification, server.py modularization

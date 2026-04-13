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
- **Marketing Pages**: Home V2+V3, Pricing V3 (Freemium Capture), How It Works, Win Wall, PublicNavbar
- Jasper→Archer rename complete, 5 SVG logos

### Cinematic Analysis (Sprint 0-3) — IMPLEMENTED 2026-04-13
- **Sprint 0**: i18n `cinematic.json` (EN+FR complete, ES/NL partial), pricing config, useUiLanguage hook
- **Sprint 1 — Backend SSE**:
  - `analyze_document_stream()` async generator (parallel reimplementation, reuses all shared helpers)
  - `GET /api/analyze/stream` SSE endpoint with asyncio.Queue (background task pattern)
  - PASS2_PROMPT + BE_PASS2_PROMPT updated with `level` and `tagline` fields
  - Upload endpoint supports `streaming=true` parameter (skips background analysis)
  - Duplicate stream protection via `stream_active` MongoDB flag
  - `already_complete` fast path for re-visits
- **Sprint 2 — Frontend Skeleton**:
  - `useAnalysisStream` hook with polling fallback (triggers SSE, polls case for completion, emits events with cinematic timing)
  - `CinematicAnalysis.jsx` root component with progress bar, scene indicator, error/complete states
  - Route `/analyze/:caseId` added to App.js
  - Upload page redirects to `/analyze/:caseId` when streaming
- **Sprint 3 — Scenes 00, 01, 02**:
  - Scene00_Opening: Archer avatar, document icon, dashed line, "EN LIGNE" pulse, subtitle
  - Scene01_Reading: PDF mockup with highlighted lines, facts list with staggered fadeUp animations
  - Scene02_Verification: Live badge, animated counter (2475), verification items with VÉRIFIÉ/EN COURS states
  - Scenes 03-07: Placeholder components showing received SSE data

## Key Architecture Decisions
- `analyze_document_advanced()` remains UNTOUCHED — streaming is a parallel reimplementation
- Backend uses `asyncio.Queue` pattern: background task pushes events, SSE reads from queue
- Analysis always completes even if client disconnects
- Frontend uses hybrid SSE trigger + polling pattern for maximum compatibility with proxies

## Prioritized Backlog
### P0
- Scenes 03-07 implementation (Score reveal, Findings, Battle, Strategy, Dashboard landing)
- James → Archer rename (waiting for user approval)
### P1
- Attorney Letter Modal Part 2 — Stripe Payment
- Reduce Cyclomatic Complexity Python
- Component splitting (Dashboard.js, CaseDetail.js)
### P1 Upcoming
- Mobile Document Scanner, HelloSign, Stripe Connect, Deadline Alerts
### P2
- Full translation verification, server.py modularization

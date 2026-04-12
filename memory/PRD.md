# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform for US and Belgium consumers.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, Recharts/SVG, DOMPurify
- **Backend**: FastAPI (Python), modular structure:
  - `server.py` — Main app, analysis logic, routes (~5100 lines)
  - `db.py`, `models.py`, `auth.py`, `storage.py` — Shared modules
  - `routes/auth_routes.py`, `routes/attorney_routes.py` — Extracted routers
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth

## Completed Features
- Full Dashboard + Case Detail pages with AI analysis pipeline (5-pass Claude)
- Document upload & library, Attorney onboarding portal
- Jurisdiction (USA/BE) & Language switching (EN/FR)
- James Clarification Q&A flow with optimistic UI
- Enhanced AI Findings: Title, Law, Impact, Do Now, Risk
- Next Actions consolidated design, Case Stage Detection
- Attorney Letter Modal (Part 1 - UI free/paid options)
- Global Letter Tone Distinction (Citizen vs Attorney)
- Case Delete feature
- Performance: Parallel Claude Passes, Analysis Caching
- Code quality: XSS (DOMPurify), hook deps, array keys
- Server.py modularization Phase 1
- **Score History Chart redesign** (ScoreHistoryChart.js component — Apr 12 2026)
  - 100% width, auto-scaling Y-axis, Bézier curves, timestamp labels, color-coded dots, dashed gridlines
  - Integrated in both Dashboard.js and CaseDetail.js

## Prioritized Backlog

### P1: In-Progress Features
- Attorney Letter Modal Part 2 — Stripe Payment integration (UI done, needs Stripe keys)
- Reduce Cyclomatic Complexity of Python functions (server.py)
- Component splitting for Dashboard.js (~1000 lines) and CaseDetail.js (~750 lines)

### P1: Upcoming Features
- Mobile Document Scanner (Camera integration)
- HelloSign / Dropbox Sign Integration (needs API keys)
- Stripe Connect for Attorney Payouts
- Deadline Alerts via SMS + Email (Twilio/SendGrid — needs API keys)

### P2: Polish & Future
- Streaming Claude responses (SSE)
- Full UI translation verification
- Further server.py modularization (target < 2000 lines)
- Python type hints throughout backend

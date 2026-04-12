# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform for US and Belgium consumers. Features include AI-powered document analysis (5-pass Claude pipeline), Virtual Legal Office dashboard, jurisdiction/language switching, attorney marketplace, and document library.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, Recharts, DOMPurify
- **Backend**: FastAPI (Python), modular structure:
  - `server.py` — Main app, analysis logic, case/document/letter/chat/library routes (~5161 lines)
  - `db.py` — MongoDB connection
  - `models.py` — Pydantic models (252 lines)
  - `auth.py` — Auth helpers (72 lines)
  - `storage.py` — Object storage (52 lines)
  - `routes/auth_routes.py` — Auth & Profile endpoints (161 lines)
  - `routes/attorney_routes.py` — Attorney portal + Admin (836 lines)
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth, Stripe, Daily.co

## What's Been Implemented

### Server.py Modularization (Apr 12 2026) — LATEST
- Extracted shared modules: db.py, models.py, auth.py, storage.py
- Extracted auth/profile routes into routes/auth_routes.py
- Extracted attorney portal (800+ lines) into routes/attorney_routes.py
- server.py reduced from 6512 to 5161 lines (21% reduction)

### Code Quality Report — COMPLETE (Apr 12 2026)
1. XSS Prevention: DOMPurify + safePrintContent()
2. Empty Catch Blocks: Error logging added
3. React Hook Dependencies: Fixed stale closures
4. Insecure localStorage: Input validation + logging
5. Array Index Keys: ALL `key={i}` replaced with stable keys
6. Backend Complexity: 10 helper functions extracted
7. Fixed Upload.js crash

### Previous Features
- Dashboard & Case Detail 12-feature parity, polling, James question two-step
- Next Actions, Letter Generation Auto-fill Modal
- Jurisdiction (USA/BE) & Language (EN/FR/NL/DE/ES) switching
- Attorney Onboarding & Admin Approval, Document Library (158 templates)
- 6 Global Claude Prompt fixes, Score History Graph

## Prioritized Backlog

### P0: Continue server.py modularization
Extract remaining route groups into routes/:
- `routes/cases.py` — Case CRUD, events, brief (~300 lines)
- `routes/documents.py` — Upload, text extraction (~500 lines)
- `routes/letters.py` — Letter generation (~200 lines)
- `routes/chat.py` — LegalChat (~200 lines)
- `routes/library.py` — Document Library + James Creator (~300 lines)
- `routes/lawyers.py` — Lawyer directory, booking (~200 lines)
- Move analysis logic to `analysis/` package

### P1: Integration Features
- Mobile Document Scanner (Camera integration)
- HelloSign / Dropbox Sign API Integration
- Stripe Connect for Attorney Payouts

### P1: Communication Features
- Deadline Alerts via SMS + Email (Twilio/SendGrid)

### P2: Polish
- Full UI translation verification
- Component splitting (Dashboard, CaseDetail)
- Python type hints
- Multi-country expansion

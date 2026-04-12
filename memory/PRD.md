# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform for US and Belgium consumers. Features include AI-powered document analysis (5-pass Claude pipeline), Virtual Legal Office dashboard, jurisdiction/language switching, attorney marketplace, and document library.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, Recharts, DOMPurify
- **Backend**: FastAPI (Python), single `server.py` monolith (6600+ lines)
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth, Stripe, Daily.co

## What's Been Implemented

### Code Quality Refactoring (Apr 12 2026) — LATEST
1. **XSS Prevention**: Implemented DOMPurify utility (`sanitize.js`) across all `dangerouslySetInnerHTML` usages
2. **Empty Catch Blocks**: Added error logging to all empty catch blocks
3. **React Hook Dependencies**: Fixed `fetchCases` useCallback in Dashboard.js (removed stale `selectedId` dep, used functional state update)
4. **Insecure localStorage**: Added type validation and error logging to `getStoredLocale`/`setStoredLocale` and `hasSeenOnboarding`/`markOnboardingSeen`
5. **Array Index Keys**: Replaced `key={i}` with stable content-based keys across Dashboard.js (13+), Upload.js (7+), Settings.js (3), DocumentLibrary.js (2)
6. **High Complexity Python Functions**: Extracted 7 helper functions from `server.py`, reducing cyclomatic complexity of `analyze_document_advanced` (~220→65 lines), `run_multi_doc_analysis_advanced` (~130→60 lines), `analyze_contract_guard` (~60→30 lines)
7. **Fixed stray `ad;`** at end of Upload.js that crashed the entire frontend

### 6 Global Claude Prompt Fixes (Apr 12 2026)
1. James Clarification: 1 question with 2-4 buttons per analysis, retry logic, fallback default
2. Battle Preview: Pass 4A MUST produce 4-5 user arguments, auto-retry if < 3
3. Outcome Predictor: Values clamped 2-95%, sum=100%, risk-based fallback
4. Next Actions: Must reference specific laws/statutes
5. Language: 100% enforcement ("ZERO English words" for non-EN)
6. Score History: Y-axis 0-100 with gridlines, X-axis with dates

### Previous Features
- Dashboard & Case Detail 12-feature parity
- In-Case Document Upload Modal with 2-second real-time polling
- James Clarification Two-Step (Max 1 Question -> Slide-in LegalChat drawer)
- Next Actions Redesign & Letter Generation Auto-fill Modal
- Jurisdiction (USA/BE) & Language (EN/FR/NL/DE/ES) Global State Switcher
- Attorney Onboarding Flow & Admin Approval Dashboard
- Document Library (158 templates, Browse vs Generate modes)
- Score History Graph Axes & global font size increment

## Prioritized Backlog

### P0: Refactor server.py into modular FastAPI routers
Break the 6600+ line monolith into:
- `routes/auth.py`, `routes/cases.py`, `routes/analysis.py`, `routes/documents.py`, `routes/attorneys.py`, etc.

### P1: Integration Features
- Mobile Document Scanner (Camera integration for Uploads)
- HelloSign / Dropbox Sign API Integration (requires user API keys)
- Stripe Connect for Attorney Payouts

### P1: Communication Features
- Deadline Alerts via SMS + Email (Twilio/SendGrid, requires user API keys)

### P2: Polish
- Full UI translation verification across all flows
- Multi-country expansion beyond US/BE

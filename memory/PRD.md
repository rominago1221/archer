# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform for US and Belgium consumers. Features include AI-powered document analysis (5-pass Claude pipeline), Virtual Legal Office dashboard, jurisdiction/language switching, attorney marketplace, and document library.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, Recharts, DOMPurify
- **Backend**: FastAPI (Python), single `server.py` monolith (~6500 lines, partially refactored with helpers)
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth, Stripe, Daily.co

## What's Been Implemented

### Code Quality Report — COMPLETE (Apr 12 2026) — LATEST
All items from the Code Quality Report have been addressed:
1. **XSS Prevention**: DOMPurify utility (`sanitize.js`) for all `dangerouslySetInnerHTML`; `safePrintContent()` replaces `document.write`
2. **Empty Catch Blocks**: Error logging added to all empty catch blocks across frontend
3. **React Hook Dependencies**: Fixed stale closures in Dashboard.js `fetchCases` (functional state update, removed `selectedId` dep)
4. **Insecure localStorage**: Input validation + error logging in `landingTranslations.js` and `JurisdictionOnboarding.js`
5. **Array Index Keys**: Replaced ALL `key={i}` with stable content-based keys across: Dashboard.js, Upload.js, Settings.js, DocumentLibrary.js, CaseDetail.js, LegalChat.js, Landing.js, LetterFormModal.js, NextActionsPanel.js, CaseChatDrawer.js
6. **High Complexity Python Functions**: Extracted 10 helper functions from `server.py`:
   - US analysis: `_build_realtime_law_context`, `_build_case_law_for_frontend`, `_validate_james_question`, `_validate_user_arguments`, `_validate_success_probability`, `_build_standard_analysis_result`, `_ensure_contract_guard_fields`
   - Belgian analysis: `_build_belgian_analysis_result`, `BE_DOC_TYPE_TO_CASE`
   - Auth: `_create_session_response` (shared register/login)
7. **Fixed stray `ad;`** at end of Upload.js (was crashing the entire app)

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
Break the ~6500 line monolith into: `routes/auth.py`, `routes/cases.py`, `routes/analysis.py`, `routes/documents.py`, `routes/attorneys.py`, etc.

### P1: Integration Features
- Mobile Document Scanner (Camera integration for Uploads)
- HelloSign / Dropbox Sign API Integration (requires user API keys)
- Stripe Connect for Attorney Payouts

### P1: Communication Features
- Deadline Alerts via SMS + Email (Twilio/SendGrid, requires user API keys)

### P2: Polish
- Full UI translation verification across all flows
- Component splitting (Dashboard 735 lines, CaseDetail 579 lines)
- Python type hints (currently 3% coverage)
- Multi-country expansion beyond US/BE

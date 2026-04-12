# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform for US and Belgium consumers.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, Recharts, DOMPurify
- **Backend**: FastAPI (Python), modular structure:
  - `server.py` — Main app, analysis logic, routes (~5300 lines)
  - `db.py`, `models.py`, `auth.py`, `storage.py` — Shared modules
  - `routes/auth_routes.py`, `routes/attorney_routes.py` — Extracted routers
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth

## Latest Changes

### Performance Optimizations (Apr 12 2026) — LATEST
1. **Parallel Analysis Passes**: Pass 3 + 4A + 4B run via `asyncio.gather` (~60% faster)
2. **Removed stagger delays**: Eliminated all `asyncio.sleep(2)` between passes
3. **Analysis caching**: Document hash → MongoDB cache (24h expiry)
4. **Reduced max_tokens**: Pass 2: 2000 (was 3000), Pass 3: 1500 (was 2500), 4A/4B: 800 (was 1500)
5. **Fast call function**: `call_claude_fast` with fewer retries + lower tokens for james-answer, letters
6. **Optimistic UI**: Instant loading spinner in analysis section when answer processing

### Enhanced Findings Format (Apr 12 2026)
Every finding now has 5 elements: title, impact_description (plain language), legal_ref, do_now (action), risk_if_ignored

### Previous
- Chat drawer: James speaks first, clarification flow with impact + chat link
- Code quality: XSS, hooks, keys, complexity all fixed
- Server.py modularization Phase 1 complete
- Full feature set: Dashboard, Case Detail, Document Library, Attorney Portal, etc.

## Prioritized Backlog

### P0: Continue server.py modularization
Extract cases, documents, letters, chat, library routes

### P1: Features
- Mobile Document Scanner
- HelloSign / Dropbox Sign Integration
- Stripe Connect for Attorney Payouts
- Deadline Alerts (Twilio/SendGrid)

### P2: Polish
- Component splitting, Python type hints
- Full UI translation verification
- Streaming Claude responses (SSE)

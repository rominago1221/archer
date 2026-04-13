# Archer - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Archer" — a legal tech AI platform for US and Belgium consumers. Law firm in your pocket.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, SVG charts, DOMPurify
- **Backend**: FastAPI (Python), modular structure:
  - `server.py` — Main app, analysis logic, routes (~5100 lines)
  - `db.py`, `models.py`, `auth.py`, `storage.py` — Shared modules
  - `routes/auth_routes.py`, `routes/attorney_routes.py` — Extracted routers
- **Database**: MongoDB
- **Integrations**: Emergent Universal LLM Key (Claude-sonnet-4-20250514), Emergent Google Auth
- **Brand**: Archer (renamed from Jasper, Apr 13 2026)

## Logo Files
- `/public/logos/archer-logo-full-color.svg` — Blue wordmark + tagline (login, signup, footer)
- `/public/logos/archer-logo-wordmark.svg` — Blue wordmark only (navbar, sidebar, dashboard)
- `/public/logos/archer-logo-mono-black.svg` — Black version (attorney letter, print)
- `/public/logos/archer-logo-mono-white.svg` — White version (dark backgrounds)
- `/public/logos/archer-favicon.svg` — Blue square with white "A" (browser tab)

## Completed Features
- Full Dashboard + Case Detail with 5-pass Claude analysis pipeline
- Document upload & library, Attorney onboarding portal
- Jurisdiction (USA/BE) & Language switching (EN/FR)
- James AI Clarification Q&A flow (James character rename pending)
- Enhanced AI Findings, Next Actions, Case Stage Detection
- Attorney Letter Modal (Part 1), Global Letter Tone Distinction
- Case Delete, Performance Optimizations, Code Quality Fixes
- Score History Chart (ResizeObserver, HTML tooltip, fixed height)
- **Pricing Page** — `/pricing`, `/en/pricing`, `/fr/pricing` with 7 sections
- **Win Wall** — `/winning-cases` with 3 versions (US/$, BE-EN/€, BE-FR/€)
- **PublicNavbar** — Shared navbar for Pricing + Winning Cases pages
- **Jasper → Archer rename** (Apr 13 2026) — All UI, prompts, emails, meta tags
- **Archer SVG logos** integrated: navbar, footer, login, signup, sidebar, dashboard, favicon

## Prioritized Backlog

### P0: Pending
- James → Archer rename (remove James character, apply neutral Archer voice)

### P1: In-Progress
- Attorney Letter Modal Part 2 — Stripe Payment integration
- Reduce Cyclomatic Complexity of Python functions
- Component splitting (Dashboard.js, CaseDetail.js)

### P1: Upcoming
- Mobile Document Scanner, HelloSign, Stripe Connect, Deadline Alerts

### P2: Polish
- Streaming SSE, Full translation verification, server.py modularization

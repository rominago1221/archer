# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Features a Virtual Legal Cabinet Dashboard, Attorney Portal, and James Document Creator.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Layout is 100% identical for all countries — only text and applicable law change.

## What's Been Implemented

### Dashboard 12-Feature Parity with CaseDetail (Apr 11 2026) — LATEST
All 12 features from CaseDetail now also present on Dashboard:
1. Download Brief + Share buttons in top bar
2. Score History Graph (SVG)
3. Horizontal Battle Preview (both user + opposing arguments)
4. James Question Card with interactive clickable answer buttons
5. Recent Jurisprudence (case law from CourtListener)
6. Outcome Predictor percentages (correct key mapping)
7. Risk Monitor / Inbox connection (Gmail + Outlook)
8. Next Actions with "Generate letter →" / "Book a call →"
9. Letter Generation Modal (AI-powered via Claude)
10. Share Modal (secure link generation)
11. PDF Brief download (jsPDF)
12. New Case Overlay (8 situation cards in EN/FR/NL)

### UX Fixes (Apr 11 2026)
- After login → most recent case auto-selected (sorted by created_at)
- Empty state: James avatar + "Welcome" text + blue button (no clipboard icon)
- Logo click → / on all pages
- "My Dashboard" button on landing when logged in

### Case Detail Page 12-Point Redesign (Apr 11 2026)
All 12 features implemented and tested.

### Upload Flow, Claude API, CourtListener, Virtual Legal Cabinet Dashboard
All fully functional (see previous entries).

### Integrations
- Emergent LlmChat (claude-sonnet-4-20250514)
- Emergent Google OAuth, Object Storage
- Daily.co Video Calls, Stripe Checkout
- CourtListener API

## Prioritized Backlog

### P0 (Critical)
- [ ] Refactor server.py (6300+ lines -> modular routers)

### P1 (High)
- [ ] Deadline Alerts via SMS + Email (Twilio/SendGrid)
- [ ] HelloSign / Dropbox Sign (e-signature)
- [ ] Mobile Document Scanner
- [ ] Stripe Connect OAuth for attorney payouts

### P2-P3 (Medium/Future)
- [ ] Email notifications (SendGrid/Resend)
- [ ] Full UI translation for all pages
- [ ] Multi-Country expansion
- [ ] Post-call client rating, Attorney admin panel

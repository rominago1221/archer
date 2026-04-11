# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Features a Virtual Legal Cabinet Dashboard, Attorney Portal, and James Document Creator.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Layout is 100% identical for all countries — only text and applicable law change.

## What's Been Implemented

### Case Detail Page 12-Point Redesign (Apr 11 2026) — LATEST
All 12 features implemented and tested (100% pass rate):
1. Navigation Breadcrumbs ("My Cases" back button)
2. Actionable Next Action buttons (right panel with "Generate letter" / "Book a call")
3. Horizontal Battle Preview (green/red columns with arguments)
4. James Question Card with clickable answer buttons
5. Case-specific Jurisprudence (CourtListener filtered results)
6. Risk Monitor/Inbox connection UI (Gmail/Outlook buttons)
7. Score History Graph (SVG-based)
8. Outcome Predictor percentages (mapped to actual AI data)
9. Case Sharing modal (secure link generation)
10. PDF Case Brief download (jsPDF)
11. Complete James sidebar card (stats: 847K+, 20 yrs, Live, #1)
12. "Open a new case" multi-language overlay (8 situation cards in EN/FR/NL)

Key fixes applied:
- Added `james_question` field to Case Pydantic model
- Fixed opposing arguments key path (`opposing_side.opposing_arguments`)
- Fixed Outcome Predictor key mapping (`full_resolution_in_favor`, `negotiated_settlement`, `partial_loss`, `full_loss`)

### Upload Flow Fix (Apr 11 2026)
- Background analysis: Upload returns instantly with case_id. 5-pass Claude analysis runs via `asyncio.create_task`.
- Instant case creation: Case document created in MongoDB immediately with `status: "analyzing"`.
- Auto-redirect: Frontend navigates to /dashboard after upload.
- Dashboard polling: Auto-polls every 5 seconds when any case has "analyzing" status.

### Claude API + CourtListener Fix (Apr 11 2026)
- Switched to Emergent LlmChat integration (no more 429 rate limiting).
- CourtListener filtered by case type AND jurisdiction/state.

### Virtual Legal Cabinet Dashboard (Apr 11 2026)
- 3-column layout: Left sidebar (260px) + Main area + Right panel (240px)
- Full EN/FR/NL translations
- New Case Overlay with 8 situation cards

### Attorney Portal, James Document Creator, Core Features
- All fully functional.

### Integrations
- Emergent LlmChat (claude-sonnet-4-20250514)
- Emergent Google OAuth, Object Storage
- Daily.co Video Calls, Stripe Checkout
- CourtListener API

## Prioritized Backlog

### P0 (Critical)
- [ ] Refactor server.py (6300+ lines -> modular routers: routes/auth.py, routes/cases.py, routes/analysis.py, etc.)

### P1 (High)
- [ ] Deadline Alerts via SMS + Email (Twilio/SendGrid) — user will provide keys separately
- [ ] HelloSign / Dropbox Sign (e-signature) — user will provide keys separately
- [ ] Mobile Document Scanner (Camera integration for Uploads)
- [ ] Stripe Connect OAuth for attorney payouts

### P2-P3 (Medium/Future)
- [ ] Email notifications (SendGrid/Resend)
- [ ] Full UI translation for all pages
- [ ] Multi-Country expansion
- [ ] Post-call client rating, Attorney admin panel

# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Features a Virtual Legal Cabinet Dashboard, Attorney Portal, and James Document Creator.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Layout is 100% identical for all countries — only text and applicable law change.

## What's Been Implemented

### Upload Flow Fix (Apr 11 2026) — LATEST
- **Background analysis**: Upload returns instantly with case_id. 5-pass Claude analysis runs via `asyncio.create_task`.
- **Instant case creation**: Case document created in MongoDB immediately with `status: "analyzing"`.
- **Auto-redirect**: Frontend navigates to /dashboard after upload (not staying on upload page).
- **Dashboard polling**: Auto-polls every 5 seconds when any case has "analyzing" status. Shows animated "James is analyzing..." state.
- **_build_case_update helper**: Centralized function for updating case fields from analysis results.

### Claude API + CourtListener Fix (Apr 11 2026)
- Switched to Emergent LlmChat integration (no more 429 rate limiting).
- CourtListener filtered by case type AND jurisdiction/state.
- Default analysis: 0/0/0/0 (not fake 50/50/50/50).

### Virtual Legal Cabinet Dashboard (Apr 11 2026)
- 3-column layout: Left sidebar (260px) + Main area + Right panel (240px)
- Full EN/FR/NL translations
- New Case Overlay with 8 situation cards

### Attorney Portal, James Document Creator, Core Features
- See previous entries — all fully functional.

### Integrations
- Emergent LlmChat (claude-4-sonnet-20250514)
- Emergent Google OAuth, Object Storage
- Daily.co Video Calls, Stripe Checkout
- CourtListener API

## Prioritized Backlog

### P0 (Critical)
- [ ] Refactor server.py (6200+ lines -> modular routers)

### P1 (High)
- [ ] Stripe Connect OAuth for attorney payouts
- [ ] HelloSign / Dropbox Sign (e-signature)
- [ ] Email notifications (SendGrid/Resend)
- [ ] Mobile Document Scanner

### P2-P3 (Medium/Future)
- [ ] Deadline Alerts (SMS/Email)
- [ ] Full UI translation for all pages
- [ ] Multi-Country expansion
- [ ] Post-call client rating, Attorney admin panel

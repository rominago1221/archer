# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Features a Virtual Legal Cabinet Dashboard, Attorney Portal, and James Document Creator.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Layout is 100% identical for all countries — only text and applicable law change.

## What's Been Implemented

### 4 UX Fixes (Apr 11 2026) — LATEST
1. **After login → correct dashboard**: Redirects to /dashboard with most recent case auto-selected (sorted by created_at, not risk_score). No more blank "No active case selected" page.
2. **Empty state redesign**: New users with no cases see James avatar (blue circle + green dot), "Welcome. What's your legal situation?" + big blue "Open a new case" button. Replaced clipboard icon + gray text.
3. **Logo click → home**: Clicking "Jasper" logo navigates to `/` on Dashboard, CaseDetail, Sidebar, and Landing page.
4. **My Dashboard button**: When logged in, landing page top-right shows "My Dashboard" button (replaces "Sign in" / "Get started").

### Case Detail Page 12-Point Redesign (Apr 11 2026)
All 12 features implemented and tested (100% pass rate):
1. Navigation Breadcrumbs
2. Actionable Next Action buttons (letter generation)
3. Horizontal Battle Preview
4. James Question Card with clickable answers
5. Case-specific Jurisprudence
6. Risk Monitor/Inbox connection
7. Score History Graph
8. Outcome Predictor percentages
9. Case Sharing modal
10. PDF Case Brief download
11. Complete James sidebar card
12. "Open a new case" multi-language overlay (8 cards in EN/FR/NL)

### Upload Flow Fix (Apr 11 2026)
- Background analysis, instant case creation, auto-redirect, dashboard polling.

### Claude API + CourtListener Fix (Apr 11 2026)
- Emergent LlmChat integration, CourtListener filtered by case type AND jurisdiction.

### Virtual Legal Cabinet Dashboard (Apr 11 2026)
- 3-column layout with full EN/FR/NL translations.

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

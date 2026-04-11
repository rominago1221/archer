# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.

## What's Been Implemented

### James Clarification Two-Step (Apr 11 2026) — LATEST
- STEP 1: James Question Card shows max 1 question with 2-3 clickable buttons
- Below buttons: "James has more questions — ask him directly →" link (EN/FR/NL)
- STEP 2: Link opens CaseChatDrawer (400px slide-in from right)
- Chat pre-loaded with full case context, James continues naturally
- User never leaves the case page
- Backend chat migrated from httpx to emergentintegrations (no more 429 errors)

### In-Case Document Upload Modal (Apr 11 2026)
- AddDocumentModal: drag & drop (PDF/Word/JPEG, 20MB), context textarea, trilingual

### Dashboard 12-Feature Parity (Apr 11 2026)
- All features: Brief, Share, Score History, Battle Preview, James Q&A, Jurisprudence, Outcome Predictor, Risk Monitor, Letter/Share Modals, New Case Overlay

### UX Fixes (Apr 11 2026)
- Post-login auto-select, James welcome empty state, logo → home, My Dashboard button

### Integrations
- Emergent LlmChat (claude-sonnet-4-20250514), Google OAuth, Object Storage
- Daily.co, Stripe, CourtListener

## Prioritized Backlog

### P0
- [ ] Refactor server.py (6300+ lines → modular routers)

### P1
- [ ] Deadline Alerts (Twilio/SendGrid) — awaiting keys
- [ ] HelloSign / Dropbox Sign — awaiting keys
- [ ] Mobile Document Scanner
- [ ] Stripe Connect for attorney payouts

### P2-P3
- [ ] Email notifications, Full UI translation, Multi-country expansion

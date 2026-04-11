# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Features a Virtual Legal Cabinet Dashboard, Attorney Portal, and James Document Creator.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Layout is 100% identical for all countries — only text and applicable law change.

## What's Been Implemented

### Critical Bug Fixes (Apr 11 2026) — LATEST
- **Claude API**: Switched from direct httpx calls to Emergent LlmChat integration (`emergentintegrations.llm.chat`). No more 429 rate limiting. Uses `claude-4-sonnet-20250514` model.
- **CourtListener filtering**: Now filters by case type AND jurisdiction/state. Returns empty for unknown types (no more random unrelated cases).
- **Default analysis**: Changed from fake 50/50/50/50 to 0/0/0/0 with clear "analysis failed" messaging.
- **Re-analyze endpoint**: `POST /api/cases/{case_id}/reanalyze` to retry analysis.
- **Battle preview**: Dashboard now accesses `user_side.strongest_arguments` correctly.
- Tested: 13/13 backend + all frontend features pass (iteration_25.json)

### Virtual Legal Cabinet Dashboard (Apr 11 2026)
- **3-column layout**: Left sidebar (260px) + Main area (1fr) + Right panel (240px)
- **Left sidebar**: Jasper logo, James AI card, navigation links, active cases list, "Open a new case" button, sign out
- **Center**: James banner with credential pills, case view with risk score (4 dimensions), AI findings with statute citations, question card
- **Right panel**: Critical deadline card, numbered next actions, documents, Battle Preview
- **New Case Overlay**: 8 situation cards in EN/FR/NL
- **Language system**: Full EN/FR/NL translations
- Tested: 41/41 features pass (iteration_24.json)

### Attorney Portal (Apr 11 2026)
- Dual Login, 7-step onboarding, Attorney Dashboard, Daily.co Video, Stripe Connect routing

### James Document Creator (Apr 11 2026)
- Conversational document generation via chat interface

### Core Features
- Document upload & 5-pass AI analysis (PDF, DOCX, TXT, EML, images)
- Claude Vision OCR, Risk Score + History Graph
- Battle Preview, Outcome Predictor, Response Letters
- Case Sharing, Contract Guard, Document Library, Legal Chat

### Integrations
- Emergent Google OAuth, Object Storage
- **Emergent LlmChat** (claude-4-sonnet-20250514) — via `emergentintegrations.llm.chat`
- Daily.co Video Calls
- Stripe Checkout
- CourtListener API (filtered by jurisdiction + case type)

## Prioritized Backlog

### P0 (Critical)
- [ ] Refactor server.py (6200+ lines -> modular routers)

### P1 (High)
- [ ] Stripe Connect OAuth for attorney payouts
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key
- [ ] Email notifications (SendGrid/Resend) — needs API keys
- [ ] Mobile Document Scanner (Camera)

### P2 (Medium)
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys
- [ ] Full UI translation for all pages (FR/NL/DE/ES)

### P3 (Future)
- [ ] Multi-Country expansion, Post-call client rating, Attorney admin panel

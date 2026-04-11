# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Jurisdiction and language are **independent**: a Belgian user can use the app in English (Belgian law still applies).

## What's Been Implemented

### Jurisdiction Switching + Back Button (Apr 11 2026) — LATEST
- **Jurisdiction pills**: 🇺🇸 United States / 🇧🇪 Belgium — always visible center-top on Dashboard, CaseDetail, and Landing pages
- Active pill: dark background (#0a0a0f), white text. Inactive: transparent, gray text
- Instant switch: updates user profile (DB + session), reloads sidebar cases filtered by jurisdiction
- Backend `GET /api/cases` filters by `user.jurisdiction` with `$or` backward compat for legacy cases
- CaseDetail → switching jurisdiction redirects to /dashboard
- **Back button**: "← Back" top-left on every page using `window.history.back()`

### Next Actions Redesign + Letter Form Modal (Apr 11 2026)
- 3 action types: TYPE A (letter/blue), TYPE B (call/purple), TYPE C (passive/gray)
- LetterFormModal with pre-filled fields, letter generation, PDF download, HelloSign, Edit with James

### Real-Time Post-Upload UI Update (Apr 11 2026)
- 2s polling, re-analyzing banner, toast notification

### James Clarification Two-Step (Apr 11 2026)
- Max 1 question + "ask directly" chat drawer

### In-Case Document Upload Modal (Apr 11 2026)
- AddDocumentModal with drag & drop, context field

### Integrations
- Emergent LlmChat, Google OAuth, Object Storage, Daily.co, Stripe, CourtListener

## Prioritized Backlog

### P0
- [ ] Refactor server.py (6400+ lines → modular routers)

### P1
- [ ] Deadline Alerts (Twilio/SendGrid)
- [ ] HelloSign / Dropbox Sign
- [ ] Mobile Document Scanner

### P2-P3
- [ ] Stripe Connect, Email notifications, Full UI translation, Multi-country expansion

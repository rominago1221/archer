# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Jurisdiction and language are independent.

## What's Been Implemented

### Jurisdiction Onboarding (Apr 11 2026) — LATEST
- 2-step educational overlay on first jurisdiction switch
- Step 1: "Welcome to [X] Law" — 3 cards (Housing, Employment, Debt differences)
- Step 2: "How James adapts" — 3 cards (Legal references, Languages, Court systems)
- Content in EN/FR/NL for both US and Belgium
- localStorage tracks seen state — shows only once per jurisdiction

### Jurisdiction Switching + Back Button (Apr 11 2026)
- 🇺🇸/🇧🇪 pills always visible, backend filters cases by jurisdiction

### Next Actions Redesign + Letter Form Modal (Apr 11 2026)
- 3 action types (letter/call/passive) + LetterFormModal with pre-fill

### Real-Time Post-Upload + James Clarification + In-Case Upload (Apr 11 2026)
- 2s polling, re-analyzing banner, toast, James chat drawer, AddDocumentModal

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

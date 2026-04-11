# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl): Determines UI language ONLY.
- **Account Type** (client or attorney): Determines dashboard and routing.

## What's Been Implemented

### Next Actions Redesign + Letter Form Modal (Apr 11 2026) — LATEST
- **3 action types**: TYPE A (letter - blue envelope, "Generate letter →"), TYPE B (call - purple phone, "Book a call →"), TYPE C (passive - gray clock, no click)
- Full-width action cards: priority badge, icon, title (13px), description, separator lines
- **LetterFormModal**: 6 pre-filled form fields (name from profile, address, recipient, date, amount) + personal note (200 chars)
- After generation: letter preview + Download PDF + Send via HelloSign + "Edit with James →" (opens chat drawer)
- Reusable NextActionsPanel + LetterFormModal components used on both Dashboard and CaseDetail

### Real-Time Post-Upload UI Update (Apr 11 2026)
- 2s polling, re-analyzing banner, toast notification, no refresh needed

### James Clarification Two-Step (Apr 11 2026)
- Max 1 question + "ask directly" chat drawer

### In-Case Document Upload Modal (Apr 11 2026)
- AddDocumentModal with drag & drop, context field

### Dashboard 12-Feature Parity (Apr 11 2026)
- All CaseDetail features on Dashboard

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

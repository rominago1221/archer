# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.

## What's Been Implemented

### Real-Time Post-Upload UI Update (Apr 11 2026) — LATEST
- 2-second polling when any case has status='analyzing'
- Re-analyzing banner (blue) when case has existing data being re-analyzed
- Full spinner only for brand new cases (score = 0)
- Green toast notification: "Analysis complete — Risk Score updated" (5s auto-dismiss)
- Auto-update of all sections: Risk Score, findings, Next Actions, Score History
- onUploadComplete forces local 'analyzing' state for instant polling kickoff
- No page refresh ever needed

### James Clarification Two-Step (Apr 11 2026)
- Max 1 question with 2-3 clickable buttons + "ask him directly →" link
- CaseChatDrawer: 400px slide-in from right, pre-loaded with case context
- Backend chat migrated to emergentintegrations

### In-Case Document Upload Modal (Apr 11 2026)
- AddDocumentModal: drag & drop, context textarea, trilingual

### Dashboard 12-Feature Parity (Apr 11 2026)
- All CaseDetail features on Dashboard: Brief, Share, Score History, Battle Preview, James Q&A, Jurisprudence, Outcome Predictor, Risk Monitor, Letter/Share Modals, New Case Overlay

### Integrations
- Emergent LlmChat (claude-sonnet-4-20250514), Google OAuth, Object Storage
- Daily.co, Stripe, CourtListener

## Prioritized Backlog

### P0
- [ ] Refactor server.py (6400+ lines → modular routers)

### P1
- [ ] Deadline Alerts (Twilio/SendGrid) — awaiting keys
- [ ] HelloSign / Dropbox Sign — awaiting keys
- [ ] Mobile Document Scanner

### P2-P3
- [ ] Stripe Connect, Email notifications, Full UI translation, Multi-country expansion

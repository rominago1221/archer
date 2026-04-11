# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Now includes a complete Attorney Portal, James Document Creator, and a redesigned Virtual Legal Cabinet Dashboard.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction` / `user.country`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Both jurisdiction and language are independent and visible on every page.

## What's Been Implemented

### Virtual Legal Cabinet Dashboard (Apr 11 2026) — LATEST
- **3-column layout**: Left sidebar (260px) + Main area (1fr) + Right panel (240px)
- **Left sidebar**: Jasper logo, James AI card (avatar, role, 4 stat boxes), navigation links, active cases list with risk colors/deadlines, "Open a new case" button, sign out
- **Main center**: James banner with credential pills, case type badge, title, metadata, Risk Score (big number + progress bar + 4 dimensions: Financial/Urgency/Legal/Complexity), James Analysis findings with legal references, question card
- **Right panel**: Overview header, critical deadline card (red), numbered next actions, documents section, Battle Preview mini-card (your args vs their args)
- **New Case Overlay**: 8 situation cards in user's language (EN/FR/NL), navigates to upload
- **Language system**: Full EN/FR/NL translations for all dashboard text
- **Re-analyze endpoint**: POST /api/cases/{case_id}/reanalyze
- **Default analysis fix**: Changed from fake 50/50/50/50 to 0/0/0/0 with "Re-analyze" prompt
- Tested: 41/41 features pass (iteration_24.json)

### Attorney Portal (Apr 11 2026)
- Dual Login System, 7-step Attorney Application/Onboarding
- Attorney Dashboard, Calls, Cases, Legal Research, Profile Editor, Earnings, Settings
- Public Attorney Profile with booking, Daily.co Video Calls, AI Case Brief
- Stripe Connect routing, Attorney Route Guard

### James Conversational Document Creator (Apr 11 2026)
- Two-column layout: sidebar + conversational main area
- Backend: POST /api/documents/james/send, GET /conversations, /recent, /messages

### Core Features
- Document upload & AI analysis (PDF, DOCX, TXT, EML, images)
- Claude Vision OCR, Risk Score + History Graph
- Legal Battle Preview, Outcome Predictor, Response Letters
- Case Sharing, Contract Guard, Document Library, Document Scanner
- Legal Chat (James AI Attorney), Multi-Document Analysis

### Integrations
- Emergent Google OAuth, Object Storage
- Anthropic Claude (claude-sonnet-4-20250514) with Vision + web_search
- Daily.co Video Calls
- Stripe Checkout + planned Connect
- CourtListener API, pymupdf, python-docx, jsPDF

## Known Issues
- Claude API rate limits (429) cause analysis to fall back to defaults. This is transient.
- CourtListener recent case law filtering depends on AI analysis producing correct case_type.

## Prioritized Backlog

### P0 (Critical)
- [ ] Refactor server.py (6000+ lines -> modular routers: routes/auth.py, routes/cases.py, routes/attorney.py, etc.)

### P1 (High)
- [ ] Stripe Connect OAuth for attorney payouts (80/20 split)
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key
- [ ] Email notifications (SendGrid/Resend) — needs API keys
- [ ] Mobile Document Scanner (Camera integration)

### P2 (Medium)
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys
- [ ] Full UI translation pass for all pages (FR/NL/DE/ES)

### P3 (Future)
- [ ] Multi-Country expansion
- [ ] Post-call client rating flow
- [ ] Attorney application admin panel

# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Now includes a complete Attorney Portal and a redesigned Virtual Legal Office Dashboard.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Both jurisdiction and language are independent and visible on every page.

## What's Been Implemented

### Virtual Legal Office Dashboard Redesign (Apr 11 2026)
- **3-column layout**: Left sidebar (260px) + Main area + Right panel (240px)
- **Left sidebar**: Jasper logo, James AI card with stats, active cases list with risk scores/deadlines, "Ouvrir un nouveau dossier" button
- **Main area**: James banner with badges, case details (title, date, docs), 4-dimension risk score (Financier, Urgence, Juridique, Complexite), AI findings with legal references, James question card
- **Right panel**: Critical deadline card, numbered next actions, documents section, Battle Preview mini-card
- **New Case Overlay**: 8 French situation cards (housing, debt, employment, insurance, contract, court, debt_collection, other)
- **Conversational Flow**: Selecting a situation triggers James to ask 3-4 questions before showing upload/skip buttons
- **Stripe bug fix**: Fixed missing `await` on checkout session creation for attorney bookings

### Attorney Portal (Apr 11 2026)
- Dual Login System, 7-step Attorney Application/Onboarding
- Attorney Dashboard, Calls, Cases, Legal Research, Profile Editor, Earnings, Settings
- Public Attorney Profile with booking, Daily.co Video Calls, AI Case Brief
- Stripe Connect routing, Attorney Route Guard

### James Conversational Document Creator (Apr 11 2026)
- Two-column layout: sidebar + conversational main area
- Backend: POST /api/documents/james/send, GET /conversations, /recent, /messages

### Complete Audit & Bug Fixes (Apr 11 2026)
- Outcome Predictor 3 scenario cards fixed
- Cases list deadline display improved
- Lawyers page jurisdiction filter fixed
- Timeline events translated

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

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Connect OAuth for attorney payouts (80/20 split)
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key
- [ ] Email notifications (SendGrid/Resend) — needs API keys

### P2 (Medium)
- [ ] Full UI translation for Dashboard, Upload, My Cases (FR/NL/DE/ES)
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys
- [ ] Mobile Document Scanner (Camera integration)

### P3 (Future)
- [ ] Refactor server.py (6000+ lines -> modular routers)
- [ ] Multi-Country expansion
- [ ] Post-call client rating flow
- [ ] Attorney application admin panel

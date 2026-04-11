# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- Both are independent and visible on every page.

## What's Been Implemented

### James Conversational Document Creator (Apr 11 2026)
- Two-column layout: sidebar (mode toggle, recent docs) + conversational main area
- James identity bar, chat flow, question tracking, document preview cards
- Action buttons: Send for signature, Download PDF, Edit with James
- Free plan limit: 3 documents
- Backend: POST /api/documents/james/send, GET /conversations, /recent, /messages

### Complete Application Audit & Bug Fixes (Apr 11 2026)
- **Bug 1 FIXED**: Outcome Predictor 3 scenario cards now render (favorable/neutral/unfavorable field mapping)
- **Bug 2 FIXED**: Cases list shows "X days left" / "Deadline passed" instead of raw dates
- **Bug 3 FIXED**: Lawyers page uses `user.jurisdiction` instead of deprecated `user.country`
- **Bug 4 FIXED**: Timeline events translated (FR: "Dossier ouvert", NL: "Dossier geopend", DE: "Fall eröffnet")

### Legal Chat — James AI Attorney
- Direct httpx call to Claude API (claude-sonnet-4-20250514)
- Personality, jurisdiction detection, language matching
- Free plan limit (3 questions), Pro unlimited

### Multi-Document Analysis System
- Combined chronological analysis, contradiction detection, case narrative
- Case Brief PDF generation for 5+ documents

### Core Features
- Document upload & AI analysis (PDF, DOCX, TXT, EML, images)
- Claude Vision OCR for scanned docs
- Risk Score + History Graph + 4 dimensions
- Legal Battle Preview, Outcome Predictor, Response Letters
- Case Sharing, Contract Guard, Document Library, Document Scanner

### Integrations
- Emergent Google OAuth, Object Storage
- Anthropic Claude (claude-sonnet-4-20250514) with Vision + web_search
- CourtListener API, pymupdf, python-docx, jsPDF

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Checkout for Pro Plan ($69/mo) and lawyer calls ($149)
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key
- [ ] Mobile Document Scanner (Camera integration for Uploads)

### P2 (Medium)
- [ ] Full UI translation for Dashboard, Upload, My Cases (FR/NL/DE/ES)
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys

### P3 (Future)
- [ ] Refactor server.py (5200+ lines -> modular routers)
- [ ] Multi-Country expansion
- [ ] Save generated Response Letters to database history

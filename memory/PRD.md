# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform for US and Belgian consumers. Upload legal documents, receive AI-powered risk analysis, manage cases, and connect with lawyers.

## Core Architecture Decisions

### Jurisdiction vs Language (CRITICAL)
- **Jurisdiction** (US or BE): Determines which laws apply to analysis. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- These are **completely independent**: A US user can use French UI, a Belgian user can use English UI.
- Both selectors visible on every page via `JurisdictionLanguageBar` component.
- Default: jurisdiction=US, language=en.

### Countries Supported
- **USA** (US Federal + State Law)
- **Belgium** (Belgian Federal + Regional Law: Wallonie, Bruxelles-Capitale, Flandre, Communaute germanophone)
- **UAE REMOVED** — all references deleted from codebase

## What's Been Implemented

### Landing Page
- Dual selector navbar: [Jurisdiction ▾] [Language ▾]
- Full translations: EN, FR, NL, DE, ES (7 locale combos: us-en, us-es, be-fr, be-nl, be-de, be-en)
- Jurisdiction warning on switch
- Currency adaptation (USD/EUR)

### Authentication
- Email/Password + Google OAuth, cookie sessions
- Signup with Jurisdiction + Language + Region (for BE)

### Core Features
- Document upload & AI analysis (PDF, DOCX, TXT, EML, JPEG, PNG, HEIC)
- Claude Vision OCR for scanned docs (auto-fallback)
- PDF-to-image conversion via pymupdf
- Risk Score + History Graph + 4 dimensions
- Multi-Document Analysis System (chronological combined analysis)
- Contradiction Detection between documents
- Case Narrative, Opposing Strategy Assessment
- Case Brief PDF generation (5+ documents)
- Legal Battle Preview (adversarial analysis)
- Outcome Predictor
- Response Letters (US + Belgian law types)
- Legal Chat with Claude
- Case Sharing with expiring links
- Contract Guard ("Before I Sign")
- Document Library (158+ templates)
- Document Scanner (mobile camera OCR)

### Integrations
- Emergent Google OAuth
- Emergent Object Storage
- Anthropic Claude (claude-sonnet-4-20250514) with Vision + web_search
- CourtListener API
- pymupdf, python-docx, jsPDF

## DB Schema
- users: {user_id, email, name, plan, jurisdiction, country, region, language, ...}
- cases: {case_id, user_id, title, type, risk_score, deadline, case_narrative, contradictions, ...}
- documents: {document_id, case_id, file_name, extracted_text, status, ...}

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Checkout for Pro Plan ($69/mo) and lawyer calls ($149)
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key

### P2 (Medium)
- [ ] Full UI translation for Dashboard, Upload, My Cases pages (FR/NL/DE/ES)
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys

### P3 (Future)
- [ ] Refactor server.py (5000+ lines -> modular routers)
- [ ] Multi-Country expansion (more EU countries)

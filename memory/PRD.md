# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- Both are independent and visible on every page.

## What's Been Implemented

### Legal Chat — James AI Attorney
- James: Senior Legal Advisor, 20 years experience, 847,000+ legal sources
- Direct httpx call to Claude API (claude-sonnet-4-20250514) with full conversation history
- System prompt with personality, answer format, jurisdiction detection, language matching
- Suggested questions adapted per jurisdiction and language
- Trust badges, credential bar, typing indicator
- Free plan limit (3 questions), Pro unlimited
- Book-a-call CTA every 3rd response

### Multi-Document Analysis System
- Combined chronological analysis when case has 2+ documents
- Contradiction detection, case narrative, opposing strategy assessment
- Case Brief PDF generation for 5+ documents

### Core Features
- Document upload & AI analysis (PDF, DOCX, TXT, EML, images)
- Claude Vision OCR for scanned docs
- Risk Score + History Graph + 4 dimensions
- Language injection on ALL analysis paths (US and Belgian)
- Legal Battle Preview, Outcome Predictor, Response Letters
- Case Sharing, Contract Guard, Document Library, Document Scanner

### Integrations
- Emergent Google OAuth, Object Storage
- Anthropic Claude (claude-sonnet-4-20250514) with Vision + web_search
- CourtListener API, pymupdf, python-docx, jsPDF

## Bug Fixes (Apr 2026)
- **Legal Chat broken**: Replaced call_claude() (JSON parser) with direct httpx for text chat
- **Findings empty text**: Added fallback chain: text || texte || description || constatation || issue || details || finding
- **French labels missing**: Added simplified aliases labels['fr'] = labels['fr-BE'] after language migration
- **Language not injected for US users**: Added language param to analyze_document_advanced, all passes use persona with lang_instruction

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Checkout for Pro Plan ($69/mo) and lawyer calls ($149)
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key

### P2 (Medium)
- [ ] Full UI translation for Dashboard, Upload, My Cases (FR/NL/DE/ES)
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys

### P3 (Future)
- [ ] Refactor server.py (5000+ lines -> modular routers)
- [ ] Multi-Country expansion

# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- Both are independent and visible on every page.

## What's Been Implemented

### James Conversational Document Creator (NEW - Apr 11 2026)
- Complete redesign of `/documents` page as two-column layout
- Primary mode: "Generate any document" via conversational AI (James)
- Secondary mode: "Browse 158 templates" (existing template grid)
- James identity bar: avatar, name, role, stat pills, live status
- Conversational flow: opening message → user describes need → James asks 3-5 questions → generates complete legal document
- Interactive question cards that track progress (multilingual regex: EN/FR/NL/DE/ES)
- Document Preview Card with title, clauses preview, action buttons
- Action buttons: Send for signature (HelloSign mock), Download PDF, Edit with James
- Dynamic suggestion chips (change after document generation)
- Typing indicator with animated dots
- Free plan limit: 3 documents, upgrade prompt after
- Recent documents sidebar (last 5)
- New conversation button
- Backend endpoints: POST /api/documents/james/send, GET /api/documents/james/conversations, GET /api/documents/james/recent, GET /api/documents/james/conversations/{id}/messages
- Document title extracted from generated content (not last message)
- Documents saved to `generated_documents` collection with `created_via: 'james_conversation'`

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
- **Document title bug**: Fixed james doc creator saving last message as title instead of extracting from document content

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Checkout for Pro Plan ($69/mo) and lawyer calls ($149)
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key
- [ ] Mobile Document Scanner (Camera integration for Uploads)
- [ ] Outcome Predictor (Probabilistic scenario UI)

### P2 (Medium)
- [ ] Full UI translation for Dashboard, Upload, My Cases (FR/NL/DE/ES)
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys

### P3 (Future)
- [ ] Refactor server.py (5200+ lines -> modular routers)
- [ ] Multi-Country expansion
- [ ] Save generated Response Letters to database history

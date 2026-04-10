# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform. Multi-country support: US + Belgium (FR/NL/DE) + UAE. Upload legal documents, get AI risk analysis, manage cases, generate response letters, access lawyer directory.

## Implementation Rule
**Every feature built for any country must be available for ALL countries.** The only difference between countries is: language, applicable law in Claude prompt, currency, and lawyers shown. No country-specific feature gating.

## What's Been Implemented

### Multi-Country Landing Page
- Country/Language selector (5 locales: US-EN, AE-EN, BE-FR, BE-NL, BE-DE)
- Full page translation, currency adaptation, country-specific lawyers
- localStorage persistence

### Authentication & Onboarding
- Email/Password + Google OAuth, cookie sessions
- Signup with Country/Region/Language (US/AE/BE)

### Core Features (ALL available for ALL countries)
- Document upload & AI analysis (PDF, DOCX, TXT, EML, JPEG, PNG, HEIC)
- **Claude Vision** for scanned docs & images (auto-fallback when text < 100 chars)
- **PDF-to-image conversion** via pymupdf for image-only PDFs
- Risk Score + History Graph + 4 dimensions
- **Mandatory language enforcement** — Belgian analysis returns content in user's language (FR/NL/DE)
- Legal Battle Preview (4A/4B adversarial analysis)
- Outcome Predictor
- Response Letters (US + Belgian law types)
- Legal Chat with Claude (language-aware)
- Case Sharing with expiring links
- Contract Guard ("Before I Sign")
- Risk Monitor (MOCKED)
- Document Library (158+ templates)
- Document Scanner (mobile camera OCR)

### Multi-Document Analysis System (Apr 2026) - NEW
- **Combined chronological analysis**: When a case has 2+ docs, ALL documents are combined chronologically with labels and analyzed together in a single 5-pass analysis
- **Multi-doc prompts**: Each of the 5 analysis passes has country/language-specific multi-doc supplements that instruct Claude to detect contradictions, track evolution, assess strategy
- **Case Narrative**: AI generates a chronological narrative of the dispute showing how it started and evolved
- **Contradiction Detection**: Automatically flags contradictions between documents (e.g., "Document 1 says X but Document 3 says Y") with defense value ratings (high/medium/low)
- **Opposing Strategy Assessment**: AI analyzes the opposing party's communication patterns to identify their strategy
- **Cumulative Financial Exposure**: Aggregates financial exposure across all documents
- **Master Deadlines**: Consolidates all deadlines from all documents in one view
- **Pattern Analysis**: For 5+ documents spanning 30+ days, analyzes escalation/de-escalation patterns
- **Case Brief PDF**: Downloadable comprehensive case brief (via Case Brief endpoint + jsPDF client-side generation) for cases with 5+ documents
- **Multi-language**: All multi-doc features work in EN, FR, NL, DE via the existing language system
- **Backend**: `build_multi_document_context()`, `run_multi_doc_analysis_advanced()`, `run_multi_doc_analysis_belgian()`, `GET /api/cases/{case_id}/brief`
- **Frontend**: Multi-doc summary section in CaseDetail.js with score trend, narrative, contradictions, deadlines, strategy analysis

### 8 Critical CaseDetail Bugs (Apr 2026) - ALL FIXED
- Bug 1-8: AI Analysis empty, wrong language, missing legal refs, deadline formatting, predictor timeout, filename titles, type defaults, letter descriptions
- useParams bug: Fixed `{ id: caseId }` -> `{ caseId }`

### Integrations
- Emergent Google OAuth, Emergent Object Storage
- Anthropic Claude (claude-sonnet-4-20250514) with Vision + web_search
- CourtListener API, pymupdf, python-docx, jsPDF

## DB Collections
users, user_sessions, cases, documents, lawyers, lawyer_calls, letters, case_events, payment_transactions, chat_conversations, chat_messages, shared_cases, contract_guard_reviews, risk_monitors, risk_monitor_alerts

## Key Case Fields (Multi-Doc)
- case_narrative (str): Chronological narrative of the dispute
- contradictions (list[dict]): Detected contradictions between documents
- opposing_strategy_analysis (str): Analysis of opposing party strategy
- cumulative_financial_exposure (str): Combined financial exposure
- master_deadlines (list[dict]): All deadlines across documents
- multi_doc_summary (str): Overall multi-doc summary/pattern analysis

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Checkout for Pro Plan ($69/mo) and lawyer calls ($149)
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key

### P2 (Medium)
- [ ] Full UI translation (dashboard, upload, settings labels in FR/NL/DE)
- [ ] UAE-specific AI analysis (UAE Federal Laws, DIFC, RERA)
- [ ] Real Gmail/Outlook OAuth for Risk Monitor
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys

### P3 (Future)
- [ ] Refactor server.py (5000+ lines -> modular routers)
- [ ] Multi-Country expansion (more EU countries)

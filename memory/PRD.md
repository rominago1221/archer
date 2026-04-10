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

### Bug Fixes (Feb 2026)
- **BUG 1**: All analysis outputs now enforce user's language via `get_language_instruction()` on every Claude prompt
- **BUG 2**: Case model validators normalize `deadline` (dict->str) and `financial_exposure` (dict->str) preventing 500 errors
- **BUG 3**: All features available for Belgian users with French legal references inline

### 8 Critical CaseDetail Bugs (Apr 2026) - ALL FIXED
- **Bug 1**: AI Analysis empty -> Fixed: ai_summary, key_insight, ai_findings now display correctly
- **Bug 2**: Wrong language UI -> Fixed: Full fr-BE/nl-BE/de-BE translation system in CaseDetail.js
- **Bug 3**: Missing legal refs -> Fixed: Each finding shows inline legal_ref and jurisprudence
- **Bug 4**: Negative deadline -> Fixed: Shows "DELAI DEPASSE" for past deadlines, "Action requise dans X jours" for future
- **Bug 5**: Predictor infinite loading -> Fixed: 30s AbortController timeout
- **Bug 6**: Filename as title -> Fixed: Backend prompts extract suggested_case_title from Claude
- **Bug 7**: Type defaulting to Other -> Fixed: Backend prompts extract proper case_type
- **Bug 8**: Response Letters missing desc -> Fixed: API response parsing (letter_types array extraction)
- **useParams bug**: Fixed `{ id: caseId }` -> `{ caseId }` matching route param

### Integrations
- Emergent Google OAuth, Emergent Object Storage
- Anthropic Claude (claude-sonnet-4-20250514) with Vision + web_search
- CourtListener API, pymupdf, python-docx

## DB Collections
users, user_sessions, cases, documents, lawyers, lawyer_calls, letters, case_events, payment_transactions, chat_conversations, chat_messages, shared_cases, contract_guard_reviews, risk_monitors, risk_monitor_alerts

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Checkout for Pro Plan
- [ ] HelloSign / Dropbox Sign (e-signature)

### P2 (Medium)
- [ ] Full UI translation (dashboard, upload, settings labels in FR/NL/DE)
- [ ] UAE-specific AI analysis (UAE Federal Laws, DIFC, RERA)
- [ ] Real Gmail/Outlook OAuth for Risk Monitor
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid

### P3 (Future)
- [ ] Refactor server.py (4500+ lines -> modular routers)
- [ ] Multi-Country expansion (more EU countries)

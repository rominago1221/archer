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
- **BUG 2**: Case model validators normalize `deadline` (dict→str) and `financial_exposure` (dict→str) preventing 500 errors
- **BUG 3**: All features available for Belgian users with French legal references inline

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
- [ ] Refactor server.py (4500+ lines → modular routers)
- [ ] Multi-Country expansion (more EU countries)

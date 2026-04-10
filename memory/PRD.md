# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform. Jasper lets consumers upload any legal document and receive an instant AI-powered risk analysis with a Risk Score from 0 to 100. Multi-country support: US + Belgium (FR/NL/DE) + UAE.

## User Personas
1. **US Consumer with Legal Issue** - demand letters, court notices, contracts
2. **Belgian Consumer** - Same use cases, adapted to Belgian law (3 languages FR/NL/DE)
3. **UAE Resident** - Employment contracts, tenancy disputes, visa issues, adapted to UAE Federal Laws
4. **Small Business Owner** - NDAs, vendor contracts, employment agreements

## What's Been Implemented

### Multi-Country Landing Page (Feb 2026)
- **Country/Language selector** in navbar with 5 locales:
  - US — English (default), UAE — English, Belgium — Français/Nederlands/Deutsch
- Full translation of all landing page sections (hero, categories, pricing, lawyers, FAQ, reviews, CTA)
- Currency adaptation: USD ($), AED, EUR (€)
- Country-specific lawyers: 3 US, 3 UAE, 3 Belgian per locale
- Country-specific legal categories and references
- localStorage persistence of locale selection
- Signup page synced with locale selector (reads localStorage)

### Multi-Country Legal Analysis
- **US**: 5-pass analysis with CourtListener API + Claude Web Search
- **Belgium**: 5-pass analysis with Belgian jurisprudence database, 3 languages (FR/NL/DE)

### Authentication & Onboarding
- Email/Password Auth + Google OAuth + session management
- Signup page with Country/Region/Language selector (US/AE/BE)
- Belgium: Region + Language dropdowns, UAE: info box

### Core Features
- Document upload & AI analysis (PDF, DOCX, TXT, EML), Document Scanner (mobile camera OCR)
- Risk Score visualization + History Graph + 4 dimensions
- Case management with timeline tracking
- Legal Battle Preview (4A/4B adversarial analysis)
- Outcome Predictor (US + Belgian judicial statistics)
- Response Letters: US (6-8 options per type) + Belgian (28 types)
- Legal Chat with Claude
- Case Sharing with expiring links
- Contract Guard ("Before I Sign" — US + Belgian negotiation analysis)
- Risk Monitor (MOCKED Gmail/Outlook email surveillance)
- Document Library (158+ templates)

### Lawyers Directory
- 6 US + 11 Belgian + 3 UAE lawyers
- Filtered by user's country, localized pricing ($/€/AED)

### Integrations
- Emergent Google OAuth, Emergent Object Storage
- Anthropic Claude API (claude-sonnet-4-20250514) with web_search tool
- CourtListener API, python-docx

## DB Collections
users, user_sessions, cases, documents, lawyers, lawyer_calls, letters, case_events, payment_transactions, chat_conversations, chat_messages, shared_cases, contract_guard_reviews, risk_monitors, risk_monitor_alerts

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Checkout for Pro Plan subscriptions
- [ ] HelloSign / Dropbox Sign API integration (e-signature)

### P2 (Medium)
- [ ] Full interface translation (FR/NL/DE) — dashboard, upload, settings
- [ ] Belgian document templates in library
- [ ] UAE-specific AI analysis (UAE Federal Laws, DIFC, RERA)
- [ ] Real Gmail/Outlook OAuth for Risk Monitor
- [ ] Date format DD/MM/YYYY for Belgian/UAE users
- [ ] Deadline Alerts (SMS/Email) — requires Twilio + SendGrid keys

### P3 (Future)
- [ ] Refactor server.py into modular routers (4500+ lines)
- [ ] Multi-Country: Add more EU countries
- [ ] Save generated letters to case history

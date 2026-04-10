# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform. Jasper lets consumers upload any legal document and receive an instant AI-powered risk analysis with a Risk Score from 0 to 100. Multi-country support: US + Belgium (FR/NL/DE).

## User Personas
1. **US Consumer with Legal Issue** - demand letters, court notices, contracts
2. **Belgian Consumer** - Same use cases, adapted to Belgian law (3 languages)
3. **Small Business Owner** - NDAs, vendor contracts, employment agreements

## What's Been Implemented

### Multi-Country Legal Analysis
- **US**: 5-pass analysis with CourtListener API + Claude Web Search
- **Belgium**: 5-pass analysis with Belgian jurisprudence database, 3 languages (FR/NL/DE)
  - Full knowledge bases: employment law, tenancy (Wallonie/Bruxelles/Flandre), consumer protection, contracts, debts, family law
  - Regional routing: auto-loads correct jurisprudence based on detected document type + user region
  - Belgian scoring thresholds adapted per document type

### Authentication
- Email/Password Auth + Google OAuth + session management

### Core Features
- Document upload & AI analysis (PDF, DOCX, TXT, EML), Document Scanner (mobile camera OCR)
- Risk Score visualization + History Graph + 4 dimensions
- Case management with timeline tracking
- Legal Battle Preview (4A/4B adversarial analysis)
- Outcome Predictor (US + Belgian judicial statistics)
- Response Letters: US (6-8 options per type) + Belgian (28 types: employment, housing, debt, NDA)
- Legal Chat with Claude
- Case Sharing with expiring links
- Contract Guard ("Before I Sign" — US + Belgian negotiation analysis)
- Risk Monitor (MOCKED Gmail/Outlook email surveillance)
- Document Library (158+ templates)

### Belgian Lawyers (17 total: 6 US + 11 Belgian)
- 5 francophone: Sophie Lecomte (Bruxelles), Thomas Dupont (Liege), Julie Renard (Namur), Alexandre Martin (Bruxelles), Emilie Dubois (Mons)
- 4 neerlandophones: Pieter Van den Berg (Gent), Laura Janssen (Antwerpen), Luc Vermeersch (Brussel), Sarah De Smedt (Leuven)
- 2 germanophones: Klaus Mueller (Eupen), Anna Schreiber (Malmedy)
- Lawyers filtered by user's country, Belgian-adapted page (FR filters, EUR pricing)

### Integrations
- Emergent Google OAuth, Emergent Object Storage
- Anthropic Claude API (claude-sonnet-4-20250514) with web_search tool
- Stripe, CourtListener API, python-docx

## DB Collections
users, user_sessions, cases, documents, lawyers, lawyer_calls, letters, case_events, payment_transactions, chat_conversations, chat_messages, shared_cases, contract_guard_reviews, risk_monitors, risk_monitor_alerts

## Prioritized Backlog

### P2 (Medium - Next)
- [ ] Full interface translation (FR/NL/DE) — navigation, dashboard, upload labels, error messages
- [ ] Belgian document templates in library
- [ ] Belgian chat suggestions by region/language
- [ ] Real Gmail/Outlook OAuth, HelloSign e-signature
- [ ] Date format DD/MM/YYYY for Belgian users

### P3 (Future)
- [ ] Deadline Alerts (SMS/Email) — requires Twilio + SendGrid keys
- [ ] Refactor server.py into modular routers (4500+ lines)
- [ ] Multi-Country: Add UAE, more EU countries
- [ ] Save generated letters to case history

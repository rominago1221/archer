# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform for US consumers. Jasper lets US consumers upload any legal document (demand letter, contract, court notice, lease, NDA, etc.) and receive an instant AI-powered risk analysis with a Risk Score from 0 to 100. Users can build a live case file that evolves as they add documents, and book a 30-minute video call with a licensed US attorney for $149 when needed.

## User Personas
1. **US Consumer with Legal Issue** - Someone who received a demand letter, court notice, or needs to review a contract
2. **Belgian Consumer** - Same use case but with Belgian law (employment, tenancy, consumer, NDA)
3. **Small Business Owner** - Needs to review NDAs, vendor contracts, employment agreements
4. **Tenant/Landlord** - Lease disputes, eviction notices, deposit issues

## Core Requirements (Static)
- Document upload and AI analysis using Claude API
- Risk Score calculation (0-100) with 4 dimensions: Financial, Urgency, Legal Strength, Complexity
- Case management with timeline tracking
- Lawyer booking system ($149 per 30-min call)
- Authentication: Email/password + Google OAuth
- Free (1 doc) and Pro ($69/mo) plans
- Stripe payments for Pro plan and lawyer calls
- Multi-country support (US, Belgium) with auto-routing based on user profile

## What's Been Implemented

### Authentication System
- Email/Password Auth with bcrypt + Google OAuth via Emergent Auth
- Session management with httpOnly cookies

### Landing Page
- Hero section, stats bar, trust bar, document categories, attorney profiles, pricing, FAQ

### Backend (FastAPI + MongoDB)
- Profile management with country/region/language fields
- Cases CRUD with risk score tracking
- Document upload with Emergent object storage (PDF, DOCX, TXT, EML)
- **Advanced 5-Pass AI Analysis System** (claude-sonnet-4-20250514) — US version with CourtListener
- **Belgian 5-Pass AI Analysis System** — Belgian persona, Belgian jurisprudence inline, regional law support
- PDF/DOCX extraction, Document Scanner via Claude Vision
- Lawyer management, call booking, response letters generation
- Stripe Integration, Legal Chat, Case Sharing
- **Contract Guard** ("Before I Sign") — US + Belgian versions
- **Risk Monitor** — email surveillance (MOCKED Gmail/Outlook)
- **Belgian Letter Types** — 8 employment, 8 housing, 6 debt, 6 NDA letter types with Belgian legal references
- **Belgian Outcome Predictor** — Belgian judicial statistics
- Country-config API endpoint for frontend routing

### Frontend (React + Tailwind CSS)
- Login/Signup, Dashboard with Risk Monitor widget
- Case detail with Risk Score History, Battle Preview, Outcome Predictor, Belgian organismes recommandes
- Upload page with mode toggle + Belgian indicator banner
- Settings with country/region/language selectors + Risk Monitor tab
- Document Library with 158+ templates

### Belgian Legal System (NEW - April 2026)
- **Country/Region/Language Selection**: Settings > Account > Country (US/Belgium)
  - Regions: Wallonie, Bruxelles-Capitale, Flandre, Communaute germanophone
  - Languages: Francais, Nederlands, Deutsch
- **Belgian Attorney Persona**: 3 versions (FR/NL/DE) with Belgian-specific scoring thresholds
- **Belgian Jurisprudence DB**: `jurisprudence_belgique.json` with employment law (CCT 109, preavis, non-concurrence), tenancy law (Wallonie, Flandre, Bruxelles), consumer protection (Livre XIX CDE), NDA (secret des affaires)
- **Belgian 5-Pass Analysis**: Fact extraction with Belgian fields (commission paritaire, region, TVA/BCE), legal analysis with injected Belgian jurisprudence, strategy with Belgian organismes (syndicats, BAJ, mediateurs)
- **Belgian Contract Guard**: Belgian-specific negotiation rules (non-concurrence, clause penale, garantie locative)
- **Belgian Letter Types**: 28 letter templates covering employment (CCT 109, C4, preavis), housing (garantie, enregistrement, treve hivernale), debt (Livre XIX CDE), NDA
- **Belgian Outcome Predictor**: Belgian judicial statistics (73% reglement avant jugement for employment, etc.)
- **Auto-routing**: Upload endpoint detects user country and routes to appropriate analysis system

### Integrations
- Emergent Google OAuth, Emergent Object Storage
- Anthropic Claude API (claude-sonnet-4-20250514) with web_search tool
- Stripe, CourtListener API, python-docx

## DB Collections
users, user_sessions, cases, documents, lawyers, lawyer_calls, letters, case_events, payment_transactions, chat_conversations, chat_messages, shared_cases, contract_guard_reviews, risk_monitors, risk_monitor_alerts

## Prioritized Backlog

### P0 (Critical - All Done)
- [x] Email/password + Google OAuth
- [x] 5-pass AI analysis (US)
- [x] Belgian 5-pass analysis system
- [x] Contract Guard (US + Belgian)
- [x] Risk Monitor (MOCKED)
- [x] Country/Region/Language selection
- [x] Belgian letter types
- [x] Belgian outcome predictor

### P2 (Medium - Upcoming)
- [ ] Real Gmail/Outlook OAuth integration
- [ ] HelloSign e-signature integration
- [ ] Multi-Country: Add UAE, more EU countries
- [ ] Save generated letters to case history

### P3 (Future)
- [ ] Deadline Alerts (SMS/Email) — requires Twilio + SendGrid keys
- [ ] Refactor server.py into modular routers (4000+ lines)
- [ ] Video call integration

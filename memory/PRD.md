# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build a complete, production-ready SaaS web application called "Jasper" — a legal tech AI platform for US consumers. Jasper lets US consumers upload any legal document (demand letter, contract, court notice, lease, NDA, etc.) and receive an instant AI-powered risk analysis with a Risk Score from 0 to 100. Users can build a live case file that evolves as they add documents, and book a 30-minute video call with a licensed US attorney for $149 when needed.

## User Personas
1. **US Consumer with Legal Issue** - Someone who received a demand letter, court notice, or needs to review a contract
2. **Small Business Owner** - Needs to review NDAs, vendor contracts, employment agreements
3. **Tenant/Landlord** - Lease disputes, eviction notices, deposit issues

## Core Requirements (Static)
- Document upload and AI analysis using Claude API
- Risk Score calculation (0-100) with 4 dimensions: Financial, Urgency, Legal Strength, Complexity
- Case management with timeline tracking
- Lawyer booking system ($149 per 30-min call)
- Authentication: Email/password + Google OAuth (+ Apple/Facebook when credentials available)
- Free (1 doc) and Pro ($69/mo) plans
- Stripe payments for Pro plan and lawyer calls

## What's Been Implemented

### Authentication System
- **Email/Password Auth** with bcrypt password hashing and session-based auth
- **Google OAuth** via Emergent Auth (auth.emergentagent.com)
- **Apple Sign In** button (MOCKED - needs Apple Developer credentials)
- **Facebook Login** button (MOCKED - needs Facebook App credentials)
- Session management with httpOnly cookies (secure, samesite=none)

### Landing Page
- Hero section with value proposition and Risk Score preview
- Stats bar, trust bar, press logos
- "What Jasper handles" - 9 legal document categories
- "The Problem" section, "How it works" - 4 steps
- Attorney profiles grid, Pricing cards, Reviews, FAQ, Footer

### Backend (FastAPI + MongoDB)
- Profile management with notification/privacy settings
- Cases CRUD with risk score tracking
- Document upload with Emergent object storage (PDF, DOCX, TXT, EML)
- **Advanced 5-Pass AI Analysis System** (claude-sonnet-4-20250514) with web_search tool + CourtListener real-time jurisprudence
- PDF text extraction using pdfplumber, DOCX via python-docx
- Lawyer management with seeded data (6 lawyers)
- Lawyer call booking with AI brief generation
- Risk Score History tracking
- Outcome Predictor via Claude API
- Document Scanner via Claude Vision API (mobile camera OCR)
- Response Letters generation — **6-8 specific options per document type**
- Stripe Integration (Pro plan $69/mo, lawyer calls $149, webhook)
- **Legal Chat** with Claude (unlimited Pro, 3 questions Free)
- **Case Sharing** with secure expiring tokens and read-only public pages
- **Contract Guard** ("Before I Sign" mode) — negotiation-focused contract analysis with amber UI
- **Risk Monitor** — email surveillance with mock Gmail/Outlook connection, threat detection alerts

### Frontend (React + Tailwind CSS)
- Login/Signup pages with email/password + social login buttons
- Dashboard with stats, cases, upload zone, lawyers, **Risk Monitor widget**
- Case detail page with Risk Score History Graph, Battle Preview, Outcome Predictor
- Upload page with mode toggle: "Analyze risk" vs "Before I sign — Contract Guard" (amber UI)
- Legal Chat page with floating chat button
- Case Sharing modal with expiring links
- SharedCase public view page
- Lawyers grid with booking + Stripe payment
- Settings page with **Risk Monitor tab** (connect/disconnect Gmail/Outlook, alerts)
- Document Library with 158+ templates

### Document Library
- **158+ legal document templates** organized in 14 categories
- AI-powered document generation via Claude
- PDF download, HelloSign e-signature flow (MOCKED - needs API key)

### Contract Guard (NEW - April 2026)
- Mode toggle on Upload page: "Analyze risk" (standard) vs "Before I sign — Contract Guard" (amber)
- Dedicated Claude system prompt for pre-signing negotiation analysis
- Returns: negotiation_score, red_lines, negotiation_points, missing_protections, standard_clauses_check
- Auto-generated negotiation email draft with copy button
- Amber-themed result UI distinct from standard analysis
- Stored in `contract_guard_reviews` MongoDB collection

### Risk Monitor (NEW - April 2026)
- Settings tab for connecting Gmail/Outlook (MOCKED OAuth)
- Dashboard widget showing monitoring status and alerts
- Mock alert system with 3 threat types (legal document, contract, deadline)
- Alert dismiss functionality
- Stats: emails scanned, threats detected, last scan time
- Demo mode notice informing users about simulated connection

### Integrations
- Emergent Google OAuth for authentication
- Emergent Object Storage for document files
- Anthropic Claude API for 5-pass analysis + Vision OCR + Outcome prediction + Letters + Chat + Contract Guard
- Stripe (via emergentintegrations) for payments
- CourtListener API for real-time jurisprudence

## Prioritized Backlog

### P0 (Critical - All Done)
- [x] Email/password authentication
- [x] Document upload and 5-pass AI analysis
- [x] Risk Score visualization + History Graph
- [x] Stripe integration (Pro plan + lawyer calls)
- [x] Legal Battle Preview + Probability Breakdown
- [x] Legal Chat
- [x] Case Sharing
- [x] Contract Guard ("Before I Sign" mode)
- [x] Risk Monitor (email surveillance - MOCKED)

### P1 (High - All Done)
- [x] Outcome Predictor
- [x] Document Scanner (Mobile Camera OCR)
- [x] Response Letters generation (6-8 options per type)
- [x] Document Library (158+ templates)

### P2 (Medium - Upcoming)
- [ ] Real Gmail/Outlook OAuth integration (requires API keys)
- [ ] HelloSign e-signature integration (requires API key)
- [ ] Apple Sign In (needs Apple Developer credentials)
- [ ] Facebook Login (needs Facebook App credentials)
- [ ] Multi-Country Support (USA/UAE/Belgium) - User asked to skip for now
- [ ] Save generated letters to case history

### P3 (Future)
- [ ] Deadline Alerts (SMS/Email) — requires Twilio + SendGrid keys
- [ ] Mobile responsive sidebar (bottom nav)
- [ ] Download user data functionality
- [ ] Delete account flow
- [ ] Video call integration
- [ ] Refactor server.py into modular routers

## Technical Architecture
- Backend: FastAPI with MongoDB at localhost:27017
- Frontend: React with Tailwind CSS
- Auth: Email/password (bcrypt) + Emergent Google OAuth with session cookies
- Files: Emergent Object Storage
- AI: Anthropic Claude API (claude-sonnet-4-20250514) — 5-pass system + Contract Guard
- Payments: Stripe via emergentintegrations library
- DB Collections: users, user_sessions, cases, documents, lawyers, lawyer_calls, letters, case_events, payment_transactions, chat_conversations, chat_messages, shared_cases, contract_guard_reviews, risk_monitors, risk_monitor_alerts

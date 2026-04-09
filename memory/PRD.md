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
- Google OAuth authentication
- Free (1 doc) and Pro ($69/mo) plans
- Stripe payments for Pro plan and lawyer calls

## What's Been Implemented

### Landing Page
- Hero section with value proposition and Risk Score preview
- Stats bar, trust bar, press logos
- "What Jasper handles" - 9 legal document categories
- "The Problem" section, "How it works" - 4 steps
- Attorney profiles grid, Pricing cards, Reviews, FAQ, Footer

### Backend (FastAPI + MongoDB)
- User authentication via Emergent Google OAuth
- Session management with httpOnly cookies
- Profile management with notification/privacy settings
- Cases CRUD with risk score tracking
- Document upload with Emergent object storage
- **Advanced 5-Pass AI Analysis System** (claude-sonnet-4-20250514):
  - Pass 1: Fact extraction (dates, amounts, parties, claims, procedural elements)
  - Pass 2: Legal analysis + jurisprudence injection (risk score, procedural defects, user rights, applicable laws)
  - Pass 3: Strategic recommendations (strategy, success probability, leverage points, red lines)
  - Pass 4A: User's attorney arguments (strongest arguments, best outcome scenario)
  - Pass 4B: Opposing attorney arguments (opposing arguments, worst outcome scenario)
- Static jurisprudence database (USA: FL tenant, NY employment, CA employment, federal debt, general housing/employment/consumer; UAE: employment, housing, debt; Belgium: emploi, logement, consommateur)
- PDF text extraction using pdfplumber
- Lawyer management with seeded data (6 lawyers)
- Lawyer call booking with AI brief generation
- Case timeline events
- Dashboard stats endpoint
- Risk Score History tracking
- Outcome Predictor via Claude API
- Document Scanner via Claude Vision API (mobile camera OCR)
- Response Letters generation via Claude API
- Stripe Integration (Pro plan $69/mo, lawyer calls $149, webhook)

### Frontend (React + Tailwind CSS)
- Login/Signup pages with Google OAuth
- Dashboard with stats, cases, upload zone, lawyers
- Cases list with filters
- Case detail page with:
  - Risk Score with 4 dimension bars
  - **Risk Score History Graph** (SVG line chart)
  - AI Analysis findings with impact badges
  - Recommended next steps
  - **Outcome Predictor** (collapsible, 3 scenarios)
  - **Key Insight banner** with leverage points
  - **Legal Battle Preview** (user's arguments vs opposing arguments, collapsible)
  - **Probability Breakdown** (horizontal bar chart: settlement/resolution/partial loss/full loss)
  - **Procedural Defects** section with severity badges
  - Response Letters generation modal
- Upload page with:
  - Drag-drop upload zone
  - **5-step progress animation** (reading → extracting facts → analyzing law → building strategy → opposing counsel)
  - **Document Scanner** (camera capture for mobile OCR)
- Lawyers grid with availability, ratings, specialties
- Lawyer booking page with Stripe payment ($149)
- Settings page with Stripe upgrade to Pro ($69/mo)
- Payment Success/Cancel pages

### Integrations
- Emergent Google OAuth for authentication
- Emergent Object Storage for document files
- Anthropic Claude API for 5-pass analysis + Vision OCR + Outcome prediction + Letters
- Stripe (via emergentintegrations) for payments

## Prioritized Backlog

### P0 (Critical - All Done)
- [x] Document upload and 5-pass AI analysis
- [x] Risk Score visualization + History Graph
- [x] User authentication
- [x] Stripe integration (Pro plan + lawyer calls)
- [x] Legal Battle Preview + Probability Breakdown

### P1 (High - All Done)
- [x] Outcome Predictor
- [x] Document Scanner (Mobile Camera OCR)
- [x] Response Letters generation

### P2 (Medium - Upcoming: Multi-Country)
- [ ] Multi-Country Support (USA/UAE/Belgium)
  - Country selector at signup
  - Country-specific Claude system prompts
  - Country-specific lawyers (seed UAE + Belgium)
  - Jurisdiction badges on cases + dashboard banner
  - Settings jurisdiction change with warning modal
  - Country-specific response letters

### P3 (Future)
- [ ] Deadline Alerts (SMS/Email) — requires Twilio + SendGrid keys
- [ ] Save generated letters to case history
- [ ] Mobile responsive sidebar (bottom nav)
- [ ] Download user data functionality
- [ ] Delete account flow
- [ ] Video call integration

## Technical Architecture
- Backend: FastAPI with MongoDB at localhost:27017
- Frontend: React with Tailwind CSS
- Auth: Emergent Google OAuth with session cookies
- Files: Emergent Object Storage
- AI: Anthropic Claude API (claude-sonnet-4-20250514) — 5-pass system
- Payments: Stripe via emergentintegrations library
- DB Collections: users, user_sessions, cases, documents, lawyers, lawyer_calls, letters, case_events, payment_transactions

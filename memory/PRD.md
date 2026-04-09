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
- Claude AI document analysis (claude-sonnet-4-20250514)
- PDF text extraction using pdfplumber
- Lawyer management with seeded data (6 lawyers)
- Lawyer call booking with AI brief generation
- Case timeline events
- Dashboard stats endpoint
- **Feature 2: Risk Score History** — `risk_score_history` array in cases, GET endpoint
- **Feature 4: Outcome Predictor** — POST endpoint with Claude AI predictions
- **Feature 3: Document Scanner** — POST /api/documents/scan with Claude Vision OCR
- **Feature 5: Response Letters** — Letter generation via Claude API
- **Stripe Integration** — Checkout for Pro plan ($69/mo) and lawyer calls ($149), payment status polling, webhook

### Frontend (React + Tailwind CSS)
- Login/Signup pages with Google OAuth
- Dashboard with stats, cases, upload zone, lawyers
- Cases list with filters
- Case detail page with Risk Score, AI findings, next steps
- **Risk Score History Graph** — SVG line chart showing score evolution
- **Outcome Predictor** — Collapsible section with AI-predicted scenarios
- **Response Letters** — Generation modal with PDF download
- Upload page with drag-drop
- **Document Scanner** — Camera capture for mobile OCR scanning
- Lawyers grid with availability, ratings, specialties
- Lawyer booking page with Stripe payment ($149)
- Settings page with Stripe upgrade to Pro ($69/mo)
- Payment Success/Cancel pages with status polling

### Integrations
- Emergent Google OAuth for authentication
- Emergent Object Storage for document files
- Anthropic Claude API for document analysis + Vision OCR + Outcome prediction
- Stripe (via emergentintegrations) for payments

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Document upload and AI analysis
- [x] Risk Score visualization
- [x] User authentication
- [x] Risk Score History Graph
- [x] Stripe integration (Pro plan + lawyer calls)

### P1 (High - Done)
- [x] Outcome Predictor
- [x] Document Scanner (Mobile Camera OCR)
- [x] Response Letters generation

### P2 (Medium - Future)
- [ ] Deadline Alerts (SMS/Email) — requires Twilio + SendGrid keys
- [ ] Save generated letters to case history
- [ ] Mobile responsive sidebar (bottom nav)
- [ ] Real-time lawyer availability refresh
- [ ] Download user data functionality
- [ ] Delete account flow

### P3 (Low - Future)
- [ ] Video call integration
- [ ] Email document intake (.eml parsing)
- [ ] Multi-language support

## Technical Notes
- Backend: FastAPI with MongoDB at localhost:27017
- Frontend: React with Tailwind CSS
- Auth: Emergent Google OAuth with session cookies
- Files: Emergent Object Storage
- AI: Anthropic Claude API (claude-sonnet-4-20250514)
- Payments: Stripe via emergentintegrations library (sk_test_emergent)
- DB Collections: users, user_sessions, cases, documents, lawyers, lawyer_calls, letters, case_events, payment_transactions

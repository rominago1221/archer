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

## What's Been Implemented (Jan 9, 2026)

### Landing Page
- ✅ Hero section with value proposition and Risk Score preview
- ✅ Stats bar (47,284 docs, 12,431 users, $8.2M saved, 4.9 rating)
- ✅ Trust bar with certifications
- ✅ Press logos (Forbes, TechCrunch, etc.)
- ✅ "What Jasper handles" - 9 legal document categories
- ✅ "The Problem" section with demo mockup
- ✅ "How it works" - 4 steps
- ✅ "Talk to a lawyer now" CTA section
- ✅ Attorney profiles grid
- ✅ Pricing cards (Free, Pro $69/mo, Attorney call $149)
- ✅ Reviews section
- ✅ FAQ accordion
- ✅ Final CTA and footer

### Backend (FastAPI + MongoDB)
- ✅ User authentication via Emergent Google OAuth
- ✅ Session management with httpOnly cookies
- ✅ Profile management with notification/privacy settings
- ✅ Cases CRUD with risk score tracking
- ✅ Document upload with Emergent object storage
- ✅ Claude AI document analysis (claude-sonnet-4-20250514)
- ✅ PDF text extraction using pdfplumber
- ✅ Lawyer management with seeded data (6 lawyers)
- ✅ Lawyer call booking with AI brief generation
- ✅ Case timeline events
- ✅ Dashboard stats endpoint

### Frontend (React + Tailwind CSS)
- ✅ Login page with Google OAuth
- ✅ Signup page with plan selection
- ✅ Dashboard with stats, cases, upload zone, lawyers
- ✅ Cases list with filters (All/Active/High Risk/Resolved)
- ✅ Case detail page with:
  - Risk Score visualization
  - AI findings with impact badges
  - Recommended next steps
  - Documents list
  - Timeline events
  - Lawyer CTA for high-risk cases
- ✅ Upload page with drag-drop, file type badges
- ✅ Lawyers grid with availability, ratings, specialties
- ✅ Lawyer booking page with time slots, AI brief preview
- ✅ Settings page with 4 tabs (Account, Plan, Notifications, Privacy)

### Integrations
- ✅ Emergent Google OAuth for authentication
- ✅ Emergent Object Storage for document files
- ✅ Anthropic Claude API for document analysis

## Prioritized Backlog

### P0 (Critical - Blocking core functionality)
- [x] Document upload and AI analysis
- [x] Risk Score visualization
- [x] User authentication

### P1 (High - Important for MVP)
- [ ] Stripe integration for payments ($69/mo Pro plan, $149 lawyer calls)
- [ ] Email notifications (deadline reminders, call confirmations)
- [ ] Document re-analysis when multiple docs in case

### P2 (Medium - Nice to have)
- [ ] Mobile responsive sidebar (bottom nav)
- [ ] Real-time lawyer availability refresh
- [ ] Download user data functionality
- [ ] Delete account flow

### P3 (Low - Future enhancements)
- [ ] AI response draft generation
- [ ] Video call integration
- [ ] Email document intake (.eml parsing)
- [ ] Multi-language support

## Next Tasks
1. Integrate Stripe for Pro plan subscriptions and lawyer call payments
2. Add email notifications using SendGrid or Resend
3. Implement mobile responsive bottom navigation
4. Add skeleton loaders for all API calls
5. Implement proper error boundaries

## Technical Notes
- Backend runs on FastAPI with MongoDB
- Frontend uses React with Tailwind CSS
- Auth uses Emergent Google OAuth with session cookies
- Files stored in Emergent Object Storage
- AI analysis via direct Anthropic Claude API call

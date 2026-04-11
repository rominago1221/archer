# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Now includes a complete Attorney Portal.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl, de, es): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.
- Both jurisdiction and language are independent and visible on every page.

## What's Been Implemented

### Attorney Portal (NEW — Apr 11 2026)
- **Dual Login System**: Two-card selector ("I'm a client" / "I'm an attorney") on Login page
- **Attorney Application Flow**: 7-step onboarding (Personal → Professional → Specialties → Profile → Pricing → Stripe Connect → Review & Submit)
- **Attorney Dashboard** (`/attorney/dashboard`): 4 metric cards, availability toggle, upcoming calls, recent activity
- **Attorney Sidebar Layout**: 7 nav items + online/offline toggle + sign out
- **Attorney Calls** (`/attorney/calls`): Scheduled sessions with filters
- **Attorney Cases** (`/attorney/cases`): Read-only case view with private notes
- **Attorney Legal Research** (`/attorney/research`): Technical attorney-grade James with unlimited usage
- **Attorney Profile Editor** (`/attorney/profile`): Bio, specialties, pricing slider ($149-$500), availability schedule
- **Attorney Earnings** (`/attorney/earnings`): Revenue dashboard with session table
- **Attorney Settings** (`/attorney/settings`): 4 tabs (Availability, Notifications, Pricing, Account)
- **Public Attorney Profile** (`/attorneys/:slug`): Client-facing profile with booking card + reviews
- **Video Calls** (`/video-call/:callId`): Daily.co integration with room creation, tokens, timer, brief panel, notes
- **AI Case Brief**: Claude-generated 7-section pre-call brief for attorneys
- **Booking Flow**: Client books attorney call with dynamic pricing + Stripe checkout
- **Attorney Route Guard**: `AttorneyRoute` component protects `/attorney/*` routes
- **DB Collections**: `attorney_profiles`, `attorney_calls`, `attorney_activity`, `attorney_case_notes`, `attorney_research_convs`, `attorney_research_msgs`

### James Conversational Document Creator (Apr 11 2026)
- Two-column layout: sidebar + conversational main area
- Backend: POST /api/documents/james/send, GET /conversations, /recent, /messages

### Complete Audit & Bug Fixes (Apr 11 2026)
- Outcome Predictor 3 scenario cards fixed (field mapping)
- Cases list deadline display improved
- Lawyers page jurisdiction filter fixed
- Timeline events translated

### Legal Chat — James AI Attorney
- Direct httpx call to Claude API (claude-sonnet-4-20250514)
- Free plan limit (3 questions), Pro unlimited

### Multi-Document Analysis System
- Combined chronological analysis, contradiction detection
- Case Brief PDF generation for 5+ documents

### Core Features
- Document upload & AI analysis (PDF, DOCX, TXT, EML, images)
- Claude Vision OCR, Risk Score + History Graph
- Legal Battle Preview, Outcome Predictor, Response Letters
- Case Sharing, Contract Guard, Document Library, Document Scanner

### Integrations
- Emergent Google OAuth, Object Storage
- Anthropic Claude (claude-sonnet-4-20250514) with Vision + web_search
- Daily.co Video Calls
- Stripe Checkout + planned Connect
- CourtListener API, pymupdf, python-docx, jsPDF

## Prioritized Backlog

### P1 (High)
- [ ] Stripe Connect OAuth for attorney payouts (80/20 split)
- [ ] HelloSign / Dropbox Sign (e-signature) — needs user API key
- [ ] Email notifications (SendGrid/Resend) — needs API keys

### P2 (Medium)
- [ ] Full UI translation for Dashboard, Upload, My Cases (FR/NL/DE/ES)
- [ ] Deadline Alerts (SMS/Email) — needs Twilio + SendGrid keys
- [ ] Mobile Document Scanner (Camera integration)

### P3 (Future)
- [ ] Refactor server.py (6000+ lines → modular routers)
- [ ] Multi-Country expansion
- [ ] Post-call client rating flow
- [ ] Attorney application admin panel

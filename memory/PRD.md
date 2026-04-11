# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.jurisdiction`.
- **Language** (en, fr, nl): UI language. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.

## What's Been Implemented

### Attorney Onboarding & Admin Flow (Apr 11 2026) — LATEST
- **Post-signup redirect**: Attorney apply → instant redirect to /attorney/dashboard (no more dead-end page)
- **Dashboard pending mode**: Yellow banner "Under review — 24h", locked features (availability, calls, earnings) with lock overlay, unlocked profile editing
- **Dashboard approved mode**: All features unlocked, green toast "Your profile is now live"
- **Rejected mode**: Red banner with rejection reason + reapply link
- **Admin page** (/admin/attorneys): Table with filter pills (All/Pending/Approved/Rejected), approve/reject buttons, reject modal requires reason
- **Email notifications** (MOCKED — SendGrid not configured, logs instead):
  - To attorney: Confirmation email on application
  - To admin: New application notification with APPROVE/REJECT links
  - To attorney: Approval or rejection email
- **Quick-action links**: Admin can approve via email link (token-based)
- Env vars: ADMIN_EMAIL, EMAIL_FROM, SENDGRID_API_KEY (when provided, real emails sent)

### Jurisdiction Switching + Onboarding (Apr 11 2026)
- 🇺🇸/🇧🇪 pills, backend filtering, 2-step educational overlay

### Next Actions Redesign + Letter Form Modal (Apr 11 2026)
- 3 action types, LetterFormModal with pre-fill

### Real-Time Post-Upload + James Chat + In-Case Upload (Apr 11 2026)
- 2s polling, re-analyzing banner, toast, chat drawer, AddDocumentModal

### Integrations
- Emergent LlmChat, Google OAuth, Object Storage, Daily.co, Stripe, CourtListener

## Prioritized Backlog

### P0
- [ ] Refactor server.py (6500+ lines → modular routers)

### P1
- [ ] Deadline Alerts (Twilio/SendGrid) — can activate emails once SendGrid key provided
- [ ] HelloSign / Dropbox Sign
- [ ] Mobile Document Scanner

### P2-P3
- [ ] Stripe Connect, Full UI translation, Multi-country expansion

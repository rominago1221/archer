# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers.

## What's Been Implemented

### Letter Modal Auto-Fill (Apr 11 2026) — LATEST
- YOUR INFO: name/email/address pre-filled from profile, LOCKED (gray, readOnly) when available
- RECIPIENT INFO: opposing party name/address/date/amount pre-filled from Claude analysis, EDITABLE
- Hints: "From your profile" (locked) / "Detected by James from your document" (auto-detected)
- Incomplete profile banner with "Complete profile →" link
- autocomplete='off' on recipient fields
- Backend: _build_case_update extracts opposing_party_name, document_date, primary_amount from Pass 1

### Attorney Onboarding & Admin (Apr 11 2026)
- Post-signup redirect, pending/approved dashboard modes, admin page, email system

### Jurisdiction Switching + Onboarding (Apr 11 2026)
- 🇺🇸/🇧🇪 pills, backend filtering, educational overlay

### Previous Features
- Next Actions (3 types), Real-time polling, James chat drawer, AddDocumentModal, 12-feature Dashboard/CaseDetail parity

## Prioritized Backlog
### P0: Refactor server.py (6500+ lines)
### P1: Activate SendGrid emails, HelloSign, Mobile Scanner
### P2: Stripe Connect, Full translation, Multi-country

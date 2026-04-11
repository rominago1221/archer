# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers. Upload legal documents, get AI risk analysis, manage cases, chat with AI attorney James, and connect with real lawyers. Features a Virtual Legal Cabinet Dashboard, Attorney Portal, and James Document Creator.

## Core Architecture
- **Jurisdiction** (US or BE): Determines which laws apply. Stored as `user.country`.
- **Language** (en, fr, nl): Determines UI language ONLY. Stored as `user.language`.
- **Account Type** (client or attorney): Determines dashboard and routing.

## What's Been Implemented

### In-Case Document Upload Modal (Apr 11 2026) — LATEST
- "Add document" button on Dashboard + CaseDetail now opens AddDocumentModal (never redirects to /upload)
- Modal features: drag & drop upload zone (PDF/Word/JPEG/PNG/scan, 20MB max), context textarea (500 chars), "Analyze with James" + "Cancel" buttons
- After upload: modal closes, James re-runs full 5-pass analysis in background, case refreshes automatically
- Trilingual: EN/FR/NL

### Dashboard 12-Feature Parity with CaseDetail (Apr 11 2026)
All 12 features on both Dashboard and CaseDetail:
Download Brief, Share, Score History Graph, Horizontal Battle Preview, James Q&A, Jurisprudence, Outcome Predictor, Risk Monitor, Next Actions with Generate letter/Book a call, Letter/Share Modals, PDF Brief, New Case Overlay

### UX Fixes (Apr 11 2026)
- After login → most recent case auto-selected
- Empty state: James avatar welcome
- Logo click → / on all pages
- "My Dashboard" button on landing when logged in

### Integrations
- Emergent LlmChat (claude-sonnet-4-20250514), Emergent Google OAuth, Object Storage
- Daily.co Video Calls, Stripe Checkout, CourtListener API

## Prioritized Backlog

### P0 (Critical)
- [ ] Refactor server.py (6300+ lines -> modular routers)

### P1 (High)
- [ ] Deadline Alerts (Twilio/SendGrid) — awaiting keys
- [ ] HelloSign / Dropbox Sign — awaiting keys
- [ ] Mobile Document Scanner
- [ ] Stripe Connect for attorney payouts

### P2-P3
- [ ] Email notifications, Full UI translation, Multi-country expansion, Post-call rating

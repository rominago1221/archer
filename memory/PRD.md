# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a virtual legal cabinet for US and Belgian consumers.

## What's Been Implemented

### Four Fixes (Apr 12 2026) — LATEST
1. **Back button → /dashboard**: CaseDetail "← Back" always navigates to /dashboard
2. **Next Actions redesign**: Blue left border accent (3px), light blue bg (#f0f7ff), bell icon, 15px bold titles, stronger card borders (1px #d1d5db), 14px padding
3. **Document clicking**: Individual documents shown in right panel, clickable → navigates to /documents/{documentId} with DocumentViewer page (preview, download, delete, James analysis)
4. **Font size +15%**: All CaseDetail fonts increased (9→12, 10→12, 11→13, 12→14, 13→15, 14→16). Dashboard unchanged.

### Previous Features
- Document Library redesign (Generate + Browse 158 templates)
- Letter Modal auto-fill, Attorney Onboarding, Jurisdiction Switching, Real-time polling, James chat drawer

### Integrations
- Emergent LlmChat, Google OAuth, Object Storage, Daily.co, Stripe, CourtListener

## Prioritized Backlog
### P0: Refactor server.py (6500+ lines)
### P1: SendGrid activation, HelloSign, Mobile Scanner
### P2: Stripe Connect, Full translation, Multi-country

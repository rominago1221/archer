# Jasper - Legal Tech AI Platform PRD

## What's Been Implemented

### 6 Global Claude Prompt Fixes (Apr 12 2026) — LATEST
1. **James Clarification**: Claude MUST generate 1 question with 2-4 buttons per analysis. Retry logic if missing. Fallback default.
2. **Battle Preview**: Pass 4A MUST produce 4-5 user arguments. Auto-retry if < 3.
3. **Outcome Predictor**: Values clamped 2-95%, sum=100%. Risk-based fallback if all 0%. French field name fallbacks added.
4. **Next Actions**: Must reference specific laws/statutes. Never generic.
5. **Language**: 100% language enforcement ("ZERO English words allowed" for non-EN).
6. **Score History**: Y-axis 0-100 with gridlines, X-axis with dates — now on BOTH Dashboard and CaseDetail.

### Previous Features
- Document Library (158 templates), Document Viewer, Next Actions (3 types), Letter Modal auto-fill, Attorney Onboarding/Admin, Jurisdiction Switching + Onboarding, Real-time polling, James chat drawer, AddDocumentModal, Navbar switcher (jurisdiction + language), Font +15% CaseDetail

## Prioritized Backlog
### P0: Refactor server.py (6600+ lines)
### P1: SendGrid, HelloSign, Mobile Scanner
### P2: Stripe Connect, Full translation, Multi-country

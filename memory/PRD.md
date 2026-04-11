# Jasper - Legal Tech AI Platform PRD

## Original Problem Statement
Build Jasper — a legal tech AI platform for US and Belgian consumers.

## What's Been Implemented

### Document Library Redesign (Apr 11 2026) — LATEST
- **Two-column layout**: 220px sidebar + main area
- **GENERATE mode** (default): James chat with 8 category cards (Employment, Housing, NDA, Business, Debt, Family, Freelance, Consumer), suggestion chips, document preview with HelloSign/Download/Edit
- **BROWSE mode**: 158 templates in 2-column grid, filter pills (15 categories), search bar, "Generate →" on hover
- Mode persisted in localStorage
- All 158 templates across 15 categories: Employment(22), Housing(18), NDA(8), Business(20), Freelance(10), Consumer(12), Debt(10), Family(12), Real Estate(10), IP(8), Court(8), Immigration(8), Government(7), Education(5)

### Previous Features (All Working)
- Letter Modal Auto-Fill, Attorney Onboarding, Jurisdiction Switching, Next Actions, Real-Time Polling, James Chat Drawer, AddDocumentModal, Dashboard/CaseDetail 12-feature parity

### Integrations
- Emergent LlmChat, Google OAuth, Object Storage, Daily.co, Stripe, CourtListener

## Prioritized Backlog
### P0: Refactor server.py (6500+ lines)
### P1: Activate SendGrid, HelloSign, Mobile Scanner
### P2: Stripe Connect, Full translation, Multi-country

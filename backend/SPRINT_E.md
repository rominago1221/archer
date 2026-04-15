# Sprint E — Calendly + Daily.co + Live Counsel

Builds on Sprints A/B/C/D. Adds the **second monetized service**: Live Counsel,
30-minute video consultations at €149 / $149.

## The flow (v2, critical sequencing)

```
Client clicks "Request Live Counsel €149"
  ↓
POST /api/cases/:id/checkout/live-counsel
  ↓ (pre-flight: has_available_attorney_for — returns 409 NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL if none)
Stripe Checkout Session → client pays
  ↓
Webhook /api/webhooks/stripe (payment_intent.succeeded, service_type=live_counsel)
  ├─ case.payment_status = "paid"
  └─ assign_case_to_attorney(service_type="live_counsel")
      ├─ matches an attorney with Calendly + same jurisdiction + specialty
      └─ creates case_assignments with status="awaiting_calendly_booking"
         (no "pending" → "accepted" step; attorney implicitly committed)
  ↓
Client polls GET /api/cases/:id/live-counsel/booking-info (every 4s)
  → returns calendly_booking_url with utm_content=<assignment_id>
  ↓
Client books a slot on Calendly
  ↓
Webhook POST /api/webhooks/calendly (invitee.created, SIGNATURE VERIFIED)
  ├─ extract utm_content → assignment_id
  ├─ status transitions "awaiting_calendly_booking" → "accepted"
  ├─ scheduled_at populated, Daily.co room created
  └─ emails to client + attorney
  ↓
1h before: reminder emails to both (idempotent flag reminder_1h_sent)
10min before: reminder emails (idempotent flag reminder_10min_sent)
  ↓
At T-15 min: attorney & client can POST /live-counsel/join → meeting_token
  → open room_url?t=token&userName=X in new tab
  ↓
T + 30min: cron mark_completed_live_counsels (only if call_started_at set)
  ├─ status = "completed"
  ├─ Daily.co room deleted
  ├─ thank-you email to client
  └─ Monday 09:00 UTC: weekly_payouts cron includes the payout (Sprint D)
```

## What shipped

### Backend
- `services/daily_co.py` — native Stripe-style wrapper (sync `requests`, invoked via `asyncio.to_thread()`). `enable_recording` is **intentionally OFF** (GDPR + attorney-client privilege).
- `services/attorney_matching.py` — added `requires_calendly` param, `has_available_attorney_for()` pre-flight helper. Live Counsel assignments created with `status="awaiting_calendly_booking"` + 7-day expiry + client snapshot frozen immediately. Pricing for `live_counsel` updated to 14900¢ (€149 / $149).
- `routes/calendly_routes.py` — `POST /attorneys/calendly/connect` + `/disconnect` with regex validation.
- `routes/calendly_webhook.py` — `POST /api/webhooks/calendly` with **HMAC-SHA256 signature verification** (`CALENDLY_WEBHOOK_SIGNING_KEY`). Binds bookings via `utm_content = case_assignment_id`. Unknown assignment_id → log warning + no-op (no fake rooms).
- `routes/stripe_webhooks.py` (unchanged, already dispatches on `service_type` metadata)
- `routes/live_counsel_routes.py` — 5 endpoints:
  - `POST /cases/:id/checkout/live-counsel` (client)
  - `GET /cases/:id/live-counsel/booking-info` (client, pollable)
  - `POST /cases/:id/live-counsel/join` (client)
  - `POST /attorneys/cases/:id/live-counsel/join` (attorney)
  - `GET /attorneys/live-counsel/upcoming`
  - `GET /attorneys/live-counsel/stats`
- `jobs/portal_maintenance.py` — `run_tick()` extended with `send_live_counsel_reminders()` (1h + 10min, idempotent) and `mark_completed_live_counsels()` (auto-close + delete room + email). Same 1-min scheduler, no separate job.
- `utils/attorney_auth.py` — `migrate_sprint_e_fields()` adds `calendly_url`, `calendly_url_validated` on attorneys, plus Live Counsel fields on `case_assignments` (scheduled_at, daily_co_*, calendly_*, reminder_*, call_started_at, call_ended_at). New indexes.

### Frontend
- Hook `useLiveCounsel` (stats + upcoming, auto-refresh 30s)
- Pages: `/attorneys/live-counsel`
- Components: `LiveCounselStats`, `UpcomingCallsList`, `UpcomingCallCard` (with Join button + countdown), `CalendlyIntegrationCard` (connect/disconnect + non-blocking HEAD ping + help text)
- Sidebar: "Live Counsel" link activated
- Client: `LiveCounselCTA` (gradient card "Request consultation €149", intercepts NO_ATTORNEY_AVAILABLE 409), `LiveCounselBookingFlow` (poll booking-info → embed Calendly iframe with fallback tab, or "Join call" button if already scheduled) — both wired into `CaseDetailV7`

### Environment (add to `.env`)
```
CALENDLY_WEBHOOK_SIGNING_KEY=<from Calendly webhook dashboard>
DAILY_CO_API_KEY=<from Daily.co dashboard>
DAILY_CO_API_BASE=https://api.daily.co/v1
```

## New statuses & fields

### case_assignments
- **NEW status**: `"awaiting_calendly_booking"` (between payment and booking).
  Live Counsel assignments never go through `"pending"`. They go straight from
  creation → `awaiting_calendly_booking` → `accepted` (via Calendly webhook) → `completed`.
- New fields: `scheduled_at`, `daily_co_room_url`, `daily_co_room_name`,
  `calendly_event_url`, `calendly_invitee_uri`, `reminder_1h_sent`,
  `reminder_10min_sent`, `call_started_at`, `call_ended_at`

### attorneys
- `calendly_url: str | null`, `calendly_url_validated: bool`

## Security

**Calendly webhook signature (critical).** We verify `Calendly-Webhook-Signature`
(format `t=<timestamp>,v1=<hmac>`) against `CALENDLY_WEBHOOK_SIGNING_KEY`
using HMAC-SHA256. Without a valid signature → 401. Tested with:
- Missing header → 401
- Invalid signature → 401
- Tampered payload → 401 (HMAC no longer matches)
- Valid signature → 200

**utm_content binding.** Calendly echoes `utm_content` natively in the webhook
payload under `payload.tracking.utm_content`. We use the `case_assignment_id`
(not `case_id`) so even if the attorney accidentally alters their Calendly
custom questions, nothing breaks — UTM is native Calendly infrastructure.

**Pre-flight availability check.** Client checkout returns 409 with
`NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL` if no matching Calendly-ready
attorney exists. The client never pays then waits forever.

**Fail-closed webhook.** If `CALENDLY_WEBHOOK_SIGNING_KEY` is unset, all webhook
calls are rejected (logged as config error). Do not deploy without this env var.

## Tests (19 new)

`test_live_counsel.py` covers:
- **Calendly signature (4 security tests)** — missing / invalid / tampered / valid
- Calendly URL validation (3) — accept/reject/auth
- Daily.co service layer (3) — create_room, meeting_token is_owner, **enable_recording absent**
- Matching (2) — requires_calendly filter, returns None when no Calendly
- Reminders (2) — 1h sent+idempotent, 10min distinct from 1h
- Completion cron (1) — only closes calls with call_started_at (no-shows skipped)
- Attorney join (2) — too-early 400, wrong-attorney 403
- Pre-flight (1) — NO_ATTORNEY_AVAILABLE_FOR_LIVE_COUNSEL 409
- Webhook graceful no-op on unknown assignment_id (1)

## Delivery checklist

```bash
cd ~/Documents/archer/backend

# 1. Add env vars (CALENDLY_WEBHOOK_SIGNING_KEY, DAILY_CO_API_KEY)

# 2. Install (no new dep — `requests` already pinned)

# 3. Tests
SCHEDULER_ENABLED=false WEEKLY_PAYOUTS_ENABLED=false \
  pytest tests/test_live_counsel.py -v
# All 19 must pass. If signature tests fail → webhook secret not loaded.

# 4. Configure Calendly webhook
#  - In Calendly dashboard → Integrations → Webhooks
#  - Add endpoint: https://<your-domain>/api/webhooks/calendly
#  - Events: invitee.created, invitee.canceled
#  - Copy signing key → CALENDLY_WEBHOOK_SIGNING_KEY

# 5. Smoke test end-to-end
#  a. Attorney: /attorneys/live-counsel → connect Calendly URL
#  b. Client: on a case, click "Demander consultation" → pays €149 with test card
#  c. Backend: Stripe CLI forwards payment_intent.succeeded → assignment created
#     status=awaiting_calendly_booking
#  d. Client page: booking-info poll resolves → Calendly iframe appears
#  e. Client books a slot → Calendly webhook fires (signature checked) →
#     status=accepted, Daily.co room created
#  f. At T-15min: client and attorney click "Join" → opens Daily.co room
#  g. At T+30min: cron marks completed, emails thank-you
#  h. Next Monday 09:00: weekly_payouts cron includes this €104.30 payout
```

## Known limitations / deferred

- **Free consultations for Pro tier** → Sprint F (tier system not yet defined)
- **Recording** → intentionally OFF. Rebrand with consent flow (checkbox + email mention + pause button during call) before enabling.
- **Reschedule from Archer UI** → must be done from the Calendly dashboard directly. `invitee.canceled` webhook clears `scheduled_at` + Daily room; a new `invitee.created` will re-populate.
- **No-show detection** → cron only closes calls with `call_started_at` set. If neither party joins, the assignment sits in `accepted` past its scheduled date. Admin can manually close + refund.
- **7-day booking window** → if a paying client never books on Calendly, the assignment expires in 7 days but is NOT refunded automatically (admin manual). Consider adding a cron to refund unbooked live counsel after 7 days in a future sprint.
- **Daily.co free tier: 10k min/month** → ≈333 calls at 30min each. Monitor. Upgrade to $9/month plan at 25k min when scaling.

## Not in Sprint E

- `live_counsel_active` flag on `cases` (used by `CaseDetailV7` to hide the CTA) — the current frontend reads this flag but the backend does not set it. Quick follow-up: extend the client case detail endpoint to include `live_counsel_active = bool(active case_assignments of type live_counsel)`. Tagged as a post-merge patch.
- Attorney rating/review after each call — brief references an "evaluate" CTA in the "Merci !" email, but no endpoint/DB model yet. Deferred.

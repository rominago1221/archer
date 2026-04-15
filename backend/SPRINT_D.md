# Sprint D — Stripe Connect + Payouts + Earnings Page

Builds on Sprints A/B/C. Unlocks monetization end-to-end:
attorney onboards Stripe → receives cases → uploads signed letter → paid every Monday.

## What shipped

### Backend — Stripe Connect onboarding
- `backend/services/stripe_connect.py` — native Stripe SDK wrappers (Account.create, AccountLink, login_link, retrieve, IBAN extraction). Synchronous SDK invoked via `asyncio.to_thread()`.
- `backend/routes/stripe_connect_routes.py` — 3 endpoints at `/api/attorneys/stripe/*`:
  - `POST /onboarding/start` — creates Connect Express account (BE/US), returns onboarding URL, reuses existing account if present
  - `GET /onboarding/status` — reads `charges_enabled ∧ payouts_enabled ∧ details_submitted`, auto-marks complete on transition, fires `notify_attorney_stripe_ready` + `notify_admin_attorney_ready`
  - `GET /dashboard-link` — magic login link to Stripe Express dashboard
- `backend/routes/stripe_webhooks.py` — `POST /api/webhooks/stripe` (**plural**, distinct from legacy singular) with 5 handlers:
  - `account.updated` — same "mark complete" logic as status check (backup path)
  - `payment_intent.succeeded` — sets `case.payment_status="paid"` + `attorney_status="waiting_assignment"` + triggers Sprint C matching. **Idempotent**.
  - `payout.paid` / `payout.failed` — update `payouts.status`
  - `transfer.failed` — mark `payouts` as failed + email admin/attorney

### Backend — Weekly payouts cron
- `backend/jobs/weekly_payouts.py` — `process_weekly_payouts()` aggregates `case_assignments` where `status="completed" AND paid_out_at IS NULL` per attorney, calls `stripe.Transfer.create`, marks assignments paid, records in `payouts`. Skips micro-payouts (<100¢). **Idempotent via `paid_out_at IS NULL`**.
- `backend/jobs/scheduler.py` — adds `weekly_payouts` cron job `day_of_week=mon, hour=9, minute=0` UTC on the same `AsyncIOScheduler` as Sprint C. Flag `WEEKLY_PAYOUTS_ENABLED=true/false`.

### Backend — Client checkout + Earnings
- `backend/routes/client_checkout_routes.py` — `POST /api/cases/:id/checkout/attorney-letter` creates a native Stripe Checkout Session (€39 BE / $49 US, currency from `current_user.country`). Metadata duplicated on `payment_intent_data.metadata` so the webhook receives `case_id` + `service_type` + `user_id`.
- `backend/routes/attorney_earnings_routes.py` — 3 endpoints at `/api/attorneys/earnings/*`:
  - `GET /summary` — this_month / total / next_payout + IBAN + stripe_ready
  - `GET /chart?period=3m|12m|all` — per-month `amount_cents` with labels
  - `GET /payouts?limit=20` — payouts history desc

### Frontend
- `frontend/src/hooks/attorneys/useStripeConnect.js` — `startOnboarding()`, `checkStatus()`, `openStripeDashboard()`
- `frontend/src/pages/Attorneys/StripeOnboarding.jsx` — onboarding intro page with Stripe branding
- `frontend/src/pages/Attorneys/StripeOnboardingComplete.jsx` — return handler (complete / resume-needed)
- `frontend/src/pages/Attorneys/Earnings.jsx` — main earnings page. **Shows empty-state + CTA if `!summary.stripe_ready`** (no leak of partial data).
- Components: `EarningsHero` (gradient blue hero with 3 stats), `EarningsChart` (SVG with 3m/12m/all toggle + hover tooltip), `StripeConnectBand` (purple band with IBAN + "Manage in Stripe"), `PayoutsTable` (status badges)
- Sidebar: **aggressive red "Action requise" banner** visible on every attorney page when `!stripe_onboarding_completed`, routing to `/attorneys/onboarding/stripe`. Earnings link is also enabled.
- Routes added: `/attorneys/earnings`, `/attorneys/onboarding/stripe`, `/attorneys/onboarding/stripe/complete`, `/attorneys/onboarding/stripe/refresh`

### Pre-flip email blast
- `backend/scripts/notify_attorneys_stripe_required.py` — argparse CLI, dry-run by default, 7-day deadline configurable, HTML email with direct CTA to `/attorneys/onboarding/stripe`. Prints summary (total / sent / skipped / errors).

### Data model changes (migrated idempotently)
- `attorneys`: `stripe_onboarding_started_at`, `stripe_onboarding_completed_at`, `stripe_iban_last4` (all nullable)
- `cases`: `payment_status`, `payment_intent_id`, `amount_paid_cents`, `paid_at` (written by webhook)
- New collection `payouts`: `id, attorney_id, stripe_transfer_id, stripe_payout_id, amount_cents, currency, period_start, period_end, assignment_count, status (pending|paid|failed|cancelled), failure_reason, iban_last4, created_at, paid_at`

## Endpoints (Sprint D additions)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/attorneys/stripe/onboarding/start` | attorney | Create/reuse Connect account, return onboarding URL |
| GET    | `/api/attorneys/stripe/onboarding/status` | attorney | Check Stripe state, mark complete if ready |
| GET    | `/api/attorneys/stripe/dashboard-link` | attorney | Magic link to Stripe Express dashboard |
| POST   | `/api/webhooks/stripe` | Stripe | **Connect events** (distinct from legacy `/api/webhook/stripe`) |
| POST   | `/api/cases/:case_id/checkout/attorney-letter` | client | Create Stripe Checkout Session |
| GET    | `/api/attorneys/earnings/summary` | attorney | Hero stats |
| GET    | `/api/attorneys/earnings/chart?period=...` | attorney | Monthly breakdown |
| GET    | `/api/attorneys/earnings/payouts?limit=...` | attorney | Payouts history |

## Tests (36 Sprint D, all mocked — no live Stripe calls)

- `test_stripe_onboarding.py` (10) — Connect account creation params, IBAN extraction, webhook handler `account.updated` (mark complete, idempotent, ignore incomplete), signature validation
- `test_weekly_payouts.py` (6) — aggregation, no-op, micro-skip, no-Stripe skip, **idempotency**, USD currency
- `test_earnings_endpoints.py` (6) — summary structure, growth %, chart 12m/3m, payouts sort, auth
- `test_attorney_letter_checkout.py` (5) — auth, cross-user 403, already-paid 409, webhook triggers matching, idempotent

## 🚨 The flip — 4-step sequence

Do NOT set `REQUIRE_STRIPE_ONBOARDING=true` in prod before completing these 4 steps.

### Step 1 — Notify existing attorneys (Day T)
```bash
# Dry-run first — inspect the list
python backend/scripts/notify_attorneys_stripe_required.py

# Send
python backend/scripts/notify_attorneys_stripe_required.py --send
```
The email sets a **7-day deadline**. All active attorneys without `stripe_onboarding_completed` receive a CTA to `/attorneys/onboarding/stripe`.

### Step 2 — Wait 7 days (Day T → Day T+7)
Monitor via `/admin/matching` how many attorneys transition to `stripe_onboarding_completed=true`. If many are still pending, send a reminder script run or extend the deadline.

### Step 3 — Flip the flag in prod (Day T+7)
Update production `.env`:
```
REQUIRE_STRIPE_ONBOARDING=true
```
Restart the backend. `.env.example` is already set to `true`.

### Step 4 — Verify
1. `/admin/matching` — the `AttorneysWorkloadTable` shows a `no-stripe` tag on rows where `stripe_onboarding_completed=false`. Those attorneys must not appear in `recent_events` as `auto_matched`.
2. Grep logs for `"no_match"` actions in the first hour — if the rate jumps, Stripe-gating is now excluding too many attorneys. Decide: extend deadline, manually onboard, or accept the reduction.
3. Run an end-to-end smoke test: client checkout → payment_intent.succeeded → Sprint C matching picks only Stripe-ready attorneys.

## Delivery checklist

```bash
# 0. Add env vars (see .env.example section "Sprint D")

# 1. Install (already pinned)
pip install -r requirements.txt   # stripe==15.0.1, APScheduler==3.11.0

# 2. Unit + service tests (Stripe mocked via monkeypatch)
SCHEDULER_ENABLED=false WEEKLY_PAYOUTS_ENABLED=false \
  pytest backend/tests/test_stripe_onboarding.py \
         backend/tests/test_weekly_payouts.py -v

# 3. Integration tests (backend running, SendGrid optional)
REACT_APP_BACKEND_URL=http://localhost:8000 \
  pytest backend/tests/test_earnings_endpoints.py \
         backend/tests/test_attorney_letter_checkout.py -v

# 4. Manual smoke — full flow
#  a. Attorney logs in → sidebar shows red "Action requise" banner
#  b. Click → /attorneys/onboarding/stripe → click Configure → Stripe test flow
#     (SSN = 000-00-0000, DOB 01/01/1901, test IBAN from Stripe docs)
#  c. Return to /attorneys/onboarding/stripe/complete → status=complete
#  d. Sidebar banner disappears, Earnings page now shows hero/chart/payouts
#  e. Client: POST /cases/:id/checkout/attorney-letter with Bearer token
#  f. Open checkout_url, pay with 4242 4242 4242 4242
#  g. Stripe CLI: stripe listen --forward-to localhost:8000/api/webhooks/stripe
#  h. Verify case.payment_status=paid and matching assignment created
#  i. Upload signed letter, wait for next Monday 09:00 UTC (or trigger manually):
#     python -c "import asyncio; from jobs.weekly_payouts import process_weekly_payouts; \
#                print(asyncio.run(process_weekly_payouts()))"
#  j. Email "Versement en route" arrives, payout row pending, next Stripe webhook
#     payout.paid will promote it to paid.
```

## Not in Sprint D

- Free attorney letter tier (Solo plan) — deferred until tier system is defined
- PDF statement download (`/earnings/statement`) — endpoint stub mentioned in original brief, removed for scope
- Retry queue for failed email send (V1.1)
- Currency conversion (we never convert; EUR stays EUR, USD stays USD)
- Calendly / Live counsel (Sprint E)

## Known limits & knobs

- `PAYOUT_MIN_CENTS=100` — under 1€ is skipped. Tune if needed.
- Scheduler runs both `portal_maintenance` (every minute) and `weekly_payouts` (Mondays 09:00 UTC) on the same `AsyncIOScheduler`. If the server restarts between Mon 09:00 and 09:01, the cron **misses that tick** (APScheduler does not backfill). Idempotent re-run via manual script recommended if this happens.
- `stripe.Transfer.create` is blocking; we run via `asyncio.to_thread()`. If Stripe is slow (>30s), the cron tick for that attorney will block but not crash — failed attorneys are isolated and `_notify_admin_payout_failed` is invoked.
- Webhook handlers always respond 200 after logging exceptions — this prevents Stripe from hammering us with retries. Rely on logs for forensics.

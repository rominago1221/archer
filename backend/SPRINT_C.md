# Sprint C — Attribution algo + Cron réassignation + Notifications

Builds on Sprints A (auth) and B (inbox + case detail + anonymization).
Automates everything that was manual in Sprint B: matching, reassignment, notifications.

## What shipped

### Backend
- `backend/services/attorney_matching.py` — pure matching logic + orchestration
  - `compute_match_score()` (testable in isolation, coefficients via env vars)
  - `match_case_to_attorney()` — filters + scoring, returns `(attorney, candidates_count)`
  - `assign_case_to_attorney()` — **the only function other code should call** to create an assignment. Handles log, metrics, client-status, email notifications.
  - `increment_active_cases()` / `record_response_time()` (EMA α=0.3)
  - `log_matching_event()` — writes to `attorney_matching_log`
  - 4 notification functions (new case / accepted / expiring / client searching)
- `backend/jobs/portal_maintenance.py` — consolidated 1-min cron tick
  - `(a) expire_and_reassign()` — expires pending assignments past window, log event, decrement counter, rebuild exclude list, reassign
  - `(b) send_expiring_warnings()` — 15-min threshold, idempotent via `expiring_email_sent` flag
  - `(c) maybe_send_health_alert()` — admin email when >10% unmatched/24h, throttled 1h
- `backend/jobs/scheduler.py` — `AsyncIOScheduler` wiring with `SCHEDULER_ENABLED` flag
- `backend/routes/admin_matching_routes.py` — 3 admin endpoints
- `backend/routes/client_attorney_request_routes.py` — client trigger
- Hooks added to `attorney_portal_cases.py` (accept/decline/upload) to keep counters & logs in sync
- Migration `migrate_sprint_c_fields()` — idempotent backfill of new fields
- 18 unit/algo tests + 5 cron tests + 8 integration tests

### Frontend
- Pages: `Admin/MatchingDashboard.jsx` at `/admin/matching`
- Components: `AdminStatsBar`, `AttorneysWorkloadTable`, `UnmatchedCasesList`, `ManualAssignModal`, `AttorneyStatusBanner` (client-side waiting banner)
- Inbox polling diff → toast `🔔 Nouveau cas attribué : #XXXX` whenever polling surfaces a new assignment_id

## Environment variables (Sprint C)

Add to `.env`:

```
# Matching algorithm
REQUIRE_STRIPE_ONBOARDING=false        # flip to true after Sprint D
MATCHING_WEIGHT_LOAD=5
MATCHING_WEIGHT_RATING=3
MATCHING_WEIGHT_SPEED=1

# Timing
ASSIGNMENT_EXPIRY_MINUTES=30
ASSIGNMENT_EXPIRING_WARNING_MINUTES=15
MATCHING_REASSIGN_INTERVAL_MINUTES=1

# Scheduler
SCHEDULER_ENABLED=true                 # disable in local/tests

# Notifications
ADMIN_NOTIFY_EMAIL=romain@archer.legal
APP_URL=https://archer.legal
```

## Endpoints (Sprint C additions)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/cases/:case_id/request-attorney-letter` | client | Sets `attorney_status="waiting_assignment"` + triggers matching. Idempotent. |
| GET    | `/api/admin/matching/dashboard` | admin | Today stats + attorneys workload + unmatched + recent 20 events |
| POST   | `/api/admin/matching/cases/:case_id/manual-assign` | admin | Force assign; logs `manual_assigned` event |
| GET    | `/api/admin/matching/logs/:case_id` | admin | Full attempt history for a case |

## Data model changes

### Attorneys — new fields (migrated idempotently at startup)
- `active_cases_count: int` (default 0) — denormalized, ±1 on assignment/accept/complete/decline/expiry
- `avg_response_seconds: float|null` — EMA updated on each accept

### Cases — new field
- `attorney_status: str|null` — `"waiting_assignment" | "assigned" | "unassigned_no_match" | null`

### case_assignments — new field
- `expiring_email_sent: bool` (default false) — idempotency flag for the 15-min warning

### New collection `attorney_matching_log`
```
{ id, case_id, attorney_id, match_score, candidates_considered,
  excluded_attorney_ids, action, metadata, created_at }
```
action ∈ `auto_matched | manual_assigned | no_match | expired_no_response | declined | accepted | completed`

## Algorithm

1. Filter attorneys by `status=active`, `available_for_cases=true`, `jurisdiction == case.country`, specialty match (case_type → specialty mapping with fallback `civil`), Stripe if flag on.
2. Exclude attorney ids from the caller's list (used for reassignment-after-decline/expiry).
3. Score each candidate:
   `score = -active_cases × 5 + rating × 10 × 3 + -avg_response_seconds/60 × 1 + rand(0, 0.5)`
4. Return the top-scored candidate + total candidates count.

Specialty mapping (extended):
```
eviction → logement     housing → logement
tenant_dispute → logement
wrongful_termination → travail   employment → travail
severance → travail
consumer_refund → consommation   consumer → consommation
speeding_ticket → penal_routier
insurance_claim → assurance      insurance → assurance
contract_dispute → civil
family_law → famille
other → civil   (fallback for anything unknown)
```

## Cron tick (every 1 min)

```
run_tick():
  expire_and_reassign()
    ↳ for each expired pending assignment:
      - mark expired, decrement attorney.active_cases_count
      - log "expired_no_response"
      - exclude = union of all prior attorneys on the case
      - assign_case_to_attorney(case_id, exclude=exclude) → new pending
  send_expiring_warnings()
    ↳ find pending assignments with 0 < remaining <= 15min AND !expiring_email_sent
      - email attorney
      - set expiring_email_sent=true (idempotent)
  maybe_send_health_alert()
    ↳ if ≥10 decisions/24h AND unmatched ratio > 10%: email admin (1h throttle)
```

## Notification emails

| Trigger | To | Subject |
|---------|-----|---------|
| New assignment created | Attorney | 🔔 Nouveau dossier #XXXX — [type] — Acceptez dans 30 min |
| Remaining window < 15 min | Attorney | ⏰ 15 min restantes — Cas #XXXX |
| Attorney accepts | Attorney | ✓ Cas #XXXX accepté — Deadline dans 4h |
| No matching attorney | Admin | ⚠️ ACTION REQUISE : Cas #XXXX sans avocat |
| >10% unmatched/24h | Admin | 🚨 Archer: >10% unmatched cases in 24h (throttled 1h) |
| Assignment created, reassignment needed | Client | 🔍 Nous cherchons l'avocat parfait pour votre dossier |

## Delivery checklist

```bash
# 1. Install
pip install APScheduler==3.11.0

# 2. Run unit & algo tests (no server needed — speaks direct to Mongo)
SCHEDULER_ENABLED=false REQUIRE_STRIPE_ONBOARDING=false \
  pytest backend/tests/test_matching_algorithm.py backend/tests/test_reassignment_cron.py -v

# 3. Start backend — logs should show:
#    "Scheduler started (portal_maintenance every 1min)"
#    no errors on migrate_sprint_c_fields()
uvicorn server:app --reload

# 4. Integration tests (backend must be running)
REACT_APP_BACKEND_URL=http://localhost:8000 \
  pytest backend/tests/test_sprint_c_integration.py -v

# 5. End-to-end manual check
#  - Seed an active attorney with specialty=logement, jurisdiction=BE
#  - Log in as a client, create a case (type=eviction, country=BE)
#  - curl POST /api/cases/<id>/request-attorney-letter with client auth
#  - Inbox (as attorney) → new case appears, toast fires
#  - Wait 30 min without accepting (or manipulate expires_at in DB for a fast test)
#    → cron moves it to another attorney (or to "unassigned_no_match")
#  - Open /admin/matching → see stats, attorneys, logs
```

## Not in Sprint C (deferred)

- Stripe Connect onboarding (Sprint D) — `REQUIRE_STRIPE_ONBOARDING=false` until then
- Real payment → trigger (Sprint D rebrands `request-attorney-letter` behind a Stripe webhook)
- Calendly / Daily.co (Sprint E)
- Email frequency preferences per attorney (Sprint F)
- Retry queue on email send failure (V1.1)
- Ratings system (TBD)

## Known limits & knobs

- Scoring coefficients are env-tunable; start with defaults and adjust from real data.
- 1-min cron is fine for MVP volume (<1000 pending). If this gets heavy, switch to event-driven.
- EMA on `avg_response_seconds` uses α=0.3 — responsive to recent behavior without being noisy.
- `manual_assign` cannot resurrect a case that already has a pending assignment (returns 409).

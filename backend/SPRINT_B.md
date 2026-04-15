# Sprint B — Attorney Portal: Inbox + Case Detail + Anonymization

Builds on Sprint A. Adds the core attorney workflow:
inbox → case detail with anonymized client → accept → full reveal → upload signed letter.

## What shipped

### Backend
- `backend/utils/case_serializer.py` — **single source of truth for anonymization**. Every attorney-facing response goes through `serialize_case_for_attorney()`. Maps `ai_findings[]` → `violations_identified[]` (title, description, law_reference), wraps legacy `strategy` (dict) into `strategies[]` list.
- `backend/utils/attorney_audit.py` — `log_attorney_access()` helper. Every view/accept/decline/doc download/letter upload is logged into `attorney_case_access_log`. Non-blocking.
- `backend/routes/attorney_portal_cases.py` — 8 endpoints + signed-letter download
- `backend/routes/admin_portal_routes.py` — `POST /api/admin/cases/:id/assign` (manual assignment; auto-matching = Sprint C)
- `backend/scripts/seed_test_cases.py` — creates 5 assignments for a given attorney (urgent / pending / live counsel / accepted / completed)
- `backend/tests/test_anonymization.py` — **10 critical tests, MUST all pass before merge**
- `backend/server.py` — +4 lines (two new routers wired)

### Frontend
- Components: `CaseRow`, `CountdownTimer`, `CaseStrategyList`, `CaseDocumentList`, `CaseClientCard`, `EarningsBreakdown`, `UploadSignedLetter`, `AcceptModal`, `DeclineModal`, `Modal`, `Toasts` (ToastProvider + useToast)
- Hooks: `useInboxCases`, `useCountdown`, `useCaseDetail`
- Pages: `Inbox`, `MyCases`, `Completed`, `CaseDetail` (2-column, status-aware)
- i18n: `inbox`, `case`, `decline_modal`, `accept_modal`, `upload_letter` sections (FR + EN)
- `App.js`: 4 new routes (`/attorneys/inbox`, `/attorneys/my-cases`, `/attorneys/completed`, `/attorneys/cases/:assignmentId`)
- Sidebar: Inbox/My Cases/Completed items now enabled

### Collections (indexes ensured at startup)
- `case_assignments` — unique `id`, compound `(attorney_id, status)`, `case_id`, `expires_at`
- `attorney_case_access_log` — `(attorney_id, created_at desc)`, `assignment_id`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/attorneys/cases/inbox?type=all|letter|live_counsel&sort=urgency|recent` | attorney | Pending assignments |
| GET    | `/api/attorneys/cases/active` | attorney | Accepted, in progress |
| GET    | `/api/attorneys/cases/completed` | attorney | Completed cases |
| GET    | `/api/attorneys/cases/:id` | attorney + ownership | Detail (anonymized if not accepted) |
| POST   | `/api/attorneys/cases/:id/accept` | attorney + ownership | Snapshot client PII, lock privilege |
| POST   | `/api/attorneys/cases/:id/decline` | attorney + ownership | With reason + notes |
| GET    | `/api/attorneys/cases/:id/documents/:doc_id/preview` | attorney + ownership | Stream PDF (403 if locked) |
| POST   | `/api/attorneys/cases/:id/upload-letter` | attorney + ownership + accepted | Multipart PDF, max 10 MB |
| GET    | `/api/attorneys/cases/:id/signed-letter` | attorney + ownership | Re-download uploaded letter |
| POST   | `/api/admin/cases/:id/assign` | admin | Manually assign a case to an attorney |

## Anonymization invariants (verified by tests)

- A `pending` assignment **never** includes `first_name`, `last_name`, `email`, `phone`, `full_address` in the response body. Assertion is done with `"name" not in r.text`, not just field presence.
- Supplementary documents return `is_locked: true` and `preview_url: null` while pending.
- `GET /documents/:doc_id/preview` → **403** for locked docs while pending.
- `POST /accept` on expired assignment → **410**. On already-accepted → **409**.
- Another attorney's assignment → **403** (ownership).
- Accepted & completed → full reveal, all docs unlocked.

## Delivery checklist

```bash
# 0. Ensure backend is running with Sprint A collections populated
#    (an attorney exists + is active)

# 1. Seed 5 test cases for an existing active attorney
python backend/scripts/seed_test_cases.py --attorney-email marc@cabinet.be

# 2. Run the anonymization tests — MUST be green
REACT_APP_BACKEND_URL=http://localhost:8000 pytest backend/tests/test_anonymization.py -v

# 3. Open the frontend as the attorney (Sprint A login flow)
#    → /attorneys/inbox shows 3 pending cases + Active section
#    → click urgent case → detail with amber banner, countdown ticking
#    → click Accept → modal → confirm → client revealed + deadline banner
#    → drag a PDF into Upload zone → upload → case becomes completed
#    → /attorneys/completed shows the case

# 4. Decline flow
#    → open another pending case → click Decline → modal → choose reason → confirm
#    → toast "Case declined" → redirect to inbox
```

## Known limitations / deferred

- **Draft letter**: placeholder UI + `{ available: false, coming_soon: true }` in API. Deferred (will be wired to existing `/cases/{id}/generate-action-letter` later).
- **Auto-reassignment after decline**: `POST /decline` returns `{ reassigned: false }`. Algorithm = Sprint C.
- **Payout**: `payout_scheduled_at` is computed (next Monday 09:00 UTC) but no actual payout pipeline (Sprint D).
- **demographic_hint**: field present everywhere, always `None` for Sprint B.
- **My Cases route**: uses `/attorneys/my-cases` (not `/attorneys/cases`) to avoid collision with the detail route `/attorneys/cases/:assignmentId`.

## Not in Sprint B scope (intentional)

- Client↔attorney chat (no MVP chat)
- Rating/review system
- Stripe Connect onboarding (Sprint D)
- Calendly integration (Sprint E)
- Auto-matching algorithm (Sprint C)

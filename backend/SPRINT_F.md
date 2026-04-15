# Sprint F — Profile + Public Preview + i18n Complet

Builds on Sprints A–E. Finalizes the attorney portal with a full editable
Profile page, a Public Preview (client-side view), and a consolidated i18n
sweep (FR + EN) on the high-visibility attorney pages.

## What shipped

### Backend
- **Migration `migrate_sprint_f_fields()`** (idempotent) — adds `title`,
  `bar_jurisdiction`, `languages_spoken`, `bio_short`, `bio_long`,
  `photo_storage_path`, `years_of_experience`, `preferred_language`,
  `notify_*`, `password_changed_at` on every `attorneys` doc.
- **`backend/routes/attorney_profile_routes.py`** — 8 endpoints:
  - `GET /api/attorneys/profile` — full profile + stats + notification prefs
  - `PATCH /api/attorneys/profile` — whitelisted editable fields via Pydantic
    model; unknown/read-only fields are silently dropped
  - `POST /api/attorneys/profile/photo` — JPEG/PNG/WebP, 5 MB max
  - `DELETE /api/attorneys/profile/photo`
  - `POST /api/attorneys/profile/change-password` — min 12 chars, invalidates
    all sessions, security notification email
  - `POST /api/attorneys/account/deactivate` — **guard 409** if active cases
    (status ∈ {accepted, awaiting_calendly_booking}); otherwise suspend + email
    attorney + admin
  - `GET /api/attorneys/:id/photo` — public proxy with `Cache-Control: public,
    max-age=3600`
  - `GET /api/attorneys/:id/public-profile` — whitelisted output (no email,
    phone, stripe_*, calendly_url, notifications)

### Frontend
- **Page `/attorneys/profile`** with 8 sections (Identity, Specialties +
  Languages, Bio, Photo, Calendly, Stripe, Notifications, Account, Danger zone),
  buffered local "pending" state flushed on a single "Save changes" button
  (with unsaved-counter badge).
- **`ChangePasswordModal`** — current + new + confirm, logs out on success
- **`PublicPreviewModal`** — fetches `/public-profile`, shows photo + stats +
  specialties + languages + bio. Zero PII.
- **Sidebar**: Profile link enabled, **FR/EN language toggle** at the bottom
- **`useAttorneyAuth`**: auto-syncs `preferred_language` from `/me` to
  `localStorage` at login (DB = source of truth for emails, localStorage =
  UI cache)
- **i18n extensions** on `attorney.json` (FR + EN): `earnings`,
  `live_counsel_ext`, `case_ext`, `profile`, `public_preview`, `common`
- **Migrated pages**: Earnings (+ Hero + PayoutsTable), LiveCounsel (+ Stats +
  UpcomingCallsList), CaseDetail (status banners, violations heading, draft
  placeholder, sidecar labels), Profile (all sections)

## Endpoints (Sprint F additions)

| Method | Path | Auth |
|--------|------|------|
| GET    | `/api/attorneys/profile` | attorney |
| PATCH  | `/api/attorneys/profile` | attorney |
| POST   | `/api/attorneys/profile/photo` | attorney |
| DELETE | `/api/attorneys/profile/photo` | attorney |
| POST   | `/api/attorneys/profile/change-password` | attorney |
| POST   | `/api/attorneys/account/deactivate` | attorney |
| GET    | `/api/attorneys/:id/photo` | public (cached 1h) |
| GET    | `/api/attorneys/:id/public-profile` | public (whitelisted) |

## Tests

`backend/tests/test_attorney_profile.py` — 12 tests:
- profile structure + stats shape
- PATCH editable updates
- PATCH ignores readonly (bar_number, stripe_account_id, email)
- PATCH rejects invalid `preferred_language`
- change-password: wrong current → 400
- change-password: < 12 chars → 422
- change-password: success invalidates sessions
- deactivate: 409 if active cases (attorney-client privilege guard)
- deactivate: success suspends + invalidates sessions
- public-profile: no PII in payload
- public-profile: 404 when suspended
- upload photo: rejects non-image

## i18n — what was migrated vs skipped

**Migrated (high-visibility attorney pages)**:
- `Earnings.jsx` + `EarningsHero.jsx` + `PayoutsTable.jsx`
- `LiveCounsel.jsx` + `LiveCounselStats.jsx` + `UpcomingCallsList.jsx`
- `CaseDetail.jsx` (status banners, violations heading, draft, side panels)
- `Profile.jsx` + all section components (Sprint F)

**Intentionally NOT migrated (documented trade-off)**:
- `AdminMatchingDashboard.jsx` (Sprint C) — EN-only, visible to Romain/admin only
- `AttorneyJoin.jsx`, `AttorneyLogin.jsx`, `AttorneyMagicVerify.jsx` — already
  i18n via their own translation subtrees (Sprint A)
- Modals: `AcceptModal`, `DeclineModal`, `UploadSignedLetter` — already use
  `t.accept_modal`, `t.decline_modal`, `t.upload_letter` (Sprint B)
- `UpcomingCallCard.jsx` — minor strings, defer if UX feedback
- `CalendlyIntegrationCard.jsx` — mix of FR/EN strings, not user-blocking
- `StripeOnboarding` pages — FR-only, functional; migrate if need arises

The language toggle **persists across reload** (`localStorage.ui_language`)
and **syncs to the backend** (`attorneys.preferred_language`) so server-side
emails use the attorney's chosen language.

## Known limitations / deferred

- **Ratings system**: `avg_rating` is hardcoded to `None`/"—" everywhere.
  Creating the ratings collection + post-call review flow + aggregation is a
  **future sprint** (ratings touch clients, attorneys, and privacy/moderation
  concerns not yet specced).
- **Orphaned profile photos**: when a new photo replaces an old one, the old
  blob stays in Emergent storage because `storage.py` doesn't expose a delete
  helper. Harmless for MVP (few KB per attorney). Add a cleanup script later.
- **Email address is read-only** from the attorney UI. Changing requires
  support contact (sessions to invalidate, Stripe account rebinding, and
  audit). Scripted admin path is out of scope.
- **Browser language auto-detect**: on first login without a stored
  `ui_language`, `useAttorneyT` falls back to `navigator.language`. Once the
  attorney profile is fetched, `preferred_language` from DB wins and is
  written to localStorage for subsequent visits.

## Delivery checklist

```bash
cd ~/Documents/archer/backend

# 1. Smoke: server boots and migration runs without error
SCHEDULER_ENABLED=false python3 -c "from server import app; print('import OK')"

# 2. Tests Sprint F
SCHEDULER_ENABLED=false pytest tests/test_attorney_profile.py -v

# 3. Smoke end-to-end
#  a. Login as attorney → /attorneys/profile
#  b. Update first_name/bio, add specialties, upload a JPEG → Save → toast ok
#  c. Click "Preview public" → see the card without email/phone
#  d. Switch FR→EN in sidebar → page reloads, all texts in EN
#  e. Try to deactivate with an accepted case → 409 with clear message
#  f. Complete the case → deactivate succeeds, redirected to /attorneys/login

# 4. Public photo URL is proxy-cached:
#    curl -I http://localhost:8000/api/attorneys/<id>/photo
#    → Cache-Control: public, max-age=3600
```

## Recap — 6 sprints complete

| Sprint | Delivered |
|---|---|
| A | Attorney auth + invitations + layout |
| B | Inbox + case detail + anonymization + upload letter |
| C | Auto-matching + cron reassignment + notifications + admin dashboard |
| D | Stripe Connect + weekly payouts + earnings page + client checkout |
| E | Calendly + Daily.co + Live Counsel video consultations |
| F | Profile + public preview + i18n FR/EN sweep |

The attorney portal is now **feature-complete for MVP launch**: an attorney can
sign up, complete Stripe onboarding, receive auto-matched cases (both Attorney
Letter and Live Counsel), manage their upcoming video consultations, upload
signed letters, get paid weekly, manage their full profile with a real-time
preview of how clients see them, and switch UI language at will. The backend
runs two cron jobs (1-minute maintenance + Monday-morning payouts), enforces
strict client anonymization until acceptance, and audits every interaction.

# Sprint A — Attorney Portal (Auth + Layout)

Parallel attorney portal stack, kept separate from the legacy
`/api/attorney/*` (singular) endpoints. Mounted under `/api/attorneys/*` (plural)
on the backend and `/attorneys/*` on the frontend.

## What shipped

### Backend
- `backend/utils/attorney_auth.py` — password/token helpers, `attorney_required` FastAPI dep, `ensure_indexes()`
- `backend/routes/attorney_portal_routes.py` — 8 endpoints
- `backend/scripts/create_attorney_invitation.py` — admin CLI
- `backend/tests/test_attorney_auth.py` — 11 integration tests
- `backend/server.py` — +5 lines (import + include_router + ensure_indexes in startup)

### Frontend
- `frontend/src/hooks/attorneys/{useAttorneyApi,useAttorneyAuth,useAttorneyT}.js`
- `frontend/src/components/Attorneys/{AttorneyLayout,AttorneySidebar,AttorneyTopbar,AvailabilityToggle,SpecialtyPicker,RequireAttorneyAuth}.jsx`
- `frontend/src/pages/Attorneys/{AttorneyJoin,AttorneyLogin,AttorneyMagicVerify,AttorneyDashboard}.jsx`
- `frontend/src/i18n/attorney.json` (FR + EN)
- `frontend/src/App.js` — 4 new routes (declared before `/attorneys/:slug`)

### Collections created at runtime
- `attorneys` (unique index on `email`, `id`)
- `attorney_invitations` (unique index on `code`)
- `attorney_sessions` (unique index on `token`, index on `attorney_id`)

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/api/attorneys/invitation/:code` | — | Check invitation validity |
| POST   | `/api/attorneys/join` | — | Create account (status=pending) |
| POST   | `/api/attorneys/login` | — | Email/password login |
| POST   | `/api/attorneys/login/magic-link` | — | Send magic link email |
| GET    | `/api/attorneys/login/verify-magic/:token` | — | Consume magic link → session |
| POST   | `/api/attorneys/logout` | — | Destroy session |
| GET    | `/api/attorneys/me` | attorney | Current attorney |
| PATCH  | `/api/attorneys/availability` | attorney | Toggle `available_for_cases` |

## Delivery checklist (test locally)

```bash
# 1. Create an invitation
python backend/scripts/create_attorney_invitation.py \
  --email test@example.com --first-name Test --last-name User

# 2. Open the printed /attorneys/join?code=... URL in the browser
# 3. Complete the 4-step wizard
# 4. Check both emails arrive (attorney confirmation + admin notification)

# 5. Activate the attorney manually (no admin UI in Sprint A)
mongosh $MONGO_URL --eval '
  use archer;
  db.attorneys.updateOne(
    { email: "test@example.com" },
    { $set: { status: "active", verified_at: new Date().toISOString() } }
  )
'

# 6. /attorneys/login → sign in with email + password
# 7. See dashboard with sidebar + user card
# 8. /attorneys/login → "Send me a magic link" → click link in email
# 9. Toggle availability in topbar
# 10. Sign out from sidebar
```

## Out of Sprint A scope (do NOT build here)

- Inbox / case display (Sprint B)
- Stripe Connect onboarding (Sprint D)
- Calendly (Sprint E)
- Daily.co (Sprint E)
- Matching algorithm (Sprint C)
- Real earnings page (Sprint D)
- Full profile page with preview (Sprint F)

## Env vars (see `.env.example`)

```
ATTORNEY_SESSION_SECRET=...
ATTORNEY_SESSION_DURATION_DAYS=30
ATTORNEY_MAGIC_LINK_DURATION_MINUTES=15
ADMIN_NOTIFY_EMAIL=romain@archer.legal
```

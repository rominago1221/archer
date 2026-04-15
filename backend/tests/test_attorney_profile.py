"""Sprint F — Attorney profile tests."""
import os
import sys
import uuid
import secrets
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
os.environ.setdefault("SCHEDULER_ENABLED", "false")

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
PREFIX = "TEST_PROF_"


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture
def attorney_ctx(db):
    import bcrypt
    aid = f"{PREFIX}a_{uuid.uuid4().hex[:8]}"
    token = secrets.token_urlsafe(32)
    db.attorneys.insert_one({
        "id": aid, "email": f"{aid}@ex.test",
        "password_hash": bcrypt.hashpw(b"initial-pass-123", bcrypt.gensalt()).decode(),
        "first_name": "Marc", "last_name": "Delcourt",
        "title": None, "phone": None,
        "status": "active", "available_for_cases": True,
        "jurisdiction": "BE", "bar_number": "A4-99999",
        "bar_jurisdiction": "Brussels Bar",
        "specialties": ["logement"], "languages_spoken": [],
        "bio_short": None, "bio_long": None, "photo_storage_path": None,
        "years_of_experience": None,
        "preferred_language": "fr",
        "notify_new_case": True, "notify_case_expiring": True,
        "notify_live_counsel": True, "notify_weekly_payout": True,
        "notify_marketing": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.attorney_sessions.insert_one({
        "attorney_id": aid, "token": token, "type": "session",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"id": aid, "token": token, "email": f"{aid}@ex.test"}
    db.attorneys.delete_one({"id": aid})
    db.attorney_sessions.delete_many({"attorney_id": aid})
    db.case_assignments.delete_many({"attorney_id": aid})


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


# =========================================================================

def test_get_profile_returns_expected_fields(attorney_ctx):
    r = requests.get(f"{API}/attorneys/profile", headers=_auth(attorney_ctx["token"]))
    assert r.status_code == 200
    p = r.json()
    for key in ("id", "first_name", "specialties", "preferred_language",
                "email_notifications", "stripe_onboarding_completed",
                "stats_public"):
        assert key in p
    assert p["email_notifications"]["new_case"] is True
    assert p["stats_public"]["avg_rating"] is None


def test_patch_profile_updates_editable_fields(attorney_ctx):
    r = requests.patch(
        f"{API}/attorneys/profile", headers=_auth(attorney_ctx["token"]),
        json={"bio_short": "Updated bio", "years_of_experience": 12},
    )
    assert r.status_code == 200
    r2 = requests.get(f"{API}/attorneys/profile", headers=_auth(attorney_ctx["token"]))
    p = r2.json()
    assert p["bio_short"] == "Updated bio"
    assert p["years_of_experience"] == 12


def test_patch_profile_ignores_readonly_fields(attorney_ctx):
    r = requests.patch(
        f"{API}/attorneys/profile", headers=_auth(attorney_ctx["token"]),
        json={"bar_number": "HACKED", "stripe_account_id": "acct_hack",
              "email": "hack@ex.test"},
    )
    # Pydantic raises 422 for unknown fields? No, we use Optional[None] and
    # EDITABLE_FIELDS whitelist. Unknown fields get silently dropped by Pydantic.
    assert r.status_code in (200, 422)
    r2 = requests.get(f"{API}/attorneys/profile", headers=_auth(attorney_ctx["token"]))
    p = r2.json()
    assert p["bar_number"] == "A4-99999"  # unchanged


def test_patch_preferred_language_rejects_unknown(attorney_ctx):
    r = requests.patch(
        f"{API}/attorneys/profile", headers=_auth(attorney_ctx["token"]),
        json={"preferred_language": "zh"},
    )
    assert r.status_code == 400


def test_change_password_requires_correct_current(attorney_ctx, db):
    r = requests.post(
        f"{API}/attorneys/profile/change-password",
        headers=_auth(attorney_ctx["token"]),
        json={"current_password": "wrong-pw", "new_password": "NewSecurePass2026!"},
    )
    assert r.status_code == 400


def test_change_password_requires_min_length(attorney_ctx):
    r = requests.post(
        f"{API}/attorneys/profile/change-password",
        headers=_auth(attorney_ctx["token"]),
        json={"current_password": "initial-pass-123", "new_password": "short"},
    )
    assert r.status_code == 422  # Pydantic min_length=12


def test_change_password_success_invalidates_sessions(attorney_ctx, db):
    r = requests.post(
        f"{API}/attorneys/profile/change-password",
        headers=_auth(attorney_ctx["token"]),
        json={"current_password": "initial-pass-123",
              "new_password": "BrandNewPass2026!"},
    )
    assert r.status_code == 200
    # Session invalidated
    r2 = requests.get(f"{API}/attorneys/profile", headers=_auth(attorney_ctx["token"]))
    assert r2.status_code == 401


def test_deactivate_blocked_when_active_cases(attorney_ctx, db):
    # Seed an active case_assignment for this attorney
    db.case_assignments.insert_one({
        "id": f"{PREFIX}ass_{uuid.uuid4().hex[:8]}",
        "attorney_id": attorney_ctx["id"],
        "case_id": f"{PREFIX}c_{uuid.uuid4().hex[:8]}",
        "status": "accepted",
        "service_type": "attorney_letter",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = requests.post(f"{API}/attorneys/account/deactivate",
                      headers=_auth(attorney_ctx["token"]))
    assert r.status_code == 409
    assert "cas en cours" in r.text.lower() or "ongoing" in r.text.lower() or "accept" in r.text.lower()


def test_deactivate_succeeds_when_no_active_cases(attorney_ctx, db):
    r = requests.post(f"{API}/attorneys/account/deactivate",
                      headers=_auth(attorney_ctx["token"]))
    assert r.status_code == 200
    atty = db.attorneys.find_one({"id": attorney_ctx["id"]})
    assert atty["status"] == "suspended"
    assert atty["available_for_cases"] is False
    # Sessions invalidated
    r2 = requests.get(f"{API}/attorneys/profile", headers=_auth(attorney_ctx["token"]))
    assert r2.status_code == 401


def test_public_profile_excludes_pii(attorney_ctx, db):
    r = requests.get(f"{API}/attorneys/{attorney_ctx['id']}/public-profile")
    assert r.status_code == 200
    body = r.text
    assert attorney_ctx["email"] not in body
    assert "password" not in body.lower()
    assert "stripe_account_id" not in body
    assert "phone" not in r.json()


def test_public_profile_404_on_suspended(attorney_ctx, db):
    db.attorneys.update_one(
        {"id": attorney_ctx["id"]}, {"$set": {"status": "suspended"}},
    )
    r = requests.get(f"{API}/attorneys/{attorney_ctx['id']}/public-profile")
    assert r.status_code == 404


def test_upload_photo_rejects_non_image(attorney_ctx):
    r = requests.post(
        f"{API}/attorneys/profile/photo",
        headers=_auth(attorney_ctx["token"]),
        files={"file": ("test.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert r.status_code == 400

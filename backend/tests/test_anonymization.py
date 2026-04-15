"""Sprint B — Anonymization tests. SACRED: if one fails, the sprint is NOT done.

Covers the 9 critical scenarios from the brief + completed-case reveal.

Integration tests: requires live backend + MongoDB access for setup/teardown.
  REACT_APP_BACKEND_URL=http://localhost:8000 pytest backend/tests/test_anonymization.py -v
"""
from __future__ import annotations
import os
import uuid
import secrets
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API_URL = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_PREFIX = "TEST_ANON_"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture
def factory(db):
    """Factory to create attorneys, clients, cases, documents, assignments.
    Cleans up everything it creates at the end of the test.
    """
    created = {
        "attorneys": [], "attorney_sessions": [], "users": [],
        "cases": [], "documents": [], "case_assignments": [],
    }

    def _make_attorney(status="active"):
        aid = f"{TEST_PREFIX}atty_{uuid.uuid4().hex[:8]}"
        email = f"{TEST_PREFIX}{uuid.uuid4().hex[:6]}@attys.test"
        import bcrypt
        pw_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()
        db.attorneys.insert_one({
            "id": aid, "email": email, "password_hash": pw_hash,
            "first_name": "Test", "last_name": "Attorney",
            "status": status, "jurisdiction": "BE",
            "specialties": ["logement"], "available_for_cases": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created["attorneys"].append(aid)
        return {"id": aid, "email": email, "password": "password123"}

    def _session_for(attorney_id):
        token = secrets.token_urlsafe(32)
        db.attorney_sessions.insert_one({
            "attorney_id": attorney_id, "token": token, "type": "session",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created["attorney_sessions"].append(token)
        return token

    def _make_client(first="Sophie", last="Lacroix",
                     email="sophie.lacroix@example.be",
                     phone="+32 478 12 34 56"):
        uid = f"{TEST_PREFIX}u_{uuid.uuid4().hex[:8]}"
        db.users.insert_one({
            "user_id": uid, "email": email, "name": f"{first} {last}",
            "phone": phone, "country": "BE", "jurisdiction": "BE",
            "region": "Bruxelles", "state_of_residence": "Anderlecht",
            "language": "fr", "account_type": "client", "plan": "free",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created["users"].append(uid)
        return uid

    def _make_case(user_id, title="Eviction notice contest"):
        cid = f"{TEST_PREFIX}case_{uuid.uuid4().hex[:8]}"
        db.cases.insert_one({
            "case_id": cid, "user_id": user_id, "title": title, "type": "eviction",
            "status": "active", "language": "fr", "country": "BE", "region": "Bruxelles",
            "ai_summary": "Tenant residing at the property since 2021 received eviction notice.",
            "ai_findings": [
                {"text": "Notice period violation", "impact_description": "30 days instead of 6 months",
                 "legal_ref": "Brussels Housing Code art. 3 §1", "impact": "high"},
                {"text": "No written reason", "impact_description": "Notice lacks required legal basis",
                 "legal_ref": "Code civil art. 1134", "impact": "medium"},
            ],
            "strategy": {"title": "Procedural nullity", "description": "Cite art. 3 §1",
                         "score": 96},
            "success_probability": {"overall": 94},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        created["cases"].append(cid)
        return cid

    def _make_documents(case_id, user_id, specs):
        """specs = [("main.pdf", True), ("supplement.pdf", False)]"""
        doc_ids = []
        for name, is_main in specs:
            did = f"{TEST_PREFIX}doc_{uuid.uuid4().hex[:8]}"
            db.documents.insert_one({
                "document_id": did, "case_id": case_id, "user_id": user_id,
                "file_name": name, "file_type": "pdf",
                "storage_path": f"test/path/{did}.pdf",
                "is_key_document": is_main, "status": "analyzed",
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
            })
            created["documents"].append(did)
            doc_ids.append(did)
        return doc_ids

    def _make_assignment(attorney_id, case_id, user_id, *, status="pending",
                          expires_in_minutes=30, with_client_snapshot=False):
        aid = f"{TEST_PREFIX}ass_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        doc = {
            "id": aid, "attorney_id": attorney_id, "case_id": case_id,
            "client_user_id": user_id, "status": status,
            "service_type": "attorney_letter",
            "case_number": str(secrets.randbelow(9000) + 1000),
            "demographic_hint": None,
            "assigned_at": now.isoformat(),
            "expires_at": (now + timedelta(minutes=expires_in_minutes)).isoformat(),
            "accepted_at": None, "deadline_at": None,
            "declined_at": None, "completed_at": None,
            "client_snapshot": None,
            "client_pays_cents": 4999, "archer_fee_cents": 1500,
            "stripe_fee_cents": 175, "your_payout_cents": 3324,
            "signed_letter_storage_path": None,
            "case_snapshot": {
                "title": "Eviction notice contest", "type": "eviction",
                "language": "fr", "jurisdiction": "Anderlecht, Bruxelles, BE",
                "submitted_at": now.isoformat(),
                "ai_summary": "Tenant residing at the property since 2021 received eviction notice.",
                "ai_findings": [
                    {"text": "Notice period violation", "impact_description": "30 days",
                     "legal_ref": "art. 3 §1", "impact": "high"},
                    {"text": "No written reason", "impact_description": "Missing reason",
                     "legal_ref": "Code civil", "impact": "medium"},
                ],
                "strategy": {"title": "Procedural nullity", "description": "Cite art. 3 §1", "score": 96},
                "success_probability": {"overall": 94},
            },
            "created_at": now.isoformat(), "updated_at": now.isoformat(),
        }
        if status in ("accepted", "completed"):
            # fill snapshot from user
            user = db.users.find_one({"user_id": user_id}) or {}
            name = (user.get("name") or "").split(" ", 1)
            snapshot = {
                "first_name": name[0] if name else "",
                "last_name": name[1] if len(name) > 1 else "",
                "email": user.get("email"),
                "phone": user.get("phone"),
                "full_address": ", ".join(p for p in [user.get("state_of_residence"),
                                                      user.get("region"),
                                                      user.get("country")] if p),
                "language": user.get("language") or "fr",
            }
            doc["client_snapshot"] = snapshot
            doc["accepted_at"] = now.isoformat()
            doc["deadline_at"] = (now + timedelta(hours=4)).isoformat()
        if status == "completed":
            doc["completed_at"] = now.isoformat()
            doc["signed_letter_storage_path"] = "test/signed.pdf"
        db.case_assignments.insert_one(doc)
        created["case_assignments"].append(aid)
        return doc

    class Factory:
        attorney = _make_attorney
        session = _session_for
        client = _make_client
        case = _make_case
        documents = _make_documents
        assignment = _make_assignment

    yield Factory

    # Cleanup
    if created["case_assignments"]:
        db.case_assignments.delete_many({"id": {"$in": created["case_assignments"]}})
    if created["documents"]:
        db.documents.delete_many({"document_id": {"$in": created["documents"]}})
    if created["cases"]:
        db.cases.delete_many({"case_id": {"$in": created["cases"]}})
    if created["users"]:
        db.users.delete_many({"user_id": {"$in": created["users"]}})
    if created["attorney_sessions"]:
        db.attorney_sessions.delete_many({"token": {"$in": created["attorney_sessions"]}})
    if created["attorneys"]:
        db.attorneys.delete_many({"id": {"$in": created["attorneys"]}})
    db.attorney_case_access_log.delete_many(
        {"attorney_id": {"$in": created["attorneys"]}}
    )


def _authed(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 1. Pending case must NOT leak client name
# ---------------------------------------------------------------------------

def test_pending_case_does_not_leak_client_name(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client(first="Sophie", last="Lacroix")
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True)])
    ass = factory.assignment(a["id"], cid, uid, status="pending")

    r = requests.get(f"{API_URL}/attorneys/cases/{ass['id']}", headers=_authed(token))
    assert r.status_code == 200, r.text
    body = r.text
    assert "Sophie" not in body
    assert "Lacroix" not in body
    data = r.json()
    assert data["client"]["anonymized"] is True
    assert "first_name" not in data["client"]
    assert "last_name" not in data["client"]


# ---------------------------------------------------------------------------
# 2. Pending case must NOT leak client email
# ---------------------------------------------------------------------------

def test_pending_case_does_not_leak_client_email(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client(email="sophie.lacroix@example.be")
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True)])
    ass = factory.assignment(a["id"], cid, uid, status="pending")

    r = requests.get(f"{API_URL}/attorneys/cases/{ass['id']}", headers=_authed(token))
    assert r.status_code == 200
    assert "sophie.lacroix" not in r.text
    assert "@example.be" not in r.text


# ---------------------------------------------------------------------------
# 3. Pending case must NOT leak client phone
# ---------------------------------------------------------------------------

def test_pending_case_does_not_leak_phone(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client(phone="+32 478 12 34 56")
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True)])
    ass = factory.assignment(a["id"], cid, uid, status="pending")

    r = requests.get(f"{API_URL}/attorneys/cases/{ass['id']}", headers=_authed(token))
    assert r.status_code == 200
    assert "478" not in r.text
    assert "+32" not in r.text


# ---------------------------------------------------------------------------
# 4. Supplementary documents are locked while pending
# ---------------------------------------------------------------------------

def test_pending_case_locks_supplementary_documents(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client()
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True), ("supplement.pdf", False)])
    ass = factory.assignment(a["id"], cid, uid, status="pending")

    r = requests.get(f"{API_URL}/attorneys/cases/{ass['id']}", headers=_authed(token))
    assert r.status_code == 200
    docs = r.json()["documents"]
    main = next(d for d in docs if "main" in d["name"])
    supp = next(d for d in docs if "supplement" in d["name"])
    assert main["is_locked"] is False
    assert supp["is_locked"] is True
    assert supp["preview_url"] is None
    assert main["preview_url"]


# ---------------------------------------------------------------------------
# 5. Accepted case reveals all client info
# ---------------------------------------------------------------------------

def test_accepted_case_reveals_all_client_info(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client(first="Sophie", last="Lacroix",
                         email="sophie.lacroix@example.be",
                         phone="+32 478 12 34 56")
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True), ("supplement.pdf", False)])
    ass = factory.assignment(a["id"], cid, uid, status="accepted")

    r = requests.get(f"{API_URL}/attorneys/cases/{ass['id']}", headers=_authed(token))
    assert r.status_code == 200
    d = r.json()
    assert d["client"]["anonymized"] is False
    assert d["client"]["first_name"] == "Sophie"
    assert d["client"]["last_name"] == "Lacroix"
    assert d["client"]["email"] == "sophie.lacroix@example.be"
    assert "478" in d["client"]["phone"]
    # Supplementary doc now unlocked
    supp = next(x for x in d["documents"] if "supplement" in x["name"])
    assert supp["is_locked"] is False


# ---------------------------------------------------------------------------
# 6. Completed case keeps client info revealed
# ---------------------------------------------------------------------------

def test_completed_case_keeps_client_info_revealed(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client(first="Marie", last="Dupont", email="marie.dupont@ex.be")
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True)])
    ass = factory.assignment(a["id"], cid, uid, status="completed")

    r = requests.get(f"{API_URL}/attorneys/cases/{ass['id']}", headers=_authed(token))
    assert r.status_code == 200
    d = r.json()
    assert d["client"]["anonymized"] is False
    assert d["client"]["first_name"] == "Marie"


# ---------------------------------------------------------------------------
# 7. Cross-attorney access is forbidden
# ---------------------------------------------------------------------------

def test_attorney_cannot_access_other_attorneys_case(factory):
    atty_a = factory.attorney()
    atty_b = factory.attorney()
    token_a = factory.session(atty_a["id"])
    uid = factory.client()
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True)])
    ass = factory.assignment(atty_b["id"], cid, uid, status="pending")

    r = requests.get(f"{API_URL}/attorneys/cases/{ass['id']}", headers=_authed(token_a))
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# 8. Locked doc returns 403 when pending
# ---------------------------------------------------------------------------

def test_locked_document_returns_403_when_pending(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client()
    cid = factory.case(uid)
    (main_id, supp_id) = factory.documents(cid, uid, [("main.pdf", True), ("supplement.pdf", False)])
    ass = factory.assignment(a["id"], cid, uid, status="pending")

    r = requests.get(
        f"{API_URL}/attorneys/cases/{ass['id']}/documents/{supp_id}/preview",
        headers=_authed(token),
    )
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# 9. Accepting an expired assignment returns 410
# ---------------------------------------------------------------------------

def test_accept_expired_assignment_returns_410(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client()
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True)])
    ass = factory.assignment(a["id"], cid, uid, status="pending", expires_in_minutes=-5)

    r = requests.post(f"{API_URL}/attorneys/cases/{ass['id']}/accept", headers=_authed(token))
    assert r.status_code == 410


# ---------------------------------------------------------------------------
# 10. Accepting an already-accepted assignment returns 409
# ---------------------------------------------------------------------------

def test_accept_already_accepted_returns_409(factory):
    a = factory.attorney()
    token = factory.session(a["id"])
    uid = factory.client()
    cid = factory.case(uid)
    factory.documents(cid, uid, [("main.pdf", True)])
    ass = factory.assignment(a["id"], cid, uid, status="accepted")

    r = requests.post(f"{API_URL}/attorneys/cases/{ass['id']}/accept", headers=_authed(token))
    assert r.status_code == 409

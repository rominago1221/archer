"""Seed 5 test cases + assignments for a given attorney email.

Usage:
  python backend/scripts/seed_test_cases.py --attorney-email marc@cabinet.be

Creates (all owned by a fake test client unless --client-email passed):
  1. Urgent pending assignment (expires in 12 min) — eviction
  2. Pending assignment (expires in 23 min) — insurance
  3. Pending assignment (expires in 27 min) — live_counsel
  4. Accepted assignment (deadline in 2h14m) — consumer
  5. Completed assignment (paid out last Monday) — employment
"""
import argparse
import asyncio
import secrets
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db import db  # noqa: E402

SEED_PREFIX = "SEED_"


def _iso(dt: datetime) -> str:
    return dt.isoformat()


async def _ensure_client(email: str, name: str, language: str) -> str:
    existing = await db.users.find_one({"email": email}, {"user_id": 1})
    if existing:
        return existing["user_id"]
    uid = f"{SEED_PREFIX}u_{uuid.uuid4().hex[:8]}"
    now = _iso(datetime.now(timezone.utc))
    await db.users.insert_one({
        "user_id": uid, "email": email, "name": name,
        "phone": "+32 478 12 34 56",
        "country": "BE", "jurisdiction": "BE", "region": "Bruxelles",
        "state_of_residence": "Anderlecht",
        "language": language, "account_type": "client", "plan": "free",
        "notif_risk_score": True, "notif_deadlines": True, "notif_calls": True,
        "notif_lawyers": False, "notif_promo": False,
        "data_sharing": True, "improve_ai": True,
        "created_at": now,
    })
    return uid


async def _seed_case(user_id: str, *, title: str, case_type: str, summary: str,
                     findings: list, strategy: dict, win_prob: int) -> str:
    cid = f"{SEED_PREFIX}case_{uuid.uuid4().hex[:8]}"
    now = _iso(datetime.now(timezone.utc))
    await db.cases.insert_one({
        "case_id": cid, "user_id": user_id,
        "title": title, "type": case_type, "status": "active",
        "country": "BE", "region": "Bruxelles", "language": "fr",
        "ai_summary": summary,
        "ai_findings": findings,
        "strategy": strategy,
        "success_probability": {"overall": win_prob},
        "created_at": now, "updated_at": now,
    })
    return cid


async def _seed_document(case_id: str, user_id: str, name: str, is_main: bool) -> str:
    did = f"{SEED_PREFIX}doc_{uuid.uuid4().hex[:8]}"
    await db.documents.insert_one({
        "document_id": did, "case_id": case_id, "user_id": user_id,
        "file_name": name, "file_type": "pdf",
        "storage_path": f"seed/{did}.pdf",
        "is_key_document": is_main, "status": "analyzed",
        "file_size": 2400 * 1024 if is_main else 1800 * 1024,
        "page_count": 3 if is_main else None,
        "uploaded_at": _iso(datetime.now(timezone.utc)),
    })
    return did


def _case_snapshot(case: dict, jurisdiction: str) -> dict:
    return {
        "title": case["title"], "type": case["type"],
        "language": case.get("language") or "fr",
        "jurisdiction": jurisdiction,
        "submitted_at": case.get("created_at"),
        "ai_summary": case.get("ai_summary"),
        "ai_findings": case.get("ai_findings", []),
        "strategy": case.get("strategy"),
        "success_probability": case.get("success_probability"),
    }


async def _seed_assignment(attorney_id, case_doc, user_id, *, status,
                            service_type="attorney_letter",
                            expires_in=None, accepted_ago=None,
                            completed_ago=None, paid_ago=None):
    now = datetime.now(timezone.utc)
    assigned_at = now - timedelta(minutes=5)
    expires_at = now + (expires_in or timedelta(minutes=30))
    accepted_at = now - accepted_ago if accepted_ago else None
    deadline_at = (accepted_at + timedelta(hours=4)) if accepted_at else None
    completed_at = now - completed_ago if completed_ago else None
    paid_at = now - paid_ago if paid_ago else None
    aid = f"{SEED_PREFIX}ass_{uuid.uuid4().hex[:8]}"

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0}) or {}
    client_snapshot = None
    if status in ("accepted", "completed"):
        name_parts = (user.get("name") or "").split(" ", 1)
        client_snapshot = {
            "first_name": name_parts[0] if name_parts else "",
            "last_name": name_parts[1] if len(name_parts) > 1 else "",
            "email": user.get("email"),
            "phone": user.get("phone"),
            "full_address": "Rue de l'Étoile 42, 1070 Anderlecht",
            "language": user.get("language") or "fr",
        }

    await db.case_assignments.insert_one({
        "id": aid, "attorney_id": attorney_id,
        "case_id": case_doc["case_id"], "client_user_id": user_id,
        "status": status, "service_type": service_type,
        "case_number": str(secrets.randbelow(9000) + 1000),
        "demographic_hint": None,
        "assigned_at": _iso(assigned_at),
        "expires_at": _iso(expires_at),
        "accepted_at": _iso(accepted_at) if accepted_at else None,
        "deadline_at": _iso(deadline_at) if deadline_at else None,
        "completed_at": _iso(completed_at) if completed_at else None,
        "paid_out_at": _iso(paid_at) if paid_at else None,
        "declined_at": None, "decline_reason": None, "decline_notes": None,
        "client_snapshot": client_snapshot,
        "client_pays_cents": 4999, "archer_fee_cents": 1500,
        "stripe_fee_cents": 175, "your_payout_cents": 3324,
        "signed_letter_storage_path": "seed/signed.pdf" if status == "completed" else None,
        "signed_letter_uploaded_at": _iso(completed_at) if completed_at else None,
        "case_snapshot": _case_snapshot(case_doc, "Anderlecht, Bruxelles, BE"),
        "created_at": _iso(assigned_at), "updated_at": _iso(now),
    })
    return aid


async def seed(attorney_email: str, client_email: str, client_name: str):
    attorney = await db.attorneys.find_one({"email": attorney_email}, {"_id": 0})
    if not attorney:
        print(f"❌ Attorney not found: {attorney_email}")
        print("   Run scripts/create_attorney_invitation.py first and join.")
        sys.exit(1)

    uid = await _ensure_client(client_email, client_name, "fr")

    findings_eviction = [
        {"text": "Notice period violation", "impact_description": "30 days instead of 6 months required",
         "legal_ref": "Brussels Housing Code art. 3 §1", "impact": "high"},
        {"text": "No written reason", "impact_description": "Notice lacks the required legal basis",
         "legal_ref": "Code civil art. 1134", "impact": "medium"},
        {"text": "Service by ordinary mail", "impact_description": "Registered mail is mandatory",
         "legal_ref": "Brussels Housing Code art. 5", "impact": "medium"},
    ]
    strat_eviction = {"title": "Procedural nullity (notice period violation)",
                      "description": "Cite art. 3 §1 Brussels Housing Code and request annulment.",
                      "score": 96}

    findings_insurance = [
        {"text": "Bad faith denial", "impact_description": "Insurer ignored documented damage",
         "legal_ref": "BE Insurance Act art. 67", "impact": "high"},
    ]
    strat_insurance = {"title": "Formal demand with statutory interest",
                       "description": "Send formal notice with 30-day deadline.", "score": 82}

    findings_consumer = [
        {"text": "Misleading commercial practice", "impact_description": "Advertised price not honored",
         "legal_ref": "Code de droit économique VI.97", "impact": "high"},
        {"text": "Right of withdrawal not disclosed",
         "impact_description": "Mandatory 14-day withdrawal clause missing",
         "legal_ref": "VI.47", "impact": "medium"},
    ]
    strat_consumer = {"title": "Demand full refund + damages", "description": "Invoke VI.97.",
                      "score": 88}

    findings_employment = [
        {"text": "Unlawful termination", "impact_description": "No valid grounds for dismissal",
         "legal_ref": "Loi sur les contrats de travail art. 35", "impact": "high"},
    ]
    strat_employment = {"title": "Indemnité de rupture", "description": "Claim statutory severance + damages.",
                        "score": 74}

    case_evict = await _seed_case(uid, title="Eviction notice contest", case_type="eviction",
                                   summary="Tenant in Brussels received eviction notice with insufficient notice period.",
                                   findings=findings_eviction, strategy=strat_eviction, win_prob=94)
    await _seed_document(case_evict, uid, "eviction_notice_april_2026.pdf", True)
    await _seed_document(case_evict, uid, "bank_statements_2025.pdf", False)

    case_ins = await _seed_case(uid, title="Insurance bad faith claim", case_type="insurance",
                                 summary="Insurer refused to pay following water damage despite valid policy.",
                                 findings=findings_insurance, strategy=strat_insurance, win_prob=82)
    await _seed_document(case_ins, uid, "policy_contract.pdf", True)

    case_live = await _seed_case(uid, title="Quick 30-min counsel — lease termination", case_type="housing",
                                  summary="Client wants to break a lease early and needs live guidance.",
                                  findings=findings_eviction[:1], strategy=strat_eviction, win_prob=70)
    await _seed_document(case_live, uid, "lease_agreement.pdf", True)

    case_cons = await _seed_case(uid, title="Consumer refund dispute", case_type="consumer",
                                  summary="Online purchase was misrepresented, merchant refuses refund.",
                                  findings=findings_consumer, strategy=strat_consumer, win_prob=88)
    await _seed_document(case_cons, uid, "order_confirmation.pdf", True)
    await _seed_document(case_cons, uid, "merchant_emails.pdf", False)

    case_emp = await _seed_case(uid, title="Unlawful dismissal", case_type="employment",
                                 summary="Employee dismissed without valid grounds or notice.",
                                 findings=findings_employment, strategy=strat_employment, win_prob=74)
    await _seed_document(case_emp, uid, "termination_letter.pdf", True)

    case_evict_doc = await db.cases.find_one({"case_id": case_evict}, {"_id": 0})
    case_ins_doc = await db.cases.find_one({"case_id": case_ins}, {"_id": 0})
    case_live_doc = await db.cases.find_one({"case_id": case_live}, {"_id": 0})
    case_cons_doc = await db.cases.find_one({"case_id": case_cons}, {"_id": 0})
    case_emp_doc = await db.cases.find_one({"case_id": case_emp}, {"_id": 0})

    # 1. Urgent pending, expires in 12 min
    id1 = await _seed_assignment(attorney["id"], case_evict_doc, uid,
                                 status="pending", expires_in=timedelta(minutes=12))
    # 2. Pending, 23 min
    id2 = await _seed_assignment(attorney["id"], case_ins_doc, uid,
                                 status="pending", expires_in=timedelta(minutes=23))
    # 3. Pending live counsel, 27 min
    id3 = await _seed_assignment(attorney["id"], case_live_doc, uid, status="pending",
                                 service_type="live_counsel", expires_in=timedelta(minutes=27))
    # 4. Accepted, deadline in 2h14m → accepted 1h46m ago
    id4 = await _seed_assignment(attorney["id"], case_cons_doc, uid, status="accepted",
                                 accepted_ago=timedelta(hours=1, minutes=46))
    # 5. Completed + paid out
    id5 = await _seed_assignment(attorney["id"], case_emp_doc, uid, status="completed",
                                 accepted_ago=timedelta(days=10),
                                 completed_ago=timedelta(days=9),
                                 paid_ago=timedelta(days=4))

    print("")
    print(f"✅ Seeded 5 assignments for {attorney_email} (client: {client_email})")
    print("")
    for lbl, aid in [("urgent pending", id1), ("pending", id2), ("live counsel pending", id3),
                     ("accepted in progress", id4), ("completed + paid", id5)]:
        print(f"  {lbl:<24}  {aid}")
    print("")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--attorney-email", required=True)
    parser.add_argument("--client-email", default="seed.client@archer.test")
    parser.add_argument("--client-name", default="Sophie Lacroix")
    args = parser.parse_args()
    asyncio.run(seed(args.attorney_email, args.client_email, args.client_name))


if __name__ == "__main__":
    main()

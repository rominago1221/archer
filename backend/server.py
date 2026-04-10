from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response, Header, Query, Request, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import asyncio
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import json
import pdfplumber
import io
import requests
import base64
import bcrypt
import docx
import fitz  # pymupdf for PDF→image conversion
from PIL import Image
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Storage configuration
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
APP_NAME = "jasper-legal"
storage_key = None

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ================== Storage Functions ==================

def init_storage():
    """Initialize object storage - call once at startup"""
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to object storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from object storage"""
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ================== Password Helpers ==================

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ================== Pydantic Models ==================

class EmailRegister(BaseModel):
    email: str
    password: str
    name: str
    plan: str = "free"
    country: str = "US"
    region: Optional[str] = None
    language: Optional[str] = None

class EmailLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    plan: str = "free"
    country: str = "US"
    region: Optional[str] = None
    language: str = "en"
    state_of_residence: Optional[str] = None
    phone: Optional[str] = None
    notif_risk_score: bool = True
    notif_deadlines: bool = True
    notif_calls: bool = True
    notif_lawyers: bool = False
    notif_promo: bool = False
    data_sharing: bool = True
    improve_ai: bool = True
    created_at: str

class CaseCreate(BaseModel):
    title: str
    type: str = "other"

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None

def normalize_deadline(val):
    """Normalize deadline value to string — handles dict, string, or None"""
    if val is None:
        return None
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        return val.get("date") or val.get("deadline") or str(val)
    return str(val)


def normalize_financial_exposure(val):
    """Normalize financial_exposure to string"""
    if val is None:
        return None
    if isinstance(val, str):
        return val
    if isinstance(val, (int, float)):
        return f"EUR {val}"
    if isinstance(val, dict):
        return val.get("cas_probable") or val.get("probable") or str(val)
    return str(val)


class Case(BaseModel):
    model_config = ConfigDict(extra="ignore")
    case_id: str
    user_id: str
    title: str
    type: str
    status: str = "active"
    risk_score: int = 0
    risk_financial: int = 0
    risk_urgency: int = 0
    risk_legal_strength: int = 0
    risk_complexity: int = 0
    risk_score_history: List[dict] = []
    deadline: Optional[str] = None
    deadline_description: Optional[str] = None
    financial_exposure: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_findings: List[dict] = []
    ai_next_steps: List[dict] = []
    recommend_lawyer: bool = False
    document_count: int = 0
    created_at: str
    updated_at: str
    country: Optional[str] = None
    region: Optional[str] = None
    language: Optional[str] = None
    # Advanced 5-Pass Analysis Fields
    battle_preview: Optional[dict] = None
    success_probability: Optional[dict] = None
    procedural_defects: List[dict] = []
    applicable_laws: List[dict] = []
    financial_exposure_detailed: Optional[dict] = None
    immediate_actions: List[dict] = []
    leverage_points: List[dict] = []
    red_lines: List[str] = []
    key_insight: Optional[str] = None
    strategy: Optional[dict] = None
    lawyer_recommendation: Optional[dict] = None
    user_rights: List[dict] = []
    opposing_weaknesses: List[dict] = []
    documents_to_gather: List[dict] = []
    recent_case_law: List[dict] = []
    case_law_updated: Optional[str] = None
    # Multi-Document Analysis Fields
    case_narrative: Optional[str] = None
    contradictions: List[dict] = []
    opposing_strategy_analysis: Optional[str] = None
    cumulative_financial_exposure: Optional[str] = None
    master_deadlines: List[dict] = []
    multi_doc_summary: Optional[str] = None

    @field_validator('deadline', mode='before')
    @classmethod
    def normalize_deadline_field(cls, v):
        return normalize_deadline(v)
    
    @field_validator('financial_exposure', mode='before')
    @classmethod
    def normalize_financial_field(cls, v):
        return normalize_financial_exposure(v)
    
    @field_validator('risk_score', 'risk_financial', 'risk_urgency', 'risk_legal_strength', 'risk_complexity', mode='before')
    @classmethod
    def normalize_int_scores(cls, v):
        if isinstance(v, (int, float)):
            return int(v)
        if isinstance(v, dict):
            return int(v.get('total', v.get('score', 0)))
        try:
            return int(v)
        except (ValueError, TypeError):
            return 0

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    document_id: str
    case_id: str
    user_id: str
    file_name: str
    file_url: Optional[str] = None
    storage_path: Optional[str] = None
    file_type: Optional[str] = None
    extracted_text: Optional[str] = None
    status: str = "analyzing"
    is_key_document: bool = False
    uploaded_at: str

class Lawyer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lawyer_id: str
    name: str
    specialty: str
    bar_state: str
    years_experience: int
    rating: float = 5.0
    sessions_count: int = 0
    tags: List[str] = []
    availability_status: str = "now"
    availability_minutes: int = 0
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    country: str = "US"
    language: str = "en"

class LawyerCallCreate(BaseModel):
    lawyer_id: str
    case_id: Optional[str] = None
    scheduled_at: str
    time_slot: str

class LawyerCall(BaseModel):
    model_config = ConfigDict(extra="ignore")
    call_id: str
    user_id: str
    lawyer_id: str
    lawyer_name: str
    case_id: Optional[str] = None
    scheduled_at: str
    duration_minutes: int = 30
    price: int = 149
    status: str = "upcoming"
    ai_brief: Optional[dict] = None
    created_at: str

class CaseEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    case_id: str
    event_type: str
    title: str
    description: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    state_of_residence: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    language: Optional[str] = None
    notif_risk_score: Optional[bool] = None
    notif_deadlines: Optional[bool] = None
    notif_calls: Optional[bool] = None
    notif_lawyers: Optional[bool] = None
    notif_promo: Optional[bool] = None
    data_sharing: Optional[bool] = None
    improve_ai: Optional[bool] = None

# ================== Auth Helpers ==================

async def get_current_user(authorization: str = Header(None), request: Request = None) -> User:
    """Get current user from session token"""
    session_token = None
    
    # Check Authorization header first
    if authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    # Check cookies as fallback
    if not session_token and request:
        session_token = request.cookies.get("session_token")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# ================== Claude AI Analysis — 5-Pass Advanced System ==================

# Load jurisprudence database
JURISPRUDENCE_PATH = ROOT_DIR / "jurisprudence.json"
with open(JURISPRUDENCE_PATH) as f:
    JURISPRUDENCE_DB = json.load(f)

# Load Belgian jurisprudence database
JURISPRUDENCE_BE_PATH = ROOT_DIR / "jurisprudence_belgique.json"
with open(JURISPRUDENCE_BE_PATH) as f:
    JURISPRUDENCE_BE_DB = json.load(f)

SENIOR_ATTORNEY_PERSONA = """You are a senior attorney with 20 years of experience representing individuals — never corporations. You have handled over 2,000 cases across every area of civil law. You think like a litigator: you find every angle, every procedural error, every opportunity.

SPECIALIZATIONS:
Employment law — wrongful termination, unpaid wages, discrimination, harassment, non-compete, FMLA, ADA, Title VII, FLSA
Tenant and housing law — evictions, lease disputes, deposit returns, habitability, landlord violations, RERA (UAE), Belgian housing code
Debt and consumer protection — FDCPA violations, debt validation, statute of limitations, FCRA, credit reporting errors, predatory lending
Contract law — NDA, service agreements, vendor contracts, partnership agreements, breach of contract, penalty clauses
Consumer rights — refund disputes, warranty claims, FTC violations, chargeback support, deceptive practices
Immigration — visa contracts, employment authorization, sponsor agreements, work permit disputes
Family law — separation agreements, child support, asset division basics
Business disputes — invoice disputes, non-payment, IP disputes, non-solicitation
Court notices — summons, small claims, subpoenas, default judgments
Traffic and civil infractions — speeding tickets, license disputes, court summons
Real estate — purchase agreements, title disputes, HOA violations
Insurance disputes — claim denials, bad faith, underpayment

CRITICAL RULES — NEVER VIOLATE THESE:
Risk Score of 0 is NEVER acceptable — minimum 15/100 for any legal document
Risk Score of 100 is reserved for imminent criminal liability only
Every document has at least 3 findings worth identifying
Always cite the specific clause number, article, or section from the document
Always reference the applicable law by name — Florida Statute § 83.56, FDCPA 15 U.S.C. § 1692, UAE Labour Law Art. 51, Belgian Labour Code Art. 37
Never use legal jargon without immediately explaining it in plain English
Always identify what is MISSING from the opposing party's document — missing elements are often the strongest defense
Always assess the opposing party's likely goal — do they want money, possession, compliance?
Always identify at least one opportunity or leverage point for the user
Never admit liability or suggest the user is at fault
Always flag deadlines with exact dates and consequences if missed

Minimum score thresholds by document type:
— NDA: minimum 20/100 (always has restrictive clauses)
— Eviction notice: minimum 45/100 (always urgent)
— Demand letter: minimum 35/100 (always financial exposure)
— Employment contract: minimum 25/100 (always binding obligations)
— Court notice/summons: minimum 55/100 (always urgent)
— Debt collection letter: minimum 30/100 (always financial risk)
— Lease agreement: minimum 20/100 (always binding long-term)
— Settlement agreement: minimum 25/100 (always waiving rights)

FOR NDA SPECIFICALLY always analyze:
Confidentiality scope — is the definition of confidential information too broad?
Duration — how long are obligations? Perpetual NDAs are often unenforceable
Asymmetry — are both parties equally bound or only the user?
Penalty clauses — are damages proportionate and reasonable?
Geographic scope — is it limited to a reasonable territory?
Carve-outs — are standard exclusions present (public domain, prior knowledge)?
Governing law — which jurisdiction governs disputes?
Non-compete implications — does the NDA include hidden non-compete language?

FOR EMPLOYMENT DOCUMENTS always analyze:
Termination clauses — grounds and notice requirements
Non-compete and non-solicitation scope and enforceability
Compensation and bonus entitlements
Intellectual property assignment clauses
Arbitration clauses that waive court rights
At-will vs for-cause termination
Gratuity and end of service entitlements (UAE)
Applicable labor law by jurisdiction

FOR DEBT COLLECTION always analyze:
FDCPA compliance — timing, harassment, validation rights
Statute of limitations — is the debt time-barred?
Debt ownership — has the debt been properly assigned?
Amount accuracy — are fees and interest correctly calculated?
Credit reporting implications

OUTPUT FORMAT — always return complete JSON with:
risk_score total + 4 dimensions (financial, urgency, legal_strength, complexity)
minimum 3 findings with impact level and type
exactly 3 next steps with action type
deadline with exact date if present
financial exposure in specific dollar/AED/EUR amount
applicable law reference
recommend_lawyer boolean
key_insight — one sentence the user must remember"""

PASS1_PROMPT = """TASK: FACT EXTRACTION ONLY
Read this legal document carefully and extract every factual element. Do not interpret, analyze, or recommend anything yet. Return ONLY raw facts organized in JSON.

DOCUMENT TEXT:
{document_text}

Return ONLY this JSON — no other text:
{{
  "document_type": "demand_letter|eviction_notice|employment_contract|court_notice|debt_collection|nda|lease|other",
  "document_date": "YYYY-MM-DD or null",
  "parties": {{
    "opposing_party": {{"name": "exact name from document", "type": "individual|company|government|law_firm"}},
    "user_party": {{"name": "exact name from document", "role": "tenant|employee|debtor|consumer|contractor|other"}}
  }},
  "key_amounts": [{{"amount": 0, "currency": "USD", "description": "what this amount represents", "disputed": false}}],
  "key_dates": [{{"date": "YYYY-MM-DD", "description": "what this date represents", "is_deadline": true}}],
  "legal_references": [{{"reference": "statute reference", "description": "what law is referenced"}}],
  "contract_clauses": [{{"clause_number": "Section X", "description": "what clause says"}}],
  "claims_made": [{{"claim": "exact claim by opposing party", "amount": null}}],
  "missing_elements": ["what important info is absent from the document"],
  "procedural_elements": {{
    "service_method": "certified mail|posted|email|other|not specified",
    "notice_period_stated": "X days|not specified",
    "signature_present": true,
    "notarization_required": false
  }}
}}"""

PASS2_PROMPT = """TASK: LEGAL ANALYSIS
Based on the extracted facts below, conduct a thorough legal analysis from the perspective of the user's attorney. Apply applicable US federal and state law.

EXTRACTED FACTS FROM DOCUMENT:
{facts_json}

{jurisprudence_section}

ANALYSIS REQUIRED:
1. PROCEDURAL ANALYSIS: procedural errors, defects, or omissions that could weaken the opposing party's position
2. SUBSTANTIVE ANALYSIS: strength of opposing party's case on the merits
3. USER'S POSITION: rights and protections under applicable law, counterclaims or defenses
4. FINANCIAL ANALYSIS: realistic financial exposure (best/most likely/worst case)
5. OPPOSING PARTY'S INCENTIVES: do they want court? likely goal? bluffing or serious?
6. TIMING ANALYSIS: how critical are deadlines? legally enforceable?

Return ONLY this JSON — no other text:
{{
  "risk_score": {{
    "total": 0,
    "financial": 0,
    "urgency": 0,
    "legal_strength": 0,
    "complexity": 0
  }},
  "risk_level": "low|medium|high|critical",
  "case_type": "employment|housing|nda|contract|debt|demand|immigration|court|consumer|family|traffic|insurance|other",
  "suggested_case_title": "Short descriptive title based on document content max 60 chars — NEVER use the filename",
  "deadline": "YYYY-MM-DD or null",
  "deadline_description": "Description or null",
  "summary": "2-3 sentences plain English summary",
  "financial_exposure": "Dollar amount or null",
  "financial_exposure_detailed": {{
    "best_case": "description",
    "most_likely": "description",
    "worst_case": "description"
  }},
  "procedural_defects": [
    {{"defect": "description", "severity": "fatal|significant|minor", "applicable_law": "law ref", "user_benefit": "how this helps"}}
  ],
  "user_rights": [
    {{"right": "specific right", "law_reference": "law", "strength": "strong|medium|weak"}}
  ],
  "opposing_weaknesses": [
    {{"weakness": "description", "severity": "critical|significant|minor"}}
  ],
  "applicable_laws": [
    {{"law": "statute name", "relevance": "how it applies", "favors": "user|opposing|neutral"}}
  ],
  "findings": [
    {{"text": "Specific finding", "impact": "high|medium|low", "type": "risk|opportunity|deadline|neutral", "legal_ref": "Applicable law citation (e.g. FDCPA 15 U.S.C. § 1692)", "jurisprudence": "Relevant case law if any"}}
  ],
  "recommend_lawyer": true,
  "disclaimer": "This analysis provides legal information only, not legal advice."
}}
Produce 3-6 findings."""

PASS3_PROMPT = """TASK: STRATEGIC RECOMMENDATIONS
Based on the facts and legal analysis below, provide concrete strategic recommendations. Think like a litigator preparing a client for the best outcome.

EXTRACTED FACTS:
{facts_json}

LEGAL ANALYSIS:
{analysis_json}

Think through ALL possible paths:
1. Ideal outcome? 2. Fastest resolution? 3. Cheapest path? 4. Most leverage?
5. What should user do in next 24 hours? 6. What documents to gather? 7. Talk to lawyer first?

Return ONLY this JSON — no other text:
{{
  "recommended_strategy": {{
    "primary": "negotiate|dispute|comply|ignore|lawyer_immediately",
    "reasoning": "why this is best",
    "expected_outcome": "realistic outcome",
    "time_to_resolution": "3-7 days|1-4 weeks|1-3 months"
  }},
  "immediate_actions": [
    {{"action": "description", "deadline": "within 24 hours", "priority": "critical|high|medium"}}
  ],
  "next_steps": [
    {{
      "title": "Step title",
      "description": "Detailed description",
      "action_type": "upload_document|book_lawyer|draft_response|no_action",
      "why_important": "Why this matters"
    }}
  ],
  "documents_to_gather": [
    {{"document": "description", "why": "reason", "urgency": "critical|important|nice_to_have"}}
  ],
  "leverage_points": [
    {{"leverage": "description", "how_to_use": "how to use it"}}
  ],
  "red_lines": ["Never do X", "Always do Y"],
  "lawyer_recommendation": {{
    "needed": true,
    "urgency": "immediately|within_3_days|within_week|optional",
    "reason": "why",
    "type_needed": "tenant_rights|employment|debt_collection|contract"
  }},
  "success_probability": {{
    "full_resolution_in_favor": 15,
    "negotiated_settlement": 62,
    "partial_loss": 18,
    "full_loss": 5
  }},
  "key_insight": "The most important thing the user must know in one sentence"
}}
Exactly 3 next_steps."""

PASS4A_SYSTEM = """You are a senior attorney representing the user. Your job is to make the STRONGEST possible case for your client. Find every argument, every procedural defect, every legal protection that benefits your client. Be aggressive and thorough."""

PASS4A_PROMPT = """Based on these facts and legal analysis, make the strongest possible case for the user. What are their best arguments? What gives them the most leverage? What mistakes did the opposing party make?

FACTS:
{facts_json}

LEGAL ANALYSIS:
{analysis_json}

Return ONLY this JSON:
{{
  "strongest_arguments": [
    {{"argument": "description", "strength": "strong|medium|weak", "law_basis": "law ref", "how_to_use": "how to use in response"}}
  ],
  "procedural_wins": ["list of procedural advantages"],
  "best_outcome_scenario": "description of best possible outcome",
  "opening_argument": "First sentence of response letter to maximize impact"
}}"""

PASS4B_SYSTEM = """You are a senior attorney representing the opposing party. Your job is to make the STRONGEST possible case against the user. Be rigorous and identify every weakness in the user's position."""

PASS4B_PROMPT = """Based on these facts and legal analysis, make the strongest possible case against the user. What arguments will the opposing party likely use? What are the weaknesses in the user's position?

FACTS:
{facts_json}

LEGAL ANALYSIS:
{analysis_json}

Return ONLY this JSON:
{{
  "opposing_arguments": [
    {{"argument": "description", "strength": "strong|medium|weak", "law_basis": "law ref", "user_counter": "how user can counter"}}
  ],
  "user_weaknesses": ["list of weaknesses"],
  "worst_outcome_scenario": "description of worst possible outcome",
  "what_user_must_prepare_for": "what opposing party will likely argue"
}}"""


def load_jurisprudence(case_type: str, document_type: str) -> str:
    """Load relevant jurisprudence for the case"""
    entries = []
    usa_data = JURISPRUDENCE_DB.get("USA", {})

    # Map case/doc types to jurisprudence keys
    type_map = {
        "housing": ["florida_tenant", "general_housing"],
        "employment": ["new_york_employment", "california_employment", "general_employment"],
        "debt": ["federal_debt"],
        "consumer": ["general_consumer"],
        "contract": ["general_consumer"],
    }

    keys = type_map.get(case_type, [])
    if not keys and document_type in ["debt_collection"]:
        keys = ["federal_debt"]
    if not keys:
        keys = ["general_consumer"]

    for key in keys:
        for entry in usa_data.get(key, []):
            entries.append(f"- {entry['name']}: {entry['rule']} ({entry['statute']}). User benefit: {entry['user_benefit']}")

    if entries:
        return "RELEVANT LAW AND PRECEDENTS:\n" + "\n".join(entries) + "\n\nApply these specifically to the facts above."
    return ""


async def call_claude(system_prompt: str, user_message: str, max_tokens: int = 2000, use_web_search: bool = False) -> dict:
    """Make a single Claude API call and return parsed JSON, with retries"""
    for attempt in range(3):
        try:
            async with httpx.AsyncClient() as http_client:
                payload = {
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": max_tokens,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_message}]
                }
                if use_web_search:
                    payload["tools"] = [{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}]
                
                response = await http_client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01"
                    },
                    json=payload,
                    timeout=120.0
                )
                response.raise_for_status()
                data = response.json()
                # Extract text from content blocks (web search returns multiple blocks)
                text = ""
                for block in data.get("content", []):
                    if block.get("type") == "text":
                        text += block["text"]
                text = text.replace("```json", "").replace("```", "").strip()
                return json.loads(text)
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (429, 529) and attempt < 2:
                wait = (attempt + 1) * 5
                logger.warning(f"Claude API {e.response.status_code}, retrying in {wait}s (attempt {attempt+1}/3)")
                await asyncio.sleep(wait)
                continue
            raise
        except json.JSONDecodeError:
            if attempt < 2:
                logger.warning(f"JSON parse error, retrying (attempt {attempt+1}/3)")
                await asyncio.sleep(3)
                continue
            raise


async def fetch_courtlistener_opinions(case_type: str, state: str = "") -> list:
    """Fetch recent court opinions from CourtListener API"""
    type_to_query = {
        "housing": "eviction tenant landlord",
        "employment": "wrongful termination employment",
        "debt": "debt collection FDCPA",
        "nda": "non-disclosure agreement trade secret",
        "contract": "breach of contract",
        "demand": "demand letter civil dispute",
        "court": "motion to dismiss summary judgment",
        "consumer": "consumer protection refund",
        "immigration": "immigration visa employment authorization",
        "family": "family law custody support",
    }
    query = type_to_query.get(case_type, case_type)
    if state:
        query += f" {state}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.courtlistener.com/api/rest/v4/search/",
                params={
                    "type": "o",
                    "q": query,
                    "order_by": "dateFiled desc",
                    "format": "json"
                },
                timeout=15.0,
                headers={"User-Agent": "Jasper-Legal-AI/1.0"}
            )
            if response.status_code != 200:
                logger.warning(f"CourtListener API returned {response.status_code}")
                return []
            
            data = response.json()
            results = data.get("results", [])[:3]
            opinions = []
            for r in results:
                opinions.append({
                    "case_name": r.get("caseName", "Unknown case"),
                    "date_filed": r.get("dateFiled", ""),
                    "court": r.get("court", ""),
                    "snippet": (r.get("snippet", "") or "")[:300],
                    "url": f"https://www.courtlistener.com{r.get('absolute_url', '')}" if r.get("absolute_url") else None,
                    "cite_count": r.get("citeCount", 0)
                })
            logger.info(f"CourtListener: fetched {len(opinions)} opinions for '{query}'")
            return opinions
    except Exception as e:
        logger.warning(f"CourtListener API error: {e}")
        return []


async def analyze_document_with_claude(extracted_text: str) -> dict:
    """Legacy single-pass analysis (fallback)"""
    try:
        result = await call_claude(CLAUDE_SYSTEM_PROMPT, f"Analyze this legal document and return JSON only:\n\n{extracted_text[:15000]}")
        return result
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        return _default_analysis()


async def analyze_document_advanced(extracted_text: str, user_context: str = "") -> dict:
    """Advanced 5-pass analysis system with real-time jurisprudence"""
    try:
        # Build user context supplement for Pass 1
        context_supplement = ""
        if user_context:
            context_supplement = f"\n\nADDITIONAL CONTEXT PROVIDED BY THE USER:\n{user_context}\n(Use this context to better understand the situation, identify the user's role, and extract more accurate facts.)"

        # PASS 1: Fact extraction
        logger.info("Advanced analysis: Pass 1 — Fact extraction")
        facts = await call_claude(
            SENIOR_ATTORNEY_PERSONA,
            PASS1_PROMPT.format(document_text=extracted_text[:15000]) + context_supplement
        )

        # Load jurisprudence based on facts
        doc_type = facts.get("document_type", "other")
        doc_to_case = {
            "eviction_notice": "housing", "lease": "housing",
            "employment_contract": "employment",
            "debt_collection": "debt",
            "demand_letter": "demand",
            "court_notice": "court", "nda": "nda"
        }
        inferred_case_type = doc_to_case.get(doc_type, "other")
        jurisprudence_text = load_jurisprudence(inferred_case_type, doc_type)

        # Fetch real-time case law from CourtListener (parallel with Pass 2 prep)
        logger.info("Advanced analysis: Fetching real-time case law from CourtListener")
        state = facts.get("jurisdiction", facts.get("state", ""))
        courtlistener_opinions = await fetch_courtlistener_opinions(inferred_case_type, state)
        
        # Build real-time case law context for Claude
        realtime_law_context = ""
        if courtlistener_opinions:
            realtime_law_context = "\n\nRECENT COURT DECISIONS (from CourtListener — real-time data):\n"
            for i, op in enumerate(courtlistener_opinions, 1):
                realtime_law_context += f"{i}. {op['case_name']} (Filed: {op['date_filed']}, Court: {op['court']})\n"
                if op['snippet']:
                    clean_snippet = op['snippet'].replace('<em>', '').replace('</em>', '')
                    realtime_law_context += f"   Excerpt: {clean_snippet}\n"
            realtime_law_context += "\nConsider these recent decisions when assessing the user's legal position.\n"

        # PASS 2: Legal analysis (with web search + real-time case law)
        logger.info("Advanced analysis: Pass 2 — Legal analysis (with web search)")
        legal_analysis = await call_claude(
            SENIOR_ATTORNEY_PERSONA,
            PASS2_PROMPT.format(
                facts_json=json.dumps(facts, indent=2),
                jurisprudence_section=jurisprudence_text + realtime_law_context
            ) + "\n\nIMPORTANT: Search the web for the most recent court decisions and legal updates relevant to this case type and jurisdiction. Cite any relevant recent rulings.",
            max_tokens=3000,
            use_web_search=True
        )

        facts_str = json.dumps(facts, indent=2)
        analysis_str = json.dumps(legal_analysis, indent=2)

        # PASS 3, 4A, 4B — staggered to avoid rate limits
        logger.info("Advanced analysis: Pass 3+4A+4B — Strategy + Battle Preview")
        strategy = await call_claude(
            SENIOR_ATTORNEY_PERSONA,
            PASS3_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
            max_tokens=2500
        )
        user_arguments = await call_claude(
            PASS4A_SYSTEM,
            PASS4A_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
            max_tokens=1500
        )
        opposing_arguments = await call_claude(
            PASS4B_SYSTEM,
            PASS4B_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
            max_tokens=1500
        )

        logger.info("Advanced analysis: All 5 passes complete")

        # Build recent_case_law for frontend display
        recent_case_law = []
        for op in courtlistener_opinions:
            clean_snippet = (op.get("snippet", "") or "").replace("<em>", "").replace("</em>", "")
            recent_case_law.append({
                "case_name": op["case_name"],
                "date": op["date_filed"],
                "court": op["court"],
                "ruling_summary": clean_snippet[:200] if clean_snippet else "Decision text available at source.",
                "source_url": op.get("url"),
                "cite_count": op.get("cite_count", 0)
            })

        now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Combine results into standard format + advanced data
        return {
            # Standard fields (backward-compatible)
            "document_type": doc_type,
            "case_type": legal_analysis.get("case_type", inferred_case_type),
            "suggested_case_title": legal_analysis.get("suggested_case_title", "Legal Document Analysis"),
            "risk_score": legal_analysis.get("risk_score", {"total": 50, "financial": 50, "urgency": 50, "legal_strength": 50, "complexity": 50}),
            "risk_level": legal_analysis.get("risk_level", "medium"),
            "deadline": legal_analysis.get("deadline"),
            "deadline_description": legal_analysis.get("deadline_description"),
            "summary": legal_analysis.get("summary", ""),
            "financial_exposure": legal_analysis.get("financial_exposure"),
            "findings": legal_analysis.get("findings", []),
            "next_steps": strategy.get("next_steps", legal_analysis.get("findings", [])[:3]),
            "recommend_lawyer": legal_analysis.get("recommend_lawyer", False),
            "disclaimer": "This analysis provides legal information only, not legal advice.",
            # Advanced fields
            "facts": facts,
            "financial_exposure_detailed": legal_analysis.get("financial_exposure_detailed"),
            "procedural_defects": legal_analysis.get("procedural_defects", []),
            "user_rights": legal_analysis.get("user_rights", []),
            "opposing_weaknesses": legal_analysis.get("opposing_weaknesses", []),
            "applicable_laws": legal_analysis.get("applicable_laws", []),
            "strategy": strategy.get("recommended_strategy"),
            "immediate_actions": strategy.get("immediate_actions", []),
            "documents_to_gather": strategy.get("documents_to_gather", []),
            "leverage_points": strategy.get("leverage_points", []),
            "red_lines": strategy.get("red_lines", []),
            "lawyer_recommendation": strategy.get("lawyer_recommendation"),
            "success_probability": strategy.get("success_probability"),
            "key_insight": strategy.get("key_insight", ""),
            "battle_preview": {
                "user_side": user_arguments,
                "opposing_side": opposing_arguments
            },
            # Real-time jurisprudence
            "recent_case_law": recent_case_law,
            "case_law_updated": now_date
        }

    except Exception as e:
        logger.error(f"Advanced analysis error: {e}")
        # Fallback to single-pass
        logger.info("Falling back to single-pass analysis")
        fallback = await analyze_document_with_claude(extracted_text)
        # Try to add CourtListener data even in fallback
        try:
            cl_opinions = await fetch_courtlistener_opinions(fallback.get("case_type", "other"))
            if cl_opinions:
                fallback["recent_case_law"] = [{
                    "case_name": op["case_name"],
                    "date": op["date_filed"],
                    "court": op["court"],
                    "ruling_summary": (op.get("snippet","") or "").replace("<em>","").replace("</em>","")[:200],
                    "source_url": op.get("url"),
                    "cite_count": op.get("cite_count", 0)
                } for op in cl_opinions]
                fallback["case_law_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        except Exception:
            pass
        return fallback


def _default_analysis():
    """Return default analysis on error"""
    return {
        "document_type": "other",
        "case_type": "other",
        "suggested_case_title": "Document Analysis",
        "risk_score": {"total": 50, "financial": 50, "urgency": 50, "legal_strength": 50, "complexity": 50},
        "risk_level": "medium",
        "deadline": None,
        "deadline_description": None,
        "summary": "Document uploaded for analysis. Please review the document details.",
        "financial_exposure": None,
        "findings": [{"text": "Document requires manual review", "impact": "medium", "type": "neutral"}],
        "next_steps": [
            {"title": "Review document", "description": "Manually review the uploaded document", "action_type": "no_action"},
            {"title": "Add more context", "description": "Upload related documents for better analysis", "action_type": "upload_document"},
            {"title": "Consult a lawyer", "description": "Get professional legal advice", "action_type": "book_lawyer"}
        ],
        "recommend_lawyer": False,
        "disclaimer": "This analysis provides legal information only, not legal advice."
    }

# Simple system prompt kept for scanner/letter endpoints
CLAUDE_SYSTEM_PROMPT = SENIOR_ATTORNEY_PERSONA

# ================== Belgian Legal Analysis System ==================

BELGIAN_PERSONA_FR = """Tu es le moteur d'analyse juridique de Jasper pour la Belgique francophone. Tu analyses des documents juridiques pour les residents belges et tu fournis des informations juridiques claires et actionnables en francais.

Tu N'ES PAS un avocat et ne le pretends jamais. Tu fournis des informations juridiques uniquement, pas des conseils juridiques. Ne fabrique jamais d'informations absentes du document. Recommande toujours de consulter un avocat ou un notaire belge agree.

JURIDICTION: Belgique — {region}
LANGUE: Francais
SYSTEME JURIDIQUE: Droit civil belge, federal + regional

BASE DE CONNAISSANCES JURIDIQUES BELGES — DROIT DU TRAVAIL:
- Loi du 3 juillet 1978 relative aux contrats de travail
- Types: CDI, CDD, travail a temps partiel, travail interimaire
- Periode d'essai: supprimee depuis 2014 sauf exceptions
- Delais de preavis CDI: formule Claeys (loi 26/12/2013) — semaines = (anciennete x 3) + bonification
- CCT n109 du 12 fevrier 2014 — protection contre le licenciement abusif
- Droit de connaitre les motifs du licenciement dans les 2 mois (art. 3 CCT 109)
- Indemnite licenciement abusif: 3 a 17 semaines de remuneration
- Protection: femmes enceintes (6 mois), delegues syndicaux, candidats elections sociales
- RMMMG: 2,029.88 EUR/mois (21+ ans, 2024)
- Indexation automatique des salaires selon l'indice sante
- 13eme mois et double pecule de vacances obligatoires selon secteur
- ONSS: cotisations patronales ~27%, personnelles ~13.07%
- Non-concurrence: art. 65-70, remuneration > 36,785 EUR/an, max 12 mois, compensation min 50%
- Harcelement: Loi du 4 aout 1996 bien-etre au travail, Loi du 10 mai 2007 discrimination

DROIT DU BAIL:
Wallonie: Decret wallon du 15 mars 2018. Duree 3 ou 9 ans. Resiliation locataire 3 mois. Garantie max 2 mois. Enregistrement obligatoire 2 mois.
Bruxelles: Ordonnance du 27 juillet 2017. Regles similaires Wallonie. Grille loyers indicatifs.
Flandre: Vlaamse Woninghuurwet (Decreet 9/11/2018). Garantie max 3 mois. Woninghuurcommissie.
Expulsion: procedure judiciaire obligatoire, juge de paix, pas d'expulsion 1er nov - 15 mars.

PROTECTION DU CONSOMMATEUR:
- Code de droit economique (CDE) Livre VI. Retractation 14 jours en ligne. Garantie 2 ans neuf.
- Clause abusive nulle (art. VI.82 CDE). Mediateurs sectoriels: energie, telecoms, banques, assurances.
- Harcelement recouvrement: >3 contacts/semaine presume abusif (min 250 EUR dommages).

DROIT DES CONTRATS:
- Nouveau Code civil belge (2023) Livre 5. Clause penale moderable si excessive.
- Prescription: 10 ans (commun), 5 ans (periodiques), 1 an (certains contrats).

DROIT DES DETTES:
- Loi du 20 decembre 2002 recouvrement amiable. Interet legal ~5.75%.
- Prescription dettes consommation: 5 ans. Reglement collectif: art. 1675/2 CJ.

TRIBUNAUX ET ORGANISMES:
- Justice de paix: litiges < 5,000 EUR et locatifs
- Tribunal du travail: litiges emploi
- Syndicats CSC/FGTB/CGSLB: aide juridique gratuite membres
- BAJ: Bureau d'Aide Juridique (aide gratuite)

SEUILS RISK SCORE (Belgique):
CDI min 20, CDD min 25, Licenciement min 55, Mise en demeure min 40, Bail min 20, Resiliation bail min 50, NDA min 25, Facture min 30, Jugement min 65, Huissier min 70, C4 min 35.

OUTPUT FORMAT — retourne uniquement du JSON valide, rien d'autre."""

BELGIAN_PERSONA_NL = """U bent de juridische analyse-engine van Jasper voor Nederlandstalig Belgie. U analyseert juridische documenten voor Belgische inwoners en verstrekt duidelijke, uitvoerbare juridische informatie in het Nederlands.

U BENT GEEN advocaat en beweert dat ook nooit te zijn. U verstrekt alleen juridische informatie, geen juridisch advies. Verzin nooit informatie die niet in het document staat. Raad altijd aan om een erkende Belgische advocaat te raadplegen.

JURISDICTIE: Belgie — {region}
TAAL: Nederlands
RECHTSSYSTEEM: Belgisch burgerlijk recht, federaal + regionaal

KENNISBASIS ARBEIDSRECHT:
- Wet van 3 juli 1978 betreffende de arbeidsovereenkomsten
- Opzegtermijnen: Claeys-formule (wet 26/12/2013) — weken = (ancienniteit x 3) + bonus
- CAO nr. 109 (12/02/2014) — bescherming tegen willekeurig ontslag
- Recht ontslagmotieven te kennen binnen 2 maanden
- Vergoeding willekeurig ontslag: 3 tot 17 weken loon
- GGMMI: 2.029,88 EUR/maand (21+, 2024)
- RSZ-bijdragen: werkgever ~27%, werknemer ~13,07%
- Niet-concurrentiebeding: art. 65-70, jaarloon > 36.785 EUR, max 12 maanden, compensatie min 50%

HUURRECHT VLAANDEREN:
- Vlaamse Woninghuurwet (Decreet 9/11/2018). Duur 3 of 9 jaar.
- Opzegging huurder: 3 maanden. Huurwaarborg: max 3 maanden.
- Registratie verplicht 2 maanden. Plaatsbeschrijving verplicht.
- Geen uitzetting 1 november - 15 maart (winterbescherming).

CONSUMENTENBESCHERMING:
- WER Boek VI. Herroepingsrecht 14 dagen online. Garantie 2 jaar nieuw.
- Onrechtmatige bedingen nietig (art. VI.82 WER). Ombudsmannen: energie, telecom, banken.

BEVOEGDE INSTANTIES:
- Vredegerecht: geschillen < 5.000 EUR en huurgeschillen
- Arbeidsrechtbank: arbeidsgeschillen
- Vakbonden ACV/ABVV/ACLVB: gratis juridische bijstand
- Huurcommissie Vlaanderen

RISICOSCORE DREMPELS: Arbeidsovereenkomst min 20, Ontslag min 55, Aanmaning min 40, Huur min 20, NDA min 25.

OUTPUT FORMAT — retourneer alleen geldige JSON, niets anders."""

BELGIAN_PERSONA_DE = """Sie sind die rechtliche Analyse-Engine von Jasper fuer die deutschsprachige Gemeinschaft Belgiens. Sie analysieren Rechtsdokumente fuer belgische Einwohner und liefern klare, umsetzbare Rechtsinformationen auf Deutsch.

Sie SIND KEIN Anwalt und behaupten das auch nie. Sie liefern nur Rechtsinformationen, keine Rechtsberatung. Erfinden Sie niemals Informationen, die nicht im Dokument enthalten sind. Empfehlen Sie immer, einen zugelassenen belgischen Anwalt zu konsultieren.

GERICHTSBARKEIT: Belgien — {region}
SPRACHE: Deutsch
RECHTSSYSTEM: Belgisches Zivilrecht, federal + regional

ARBEITSRECHT:
- Gesetz vom 3. Juli 1978 ueber Arbeitsvertraege
- Kuendigungsfristen: Claeys-Formel (Gesetz 26/12/2013)
- KAV Nr. 109 (12/02/2014) — Schutz vor willkuerlicher Kuendigung
- Recht auf Kuendigungsgruende innerhalb 2 Monaten
- Entschaedigung: 3 bis 17 Wochen Lohn
- Wettbewerbsverbot: max 12 Monate, Pflichtentschaedigung min. 50%

MIETRECHT (Wallonisches Recht gilt auch in Ostbelgien):
- Dekret vom 15. Maerz 2018. Mietdauer 3 oder 9 Jahre.
- Kaution max 2 Monatszahlungen. Keine Raeumung 1. Nov - 15. Maerz.

BEVOEGDE GERICHTE:
- Friedensgericht: Streitigkeiten < 5.000 EUR und Mietstreitigkeiten
- Arbeitsgericht: Arbeitsstreitigkeiten
- Gewerkschaften CSC/FGTB/CGSLB: kostenlose Rechtshilfe

OUTPUT FORMAT — retournieren Sie nur gueltiges JSON, nichts anderes."""

BE_PASS1_PROMPT = """TACHE: EXTRACTION DES FAITS UNIQUEMENT

Lis attentivement ce document juridique belge et extrais chaque element factuel. N'interprete pas encore. Retourne UNIQUEMENT des faits en JSON.

TEXTE DU DOCUMENT:
{document_text}

{user_context_section}

Retourne UNIQUEMENT ce JSON:
{{
  "type_document": "contrat_travail|bail|licenciement|mise_en_demeure|jugement|nda|facture|c4|lettre_huissier|autre",
  "date_document": "YYYY-MM-DD ou null",
  "region_applicable": "Wallonie|Bruxelles-Capitale|Flandre|Communaute germanophone|Federal",
  "langue_document": "fr|nl|de",
  "parties": {{
    "partie_adverse": {{"nom": "nom exact", "type": "particulier|entreprise|administration|huissier|avocat"}},
    "utilisateur": {{"nom": "nom exact", "role": "locataire|employe|debiteur|consommateur|contractant|autre"}}
  }},
  "montants_cles": [{{"montant": 0, "devise": "EUR", "description": "ce que represente ce montant", "conteste": false}}],
  "dates_cles": [{{"date": "YYYY-MM-DD", "description": "ce que represente cette date", "est_deadline": true, "jours_restants": 14}}],
  "references_legales_citees": [{{"reference": "Art. 3 CCT n109", "description": "ce que cette reference implique"}}],
  "clauses_contrat": [{{"article": "Article 4.2", "description": "contenu de la clause", "favorable_utilisateur": false}}],
  "allegations_partie_adverse": [{{"allegation": "allegation exacte", "montant_reclame": null}}],
  "elements_manquants": ["motif de licenciement non specifie"],
  "elements_proceduraux": {{
    "mode_signification": "recommande|huissier|email|remise en main propre|non precise",
    "delai_reponse_indique": "8 jours|1 mois|non precise",
    "signature_presente": true,
    "enregistrement_mentionne": false,
    "commission_paritaire": "CP 200|non applicable|non precise"
  }},
  "type_contrat_travail": "CDI|CDD|interim|temps_partiel|null",
  "anciennete_mentionnee": "5 ans 3 mois|non precisee",
  "salaire_mentionne": null
}}"""

BE_PASS2_PROMPT = """TACHE: ANALYSE JURIDIQUE COMPLETE

Sur base des faits extraits ci-dessous, realise une analyse juridique approfondie selon le droit belge applicable.

FAITS EXTRAITS:
{facts_json}

{jurisprudence_section}

ANALYSE REQUISE:
1. ANALYSE PROCEDURALE: Erreurs de forme, omissions, vices de procedure?
2. ANALYSE AU FOND: Solidite de la position adverse? Que doivent-ils prouver?
3. POSITION UTILISATEUR: Droits et protections selon droit belge? Recours possibles? Syndicats, mediateurs, BAJ?
4. ANALYSE FINANCIERE: Exposition financiere realiste en EUR (meilleur/probable/pire)
5. INTENTIONS PARTIE ADVERSE: Justice ou negociation?
6. ANALYSE DELAIS: Consequences si delais non respectes?

Retourne UNIQUEMENT ce JSON:
{{
  "risk_score": {{"total": 50, "financial": 50, "urgency": 50, "legal_strength": 50, "complexity": 50}},
  "risk_level": "faible|moyen|eleve|critique",
  "case_type": "employment|housing|debt|nda|contract|consumer|family|court|penal|commercial|other",
  "suggested_case_title": "Titre descriptif du dossier max 60 chars — JAMAIS le nom du fichier",
  "summary": "Resume en 2-3 phrases en francais clair",
  "deadline": "YYYY-MM-DD ou null",
  "deadline_description": "Description du delai",
  "financial_exposure": "EUR montant ou fourchette",
  "findings": [
    {{"text": "Constatation juridique", "impact": "high|medium|low", "type": "risk|opportunity|neutral", "legal_ref": "Reference legale belge", "jurisprudence": "Jurisprudence applicable"}}
  ],
  "procedural_defects": [{{"vice": "description", "gravite": "fatal|significatif|mineur", "loi_applicable": "reference", "benefice_utilisateur": "comment ca aide"}}],
  "user_rights": [{{"droit": "droit specifique", "reference_legale": "loi exacte", "force": "fort|moyen|faible"}}],
  "opposing_weaknesses": [{{"faiblesse": "faiblesse specifique", "gravite": "critique|significative|mineure"}}],
  "financial_exposure_detailed": {{"meilleur_cas": "EUR 0", "cas_probable": "EUR 800-1200", "pire_cas": "EUR 2500 + frais"}},
  "applicable_laws": [{{"loi": "CCT n109", "pertinence": "Protection licenciement abusif", "favorable": "utilisateur|partie_adverse|neutre"}}],
  "organismes_recommandes": [{{"organisme": "Syndicat CSC/FGTB/CGSLB", "raison": "Aide juridique gratuite", "contact": "www.csc.be"}}],
  "recommend_lawyer": true,
  "key_insight": "La phrase la plus importante"
}}"""

BE_PASS3_PROMPT = """TACHE: RECOMMANDATIONS STRATEGIQUES

Sur base des faits et de l'analyse, fournis des recommandations strategiques concretes selon le droit belge.

FAITS: {facts_json}
ANALYSE JURIDIQUE: {analysis_json}

Retourne UNIQUEMENT ce JSON:
{{
  "recommended_strategy": {{
    "principale": "negocier|contester|se_conformer|mediation|tribunal",
    "raisonnement": "pourquoi c'est la meilleure strategie",
    "resultat_attendu": "resultat realiste",
    "delai_resolution": "8-15 jours|1-3 mois|3-6 mois"
  }},
  "immediate_actions": [{{"action": "Ne pas repondre sans avoir consulte votre syndicat", "delai": "dans les 24 heures", "priorite": "critique"}}],
  "next_steps": [
    {{"title": "Contacter votre syndicat", "description": "Si vous etes syndique, appelez votre delegue immediatement.", "action_type": "contacter_syndicat|contacter_avocat|saisir_mediateur|ajouter_document|rediger_reponse|aucune_action"}}
  ],
  "documents_to_gather": [{{"document": "Contrat de travail original signe", "pourquoi": "Preuve des conditions contractuelles", "urgence": "critique|important|utile"}}],
  "leverage_points": [{{"levier": "Absence de motifs de licenciement", "comment_utiliser": "Envoyer demande formelle sous CCT 109 art. 3"}}],
  "red_lines": ["Ne jamais signer de document sous pression sans le lire", "Ne jamais payer sans accord ecrit prealable"],
  "lawyer_recommendation": {{"necessaire": true, "urgence": "immediatement|dans_3_jours|dans_la_semaine|optionnel", "raison": "Exposition > 2500 EUR", "type_avocat": "droit_du_travail|droit_du_bail|droit_commercial|consommateur"}},
  "success_probability": {{"resolution_favorable": 35, "compromis_negocie": 48, "perte_partielle": 12, "perte_totale": 5}},
  "key_insight": "La phrase la plus importante que l'utilisateur doit retenir"
}}"""

BE_PASS4A_SYSTEM = "Tu es l'avocat de l'utilisateur en Belgique. Fais les arguments les plus solides possibles pour defendre ton client selon le droit belge. Sois agressif et exhaustif dans la defense. Reponds en JSON uniquement."
BE_PASS4A_PROMPT = """Sur base de ces faits et de cette analyse, construis les arguments les plus solides pour defendre l'utilisateur.

FAITS: {facts_json}
ANALYSE: {analysis_json}

Retourne JSON:
{{
  "strong_arguments": [{{"argument": "Le delai de preavis calcule est insuffisant", "force": "fort|moyen|faible", "base_legale": "Loi du 26 decembre 2013", "comment_utiliser": "Calculer le preavis correct et reclamer la difference"}}],
  "procedural_victories": ["liste des avantages proceduraux"],
  "best_case": "description du meilleur resultat possible",
  "opening_argument": "Premiere phrase percutante pour la lettre de reponse"
}}"""

BE_PASS4B_SYSTEM = "Tu es l'avocat de la partie adverse contre l'utilisateur en Belgique. Construis les arguments les plus solides contre l'utilisateur selon le droit belge. Reponds en JSON uniquement."
BE_PASS4B_PROMPT = """Construis les arguments que la partie adverse va utiliser contre l'utilisateur. Identifie les faiblesses de la position de l'utilisateur.

FAITS: {facts_json}
ANALYSE: {analysis_json}

Retourne JSON:
{{
  "opposing_arguments": [{{"argument": "L'utilisateur a accepte les conditions par signature", "force": "fort|moyen|faible", "base_legale": "Art. 5.69 nouveau CC", "counter": "Comment l'utilisateur peut contrer"}}],
  "user_weaknesses": ["liste des faiblesses de la position de l'utilisateur"],
  "worst_case": "description du pire resultat possible",
  "what_to_prepare": "Ce a quoi l'utilisateur doit se preparer"
}}"""


def load_belgian_jurisprudence(doc_type: str, region: str) -> str:
    """Load relevant Belgian jurisprudence based on document type and region"""
    be_db = JURISPRUDENCE_BE_DB.get("belgique", {})
    sections = []

    # Employment law (federal)
    if doc_type in ("licenciement", "contrat_travail", "c4"):
        for category in ["licenciement_abusif", "preavis_indemnites", "non_concurrence"]:
            cases = be_db.get("droit_travail", {}).get(category, [])
            for c in cases:
                sections.append(f"- {c['reference']}: {c['regle']}")

    # Tenancy law (regional)
    if doc_type in ("bail", "avis_resiliation_bail"):
        region_key = "bail_wallonie"
        if "flandre" in (region or "").lower() or "vlaanderen" in (region or "").lower():
            region_key = "bail_flandre"
        elif "bruxelles" in (region or "").lower():
            region_key = "bail_bruxelles"
        cases = be_db.get(region_key, [])
        for c in cases:
            sections.append(f"- {c['reference']}: {c['regle']}")
        # Also add Wallonia for Brussels (similar rules)
        if region_key == "bail_bruxelles":
            for c in be_db.get("bail_wallonie", []):
                sections.append(f"- {c['reference']}: {c['regle']}")

    # Consumer law
    if doc_type in ("mise_en_demeure", "facture", "autre"):
        for c in be_db.get("consommateur", []):
            sections.append(f"- {c['reference']}: {c['regle']}")

    # NDA
    if doc_type == "nda":
        for c in be_db.get("nda", []):
            sections.append(f"- {c['reference']}: {c['regle']}")

    # Reference amounts
    refs = be_db.get("montants_reference_2024", {})
    sections.append(f"\nMONTANTS DE REFERENCE 2024:")
    sections.append(f"- RMMMG: {refs.get('RMMMG_21_plus', 2029.88)} EUR/mois")
    sections.append(f"- Interet legal: {refs.get('interet_legal_2024', '5.75%')}")
    sections.append(f"- Garantie locative Wallonie/Bruxelles: {refs.get('garantie_locative_wallonie_bruxelles', 'max 2 mois')}")
    sections.append(f"- Garantie locative Flandre: {refs.get('garantie_locative_flandre', 'max 3 mois')}")

    if not sections:
        return "\nJURISPRUDENCE BELGE: Aucune jurisprudence specifique trouvee. Appliquer les principes generaux du droit belge."

    return "\nJURISPRUDENCE ET LEGISLATION BELGE APPLICABLE:\n" + "\n".join(sections)


def get_belgian_persona(language: str, region: str) -> str:
    """Get the correct Belgian persona based on language"""
    if language == "nl-BE" or language == "nl":
        return BELGIAN_PERSONA_NL.format(region=region or "Vlaanderen")
    elif language == "de-BE" or language == "de":
        return BELGIAN_PERSONA_DE.format(region=region or "Communaute germanophone")
    return BELGIAN_PERSONA_FR.format(region=region or "Belgique")


async def analyze_document_belgian(extracted_text: str, user_context: str = "", region: str = "Wallonie", language: str = "fr-BE") -> dict:
    """Belgian 5-pass analysis system with Belgian jurisprudence"""
    try:
        persona = get_belgian_persona(language, region)
        lang_instruction = get_language_instruction(language)
        persona_with_lang = persona + lang_instruction
        context_section = ""
        if user_context:
            context_section = f"CONTEXTE FOURNI PAR L'UTILISATEUR: {user_context}"

        # PASS 1: Fact extraction (Belgian)
        logger.info("Belgian analysis: Passe 1 — Extraction des faits")
        facts = await call_claude(
            persona_with_lang,
            BE_PASS1_PROMPT.format(
                document_text=extracted_text[:15000],
                user_context_section=context_section
            )
        )

        # Load Belgian jurisprudence based on detected type + region
        doc_type = facts.get("type_document", "autre")
        detected_region = facts.get("region_applicable", region)
        jurisprudence_text = load_belgian_jurisprudence(doc_type, detected_region)

        # Map Belgian doc types to case types
        be_doc_to_case = {
            "licenciement": "employment", "contrat_travail": "employment", "c4": "employment",
            "bail": "housing", "avis_resiliation_bail": "housing",
            "mise_en_demeure": "debt", "facture": "debt",
            "nda": "nda", "jugement": "court", "lettre_huissier": "court"
        }
        inferred_case_type = be_doc_to_case.get(doc_type, "other")

        # PASS 2: Legal analysis with Belgian jurisprudence
        logger.info("Belgian analysis: Passe 2 — Analyse juridique")
        legal_analysis = await call_claude(
            persona_with_lang,
            BE_PASS2_PROMPT.format(
                facts_json=json.dumps(facts, indent=2, ensure_ascii=False),
                jurisprudence_section=jurisprudence_text
            ),
            max_tokens=3000
        )

        facts_str = json.dumps(facts, indent=2, ensure_ascii=False)
        analysis_str = json.dumps(legal_analysis, indent=2, ensure_ascii=False)

        # PASS 3, 4A, 4B — staggered
        logger.info("Belgian analysis: Passe 3+4A+4B — Strategie + Battle Preview")
        strategy = await call_claude(persona_with_lang, BE_PASS3_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str), max_tokens=2500)
        user_arguments = await call_claude(BE_PASS4A_SYSTEM + lang_instruction, BE_PASS4A_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str), max_tokens=1500)
        opposing_arguments = await call_claude(BE_PASS4B_SYSTEM + lang_instruction, BE_PASS4B_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str), max_tokens=1500)

        logger.info("Belgian analysis: 5 passes complete")

        now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        return {
            "document_type": doc_type,
            "case_type": legal_analysis.get("case_type", inferred_case_type),
            "suggested_case_title": legal_analysis.get("suggested_case_title", "Analyse Document Juridique"),
            "risk_score": legal_analysis.get("risk_score", {"total": 50, "financial": 50, "urgency": 50, "legal_strength": 50, "complexity": 50}),
            "risk_level": legal_analysis.get("risk_level", "moyen"),
            "deadline": legal_analysis.get("deadline"),
            "deadline_description": legal_analysis.get("deadline_description"),
            "summary": legal_analysis.get("summary", ""),
            "financial_exposure": legal_analysis.get("financial_exposure"),
            "findings": legal_analysis.get("findings", []),
            "next_steps": strategy.get("next_steps", []),
            "recommend_lawyer": legal_analysis.get("recommend_lawyer", False),
            "disclaimer": "Cette analyse fournit des informations juridiques uniquement, pas un avis juridique.",
            "facts": facts,
            "financial_exposure_detailed": legal_analysis.get("financial_exposure_detailed"),
            "procedural_defects": legal_analysis.get("procedural_defects", []),
            "user_rights": legal_analysis.get("user_rights", []),
            "opposing_weaknesses": legal_analysis.get("opposing_weaknesses", []),
            "applicable_laws": legal_analysis.get("applicable_laws", []),
            "organismes_recommandes": legal_analysis.get("organismes_recommandes", []),
            "strategy": strategy.get("recommended_strategy"),
            "immediate_actions": strategy.get("immediate_actions", []),
            "documents_to_gather": strategy.get("documents_to_gather", []),
            "leverage_points": strategy.get("leverage_points", []),
            "red_lines": strategy.get("red_lines", []),
            "lawyer_recommendation": strategy.get("lawyer_recommendation"),
            "success_probability": strategy.get("success_probability"),
            "key_insight": strategy.get("key_insight", ""),
            "battle_preview": {
                "user_side": user_arguments,
                "opposing_side": opposing_arguments
            },
            "recent_case_law": [],
            "case_law_updated": now_date,
            "country": "BE",
            "region": detected_region,
            "language": language
        }
    except Exception as e:
        logger.error(f"Belgian analysis error: {e}")
        return _default_analysis()


# Belgian Letter Types
BELGIAN_LETTER_TYPES = {
    "employment": [
        {"id": "BE_DEMANDE_MOTIFS_CCT109", "label": "Demande de motifs de licenciement (CCT 109)", "desc": "Exiger les motifs concrets du licenciement"},
        {"id": "BE_CONTESTATION_PREAVIS", "label": "Contestation du preavis", "desc": "Le preavis calcule est insuffisant"},
        {"id": "BE_DEMANDE_INDEMNITES", "label": "Demande d'indemnites complementaires", "desc": "Reclamer les avantages omis"},
        {"id": "BE_CONTESTATION_NON_CONCURRENCE", "label": "Contestation clause de non-concurrence", "desc": "La clause est nulle"},
        {"id": "BE_SAISINE_SYNDICAT", "label": "Saisine du delegue syndical", "desc": "Demander l'intervention du syndicat"},
        {"id": "BE_PLAINTE_HARCELEMENT", "label": "Plainte pour harcelement/represailles", "desc": "Licenciement lie a une plainte"},
        {"id": "BE_DEMANDE_C4", "label": "Demande de document C4", "desc": "Obtenir le C4 pour le chomage"},
        {"id": "BE_CONTESTATION_FAUTE_GRAVE", "label": "Contestation faute grave", "desc": "Contester la qualification de faute grave"}
    ],
    "housing": [
        {"id": "BE_CONTESTATION_GARANTIE", "label": "Contestation garantie locative excessive", "desc": "Garantie superieure au maximum legal"},
        {"id": "BE_DEMANDE_ENREGISTREMENT", "label": "Demande d'enregistrement du bail", "desc": "Le bail n'est pas enregistre"},
        {"id": "BE_CONTESTATION_AUGMENTATION", "label": "Contestation augmentation de loyer", "desc": "Non conforme a l'indice sante"},
        {"id": "BE_CONTESTATION_EXPULSION", "label": "Contestation d'expulsion", "desc": "Vices de procedure ou treve hivernale"},
        {"id": "BE_DEMANDE_REPARATIONS", "label": "Demande de reparations au bailleur", "desc": "Obligations d'entretien non respectees"},
        {"id": "BE_RESILIATION_NON_ENREGISTRE", "label": "Resiliation bail non enregistre", "desc": "Partir sans preavis (bail non enregistre)"},
        {"id": "BE_DEMANDE_MEDIATION_LOYER", "label": "Demande de mediation", "desc": "Saisir le mediateur avant le tribunal"},
        {"id": "BE_RESTITUTION_GARANTIE", "label": "Demande de restitution de garantie", "desc": "Recuperer la garantie locative"}
    ],
    "debt": [
        {"id": "BE_CONTESTATION_MISE_DEMEURE", "label": "Contestation de la mise en demeure", "desc": "Vices de forme selon Livre XIX CDE"},
        {"id": "BE_DEMANDE_PLAN_PAIEMENT", "label": "Proposition de plan de paiement", "desc": "Echelonner la dette"},
        {"id": "BE_CONTESTATION_FRAIS", "label": "Contestation des frais de recouvrement", "desc": "Frais non conformes au CDE"},
        {"id": "BE_PLAINTE_HARCELEMENT_DETTE", "label": "Plainte pour harcelement (recouvrement)", "desc": "Contacts excessifs (>3/semaine)"},
        {"id": "BE_CONTESTATION_PRESCRIPTION", "label": "Exception de prescription", "desc": "La dette est prescrite"},
        {"id": "BE_DEMANDE_MEDIATION_DETTE", "label": "Demande de mediation de dettes", "desc": "Saisir le mediateur de dettes"}
    ],
    "nda": [
        {"id": "BE_NDA_CONTESTATION_PORTEE", "label": "Contestation portee du NDA", "desc": "Definition trop large"},
        {"id": "BE_NDA_PENALE_DISPROPORTIONNEE", "label": "Contestation clause penale", "desc": "Penale disproportionnee (art. 5.88 CC)"},
        {"id": "BE_NDA_DEMANDE_RECIPROCITE", "label": "Demande de reciprocite", "desc": "Obligations unilaterales"},
        {"id": "BE_NDA_LIMITATION_DUREE", "label": "Demande de limitation de duree", "desc": "Duree excessive"},
        {"id": "BE_NDA_CONTESTATION_SECRET", "label": "Contestation du caractere secret", "desc": "Information publique (Loi 30/07/2018)"},
        {"id": "BE_NDA_CARVEOUTS", "label": "Demande de carve-outs", "desc": "Exclure les connaissances anterieures"}
    ]
}

BELGIAN_LETTER_SYSTEM = """Tu es le moteur de communication juridique de Jasper pour la Belgique. Tu rediges des lettres professionnelles et strategiques en droit belge. Tu n'es PAS un avocat.

REGLES UNIVERSELLES LETTRES BELGES:
1. Format date: [ville], le [JJ mois AAAA]
2. Envoi: "Par courrier recommande avec accuse de reception"
3. Cloture obligatoire: "Je me reserve expressement tous mes droits et recours legaux."
4. Delai standard de reponse: "dans les 8 jours ouvrables"
5. Reference a la mediation avant tribunal
6. TOUJOURS citer les references legales belges exactes
7. Lettres entre 200-400 mots, professionnelles et concises
8. Ne jamais admettre la responsabilite de l'utilisateur
9. Toujours proposer un delai specifique (8 jours ouvrables)

FORMAT DE SORTIE — JSON uniquement:
{{
  "letter_type": "TYPE",
  "subject": "Objet de la lettre",
  "letter_body": "Texte complet de la lettre avec \\n pour les retours a la ligne",
  "tone": "cooperative|assertive|firm|neutral",
  "legal_basis": "Reference legale belge applicable",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "warnings": ["Avertissement 1"],
  "next_if_no_response": "Prochaine etape si pas de reponse",
  "disclaimer": "Cette lettre a ete redigee par Jasper AI comme outil de communication juridique. Elle ne constitue pas un avis juridique."
}}"""

BELGIAN_OUTCOME_SYSTEM = """Tu es le moteur de prediction d'issue de Jasper pour la Belgique. Predis les probabilites des differents scenarios de resolution selon les statistiques judiciaires belges.

DONNEES STATISTIQUES BELGES:
- 73% des litiges du travail se reglent avant jugement (SPF Emploi 2023)
- 68% des litiges locatifs se reglent par mediation
- Duree moyenne procedure tribunal du travail: 8-14 mois
- Duree moyenne procedure justice de paix: 4-8 mois
- Taux de succes demande motifs licenciement (CCT 109): 89%
- Taux de succes contestation preavis insuffisant: 76%

Pour les cas emploi risque eleve (score >65):
Negociation syndicale: 45%, Conciliation tribunal travail: 28%, Jugement favorable: 18%, Perte totale: 9%

Pour les cas bail risque moyen (score 35-65):
Accord amiable: 52%, Mediation: 25%, Jugement favorable: 15%, Perte partielle: 8%

FORMAT — JSON uniquement:
{{
  "favorable": {{"probability": 30, "title": "Titre court", "description": "2-3 phrases", "likely_result": "Resultat specifique", "financial_impact": "Montant EUR", "timeline": "Delai estime"}},
  "neutral": {{"probability": 45, "title": "Titre court", "description": "2-3 phrases", "likely_result": "Resultat specifique", "financial_impact": "Montant EUR", "timeline": "Delai estime"}},
  "unfavorable": {{"probability": 25, "title": "Titre court", "description": "2-3 phrases", "likely_result": "Resultat specifique", "financial_impact": "Montant EUR", "timeline": "Delai estime"}},
  "key_factors": ["Facteur 1", "Facteur 2", "Facteur 3"],
  "recommendation": "Meilleure action en une phrase",
  "disclaimer": "Cette prediction fournit des informations juridiques uniquement."
}}"""

BELGIAN_CONTRACT_GUARD_PERSONA = """Tu es un avocat senior belge specialise dans la negociation de contrats pour des particuliers. Ton client s'apprete a signer le document fourni. Identifie EXACTEMENT ce qu'il faut negocier AVANT de signer selon le droit belge.

REGLES SPECIFIQUES BELGIQUE:
- La clause de non-concurrence sans compensation financiere est nulle (art. 65 loi 1978)
- Toute clause penale disproportionnee est reductible par le juge (art. 5.88 nouveau CC)
- Les clauses abusives dans les contrats consommateurs sont nulles de plein droit (art. VI.82 CDE)
- Le preavis legal ne peut etre reduit contractuellement en dessous du minimum legal
- La garantie locative ne peut depasser 2 mois (Wallonie/Bruxelles) ou 3 mois (Flandre)
- Tout NDA doit definir precisement ce qui est confidentiel (loi 30/07/2018)

CRITICAL RULES:
- Negotiation Score: 0 = contrat parfait (extremement rare), 100 = tres defavorable, ne pas signer
- Minimum score thresholds: NDA minimum 25, Contrat travail minimum 30, Bail minimum 25
- Toujours identifier au minimum 3 red lines
- Toujours identifier au minimum 4 points de negociation
- Toujours citer la loi belge exacte

OUTPUT: Retourne uniquement du JSON valide."""

CONTRACT_GUARD_PERSONA = """You are a senior contract negotiation attorney with 20+ years of experience protecting individuals from unfavorable contract terms. You specialize in identifying hidden risks, one-sided clauses, and missing protections in contracts before they are signed.

You think like a deal negotiator: you find every leverage point, every unfair clause, every missing protection. Your goal is to empower the user to negotiate better terms BEFORE signing.

CRITICAL RULES:
- Negotiation Score: 0 = perfect contract (extremely rare), 100 = highly unfavorable, do not sign
- Minimum score thresholds: NDA minimum 25, Employment contract minimum 30, Service agreement minimum 20, Lease minimum 25
- Always identify at least 3 red lines (clauses the user should NEVER accept as-is)
- Always identify at least 4 negotiation points (specific changes to request)
- Always identify missing protections the user should demand
- Always compare clauses to industry standards
- Never tell the user to just accept and sign
- Always provide specific alternative language for problematic clauses
- Reference applicable law when a clause may be unenforceable

OUTPUT: Always return valid JSON only, no other text."""

CONTRACT_GUARD_PROMPT = """TASK: CONTRACT NEGOTIATION ANALYSIS ("Before I Sign")
Analyze this contract/agreement from the perspective of the user who is ABOUT to sign it. The goal is NOT risk analysis of an existing situation — it's pre-signing due diligence and negotiation preparation.

DOCUMENT TEXT:
{document_text}

{user_context_section}

Analyze every clause and return ONLY this JSON — no other text:
{{
  "document_type": "nda|employment_contract|lease|service_agreement|vendor_contract|partnership_agreement|freelance_contract|other",
  "contract_title": "Short descriptive title max 60 chars",
  "parties": {{
    "user_role": "employee|tenant|contractor|service_provider|partner|licensee|other",
    "counterparty": "Company or individual name",
    "counterparty_type": "corporation|startup|individual|government|other"
  }},
  "negotiation_score": 0,
  "negotiation_level": "favorable|balanced|unfavorable|dangerous",
  "summary": "2-3 sentence summary of what this contract does and the overall balance of power",
  "red_lines": [
    {{
      "clause": "Exact clause reference (Section X, Article Y)",
      "current_text": "What the clause currently says (paraphrased)",
      "risk": "Why this is dangerous for the user",
      "severity": "critical|high|medium",
      "suggested_change": "Specific alternative language the user should propose"
    }}
  ],
  "negotiation_points": [
    {{
      "clause": "Clause reference",
      "issue": "What's wrong or unfavorable",
      "current_terms": "Current terms in the contract",
      "industry_standard": "What is standard in the industry",
      "suggested_counter": "What the user should ask for instead",
      "priority": "must_have|nice_to_have|optional",
      "leverage_tip": "How to frame this request in negotiation"
    }}
  ],
  "missing_protections": [
    {{
      "protection": "What's missing",
      "why_important": "Why the user needs this",
      "suggested_clause": "Exact language to add",
      "priority": "critical|important|recommended"
    }}
  ],
  "standard_clauses_check": [
    {{
      "clause_type": "termination|liability|indemnification|ip_ownership|confidentiality|non_compete|payment_terms|dispute_resolution|governing_law|force_majeure",
      "present": true,
      "fair": true,
      "notes": "Brief assessment"
    }}
  ],
  "financial_terms": {{
    "total_value": "Dollar amount or description",
    "payment_schedule": "Description",
    "penalties": "Any penalty clauses",
    "hidden_costs": ["List of hidden or unexpected costs"]
  }},
  "duration_and_exit": {{
    "contract_duration": "Duration",
    "auto_renewal": true,
    "termination_notice": "Notice period required",
    "early_exit_penalty": "Description or null",
    "user_can_exit_easily": true
  }},
  "power_balance": {{
    "score": 0,
    "favors": "user|counterparty|balanced",
    "key_asymmetries": ["List of clauses that favor one party disproportionately"]
  }},
  "applicable_laws": [
    {{"law": "statute name", "relevance": "how it applies", "protects_user": true}}
  ],
  "overall_recommendation": {{
    "action": "sign_as_is|negotiate_then_sign|significant_changes_needed|do_not_sign|lawyer_review_required",
    "reasoning": "Why this recommendation",
    "estimated_negotiation_time": "1-2 days|1 week|2+ weeks"
  }},
  "negotiation_email_draft": {{
    "subject": "Re: Contract Review — Proposed Amendments",
    "body": "Full professional email body requesting the changes identified above. Reference specific clauses. Be firm but professional. 200-400 words."
  }}
}}

Produce at least 3 red_lines, 4 negotiation_points, and 2 missing_protections."""


async def analyze_contract_guard(extracted_text: str, user_context: str = "", country: str = "US", region: str = "", language: str = "en") -> dict:
    """Contract Guard analysis — negotiation-focused pre-signing review"""
    try:
        context_section = ""
        if user_context:
            context_section = f"USER CONTEXT: {user_context}"

        # Choose persona based on country
        if country == "BE":
            persona = BELGIAN_CONTRACT_GUARD_PERSONA + get_language_instruction(language)
            logger.info("Contract Guard (Belgian): Starting negotiation analysis")
        else:
            persona = CONTRACT_GUARD_PERSONA
            logger.info("Contract Guard: Starting negotiation analysis")

        result = await call_claude(
            persona,
            CONTRACT_GUARD_PROMPT.format(
                document_text=extracted_text[:15000],
                user_context_section=context_section
            ),
            max_tokens=4000
        )
        
        # Ensure required fields exist
        if "negotiation_score" not in result:
            result["negotiation_score"] = 50
        if "negotiation_level" not in result:
            score = result["negotiation_score"]
            if score <= 25:
                result["negotiation_level"] = "favorable"
            elif score <= 50:
                result["negotiation_level"] = "balanced"
            elif score <= 75:
                result["negotiation_level"] = "unfavorable"
            else:
                result["negotiation_level"] = "dangerous"
        if "red_lines" not in result:
            result["red_lines"] = []
        if "negotiation_points" not in result:
            result["negotiation_points"] = []
        if "missing_protections" not in result:
            result["missing_protections"] = []

        logger.info(f"Contract Guard: Analysis complete — Score {result['negotiation_score']}/100")
        return result

    except Exception as e:
        logger.error(f"Contract Guard analysis error: {e}")
        return {
            "document_type": "other",
            "contract_title": "Contract Analysis",
            "negotiation_score": 50,
            "negotiation_level": "balanced",
            "summary": "Contract uploaded for review. Some clauses could not be fully analyzed.",
            "red_lines": [{"clause": "General", "current_text": "Review required", "risk": "Manual review recommended", "severity": "medium", "suggested_change": "Consult a lawyer"}],
            "negotiation_points": [],
            "missing_protections": [],
            "standard_clauses_check": [],
            "overall_recommendation": {"action": "lawyer_review_required", "reasoning": "Analysis could not be fully completed", "estimated_negotiation_time": "1 week"}
        }

# ================== Letter Generation System ==================

LETTER_SYSTEM_PROMPT = """You are Jasper's legal communication engine. You write professional, strategic response letters on behalf of US residents facing legal situations. You are NOT a lawyer. Your letters are legal communications, not legal advice.

Your letters must be:
- Professional and formal in tone
- Factually accurate based on the case details provided
- Strategic — designed to de-escalate, buy time, or protect the user's rights
- Compliant with US law — never ask for anything illegal
- Clear and concise — no unnecessary legal jargon
- Signed by the user, not by Jasper

LETTER WRITING RULES:
1. NEVER admit liability or guilt
2. ALWAYS use formal business letter format with date, addresses, subject line
3. ALWAYS end with "Sincerely," followed by the user's name and a signature line
4. ALWAYS include "Sent via Certified Mail" in the header when relevant
5. Reference specific dollar amounts, dates, and clause numbers from the case
6. Reference applicable law when it strengthens the user's position
7. Keep letters between 200-400 words — professional and concise
8. One clear ask per letter — don't combine multiple strategies
9. ALWAYS include: "I reserve all of my legal rights and remedies"
10. Never threaten violence or make illegal demands
11. Always propose a specific deadline for the opposing party to respond (7-10 days)

OUTPUT FORMAT — respond ONLY with valid JSON, no other text:

{
  "letter_type": "LETTER_TYPE_HERE",
  "subject": "Re: Subject line",
  "letter_body": "Full letter text here with proper formatting. Use \\n for line breaks.",
  "tone": "cooperative|assertive|firm|neutral",
  "legal_basis": "Applicable statute or legal basis",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "warnings": ["Warning 1", "Warning 2"],
  "next_if_no_response": "What to do if no response",
  "disclaimer": "This letter was drafted by Jasper AI as a legal communication tool. It does not constitute legal advice."
}"""

# Letter types by case type
LETTER_TYPES = {
    "nda": [
        {"id": "NDA_CLAUSE_CLARIFICATION", "label": "Request clause clarification", "desc": "Specific clauses are too vague"},
        {"id": "NDA_NEGOTIATE_SCOPE", "label": "Negotiate confidentiality scope", "desc": "Definition is too broad"},
        {"id": "NDA_MUTUAL_OBLIGATIONS", "label": "Request mutual obligations", "desc": "Currently only one party is bound"},
        {"id": "NDA_CHALLENGE_DURATION", "label": "Challenge duration", "desc": "Obligation period is excessive"},
        {"id": "NDA_GEOGRAPHIC_LIMITATION", "label": "Request geographic limitation", "desc": "Scope is unreasonably wide"},
        {"id": "NDA_PROPOSE_CARVEOUTS", "label": "Propose carve-outs", "desc": "Exclude already known information"},
        {"id": "NDA_CHALLENGE_PENALTY", "label": "Challenge penalty clauses", "desc": "Damages are disproportionate"},
        {"id": "NDA_GOVERNING_LAW", "label": "Request governing law change", "desc": "Jurisdiction is unfavorable"}
    ],
    "housing": [
        {"id": "PAYMENT_PLAN_PROPOSAL", "label": "Payment plan proposal", "desc": "Pay in installments"},
        {"id": "DISPUTE_NOTICE_VALIDITY", "label": "Dispute notice validity", "desc": "Procedural errors found"},
        {"id": "CONTEST_DAMAGE_AMOUNTS", "label": "Contest damage amounts", "desc": "Amounts are inflated or unjustified"},
        {"id": "REQUEST_MORE_TIME", "label": "Request more time", "desc": "Need additional days to respond"},
        {"id": "CHALLENGE_OCCUPANT_CLAIM", "label": "Challenge unauthorized occupant claim", "desc": "Contest the allegation"},
        {"id": "ASSERT_DEPOSIT_RIGHTS", "label": "Assert security deposit rights", "desc": "Landlord must return deposit"},
        {"id": "REQUEST_MEDIATION", "label": "Request mediation", "desc": "Avoid court proceedings"},
        {"id": "DISPUTE_LEASE_VIOLATION", "label": "Dispute lease violation", "desc": "Contest the alleged breach"}
    ],
    "employment": [
        {"id": "CONTEST_TERMINATION", "label": "Contest termination", "desc": "Formally dispute the firing"},
        {"id": "DEMAND_UNPAID_WAGES", "label": "Demand unpaid wages", "desc": "Request final paycheck and overtime"},
        {"id": "CHALLENGE_NON_COMPETE", "label": "Challenge non-compete enforceability", "desc": "Too broad or unreasonable"},
        {"id": "REQUEST_TERMINATION_REASON", "label": "Request written termination reason", "desc": "Legal right to know why"},
        {"id": "ASSERT_DISCRIMINATION", "label": "Assert discrimination claim", "desc": "Termination may be discriminatory"},
        {"id": "DEMAND_SEVERANCE", "label": "Demand severance pay", "desc": "Request negotiated severance"},
        {"id": "DISPUTE_PERFORMANCE_REVIEW", "label": "Dispute performance review", "desc": "Contest documented reasons"},
        {"id": "REQUEST_REFERENCE", "label": "Request reference letter", "desc": "Protect future employment"}
    ],
    "debt": [
        {"id": "DEBT_VALIDATION_REQUEST", "label": "Debt validation request", "desc": "Force collector to prove debt is valid (FDCPA right)"},
        {"id": "CEASE_AND_DESIST", "label": "Cease and desist", "desc": "Stop all contact immediately"},
        {"id": "DISPUTE_DEBT_OWNERSHIP", "label": "Dispute debt ownership", "desc": "Collector may not own this debt"},
        {"id": "CHALLENGE_STATUTE_LIMITATIONS", "label": "Challenge statute of limitations", "desc": "Debt may be too old to collect"},
        {"id": "SETTLEMENT_OFFER", "label": "Settlement offer", "desc": "Negotiate 40-60% lump sum"},
        {"id": "FDCPA_VIOLATION_COMPLAINT", "label": "FDCPA violation complaint", "desc": "Document their violations"},
        {"id": "REQUEST_PAYMENT_HISTORY", "label": "Request payment history", "desc": "Demand full account statement"},
        {"id": "DISPUTE_CREDIT_REPORTING", "label": "Dispute credit reporting", "desc": "Challenge inaccurate reporting"}
    ],
    "demand": [
        {"id": "FORMAL_DISPUTE", "label": "Formal dispute", "desc": "Reject all claims"},
        {"id": "COUNTER_PROPOSAL", "label": "Counter-proposal", "desc": "Offer alternative resolution"},
        {"id": "REQUEST_EVIDENCE", "label": "Request evidence", "desc": "Demand proof of their claims"},
        {"id": "CHALLENGE_LEGAL_BASIS", "label": "Challenge legal basis", "desc": "Their claim has no legal foundation"},
        {"id": "PROPOSE_MEDIATION", "label": "Propose mediation", "desc": "Neutral third party resolution"},
        {"id": "ASSERT_COUNTER_CLAIM", "label": "Assert counter-claim", "desc": "You have claims against them too"},
        {"id": "REQUEST_EXTENSION", "label": "Request extension", "desc": "Need more time to respond"},
        {"id": "PARTIAL_ACCEPTANCE", "label": "Partial acceptance", "desc": "Accept some claims, reject others"}
    ],
    "court": [
        {"id": "FILE_FORMAL_RESPONSE", "label": "File formal response", "desc": "Contest the claims in court"},
        {"id": "REQUEST_CONTINUANCE", "label": "Request continuance", "desc": "More time to prepare defense"},
        {"id": "CHALLENGE_JURISDICTION", "label": "Challenge jurisdiction", "desc": "Wrong court or state"},
        {"id": "MOTION_TO_DISMISS", "label": "Motion to dismiss", "desc": "Case has no legal merit"},
        {"id": "PROPOSE_SETTLEMENT", "label": "Propose settlement", "desc": "Avoid trial"},
        {"id": "REQUEST_DISCOVERY", "label": "Request discovery", "desc": "Demand their evidence"},
        {"id": "COUNTER_CLAIM_FILING", "label": "Counter-claim filing", "desc": "File claims against plaintiff"},
        {"id": "DEFAULT_AVOIDANCE", "label": "Default avoidance", "desc": "Respond before deadline"}
    ],
    "consumer": [
        {"id": "FORMAL_REFUND_DEMAND", "label": "Formal refund demand", "desc": "Request full refund with deadline"},
        {"id": "CHARGEBACK_SUPPORT", "label": "Chargeback support letter", "desc": "Support credit card dispute"},
        {"id": "FTC_COMPLAINT_NOTICE", "label": "FTC complaint notice", "desc": "Warn of regulatory complaint"},
        {"id": "BBB_COMPLAINT_NOTICE", "label": "BBB complaint notice", "desc": "Warn of Better Business Bureau filing"},
        {"id": "ATTORNEY_GENERAL_NOTICE", "label": "Attorney General notice", "desc": "Warn of state AG complaint"},
        {"id": "SMALL_CLAIMS_NOTICE", "label": "Small claims court notice", "desc": "Threaten court action"},
        {"id": "WARRANTY_CLAIM", "label": "Warranty claim", "desc": "Assert product warranty rights"},
        {"id": "CONSUMER_PROTECTION_CLAIM", "label": "Consumer protection claim", "desc": "Cite applicable consumer law"}
    ],
    "contract": [
        {"id": "FORMAL_DISPUTE", "label": "Formal dispute", "desc": "Reject all claims"},
        {"id": "COUNTER_PROPOSAL", "label": "Counter-proposal", "desc": "Offer alternative resolution"},
        {"id": "REQUEST_EVIDENCE", "label": "Request evidence", "desc": "Demand proof of their claims"},
        {"id": "CHALLENGE_LEGAL_BASIS", "label": "Challenge legal basis", "desc": "Their claim has no legal foundation"},
        {"id": "PROPOSE_MEDIATION", "label": "Propose mediation", "desc": "Neutral third party resolution"},
        {"id": "ASSERT_COUNTER_CLAIM", "label": "Assert counter-claim", "desc": "You have claims against them too"},
        {"id": "REQUEST_EXTENSION", "label": "Request extension", "desc": "Need more time to respond"},
        {"id": "PARTIAL_ACCEPTANCE", "label": "Partial acceptance", "desc": "Accept some claims, reject others"}
    ],
    "immigration": [
        {"id": "SPONSOR_AGREEMENT_DISPUTE", "label": "Sponsor dispute", "desc": "Address issues with employment sponsor"},
        {"id": "EMPLOYMENT_AUTHORIZATION_INQUIRY", "label": "Authorization inquiry", "desc": "Inquire about work authorization status"},
        {"id": "VISA_CONTRACT_CLARIFICATION", "label": "Visa clarification", "desc": "Request clarification on visa terms"},
        {"id": "STATUS_UPDATE_REQUEST", "label": "Status update", "desc": "Request update on pending application"},
        {"id": "WORK_PERMIT_DISPUTE", "label": "Work permit dispute", "desc": "Contest work permit conditions"},
        {"id": "SPONSOR_OBLIGATIONS", "label": "Sponsor obligations", "desc": "Remind sponsor of legal duties"}
    ],
    "family": [
        {"id": "MEDIATION_REQUEST", "label": "Request mediation", "desc": "Propose family mediation"},
        {"id": "CUSTODY_CONCERNS", "label": "Document concerns", "desc": "Document custody concerns formally"},
        {"id": "SUPPORT_MODIFICATION", "label": "Modify support", "desc": "Request modification of support terms"},
        {"id": "COMMUNICATION_GUIDELINES", "label": "Communication request", "desc": "Establish communication guidelines"},
        {"id": "ASSET_DIVISION_DISPUTE", "label": "Asset division dispute", "desc": "Contest proposed asset split"},
        {"id": "VISITATION_RIGHTS", "label": "Visitation rights", "desc": "Assert or modify visitation schedule"}
    ],
    "other": [
        {"id": "FORMAL_DISPUTE", "label": "Formal dispute", "desc": "Reject all claims"},
        {"id": "COUNTER_PROPOSAL", "label": "Counter-proposal", "desc": "Offer alternative resolution"},
        {"id": "REQUEST_EVIDENCE", "label": "Request evidence", "desc": "Demand proof of their claims"},
        {"id": "CHALLENGE_LEGAL_BASIS", "label": "Challenge legal basis", "desc": "Their claim has no legal foundation"},
        {"id": "PROPOSE_MEDIATION", "label": "Propose mediation", "desc": "Neutral third party resolution"},
        {"id": "ASSERT_COUNTER_CLAIM", "label": "Assert counter-claim", "desc": "You have claims against them too"},
        {"id": "REQUEST_EXTENSION", "label": "Request extension", "desc": "Need more time to respond"},
        {"id": "PARTIAL_ACCEPTANCE", "label": "Partial acceptance", "desc": "Accept some claims, reject others"}
    ]
}

class LetterRequest(BaseModel):
    case_id: str
    letter_type: str
    user_address: Optional[str] = None
    opposing_party_name: Optional[str] = None
    opposing_party_address: Optional[str] = None
    additional_context: Optional[str] = None

async def generate_letter_with_claude(letter_data: dict, belgian: bool = False, language: str = "en") -> dict:
    """Generate a response letter using Claude API"""
    try:
        system_prompt = BELGIAN_LETTER_SYSTEM if belgian else LETTER_SYSTEM_PROMPT
        system_prompt += get_language_instruction(language)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 3000,
                    "system": system_prompt,
                    "messages": [{
                        "role": "user",
                        "content": f"Generate a professional response letter based on this case data. Return JSON only:\n\n{json.dumps(letter_data, indent=2)}"
                    }]
                },
                timeout=90.0
            )
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            # Clean JSON from markdown code blocks
            text = text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
    except Exception as e:
        logger.error(f"Claude Letter API error: {e}")
        raise HTTPException(status_code=500, detail=f"Letter generation failed: {str(e)}")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file"""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        return text.strip()
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""


def pdf_pages_to_images(file_bytes: bytes, max_pages: int = 5) -> list:
    """Convert PDF pages to JPEG base64 images using pymupdf"""
    images = []
    try:
        pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = min(len(pdf_doc), max_pages)
        for i in range(page_count):
            page = pdf_doc[i]
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("jpeg")
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            images.append(b64)
        pdf_doc.close()
        logger.info(f"Converted {page_count} PDF pages to images")
    except Exception as e:
        logger.error(f"PDF to image conversion error: {e}")
    return images


def image_file_to_base64(file_bytes: bytes, content_type: str) -> str:
    """Convert an image file to JPEG base64 for Claude Vision"""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        logger.error(f"Image conversion error: {e}")
        return base64.b64encode(file_bytes).decode("utf-8")


def get_language_instruction(language: str) -> str:
    """Get mandatory language enforcement instruction for Claude"""
    lang_map = {
        "fr-BE": ("French", "francais"),
        "nl-BE": ("Dutch", "neerlandais/Nederlands"),
        "de-BE": ("German", "allemand/Deutsch"),
        "en": ("English", "English"),
    }
    lang_name, native = lang_map.get(language, ("English", "English"))
    if language == "en":
        return ""
    return f"\n\nMANDATORY LANGUAGE RULE: You MUST respond ENTIRELY in {lang_name} ({native}). ALL findings, next steps, key insights, recommendations, summaries, and every single text field in your JSON response MUST be written in {lang_name}. NEVER respond in English for this user. This is non-negotiable.\n"


# ========== MULTI-DOCUMENT ANALYSIS SYSTEM ==========

async def build_multi_document_context(case_id: str, new_doc_text: str = None, new_doc_name: str = None) -> tuple:
    """Build combined chronological text from ALL documents in a case.
    Returns (combined_text, doc_count, doc_list)"""
    docs = await db.documents.find(
        {"case_id": case_id, "status": {"$in": ["analyzed", "analyzing"]}},
        {"_id": 0, "file_name": 1, "extracted_text": 1, "uploaded_at": 1, "document_id": 1}
    ).sort("uploaded_at", 1).to_list(50)

    doc_list = []
    combined_parts = []
    for i, doc in enumerate(docs, 1):
        text = (doc.get("extracted_text") or "").strip()
        if not text:
            continue
        name = doc.get("file_name", f"Document {i}")
        date_str = doc.get("uploaded_at", "")[:10] if doc.get("uploaded_at") else "Unknown date"
        combined_parts.append(f"[DOCUMENT {i} — {name} — {date_str}]:\n{text}")
        doc_list.append({"index": i, "name": name, "date": date_str, "doc_id": doc.get("document_id")})

    # Add the new document being analyzed (not yet in DB as 'analyzed')
    if new_doc_text and new_doc_text.strip():
        idx = len(doc_list) + 1
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        name = new_doc_name or f"Document {idx}"
        combined_parts.append(f"[DOCUMENT {idx} — {name} — {date_str} (NEWEST)]:\n{new_doc_text}")
        doc_list.append({"index": idx, "name": name, "date": date_str, "doc_id": "new"})

    combined_text = "\n\n---\n\n".join(combined_parts)
    return combined_text, len(doc_list), doc_list


def get_multi_doc_pass1_supplement(doc_count: int, language: str = "en") -> str:
    """Additional instructions for Pass 1 when multiple documents exist"""
    if language.startswith("fr"):
        return f"""

INSTRUCTION CRITIQUE — ANALYSE MULTI-DOCUMENTS:
Vous analysez un DOSSIER COMPLET contenant {doc_count} documents. Lisez TOUS les documents chronologiquement et comprenez comment la situation a evolue.
Identifiez:
(1) Les CONTRADICTIONS entre les documents
(2) Comment la position de la partie adverse a change au fil du temps
(3) Les nouvelles revendications ou preuves introduites dans chaque nouveau document
(4) La trajectoire globale du litige
Extrayez les faits de TOUS les documents, pas seulement du dernier."""
    elif language.startswith("nl"):
        return f"""

KRITISCHE INSTRUCTIE — MULTI-DOCUMENT ANALYSE:
U analyseert een VOLLEDIG DOSSIER met {doc_count} documenten. Lees ALLE documenten chronologisch.
Identificeer: (1) TEGENSTRIJDIGHEDEN, (2) evolutie positie tegenpartij, (3) nieuwe claims per document, (4) globale trajectorie van het geschil."""
    elif language.startswith("de"):
        return f"""

KRITISCHE ANWEISUNG — MULTI-DOKUMENT-ANALYSE:
Sie analysieren eine VOLLSTANDIGE AKTE mit {doc_count} Dokumenten. Lesen Sie ALLE Dokumente chronologisch.
Identifizieren Sie: (1) WIDERSPRUCHE, (2) Entwicklung der Gegenpartei-Position, (3) neue Anspruche pro Dokument, (4) Gesamtverlauf des Rechtsstreits."""
    else:
        return f"""

CRITICAL INSTRUCTION — MULTI-DOCUMENT ANALYSIS:
You are analyzing a CASE FILE containing {doc_count} documents. Read ALL documents chronologically and understand how the situation has evolved.
Identify:
(1) CONTRADICTIONS between documents
(2) How the opposing party's position has changed over time
(3) New claims or evidence introduced in each new document
(4) The overall trajectory of the dispute
Extract facts from ALL documents, not just the latest one."""


def get_multi_doc_pass2_supplement(doc_count: int, language: str = "en") -> str:
    """Additional instructions for Pass 2 when multiple documents exist"""
    if language.startswith("fr"):
        return f"""

INSTRUCTION MULTI-DOCUMENTS (PASSE 2):
Sur base de TOUS les {doc_count} documents du dossier, fournissez une analyse juridique complete qui considere le tableau d'ensemble — pas seulement le dernier document.
Comment la situation juridique a-t-elle evolue? Quel est l'effet cumulatif de tous les documents? Que revele le schema de communication sur la strategie de la partie adverse?
IMPORTANT: Ajoutez ces champs supplementaires dans votre JSON:
- "case_narrative": "Recit chronologique du litige: comment il a commence, evolue, et ou en est-on maintenant (3-5 phrases)"
- "contradictions": [{{"doc_a": "Document X", "doc_b": "Document Y", "claim_a": "Ce que dit le doc X", "claim_b": "Ce que dit le doc Y", "significance": "Pourquoi c'est important", "defense_value": "high|medium|low"}}]
- "cumulative_financial_exposure": "Exposition financiere totale cumulee de tous les documents"
- "master_deadlines": [{{"date": "YYYY-MM-DD", "source_document": "nom du doc", "description": "nature du delai", "status": "passed|upcoming|urgent"}}]
- "opposing_strategy_analysis": "Analyse de la strategie de la partie adverse basee sur l'ensemble des communications"
"""
    elif language.startswith("nl"):
        return f"""

MULTI-DOCUMENT INSTRUCTIE (PASS 2):
Analyseer ALLE {doc_count} documenten samen. Voeg toe aan JSON:
- "case_narrative": "Chronologisch verhaal van het geschil (3-5 zinnen)"
- "contradictions": [{{"doc_a": "Doc X", "doc_b": "Doc Y", "claim_a": "...", "claim_b": "...", "significance": "...", "defense_value": "high|medium|low"}}]
- "cumulative_financial_exposure": "Totale cumulatieve financiele blootstelling"
- "master_deadlines": [{{"date": "YYYY-MM-DD", "source_document": "...", "description": "...", "status": "passed|upcoming|urgent"}}]
- "opposing_strategy_analysis": "Analyse van de strategie van de tegenpartij"
"""
    elif language.startswith("de"):
        return f"""

MULTI-DOKUMENT-ANWEISUNG (PASS 2):
Analysieren Sie ALLE {doc_count} Dokumente zusammen. Fugen Sie zum JSON hinzu:
- "case_narrative", "contradictions", "cumulative_financial_exposure", "master_deadlines", "opposing_strategy_analysis"
"""
    else:
        return f"""

MULTI-DOCUMENT INSTRUCTION (PASS 2):
Based on ALL {doc_count} documents in this case file, provide a comprehensive legal analysis that considers the full picture — not just the latest document.
How has the legal situation evolved? What is the cumulative effect of all documents? What does the pattern of communication reveal about the opposing party's strategy?
IMPORTANT: Add these additional fields in your JSON response:
- "case_narrative": "Chronological narrative of the dispute: how it started, evolved, and where it stands now (3-5 sentences)"
- "contradictions": [{{"doc_a": "Document X", "doc_b": "Document Y", "claim_a": "What doc X states", "claim_b": "What doc Y states", "significance": "Why this matters", "defense_value": "high|medium|low"}}]
- "cumulative_financial_exposure": "Total cumulative financial exposure across all documents"
- "master_deadlines": [{{"date": "YYYY-MM-DD", "source_document": "doc name", "description": "deadline nature", "status": "passed|upcoming|urgent"}}]
- "opposing_strategy_analysis": "Analysis of opposing party strategy based on all communications"
"""


def get_multi_doc_pass3_supplement(doc_count: int, language: str = "en") -> str:
    """Additional instructions for Pass 3 when multiple documents exist"""
    if language.startswith("fr"):
        return f"""

INSTRUCTION MULTI-DOCUMENTS (PASSE 3):
Etant donne l'historique complet du dossier a travers les {doc_count} documents, quelle est la strategie optimale MAINTENANT?
Considerez ce qui a deja ete dit, quels engagements ont ete pris, et quel levier existe sur base de l'historique complet du dossier.
Si le dossier a 5+ documents couvrant 30+ jours, ajoutez:
- "pattern_analysis": "La partie adverse a [escalade/desescalade] ses revendications. Leur dernier document [renforce/affaiblit] leur position initiale. Ce schema suggere qu'ils [veulent negocier/preparent un litige]."
"""
    elif language.startswith("nl"):
        return f"""

MULTI-DOCUMENT INSTRUCTIE (PASS 3):
Gezien de volledige dossiergeschiedenis ({doc_count} documenten), wat is nu de optimale strategie?
Bij 5+ documenten over 30+ dagen, voeg toe: "pattern_analysis": "Patroonanalyse van de tegenpartij"
"""
    elif language.startswith("de"):
        return f"""

MULTI-DOKUMENT-ANWEISUNG (PASS 3):
Optimale Strategie basierend auf allen {doc_count} Dokumenten. Bei 5+ Dokumenten uber 30+ Tage: "pattern_analysis" hinzufugen.
"""
    else:
        return f"""

MULTI-DOCUMENT INSTRUCTION (PASS 3):
Given the complete case history across all {doc_count} documents, what is the optimal strategy NOW?
Consider what has already been said, what commitments have been made, and what leverage exists based on the full document history.
If the case has 5+ documents spanning 30+ days, add:
- "pattern_analysis": "The opposing party has [escalated/de-escalated] their claims over time. Their latest document [strengthens/weakens] their original position. This pattern suggests they [want to settle/are preparing for litigation]."
"""


async def run_multi_doc_analysis_advanced(combined_text: str, doc_count: int, user_context: str = "") -> dict:
    """Run 5-pass analysis on combined multi-document text (US/UAE/default)"""
    p1_supplement = get_multi_doc_pass1_supplement(doc_count, "en")
    p2_supplement = get_multi_doc_pass2_supplement(doc_count, "en")
    p3_supplement = get_multi_doc_pass3_supplement(doc_count, "en")

    context_supplement = ""
    if user_context:
        context_supplement = f"\n\nADDITIONAL CONTEXT PROVIDED BY THE USER:\n{user_context}"

    # Limit combined text to stay within token limits
    max_text = 30000 if doc_count <= 5 else 45000
    text_for_analysis = combined_text[:max_text]

    # PASS 1: Multi-doc fact extraction
    logger.info(f"Multi-doc analysis ({doc_count} docs): Pass 1 — Fact extraction")
    facts = await call_claude(
        SENIOR_ATTORNEY_PERSONA,
        PASS1_PROMPT.format(document_text=text_for_analysis) + p1_supplement + context_supplement
    )

    doc_type = facts.get("document_type", "other")
    doc_to_case = {
        "eviction_notice": "housing", "lease": "housing",
        "employment_contract": "employment",
        "debt_collection": "debt",
        "demand_letter": "demand",
        "court_notice": "court", "nda": "nda"
    }
    inferred_case_type = doc_to_case.get(doc_type, "other")
    jurisprudence_text = load_jurisprudence(inferred_case_type, doc_type)

    logger.info("Multi-doc analysis: Fetching real-time case law")
    state = facts.get("jurisdiction", facts.get("state", ""))
    courtlistener_opinions = await fetch_courtlistener_opinions(inferred_case_type, state)
    realtime_law_context = ""
    if courtlistener_opinions:
        realtime_law_context = "\n\nRECENT COURT DECISIONS (from CourtListener):\n"
        for i, op in enumerate(courtlistener_opinions, 1):
            realtime_law_context += f"{i}. {op['case_name']} (Filed: {op['date_filed']}, Court: {op['court']})\n"
            if op['snippet']:
                realtime_law_context += f"   Excerpt: {op['snippet'].replace('<em>', '').replace('</em>', '')}\n"

    # PASS 2: Multi-doc legal analysis
    logger.info(f"Multi-doc analysis ({doc_count} docs): Pass 2 — Legal analysis")
    legal_analysis = await call_claude(
        SENIOR_ATTORNEY_PERSONA,
        PASS2_PROMPT.format(
            facts_json=json.dumps(facts, indent=2),
            jurisprudence_section=jurisprudence_text + realtime_law_context
        ) + p2_supplement,
        max_tokens=4000,
        use_web_search=True
    )

    facts_str = json.dumps(facts, indent=2)
    analysis_str = json.dumps(legal_analysis, indent=2)

    # PASS 3+4A+4B: Multi-doc strategy + battle preview
    logger.info(f"Multi-doc analysis ({doc_count} docs): Pass 3+4A+4B")
    strategy = await call_claude(
        SENIOR_ATTORNEY_PERSONA,
        PASS3_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str) + p3_supplement,
        max_tokens=3000
    )
    user_arguments = await call_claude(
        PASS4A_SYSTEM,
        PASS4A_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
        max_tokens=1500
    )
    opposing_arguments = await call_claude(
        PASS4B_SYSTEM,
        PASS4B_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
        max_tokens=1500
    )

    logger.info(f"Multi-doc analysis ({doc_count} docs): All passes complete")

    recent_case_law = []
    for op in courtlistener_opinions:
        clean_snippet = (op.get("snippet", "") or "").replace("<em>", "").replace("</em>", "")
        recent_case_law.append({
            "case_name": op["case_name"], "date": op["date_filed"], "court": op["court"],
            "ruling_summary": clean_snippet[:200], "source_url": op.get("url"), "cite_count": op.get("cite_count", 0)
        })

    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return {
        "document_type": doc_type,
        "case_type": legal_analysis.get("case_type", inferred_case_type),
        "suggested_case_title": legal_analysis.get("suggested_case_title", "Legal Document Analysis"),
        "risk_score": legal_analysis.get("risk_score", {"total": 50, "financial": 50, "urgency": 50, "legal_strength": 50, "complexity": 50}),
        "risk_level": legal_analysis.get("risk_level", "medium"),
        "deadline": legal_analysis.get("deadline"),
        "deadline_description": legal_analysis.get("deadline_description"),
        "summary": legal_analysis.get("summary", ""),
        "financial_exposure": legal_analysis.get("financial_exposure"),
        "findings": legal_analysis.get("findings", []),
        "next_steps": strategy.get("next_steps", []),
        "recommend_lawyer": legal_analysis.get("recommend_lawyer", False),
        "disclaimer": "This analysis provides legal information only, not legal advice.",
        "facts": facts,
        "financial_exposure_detailed": legal_analysis.get("financial_exposure_detailed"),
        "procedural_defects": legal_analysis.get("procedural_defects", []),
        "user_rights": legal_analysis.get("user_rights", []),
        "opposing_weaknesses": legal_analysis.get("opposing_weaknesses", []),
        "applicable_laws": legal_analysis.get("applicable_laws", []),
        "strategy": strategy.get("recommended_strategy"),
        "immediate_actions": strategy.get("immediate_actions", []),
        "documents_to_gather": strategy.get("documents_to_gather", []),
        "leverage_points": strategy.get("leverage_points", []),
        "red_lines": strategy.get("red_lines", []),
        "lawyer_recommendation": strategy.get("lawyer_recommendation"),
        "success_probability": strategy.get("success_probability"),
        "key_insight": strategy.get("key_insight", ""),
        "battle_preview": {"user_side": user_arguments, "opposing_side": opposing_arguments},
        "recent_case_law": recent_case_law,
        "case_law_updated": now_date,
        # Multi-document specific fields
        "case_narrative": legal_analysis.get("case_narrative", ""),
        "contradictions": legal_analysis.get("contradictions", []),
        "opposing_strategy_analysis": legal_analysis.get("opposing_strategy_analysis", ""),
        "cumulative_financial_exposure": legal_analysis.get("cumulative_financial_exposure", ""),
        "master_deadlines": legal_analysis.get("master_deadlines", []),
        "pattern_analysis": strategy.get("pattern_analysis", ""),
    }


async def run_multi_doc_analysis_belgian(combined_text: str, doc_count: int, user_context: str = "", region: str = "Wallonie", language: str = "fr-BE") -> dict:
    """Run 5-pass multi-document analysis for Belgian users"""
    persona = get_belgian_persona(language, region)
    lang_instruction = get_language_instruction(language)
    persona_with_lang = persona + lang_instruction
    p1_supplement = get_multi_doc_pass1_supplement(doc_count, language)
    p2_supplement = get_multi_doc_pass2_supplement(doc_count, language)
    p3_supplement = get_multi_doc_pass3_supplement(doc_count, language)

    context_section = ""
    if user_context:
        context_section = f"CONTEXTE FOURNI PAR L'UTILISATEUR: {user_context}"

    max_text = 30000 if doc_count <= 5 else 45000
    text_for_analysis = combined_text[:max_text]

    # PASS 1
    logger.info(f"Belgian multi-doc analysis ({doc_count} docs): Passe 1")
    facts = await call_claude(
        persona_with_lang,
        BE_PASS1_PROMPT.format(document_text=text_for_analysis, user_context_section=context_section) + p1_supplement
    )

    doc_type = facts.get("type_document", "autre")
    detected_region = facts.get("region_applicable", region)
    jurisprudence_text = load_belgian_jurisprudence(doc_type, detected_region)
    be_doc_to_case = {
        "licenciement": "employment", "contrat_travail": "employment", "c4": "employment",
        "bail": "housing", "avis_resiliation_bail": "housing",
        "mise_en_demeure": "debt", "facture": "debt",
        "nda": "nda", "jugement": "court", "lettre_huissier": "court"
    }
    inferred_case_type = be_doc_to_case.get(doc_type, "other")

    # PASS 2
    logger.info(f"Belgian multi-doc analysis ({doc_count} docs): Passe 2")
    legal_analysis = await call_claude(
        persona_with_lang,
        BE_PASS2_PROMPT.format(
            facts_json=json.dumps(facts, indent=2, ensure_ascii=False),
            jurisprudence_section=jurisprudence_text
        ) + p2_supplement,
        max_tokens=4000
    )

    facts_str = json.dumps(facts, indent=2, ensure_ascii=False)
    analysis_str = json.dumps(legal_analysis, indent=2, ensure_ascii=False)

    # PASS 3+4A+4B
    logger.info(f"Belgian multi-doc analysis ({doc_count} docs): Passe 3+4A+4B")
    strategy = await call_claude(persona_with_lang, BE_PASS3_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str) + p3_supplement, max_tokens=3000)
    user_arguments = await call_claude(BE_PASS4A_SYSTEM + lang_instruction, BE_PASS4A_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str), max_tokens=1500)
    opposing_arguments = await call_claude(BE_PASS4B_SYSTEM + lang_instruction, BE_PASS4B_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str), max_tokens=1500)

    logger.info(f"Belgian multi-doc analysis ({doc_count} docs): Complete")
    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return {
        "document_type": doc_type,
        "case_type": legal_analysis.get("case_type", inferred_case_type),
        "suggested_case_title": legal_analysis.get("suggested_case_title", "Analyse Document Juridique"),
        "risk_score": legal_analysis.get("risk_score", {"total": 50, "financial": 50, "urgency": 50, "legal_strength": 50, "complexity": 50}),
        "risk_level": legal_analysis.get("risk_level", "moyen"),
        "deadline": legal_analysis.get("deadline"),
        "deadline_description": legal_analysis.get("deadline_description"),
        "summary": legal_analysis.get("summary", ""),
        "financial_exposure": legal_analysis.get("financial_exposure"),
        "findings": legal_analysis.get("findings", []),
        "next_steps": strategy.get("next_steps", []),
        "recommend_lawyer": legal_analysis.get("recommend_lawyer", False),
        "disclaimer": "Cette analyse fournit des informations juridiques uniquement.",
        "facts": facts,
        "financial_exposure_detailed": legal_analysis.get("financial_exposure_detailed"),
        "procedural_defects": legal_analysis.get("procedural_defects", []),
        "user_rights": legal_analysis.get("user_rights", []),
        "opposing_weaknesses": legal_analysis.get("opposing_weaknesses", []),
        "applicable_laws": legal_analysis.get("applicable_laws", []),
        "organismes_recommandes": legal_analysis.get("organismes_recommandes", []),
        "strategy": strategy.get("recommended_strategy"),
        "immediate_actions": strategy.get("immediate_actions", []),
        "documents_to_gather": strategy.get("documents_to_gather", []),
        "leverage_points": strategy.get("leverage_points", []),
        "red_lines": strategy.get("red_lines", []),
        "lawyer_recommendation": strategy.get("lawyer_recommendation"),
        "success_probability": strategy.get("success_probability"),
        "key_insight": strategy.get("key_insight", ""),
        "battle_preview": {"user_side": user_arguments, "opposing_side": opposing_arguments},
        "recent_case_law": [],
        "case_law_updated": now_date,
        "country": "BE", "region": detected_region, "language": language,
        # Multi-document specific fields
        "case_narrative": legal_analysis.get("case_narrative", ""),
        "contradictions": legal_analysis.get("contradictions", []),
        "opposing_strategy_analysis": legal_analysis.get("opposing_strategy_analysis", ""),
        "cumulative_financial_exposure": legal_analysis.get("cumulative_financial_exposure", ""),
        "master_deadlines": legal_analysis.get("master_deadlines", []),
        "pattern_analysis": strategy.get("pattern_analysis", ""),
    }



async def analyze_document_vision(image_b64_list: list, system_prompt: str = None, user_context: str = "", language: str = "en") -> dict:
    """Analyze document images using Claude Vision API (for scanned/image docs)"""
    if not system_prompt:
        system_prompt = "You are an OCR + legal analysis expert. First, read ALL text visible in the document images. Then analyze the extracted text as a legal document.\n\n" + CLAUDE_SYSTEM_PROMPT
    
    system_prompt += get_language_instruction(language)
    
    content_blocks = []
    for i, b64 in enumerate(image_b64_list):
        content_blocks.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}
        })
    
    prompt_text = "Read ALL text from this scanned legal document and analyze it completely. You MUST return a JSON with: risk_score (total + 4 dimensions), case_type (employment|housing|debt|nda|contract|consumer|family|court|penal|commercial|other), suggested_case_title (descriptive title from content, NEVER the filename), summary, findings (each with text, impact, type, legal_ref, jurisprudence), next_steps, deadline, financial_exposure, key_insight, battle_preview, recommend_lawyer. Return JSON only."
    if user_context:
        prompt_text += f"\n\nUser context: {user_context}"
    if len(image_b64_list) > 1:
        prompt_text = f"This document has {len(image_b64_list)} pages. Read ALL text from every page, then analyze the complete document. You MUST return a JSON with: risk_score, case_type, suggested_case_title (from content, NEVER filename), summary, findings (each with text, impact, type, legal_ref, jurisprudence), next_steps, deadline, financial_exposure, key_insight, battle_preview, recommend_lawyer. Return JSON only."
        if user_context:
            prompt_text += f"\n\nUser context: {user_context}"
    
    content_blocks.append({"type": "text", "text": prompt_text})
    
    for attempt in range(3):
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 4000,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": content_blocks}]
                    },
                    timeout=120.0
                )
                response.raise_for_status()
                data = response.json()
                text = ""
                for block in data.get("content", []):
                    if block.get("type") == "text":
                        text += block["text"]
                text = text.replace("```json", "").replace("```", "").strip()
                return json.loads(text)
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (429, 529) and attempt < 2:
                await asyncio.sleep((attempt + 1) * 5)
                continue
            raise
        except json.JSONDecodeError:
            if attempt < 2:
                await asyncio.sleep(3)
                continue
            raise
    return _default_analysis()

# ================== Auth Endpoints ==================

@api_router.post("/auth/session")
async def create_session(request: Request):
    """Exchange session_id from Emergent Auth for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    try:
        # Call Emergent Auth to get user data
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=30.0
            )
            response.raise_for_status()
            auth_data = response.json()
    except Exception as e:
        logger.error(f"Emergent Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid session_id")
    
    email = auth_data.get("email")
    name = auth_data.get("name", email.split("@")[0] if email else "User")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if needed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "plan": "pro" if email in ("romain@nestorconfidential.com", "debe.romain@gmail.com") else "free",
            "state_of_residence": None,
            "phone": None,
            "notif_risk_score": True,
            "notif_deadlines": True,
            "notif_calls": True,
            "notif_lawyers": False,
            "notif_promo": False,
            "data_sharing": True,
            "improve_ai": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Get updated user
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    response = JSONResponse(content={"user": user_doc, "session_token": session_token})
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    return response

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    return response

@api_router.post("/auth/register")
async def register_email(body: EmailRegister):
    """Register a new user with email and password"""
    email = body.email.strip().lower()
    password = body.password.strip()
    name = body.name.strip()
    plan = body.plan if body.plan in ["free", "pro"] else "free"
    country = body.country if body.country in ["US", "BE", "AE"] else "US"
    region = body.region
    language = body.language or ("en" if country in ["US", "AE"] else "fr-BE")
    
    if not email or not password or not name:
        raise HTTPException(status_code=400, detail="Email, password and name are required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(password)
    
    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": None,
        "password_hash": password_hash,
        "auth_provider": "email",
        "plan": plan,
        "country": country,
        "region": region,
        "language": language,
        "state_of_residence": None,
        "phone": None,
        "notif_risk_score": True,
        "notif_deadlines": True,
        "notif_calls": True,
        "notif_lawyers": False,
        "notif_promo": False,
        "data_sharing": True,
        "improve_ai": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    safe_user = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}
    
    response = JSONResponse(content={"user": safe_user, "session_token": session_token})
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    return response

@api_router.post("/auth/login")
async def login_email(body: EmailLogin):
    """Login with email and password"""
    email = body.email.strip().lower()
    password = body.password.strip()
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    stored_hash = user_doc.get("password_hash")
    if not stored_hash:
        raise HTTPException(status_code=401, detail="This account uses social login. Please sign in with Google, Apple, or Facebook.")
    
    if not verify_password(password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = user_doc["user_id"]
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    safe_user = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}
    
    response = JSONResponse(content={"user": safe_user, "session_token": session_token})
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    return response

# ================== Profile Endpoints ==================

@api_router.put("/profile")
async def update_profile(update: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": update_data}
        )
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return user_doc

@api_router.put("/profile/plan")
async def update_plan(plan: str = "pro", current_user: User = Depends(get_current_user)):
    """Update user plan (after Stripe payment)"""
    if plan not in ["free", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"plan": plan}}
    )
    return {"message": f"Plan updated to {plan}"}

# ================== Case Endpoints ==================

@api_router.post("/cases", response_model=Case, status_code=201)
async def create_case(case_data: CaseCreate, current_user: User = Depends(get_current_user)):
    """Create a new case"""
    case_id = f"case_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    case_doc = {
        "case_id": case_id,
        "user_id": current_user.user_id,
        "title": case_data.title,
        "type": case_data.type,
        "status": "active",
        "risk_score": 0,
        "risk_financial": 0,
        "risk_urgency": 0,
        "risk_legal_strength": 0,
        "risk_complexity": 0,
        "risk_score_history": [],
        "deadline": None,
        "deadline_description": None,
        "financial_exposure": None,
        "ai_summary": None,
        "ai_findings": [],
        "ai_next_steps": [],
        "recommend_lawyer": False,
        "document_count": 0,
        "created_at": now,
        "updated_at": now
    }
    await db.cases.insert_one(case_doc)
    
    # Create case event
    event_doc = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "case_id": case_id,
        "event_type": "case_opened",
        "title": "Case opened",
        "description": f"Case created: {case_data.title}",
        "metadata": None,
        "created_at": now
    }
    await db.case_events.insert_one(event_doc)
    
    return Case(**case_doc)

@api_router.get("/cases", response_model=List[Case])
async def get_cases(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all cases for current user"""
    query = {"user_id": current_user.user_id}
    if status:
        query["status"] = status
    
    cases = await db.cases.find(query, {"_id": 0}).sort("risk_score", -1).to_list(100)
    
    # Update document counts
    for case in cases:
        doc_count = await db.documents.count_documents({"case_id": case["case_id"]})
        case["document_count"] = doc_count
    
    return [Case(**c) for c in cases]

@api_router.get("/cases/{case_id}", response_model=Case)
async def get_case(case_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific case"""
    case_doc = await db.cases.find_one(
        {"case_id": case_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Update document count
    doc_count = await db.documents.count_documents({"case_id": case_id})
    case_doc["document_count"] = doc_count
    
    return Case(**case_doc)

@api_router.put("/cases/{case_id}")
async def update_case(
    case_id: str,
    update: CaseUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a case"""
    case_doc = await db.cases.find_one(
        {"case_id": case_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.cases.update_one({"case_id": case_id}, {"$set": update_data})
    
    # Create event if status changed
    if update.status:
        event_doc = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "case_id": case_id,
            "event_type": "case_resolved" if update.status == "resolved" else "score_updated",
            "title": f"Case status changed to {update.status}",
            "description": None,
            "metadata": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.case_events.insert_one(event_doc)
    
    updated = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    return updated

@api_router.get("/cases/{case_id}/events", response_model=List[CaseEvent])
async def get_case_events(case_id: str, current_user: User = Depends(get_current_user)):
    """Get timeline events for a case"""
    # Verify case belongs to user
    case_doc = await db.cases.find_one(
        {"case_id": case_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    events = await db.case_events.find(
        {"case_id": case_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return [CaseEvent(**e) for e in events]

@api_router.get("/cases/{case_id}/documents", response_model=List[Document])
async def get_case_documents(case_id: str, current_user: User = Depends(get_current_user)):
    """Get documents for a case"""
    # Verify case belongs to user
    case_doc = await db.cases.find_one(
        {"case_id": case_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    documents = await db.documents.find(
        {"case_id": case_id},
        {"_id": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    return [Document(**d) for d in documents]

@api_router.get("/cases/{case_id}/brief")
async def generate_case_brief(case_id: str, current_user: User = Depends(get_current_user)):
    """Generate a comprehensive case brief for complex cases (5+ documents)"""
    case_doc = await db.cases.find_one(
        {"case_id": case_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")

    # Get all documents for this case
    docs = await db.documents.find(
        {"case_id": case_id},
        {"_id": 0, "file_name": 1, "uploaded_at": 1, "extracted_text": 1}
    ).sort("uploaded_at", 1).to_list(50)
    doc_count = len(docs)

    user_language = current_user.language or case_doc.get("language") or "en"
    is_belgian = (current_user.country or case_doc.get("country", "US")) == "BE"

    # Build document timeline
    doc_timeline = []
    for i, doc in enumerate(docs, 1):
        doc_timeline.append({
            "index": i,
            "name": doc.get("file_name", f"Document {i}"),
            "date": (doc.get("uploaded_at") or "")[:10]
        })

    # Generate the brief using Claude
    lang_instruction = get_language_instruction(user_language)
    if user_language.startswith("fr"):
        brief_prompt = f"""Genere un DOSSIER JURIDIQUE COMPLET pour un dossier avec {doc_count} documents.

INFORMATIONS DU DOSSIER:
- Titre: {case_doc.get('title', 'Dossier juridique')}
- Type: {case_doc.get('type', 'other')}
- Score de risque: {case_doc.get('risk_score', 0)}/100
- Exposition financiere: {case_doc.get('financial_exposure', 'Non determinee')}
- Resume IA: {case_doc.get('ai_summary', '')}
- Point cle: {case_doc.get('key_insight', '')}
- Recit du dossier: {case_doc.get('case_narrative', '')}
- Contradictions detectees: {json.dumps(case_doc.get('contradictions', []), ensure_ascii=False)}
- Analyse strategie adverse: {case_doc.get('opposing_strategy_analysis', '')}
- Delais: {json.dumps(case_doc.get('master_deadlines', []), ensure_ascii=False)}
- Documents: {json.dumps(doc_timeline, ensure_ascii=False)}

Retourne UNIQUEMENT ce JSON:
{{
  "executive_summary": "Resume executif en 1 paragraphe (200 mots max)",
  "document_timeline": [{{"date": "YYYY-MM-DD", "document": "nom", "key_event": "ce qui s'est passe"}}],
  "key_legal_issues": [{{"issue": "description", "severity": "critical|high|medium", "applicable_law": "reference legale"}}],
  "risk_assessment": {{"score": 0, "explanation": "explication du score", "trend": "increasing|stable|decreasing"}},
  "recommended_strategy": "Strategie recommandee en detail",
  "legal_references": [{{"reference": "loi/article", "relevance": "pertinence pour le dossier"}}],
  "conclusion": "Conclusion et prochaines etapes"
}}"""
    elif user_language.startswith("nl"):
        brief_prompt = f"""Genereer een VOLLEDIG JURIDISCH DOSSIER voor een zaak met {doc_count} documenten.
Titel: {case_doc.get('title')}, Type: {case_doc.get('type')}, Risico: {case_doc.get('risk_score')}/100
Samenvatting: {case_doc.get('ai_summary', '')}
Retourneer JSON met: executive_summary, document_timeline, key_legal_issues, risk_assessment, recommended_strategy, legal_references, conclusion"""
    else:
        brief_prompt = f"""Generate a COMPREHENSIVE CASE BRIEF for a case with {doc_count} documents.

CASE INFORMATION:
- Title: {case_doc.get('title', 'Legal Case')}
- Type: {case_doc.get('type', 'other')}
- Risk Score: {case_doc.get('risk_score', 0)}/100
- Financial Exposure: {case_doc.get('financial_exposure', 'Not determined')}
- AI Summary: {case_doc.get('ai_summary', '')}
- Key Insight: {case_doc.get('key_insight', '')}
- Case Narrative: {case_doc.get('case_narrative', '')}
- Contradictions: {json.dumps(case_doc.get('contradictions', []))}
- Opposing Strategy: {case_doc.get('opposing_strategy_analysis', '')}
- Deadlines: {json.dumps(case_doc.get('master_deadlines', []))}
- Documents: {json.dumps(doc_timeline)}

Return ONLY this JSON:
{{
  "executive_summary": "Executive summary in 1 paragraph (200 words max)",
  "document_timeline": [{{"date": "YYYY-MM-DD", "document": "name", "key_event": "what happened"}}],
  "key_legal_issues": [{{"issue": "description", "severity": "critical|high|medium", "applicable_law": "legal reference"}}],
  "risk_assessment": {{"score": 0, "explanation": "score explanation", "trend": "increasing|stable|decreasing"}},
  "recommended_strategy": "Detailed recommended strategy",
  "legal_references": [{{"reference": "law/article", "relevance": "relevance to case"}}],
  "conclusion": "Conclusion and next steps"
}}"""

    persona = get_belgian_persona(user_language, current_user.region or "") if is_belgian else SENIOR_ATTORNEY_PERSONA
    system = persona + lang_instruction

    try:
        brief = await call_claude(system, brief_prompt, max_tokens=3000)
        brief["case_id"] = case_id
        brief["generated_at"] = datetime.now(timezone.utc).isoformat()
        brief["document_count"] = doc_count
        brief["case_title"] = case_doc.get("title", "")
        return brief
    except Exception as e:
        logger.error(f"Case brief generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate case brief")



# ================== Document Endpoints ==================

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    case_id: Optional[str] = Form(None),
    user_context: Optional[str] = Form(None),
    analysis_mode: Optional[str] = Form("standard"),
    current_user: User = Depends(get_current_user)
):
    """Upload and analyze a document. analysis_mode: 'standard' or 'contract_guard'"""
    # Check plan restrictions
    if current_user.plan == "free":
        doc_count = await db.documents.count_documents({"user_id": current_user.user_id})
        if doc_count >= 1:
            raise HTTPException(
                status_code=403,
                detail="Free plan limited to 1 document. Upgrade to Pro for unlimited analyses."
            )
    
    # Read file
    file_bytes = await file.read()
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    content_type = file.content_type or "application/octet-stream"
    
    # Normalize HEIC → JPEG
    is_image_file = file_ext in ["jpg", "jpeg", "png", "heic", "heif", "webp"]
    if file_ext in ["heic", "heif"]:
        file_ext = "jpg"
        content_type = "image/jpeg"
    
    # Upload to storage
    storage_path = f"{APP_NAME}/documents/{current_user.user_id}/{uuid.uuid4()}.{file_ext}"
    try:
        put_object(storage_path, file_bytes, content_type)
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        storage_path = None
    
    # Extract text (for text-based documents)
    extracted_text = ""
    use_vision = False
    
    if is_image_file:
        use_vision = True
        logger.info(f"Image file detected ({file_ext}), routing to Claude Vision")
    elif file_ext == "pdf":
        extracted_text = extract_text_from_pdf(file_bytes)
        if len(extracted_text.strip()) < 100:
            use_vision = True
            logger.info(f"PDF has insufficient text ({len(extracted_text.strip())} chars), routing to Claude Vision")
    elif file_ext in ["docx"]:
        extracted_text = extract_text_from_docx(file_bytes)
    elif file_ext in ["txt", "text", "eml"]:
        extracted_text = file_bytes.decode("utf-8", errors="ignore")
    elif file_ext in ["doc"]:
        extracted_text = file_bytes.decode("utf-8", errors="ignore")
    
    if not extracted_text.strip():
        logger.warning(f"No text extracted from {file.filename} (ext={file_ext})")
    
    # Create document record
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc_record = {
        "document_id": document_id,
        "case_id": case_id,
        "user_id": current_user.user_id,
        "file_name": file.filename,
        "file_url": None,
        "storage_path": storage_path,
        "file_type": file_ext,
        "extracted_text": extracted_text[:50000] if extracted_text else None,
        "status": "analyzing",
        "is_key_document": case_id is None,  # First doc is key doc
        "uploaded_at": now
    }
    await db.documents.insert_one(doc_record)
    
    # Analyze with Claude — mode-dependent + country-dependent
    analysis = None
    is_contract_guard = analysis_mode == "contract_guard"
    user_country = current_user.country or "US"
    user_region = current_user.region or ""
    user_language = current_user.language or "en"
    is_belgian = user_country == "BE"

    # Check if this is a multi-document case (existing case with prior docs)
    existing_doc_count = 0
    is_multi_doc = False
    if case_id and not is_contract_guard:
        existing_doc_count = await db.documents.count_documents({"case_id": case_id, "status": "analyzed"})
        if existing_doc_count > 0:
            is_multi_doc = True
            logger.info(f"Multi-document case detected: {existing_doc_count} existing docs + 1 new for case {case_id}")

    if extracted_text or use_vision:
        context_str = ""
        if user_context and user_context.strip():
            context_str = user_context.strip()[:500]
        
        # For vision docs, first extract OCR text so it can be combined with other docs
        vision_extracted_text = ""
        if use_vision:
            # Claude Vision path — for scanned PDFs and image files
            image_b64_list = []
            if is_image_file:
                image_b64_list = [image_file_to_base64(file_bytes, content_type)]
            elif file_ext == "pdf":
                image_b64_list = pdf_pages_to_images(file_bytes, max_pages=5)
            
            if image_b64_list:
                try:
                    if is_contract_guard:
                        if is_belgian:
                            cg_system = get_belgian_persona(user_language, user_region) + "\n\nYou are also a CONTRACT REVIEW specialist.\n" + get_language_instruction(user_language)
                            analysis = await analyze_document_vision(image_b64_list, system_prompt=cg_system, user_context=context_str, language=user_language)
                        else:
                            analysis = await analyze_document_vision(image_b64_list, user_context=context_str)
                    elif not is_multi_doc:
                        # Single document vision analysis (no prior docs)
                        if is_belgian:
                            be_persona = get_belgian_persona(user_language, user_region)
                            be_system = "Tu es un expert OCR + analyse juridique. Lis d'abord TOUT le texte visible dans les images. Puis analyse le document juridique belge.\n\n" + be_persona + get_language_instruction(user_language)
                            analysis = await analyze_document_vision(image_b64_list, system_prompt=be_system, user_context=context_str, language=user_language)
                        else:
                            analysis = await analyze_document_vision(image_b64_list, user_context=context_str)
                    else:
                        # Multi-doc: extract OCR text from vision, then combine below
                        ocr_prompt = "Read ALL text from this scanned document. Return ONLY the extracted text, nothing else."
                        ocr_system = "You are an OCR expert. Extract all text from the document image(s). Return only the text content."
                        if is_belgian:
                            ocr_system += get_language_instruction(user_language)
                        ocr_result = await call_claude(ocr_system, ocr_prompt, max_tokens=4000)
                        if isinstance(ocr_result, dict):
                            vision_extracted_text = ocr_result.get("text", json.dumps(ocr_result))
                        elif isinstance(ocr_result, str):
                            vision_extracted_text = ocr_result
                        # Update document record with extracted text
                        await db.documents.update_one(
                            {"document_id": document_id},
                            {"$set": {"extracted_text": vision_extracted_text[:50000]}}
                        )
                except Exception as e:
                    logger.error(f"Vision analysis failed: {e}")
                    analysis = None

        # Multi-document combined analysis
        if is_multi_doc and not is_contract_guard and analysis is None:
            new_text = extracted_text or vision_extracted_text
            if new_text:
                try:
                    combined_text, total_doc_count, doc_list = await build_multi_document_context(
                        case_id, new_doc_text=new_text, new_doc_name=file.filename
                    )
                    logger.info(f"Running multi-doc analysis: {total_doc_count} documents combined ({len(combined_text)} chars)")
                    if is_belgian:
                        analysis = await run_multi_doc_analysis_belgian(
                            combined_text, total_doc_count, user_context=context_str,
                            region=user_region, language=user_language
                        )
                    else:
                        analysis = await run_multi_doc_analysis_advanced(
                            combined_text, total_doc_count, user_context=context_str
                        )
                    # Tag as multi-doc analysis
                    if analysis:
                        analysis["_multi_doc"] = True
                        analysis["_doc_count"] = total_doc_count
                        analysis["_doc_list"] = doc_list
                except Exception as e:
                    logger.error(f"Multi-doc analysis failed, falling back to single-doc: {e}")
                    # Fallback to single-document analysis
                    if is_belgian:
                        analysis = await analyze_document_belgian(new_text, user_context=context_str, region=user_region, language=user_language)
                    else:
                        analysis = await analyze_document_advanced(new_text, user_context=context_str)

        # Single-document analysis (no prior docs, non-vision)
        if analysis is None and not use_vision and not is_contract_guard:
            if is_belgian:
                analysis = await analyze_document_belgian(extracted_text, user_context=context_str, region=user_region, language=user_language)
            else:
                analysis = await analyze_document_advanced(extracted_text, user_context=context_str)
        
        # Fallback for contract guard non-vision
        if analysis is None and is_contract_guard and not use_vision:
            if is_belgian:
                analysis = await analyze_contract_guard(extracted_text, user_context=context_str, country="BE", region=user_region, language=user_language)
            else:
                analysis = await analyze_contract_guard(extracted_text, user_context=context_str)
    
    # Create or update case
    if case_id and not is_contract_guard:
        # Update existing case (standard mode only)
        case_doc = await db.cases.find_one({"case_id": case_id, "user_id": current_user.user_id}, {"_id": 0})
        if case_doc and analysis:
            old_score = case_doc.get("risk_score", 0)
            new_score = analysis["risk_score"]["total"]
            
            history_entry = {
                "score": new_score,
                "financial": analysis["risk_score"]["financial"],
                "urgency": analysis["risk_score"]["urgency"],
                "legal_strength": analysis["risk_score"]["legal_strength"],
                "complexity": analysis["risk_score"]["complexity"],
                "document_name": file.filename,
                "date": now
            }
            
            await db.cases.update_one(
                {"case_id": case_id},
                {
                    "$set": {
                        "risk_score": new_score,
                        "risk_financial": analysis["risk_score"]["financial"],
                        "risk_urgency": analysis["risk_score"]["urgency"],
                        "risk_legal_strength": analysis["risk_score"]["legal_strength"],
                        "risk_complexity": analysis["risk_score"]["complexity"],
                        "title": analysis.get("suggested_case_title") or case_doc.get("title"),
                        "type": analysis.get("case_type") or case_doc.get("type"),
                        "deadline": normalize_deadline(analysis.get("deadline")),
                        "deadline_description": analysis.get("deadline_description") or (analysis.get("deadline", {}).get("description") if isinstance(analysis.get("deadline"), dict) else None),
                        "financial_exposure": normalize_financial_exposure(analysis.get("financial_exposure")),
                        "ai_summary": analysis.get("summary"),
                        "ai_findings": analysis.get("findings", []),
                        "ai_next_steps": analysis.get("next_steps", []),
                        "recommend_lawyer": analysis.get("recommend_lawyer", False),
                        "battle_preview": analysis.get("battle_preview"),
                        "success_probability": analysis.get("success_probability"),
                        "procedural_defects": analysis.get("procedural_defects", []),
                        "applicable_laws": analysis.get("applicable_laws", []),
                        "financial_exposure_detailed": analysis.get("financial_exposure_detailed"),
                        "immediate_actions": analysis.get("immediate_actions", []),
                        "leverage_points": analysis.get("leverage_points", []),
                        "red_lines": analysis.get("red_lines", []),
                        "key_insight": analysis.get("key_insight", ""),
                        "strategy": analysis.get("strategy"),
                        "lawyer_recommendation": analysis.get("lawyer_recommendation"),
                        "user_rights": analysis.get("user_rights", []),
                        "opposing_weaknesses": analysis.get("opposing_weaknesses", []),
                        "documents_to_gather": analysis.get("documents_to_gather", []),
                        "recent_case_law": analysis.get("recent_case_law", []),
                        "case_law_updated": analysis.get("case_law_updated"),
                        # Multi-document analysis fields
                        "case_narrative": analysis.get("case_narrative") or case_doc.get("case_narrative"),
                        "contradictions": analysis.get("contradictions") or case_doc.get("contradictions", []),
                        "opposing_strategy_analysis": analysis.get("opposing_strategy_analysis") or case_doc.get("opposing_strategy_analysis"),
                        "cumulative_financial_exposure": analysis.get("cumulative_financial_exposure") or case_doc.get("cumulative_financial_exposure"),
                        "master_deadlines": analysis.get("master_deadlines") or case_doc.get("master_deadlines", []),
                        "multi_doc_summary": analysis.get("case_narrative") or case_doc.get("multi_doc_summary"),
                        "updated_at": now
                    },
                    "$push": {"risk_score_history": history_entry}
                }
            )
            
            event_doc = {
                "event_id": f"evt_{uuid.uuid4().hex[:12]}",
                "case_id": case_id,
                "event_type": "score_updated",
                "title": f"Score updated to {new_score}/100",
                "description": f"Document added — risk {'increased' if new_score > old_score else 'decreased'}",
                "metadata": {"old_score": old_score, "new_score": new_score},
                "created_at": now
            }
            await db.case_events.insert_one(event_doc)
    elif is_contract_guard:
        # Contract Guard mode — store in contract_guard_reviews collection
        case_id = case_id or f"cg_{uuid.uuid4().hex[:12]}"
        cg_record = {
            "review_id": case_id,
            "user_id": current_user.user_id,
            "document_id": document_id,
            "file_name": file.filename,
            "analysis": analysis,
            "negotiation_score": analysis.get("negotiation_score", 50) if analysis else 50,
            "created_at": now
        }
        await db.contract_guard_reviews.insert_one(cg_record)
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {"case_id": case_id, "analysis_mode": "contract_guard"}}
        )
    else:
        # Create new case (standard mode)
        case_id = f"case_{uuid.uuid4().hex[:12]}"
        case_title = (analysis.get("suggested_case_title") or "").strip() if analysis else ""
        if not case_title or case_title == file.filename or len(case_title) < 5:
            case_type_val = analysis.get("case_type", "other") if analysis else "other"
            summary = (analysis.get("summary") or "") if analysis else ""
            case_title = summary[:60].rstrip('.') if summary else f"Legal case — {case_type_val}"
        case_type = analysis.get("case_type", "other") if analysis else "other"
        
        case_doc = {
            "case_id": case_id,
            "user_id": current_user.user_id,
            "title": case_title,
            "type": case_type,
            "status": "active",
            "country": user_country,
            "region": user_region,
            "language": user_language,
            "risk_score": analysis["risk_score"]["total"] if analysis and isinstance(analysis.get("risk_score"), dict) else (analysis.get("risk_score", {}).get("total", 0) if analysis else 0),
            "risk_financial": analysis["risk_score"]["financial"] if analysis and isinstance(analysis.get("risk_score"), dict) else 0,
            "risk_urgency": analysis["risk_score"]["urgency"] if analysis and isinstance(analysis.get("risk_score"), dict) else 0,
            "risk_legal_strength": analysis["risk_score"]["legal_strength"] if analysis and isinstance(analysis.get("risk_score"), dict) else 0,
            "risk_complexity": analysis["risk_score"]["complexity"] if analysis and isinstance(analysis.get("risk_score"), dict) else 0,
            "risk_score_history": [{
                "score": analysis["risk_score"]["total"],
                "financial": analysis["risk_score"]["financial"],
                "urgency": analysis["risk_score"]["urgency"],
                "legal_strength": analysis["risk_score"]["legal_strength"],
                "complexity": analysis["risk_score"]["complexity"],
                "document_name": file.filename,
                "date": now
            }] if analysis and isinstance(analysis.get("risk_score"), dict) else [],
            "deadline": normalize_deadline(analysis.get("deadline")) if analysis else None,
            "deadline_description": (analysis.get("deadline_description") or (analysis.get("deadline", {}).get("description") if isinstance(analysis.get("deadline"), dict) else None)) if analysis else None,
            "financial_exposure": normalize_financial_exposure(analysis.get("financial_exposure")) if analysis else None,
            "ai_summary": analysis.get("summary") if analysis else None,
            "ai_findings": analysis.get("findings", []) if analysis else [],
            "ai_next_steps": analysis.get("next_steps", []) if analysis else [],
            "recommend_lawyer": analysis.get("recommend_lawyer", False) if analysis else False,
            "battle_preview": analysis.get("battle_preview") if analysis else None,
            "success_probability": analysis.get("success_probability") if analysis else None,
            "procedural_defects": analysis.get("procedural_defects", []) if analysis else [],
            "applicable_laws": analysis.get("applicable_laws", []) if analysis else [],
            "financial_exposure_detailed": analysis.get("financial_exposure_detailed") if analysis else None,
            "immediate_actions": analysis.get("immediate_actions", []) if analysis else [],
            "leverage_points": analysis.get("leverage_points", []) if analysis else [],
            "red_lines": analysis.get("red_lines", []) if analysis else [],
            "key_insight": analysis.get("key_insight", "") if analysis else "",
            "strategy": analysis.get("strategy") if analysis else None,
            "lawyer_recommendation": analysis.get("lawyer_recommendation") if analysis else None,
            "user_rights": analysis.get("user_rights", []) if analysis else [],
            "opposing_weaknesses": analysis.get("opposing_weaknesses", []) if analysis else [],
            "recent_case_law": analysis.get("recent_case_law", []) if analysis else [],
            "case_law_updated": analysis.get("case_law_updated") if analysis else None,
            "documents_to_gather": analysis.get("documents_to_gather", []) if analysis else [],
            "document_count": 1,
            "created_at": now,
            "updated_at": now
        }
        await db.cases.insert_one(case_doc)
        
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {"case_id": case_id}}
        )
        
        event_doc = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "case_id": case_id,
            "event_type": "case_opened",
            "title": "Case opened",
            "description": f"Document analyzed · {analysis['risk_score']['total'] if analysis else 0}/100" if analysis else "Document uploaded",
            "metadata": None,
            "created_at": now
        }
        await db.case_events.insert_one(event_doc)
    
    # Update document status
    if not is_contract_guard:
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {"status": "analyzed", "case_id": case_id}}
        )
    
    # Create document added event (standard mode only)
    if not is_contract_guard:
        doc_event = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "case_id": case_id,
            "event_type": "document_added",
            "title": "Document uploaded",
            "description": file.filename,
            "metadata": None,
            "created_at": now
        }
        await db.case_events.insert_one(doc_event)
    
    return {
        "document_id": document_id,
        "case_id": case_id,
        "analysis": analysis,
        "analysis_mode": analysis_mode,
        "file_name": file.filename,
        "status": "analyzed",
        "vision_mode": use_vision
    }

@api_router.get("/documents/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download a document"""
    doc = await db.documents.find_one(
        {"document_id": document_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not doc.get("storage_path"):
        raise HTTPException(status_code=404, detail="File not available")
    
    try:
        data, content_type = get_object(doc["storage_path"])
        return Response(
            content=data,
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={doc['file_name']}"}
        )
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise HTTPException(status_code=500, detail="Download failed")

# ================== Letter Generation Endpoints ==================

@api_router.get("/letters/types/{case_type}")
async def get_letter_types(case_type: str, country: str = "US"):
    """Get available letter types for a case type"""
    if country == "BE":
        letter_types = BELGIAN_LETTER_TYPES.get(case_type, BELGIAN_LETTER_TYPES.get("debt", []))
    else:
        letter_types = LETTER_TYPES.get(case_type, LETTER_TYPES["other"])
    return {"case_type": case_type, "letter_types": letter_types, "country": country}

@api_router.post("/letters/generate")
async def generate_letter(
    request: LetterRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate a response letter for a case"""
    # Get case data
    case_doc = await db.cases.find_one(
        {"case_id": request.case_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Build letter data
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    
    letter_data = {
        "letter_type": request.letter_type,
        "case": {
            "type": case_doc.get("type", "other"),
            "title": case_doc.get("title", ""),
            "risk_score": case_doc.get("risk_score", 0),
            "financial_exposure": case_doc.get("financial_exposure"),
            "deadline": case_doc.get("deadline"),
            "deadline_description": case_doc.get("deadline_description"),
            "ai_summary": case_doc.get("ai_summary"),
            "findings": [f.get("text", "") for f in case_doc.get("ai_findings", [])]
        },
        "user": {
            "name": current_user.name,
            "address": request.user_address or f"{current_user.state_of_residence or 'United States'}",
            "state": current_user.state_of_residence or "United States"
        },
        "opposing_party": {
            "name": request.opposing_party_name or "[Opposing Party Name]",
            "address": request.opposing_party_address or "[Opposing Party Address]"
        },
        "additional_context": request.additional_context,
        "today_date": today
    }
    
    # Generate letter — use Belgian system prompt if user is Belgian
    is_belgian = current_user.country == "BE"
    user_language = getattr(current_user, 'language', 'en') or 'en'
    letter_result = await generate_letter_with_claude(letter_data, belgian=is_belgian, language=user_language)
    
    # Store letter in database
    letter_id = f"letter_{uuid.uuid4().hex[:12]}"
    letter_doc = {
        "letter_id": letter_id,
        "case_id": request.case_id,
        "user_id": current_user.user_id,
        "letter_type": request.letter_type,
        "letter_data": letter_result,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.letters.insert_one(letter_doc)
    
    # Create case event
    event_doc = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "case_id": request.case_id,
        "event_type": "letter_generated",
        "title": "Response letter generated",
        "description": f"{request.letter_type.replace('_', ' ').title()}",
        "metadata": {"letter_id": letter_id},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.case_events.insert_one(event_doc)
    
    return {
        "letter_id": letter_id,
        "letter": letter_result
    }

@api_router.get("/cases/{case_id}/letters")
async def get_case_letters(
    case_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all generated letters for a case"""
    # Verify case belongs to user
    case_doc = await db.cases.find_one(
        {"case_id": case_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    letters = await db.letters.find(
        {"case_id": case_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return letters

# ================== Lawyer Endpoints ==================

@api_router.get("/lawyers", response_model=List[Lawyer])
async def get_lawyers(
    specialty: Optional[str] = None,
    available_now: Optional[bool] = None,
    country: Optional[str] = None,
    language: Optional[str] = None
):
    """Get all lawyers, filtered by country/language if specified"""
    query = {}
    if specialty:
        query["specialty"] = {"$regex": specialty, "$options": "i"}
    if available_now:
        query["availability_status"] = "now"
    if country:
        query["country"] = country
    if language:
        query["language"] = {"$regex": language, "$options": "i"}
    
    lawyers = await db.lawyers.find(query, {"_id": 0}).to_list(100)
    return [Lawyer(**l) for l in lawyers]

@api_router.get("/lawyers/{lawyer_id}", response_model=Lawyer)
async def get_lawyer(lawyer_id: str):
    """Get a specific lawyer"""
    lawyer = await db.lawyers.find_one({"lawyer_id": lawyer_id}, {"_id": 0})
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    return Lawyer(**lawyer)

@api_router.post("/lawyer-calls", response_model=LawyerCall)
async def book_lawyer_call(
    call_data: LawyerCallCreate,
    current_user: User = Depends(get_current_user)
):
    """Book a lawyer call"""
    # Get lawyer
    lawyer = await db.lawyers.find_one({"lawyer_id": call_data.lawyer_id}, {"_id": 0})
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    
    # Generate AI brief if case provided
    ai_brief = None
    if call_data.case_id:
        case = await db.cases.find_one(
            {"case_id": call_data.case_id, "user_id": current_user.user_id},
            {"_id": 0}
        )
        if case:
            doc_count = await db.documents.count_documents({"case_id": call_data.case_id})
            ai_brief = {
                "case_type": case.get("type"),
                "risk_score": case.get("risk_score"),
                "document_count": doc_count,
                "key_findings": case.get("ai_findings", [])[:3],
                "deadline": case.get("deadline"),
                "deadline_description": case.get("deadline_description"),
                "financial_exposure": case.get("financial_exposure"),
                "user_state": current_user.state_of_residence,
                "ai_recommendations": case.get("ai_next_steps", [])
            }
    
    # Create call record
    call_id = f"call_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    call_doc = {
        "call_id": call_id,
        "user_id": current_user.user_id,
        "lawyer_id": call_data.lawyer_id,
        "lawyer_name": lawyer["name"],
        "case_id": call_data.case_id,
        "scheduled_at": call_data.scheduled_at,
        "duration_minutes": 30,
        "price": 149,
        "status": "upcoming",
        "ai_brief": ai_brief,
        "created_at": now
    }
    await db.lawyer_calls.insert_one(call_doc)
    
    # Update lawyer sessions count
    await db.lawyers.update_one(
        {"lawyer_id": call_data.lawyer_id},
        {"$inc": {"sessions_count": 1}}
    )
    
    # Create case event if case provided
    if call_data.case_id:
        event_doc = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "case_id": call_data.case_id,
            "event_type": "call_booked",
            "title": "Call booked",
            "description": f"{lawyer['name']} · {call_data.time_slot}",
            "metadata": {"lawyer_id": call_data.lawyer_id, "call_id": call_id},
            "created_at": now
        }
        await db.case_events.insert_one(event_doc)
    
    return LawyerCall(**call_doc)

@api_router.get("/lawyer-calls", response_model=List[LawyerCall])
async def get_lawyer_calls(current_user: User = Depends(get_current_user)):
    """Get user's lawyer calls"""
    calls = await db.lawyer_calls.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("scheduled_at", -1).to_list(100)
    return [LawyerCall(**c) for c in calls]

@api_router.get("/lawyer-calls/next")
async def get_next_call(current_user: User = Depends(get_current_user)):
    """Get user's next upcoming call"""
    call = await db.lawyer_calls.find_one(
        {"user_id": current_user.user_id, "status": "upcoming"},
        {"_id": 0},
        sort=[("scheduled_at", 1)]
    )
    return call

# ================== Dashboard Stats ==================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics"""
    # Active cases
    active_cases = await db.cases.count_documents({
        "user_id": current_user.user_id,
        "status": "active"
    })
    
    # Cases requiring action (high risk)
    cases_action = await db.cases.count_documents({
        "user_id": current_user.user_id,
        "status": "active",
        "risk_score": {"$gt": 60}
    })
    
    # Highest risk score
    highest_risk_case = await db.cases.find_one(
        {"user_id": current_user.user_id, "status": "active"},
        {"_id": 0},
        sort=[("risk_score", -1)]
    )
    highest_risk = highest_risk_case["risk_score"] if highest_risk_case else 0
    
    # Total documents
    total_docs = await db.documents.count_documents({"user_id": current_user.user_id})
    
    # Next call
    next_call = await db.lawyer_calls.find_one(
        {"user_id": current_user.user_id, "status": "upcoming"},
        {"_id": 0},
        sort=[("scheduled_at", 1)]
    )
    
    return {
        "active_cases": active_cases,
        "cases_requiring_action": cases_action,
        "highest_risk_score": highest_risk,
        "total_documents": total_docs,
        "next_call": next_call
    }

# ================== Risk Score History ==================

@api_router.get("/cases/{case_id}/risk-history")
async def get_risk_history(case_id: str, current_user: User = Depends(get_current_user)):
    """Get risk score history for a case"""
    case_doc = await db.cases.find_one(
        {"case_id": case_id, "user_id": current_user.user_id},
        {"_id": 0, "risk_score_history": 1, "risk_score": 1}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    return {
        "current_score": case_doc.get("risk_score", 0),
        "history": case_doc.get("risk_score_history", [])
    }

# ================== Outcome Predictor ==================

OUTCOME_SYSTEM_PROMPT = """You are Jasper's legal outcome prediction engine. Based on case data and AI analysis, predict likely outcomes for this legal situation. You are NOT a lawyer and never claim to be one.

RULES:
- Provide 3 scenarios: favorable, neutral, and unfavorable
- Include probability estimates (must total 100%)
- Reference specific case facts and legal precedents
- Be realistic and grounded in the case data
- Plain English only

OUTPUT FORMAT — respond ONLY with this exact JSON, no other text:
{
  "favorable": {
    "probability": 30,
    "title": "Short title",
    "description": "2-3 sentences describing this outcome",
    "likely_result": "What happens specifically",
    "financial_impact": "Dollar amount or range",
    "timeline": "Estimated timeline"
  },
  "neutral": {
    "probability": 45,
    "title": "Short title",
    "description": "2-3 sentences describing this outcome",
    "likely_result": "What happens specifically",
    "financial_impact": "Dollar amount or range",
    "timeline": "Estimated timeline"
  },
  "unfavorable": {
    "probability": 25,
    "title": "Short title",
    "description": "2-3 sentences describing this outcome",
    "likely_result": "What happens specifically",
    "financial_impact": "Dollar amount or range",
    "timeline": "Estimated timeline"
  },
  "key_factors": ["Factor 1", "Factor 2", "Factor 3"],
  "recommendation": "One sentence best course of action",
  "disclaimer": "This prediction provides legal information only, not legal advice. Actual outcomes may vary."
}"""

@api_router.post("/cases/{case_id}/predict-outcome")
async def predict_outcome(case_id: str, current_user: User = Depends(get_current_user)):
    """Predict case outcome using AI"""
    case_doc = await db.cases.find_one(
        {"case_id": case_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case_context = {
        "type": case_doc.get("type"),
        "title": case_doc.get("title"),
        "risk_score": case_doc.get("risk_score"),
        "risk_financial": case_doc.get("risk_financial"),
        "risk_urgency": case_doc.get("risk_urgency"),
        "risk_legal_strength": case_doc.get("risk_legal_strength"),
        "risk_complexity": case_doc.get("risk_complexity"),
        "financial_exposure": case_doc.get("financial_exposure"),
        "deadline": case_doc.get("deadline"),
        "summary": case_doc.get("ai_summary"),
        "findings": [f.get("text") for f in case_doc.get("ai_findings", [])],
        "next_steps": [s.get("title") for s in case_doc.get("ai_next_steps", [])]
    }
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 2000,
                    "system": (BELGIAN_OUTCOME_SYSTEM if current_user.country == "BE" else OUTCOME_SYSTEM_PROMPT) + get_language_instruction(getattr(current_user, 'language', 'en') or 'en'),
                    "messages": [{
                        "role": "user",
                        "content": f"Predict outcomes for this legal case. Return JSON only:\n\n{json.dumps(case_context, indent=2)}"
                    }]
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            text = text.replace("```json", "").replace("```", "").strip()
            prediction = json.loads(text)
            return prediction
    except Exception as e:
        logger.error(f"Outcome prediction error: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again.")

# ================== Document Scanner (Mobile Camera) ==================

class ScanRequest(BaseModel):
    image_base64: str
    case_id: Optional[str] = None

@api_router.post("/documents/scan")
async def scan_document(
    scan_data: ScanRequest,
    current_user: User = Depends(get_current_user)
):
    """Scan a document photo using Claude Vision API"""
    # Check plan restrictions
    if current_user.plan == "free":
        doc_count = await db.documents.count_documents({"user_id": current_user.user_id})
        if doc_count >= 1:
            raise HTTPException(
                status_code=403,
                detail="Free plan limited to 1 document. Upgrade to Pro for unlimited analyses."
            )
    
    # Clean base64 string
    image_data = scan_data.image_base64
    if "base64," in image_data:
        image_data = image_data.split("base64,")[1]
    
    # Determine media type
    media_type = "image/jpeg"
    if scan_data.image_base64.startswith("data:image/png"):
        media_type = "image/png"
    elif scan_data.image_base64.startswith("data:image/webp"):
        media_type = "image/webp"
    
    # Call Claude Vision API for OCR + analysis
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 3000,
                    "system": "First, extract all text from this document image (OCR). Then analyze the extracted text as a legal document.\n\n" + CLAUDE_SYSTEM_PROMPT,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": "Extract text from this document image and analyze it as a legal document. Return the analysis JSON only."
                            }
                        ]
                    }]
                },
                timeout=90.0
            )
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            text = text.replace("```json", "").replace("```", "").strip()
            analysis = json.loads(text)
    except Exception as e:
        logger.error(f"Claude Vision scan error: {e}")
        raise HTTPException(status_code=500, detail="Document scan failed. Please try again or upload a file instead.")
    
    # Save scanned image to storage
    now = datetime.now(timezone.utc).isoformat()
    image_bytes = base64.b64decode(image_data)
    ext = "jpg" if media_type == "image/jpeg" else "png"
    storage_path = f"{APP_NAME}/scans/{current_user.user_id}/{uuid.uuid4()}.{ext}"
    try:
        put_object(storage_path, image_bytes, media_type)
    except Exception as e:
        logger.error(f"Scan storage failed: {e}")
        storage_path = None
    
    # Create document record
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    case_id = scan_data.case_id
    
    doc_record = {
        "document_id": document_id,
        "case_id": case_id,
        "user_id": current_user.user_id,
        "file_name": f"scan_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.{ext}",
        "file_url": None,
        "storage_path": storage_path,
        "file_type": ext,
        "extracted_text": analysis.get("summary", ""),
        "status": "analyzed",
        "is_key_document": case_id is None,
        "uploaded_at": now
    }
    await db.documents.insert_one(doc_record)
    
    # Create or update case (same logic as file upload)
    if case_id:
        case_doc = await db.cases.find_one({"case_id": case_id, "user_id": current_user.user_id}, {"_id": 0})
        if case_doc and analysis:
            history_entry = {
                "score": analysis["risk_score"]["total"],
                "financial": analysis["risk_score"]["financial"],
                "urgency": analysis["risk_score"]["urgency"],
                "legal_strength": analysis["risk_score"]["legal_strength"],
                "complexity": analysis["risk_score"]["complexity"],
                "document_name": doc_record["file_name"],
                "date": now
            }
            await db.cases.update_one(
                {"case_id": case_id},
                {
                    "$set": {
                        "risk_score": analysis["risk_score"]["total"],
                        "risk_financial": analysis["risk_score"]["financial"],
                        "risk_urgency": analysis["risk_score"]["urgency"],
                        "risk_legal_strength": analysis["risk_score"]["legal_strength"],
                        "risk_complexity": analysis["risk_score"]["complexity"],
                        "deadline": normalize_deadline(analysis.get("deadline")),
                        "deadline_description": analysis.get("deadline_description") or (analysis.get("deadline", {}).get("description") if isinstance(analysis.get("deadline"), dict) else None),
                        "financial_exposure": normalize_financial_exposure(analysis.get("financial_exposure")),
                        "ai_summary": analysis.get("summary"),
                        "ai_findings": analysis.get("findings", []),
                        "ai_next_steps": analysis.get("next_steps", []),
                        "recommend_lawyer": analysis.get("recommend_lawyer", False),
                        "updated_at": now
                    },
                    "$push": {"risk_score_history": history_entry}
                }
            )
    else:
        case_id = f"case_{uuid.uuid4().hex[:12]}"
        case_title = (analysis.get("suggested_case_title") or "").strip()
        if not case_title or len(case_title) < 5:
            summary = (analysis.get("summary") or "")
            case_title = summary[:60].rstrip('.') if summary else "Scanned Document Analysis"
        case_type = analysis.get("case_type", "other")
        
        case_doc = {
            "case_id": case_id,
            "user_id": current_user.user_id,
            "title": case_title,
            "type": case_type,
            "status": "active",
            "risk_score": analysis["risk_score"]["total"],
            "risk_financial": analysis["risk_score"]["financial"],
            "risk_urgency": analysis["risk_score"]["urgency"],
            "risk_legal_strength": analysis["risk_score"]["legal_strength"],
            "risk_complexity": analysis["risk_score"]["complexity"],
            "risk_score_history": [{
                "score": analysis["risk_score"]["total"],
                "financial": analysis["risk_score"]["financial"],
                "urgency": analysis["risk_score"]["urgency"],
                "legal_strength": analysis["risk_score"]["legal_strength"],
                "complexity": analysis["risk_score"]["complexity"],
                "document_name": doc_record["file_name"],
                "date": now
            }],
            "deadline": normalize_deadline(analysis.get("deadline")),
            "deadline_description": analysis.get("deadline_description") or (analysis.get("deadline", {}).get("description") if isinstance(analysis.get("deadline"), dict) else None),
            "financial_exposure": normalize_financial_exposure(analysis.get("financial_exposure")),
            "ai_summary": analysis.get("summary"),
            "ai_findings": analysis.get("findings", []),
            "ai_next_steps": analysis.get("next_steps", []),
            "recommend_lawyer": analysis.get("recommend_lawyer", False),
            "document_count": 1,
            "created_at": now,
            "updated_at": now
        }
        await db.cases.insert_one(case_doc)
        await db.documents.update_one({"document_id": document_id}, {"$set": {"case_id": case_id}})
        
        event_doc = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "case_id": case_id,
            "event_type": "case_opened",
            "title": "Case opened",
            "description": f"Scanned document analyzed · {analysis['risk_score']['total']}/100",
            "metadata": None,
            "created_at": now
        }
        await db.case_events.insert_one(event_doc)
    
    return {
        "document_id": document_id,
        "case_id": case_id,
        "analysis": analysis,
        "status": "analyzed"
    }

# ================== Stripe Payment Endpoints ==================

PAYMENT_PACKAGES = {
    "pro_monthly": {"amount": 69.00, "currency": "usd", "description": "Jasper Pro Plan - Monthly"},
    "lawyer_call": {"amount": 149.00, "currency": "usd", "description": "Attorney Video Call - 30 min"}
}

class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str
    metadata: Optional[Dict[str, str]] = None

@api_router.post("/payments/checkout")
async def create_checkout(
    checkout_data: CheckoutRequest,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe checkout session"""
    package = PAYMENT_PACKAGES.get(checkout_data.package_id)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    origin = checkout_data.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel"
    
    metadata = checkout_data.metadata or {}
    metadata["user_id"] = current_user.user_id
    metadata["package_id"] = checkout_data.package_id
    metadata["user_email"] = current_user.email
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_req = CheckoutSessionRequest(
        amount=package["amount"],
        currency=package["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
    
    # Record payment transaction
    now = datetime.now(timezone.utc).isoformat()
    tx_doc = {
        "transaction_id": f"tx_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "user_id": current_user.user_id,
        "package_id": checkout_data.package_id,
        "amount": package["amount"],
        "currency": package["currency"],
        "description": package["description"],
        "payment_status": "pending",
        "status": "initiated",
        "metadata": metadata,
        "created_at": now,
        "updated_at": now
    }
    await db.payment_transactions.insert_one(tx_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Check payment status and update records"""
    tx = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed, return cached status
    if tx.get("payment_status") == "paid":
        return {"status": tx["status"], "payment_status": "paid", "package_id": tx["package_id"]}
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    if checkout_status.payment_status == "paid" and tx.get("payment_status") != "paid":
        # Update transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "status": "completed", "updated_at": now}}
        )
        
        # Fulfill based on package
        if tx["package_id"] == "pro_monthly":
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$set": {"plan": "pro"}}
            )
        
        return {"status": "completed", "payment_status": "paid", "package_id": tx["package_id"]}
    elif checkout_status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "expired", "status": "expired", "updated_at": now}}
        )
        return {"status": "expired", "payment_status": "expired", "package_id": tx["package_id"]}
    
    return {"status": tx["status"], "payment_status": checkout_status.payment_status, "package_id": tx["package_id"]}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            now = datetime.now(timezone.utc).isoformat()
            
            tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if tx and tx.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "status": "completed", "updated_at": now}}
                )
                
                if tx["package_id"] == "pro_monthly":
                    await db.users.update_one(
                        {"user_id": tx["user_id"]},
                        {"$set": {"plan": "pro"}}
                    )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "detail": str(e)}

# ================== Legal Chat ==================

LEGAL_CHAT_SYSTEM_PROMPT = """You are Jasper Legal Chat — a senior legal information assistant with deep knowledge of US law. You answer legal questions clearly and in plain English for people who have no legal background.

You are NOT a lawyer and never claim to be one.
You provide legal INFORMATION only, not legal advice.

YOUR ANSWER FORMAT:
1. Direct answer to the question (2-3 sentences max)
2. The specific law or rule that applies
3. What the person should do next
4. If the situation is complex or high-stakes: recommend booking a lawyer call

RULES:
- Always specify which state the answer applies to when relevant
- Never say "I don't know" — say "This varies by state — here's the general rule"
- Keep answers under 200 words — concise and actionable
- If user seems to have an urgent legal problem, suggest uploading their document
- Never reproduce large sections of legal code — summarize in plain English
- End every answer with one of:
  * "Want me to analyze a document related to this?" (if relevant)
  * "Need to talk to a lawyer? Book a 30-min call for $149." (if complex)
  * "This is a common situation — here's what most people do:" (if simple)

CONVERSATION MEMORY:
You remember everything said in this conversation. If the user mentions their situation, apply that context to all subsequent answers.

JURISDICTION: USA — Federal + applicable state law"""

class ChatMessageInput(BaseModel):
    content: str
    case_id: Optional[str] = None

class CreateConversationInput(BaseModel):
    case_id: Optional[str] = None
    first_message: Optional[str] = None

@api_router.post("/chat/conversations")
async def create_conversation(
    data: CreateConversationInput,
    current_user: User = Depends(get_current_user)
):
    """Create a new chat conversation"""
    now = datetime.now(timezone.utc).isoformat()
    conv_id = f"conv_{uuid.uuid4().hex[:12]}"
    title = "New conversation"

    conv_doc = {
        "conversation_id": conv_id,
        "user_id": current_user.user_id,
        "title": title,
        "case_id": data.case_id,
        "created_at": now,
        "updated_at": now
    }
    await db.chat_conversations.insert_one(conv_doc)
    del conv_doc["_id"]
    return conv_doc

@api_router.get("/chat/conversations")
async def list_conversations(current_user: User = Depends(get_current_user)):
    """List user's chat conversations"""
    convs = await db.chat_conversations.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    return convs

@api_router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    """Delete a conversation and its messages"""
    await db.chat_conversations.delete_one({"conversation_id": conversation_id, "user_id": current_user.user_id})
    await db.chat_messages.delete_many({"conversation_id": conversation_id})
    return {"status": "deleted"}

@api_router.get("/chat/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, current_user: User = Depends(get_current_user)):
    """Get messages for a conversation"""
    conv = await db.chat_conversations.find_one(
        {"conversation_id": conversation_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await db.chat_messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return messages

@api_router.post("/chat/conversations/{conversation_id}/messages")
async def send_chat_message(
    conversation_id: str,
    data: ChatMessageInput,
    current_user: User = Depends(get_current_user)
):
    """Send a message and get AI response"""
    conv = await db.chat_conversations.find_one(
        {"conversation_id": conversation_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Free plan: limit to 3 total questions
    if current_user.plan == "free":
        total_user_msgs = await db.chat_messages.count_documents({
            "conversation_id": {"$in": [c["conversation_id"] for c in await db.chat_conversations.find({"user_id": current_user.user_id}, {"conversation_id": 1, "_id": 0}).to_list(100)]},
            "role": "user"
        })
        if total_user_msgs >= 3:
            raise HTTPException(status_code=403, detail="Free plan limited to 3 questions. Upgrade to Pro for unlimited legal chat.")

    now = datetime.now(timezone.utc).isoformat()

    # Save user message
    user_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "role": "user",
        "content": data.content,
        "created_at": now
    }
    await db.chat_messages.insert_one(user_msg)

    # Update conversation title from first message
    msg_count = await db.chat_messages.count_documents({"conversation_id": conversation_id, "role": "user"})
    if msg_count == 1:
        title = data.content[:60] + ("..." if len(data.content) > 60 else "")
        await db.chat_conversations.update_one(
            {"conversation_id": conversation_id},
            {"$set": {"title": title, "updated_at": now}}
        )

    # Build conversation history for Claude
    history = await db.chat_messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0, "role": 1, "content": 1}
    ).sort("created_at", 1).to_list(100)

    claude_messages = [{"role": m["role"], "content": m["content"]} for m in history]

    # Build system prompt with optional case context
    system_prompt = LEGAL_CHAT_SYSTEM_PROMPT
    user_language = getattr(current_user, 'language', 'en') or 'en'
    system_prompt += get_language_instruction(user_language)
    case_id = data.case_id or conv.get("case_id")
    if case_id:
        case_doc = await db.cases.find_one({"case_id": case_id, "user_id": current_user.user_id}, {"_id": 0})
        if case_doc:
            system_prompt += f"\n\nCONTEXT: The user has an active case: '{case_doc.get('title', '')}'. Type: {case_doc.get('type', '')}. Risk Score: {case_doc.get('risk_score', 0)}/100. Summary: {case_doc.get('ai_summary', 'N/A')}. They may ask questions related to this case."

    # Call Claude
    try:
        ai_response = await call_claude(system_prompt, claude_messages[-1]["content"] if len(claude_messages) == 1 else None, max_tokens=1000)
        # If single message, call_claude expects string. For multi-turn, use full history
        if len(claude_messages) > 1:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 1000,
                        "system": system_prompt,
                        "messages": claude_messages
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                resp_data = response.json()
                ai_text = resp_data["content"][0]["text"]
        else:
            # Single message - use call_claude but get raw text
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 1000,
                        "system": system_prompt,
                        "messages": claude_messages
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                resp_data = response.json()
                ai_text = resp_data["content"][0]["text"]
    except Exception as e:
        logger.error(f"Chat Claude error: {e}")
        ai_text = "I'm having trouble processing your question right now. Please try again in a moment."

    # Save AI response
    ai_msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": ai_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(ai_msg)
    await db.chat_conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"user_message": {k: v for k, v in user_msg.items() if k != "_id"}, "ai_message": {k: v for k, v in ai_msg.items() if k != "_id"}}

@api_router.get("/chat/question-count")
async def get_question_count(current_user: User = Depends(get_current_user)):
    """Get total question count for free plan tracking"""
    conv_ids = [c["conversation_id"] for c in await db.chat_conversations.find({"user_id": current_user.user_id}, {"conversation_id": 1, "_id": 0}).to_list(100)]
    if not conv_ids:
        return {"count": 0, "limit": 3 if current_user.plan == "free" else None}
    count = await db.chat_messages.count_documents({"conversation_id": {"$in": conv_ids}, "role": "user"})
    return {"count": count, "limit": 3 if current_user.plan == "free" else None}

# ================== Case Sharing ==================

import secrets

class ShareCaseInput(BaseModel):
    expiry_hours: int = 48
    message: Optional[str] = None

class SharedCaseComment(BaseModel):
    commenter_name: str
    comment: str

@api_router.post("/cases/{case_id}/share")
async def share_case(case_id: str, data: ShareCaseInput, current_user: User = Depends(get_current_user)):
    """Generate a secure share link for a case"""
    if current_user.plan == "free":
        raise HTTPException(status_code=403, detail="Case sharing is available on the Pro plan. Upgrade for $69/month.")

    case_doc = await db.cases.find_one({"case_id": case_id, "user_id": current_user.user_id}, {"_id": 0})
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case not found")

    # Limit expiry options
    allowed = [24, 48, 168, 720]
    if data.expiry_hours not in allowed:
        data.expiry_hours = 48

    now = datetime.now(timezone.utc)
    token = secrets.token_urlsafe(24)

    share_doc = {
        "share_id": f"share_{uuid.uuid4().hex[:12]}",
        "case_id": case_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name or "User",
        "token": token,
        "expires_at": (now + timedelta(hours=data.expiry_hours)).isoformat(),
        "expiry_hours": data.expiry_hours,
        "optional_message": data.message,
        "views_count": 0,
        "is_revoked": False,
        "created_at": now.isoformat()
    }
    await db.shared_cases.insert_one(share_doc)

    return {"token": token, "share_id": share_doc["share_id"], "expires_at": share_doc["expires_at"]}

@api_router.get("/cases/{case_id}/shares")
async def list_case_shares(case_id: str, current_user: User = Depends(get_current_user)):
    """List active shares for a case"""
    shares = await db.shared_cases.find(
        {"case_id": case_id, "user_id": current_user.user_id, "is_revoked": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    now = datetime.now(timezone.utc).isoformat()
    active = [s for s in shares if s["expires_at"] > now]

    # Get comment counts
    for s in active:
        s["comment_count"] = await db.shared_case_comments.count_documents({"share_id": s["share_id"]})

    return active

@api_router.post("/shares/{share_id}/revoke")
async def revoke_share(share_id: str, current_user: User = Depends(get_current_user)):
    """Revoke a share link"""
    result = await db.shared_cases.update_one(
        {"share_id": share_id, "user_id": current_user.user_id},
        {"$set": {"is_revoked": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Share not found")
    return {"status": "revoked"}

# Public endpoints (no auth required)
@api_router.get("/shared/{token}")
async def get_shared_case(token: str):
    """Get a shared case by token (public, no auth)"""
    share = await db.shared_cases.find_one({"token": token}, {"_id": 0})
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")

    if share.get("is_revoked"):
        raise HTTPException(status_code=410, detail="This link has been revoked by the owner.")

    now = datetime.now(timezone.utc).isoformat()
    if share["expires_at"] < now:
        raise HTTPException(status_code=410, detail="This link has expired.")

    # Increment views
    await db.shared_cases.update_one({"token": token}, {"$inc": {"views_count": 1}})

    # Get case data (filtered for privacy)
    case_doc = await db.cases.find_one({"case_id": share["case_id"]}, {"_id": 0})
    if not case_doc:
        raise HTTPException(status_code=404, detail="Case no longer exists")

    # Get comments
    comments = await db.shared_case_comments.find(
        {"share_id": share["share_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # Filter sensitive data
    safe_case = {
        "title": case_doc.get("title"),
        "type": case_doc.get("type"),
        "status": case_doc.get("status"),
        "risk_score": case_doc.get("risk_score"),
        "risk_financial": case_doc.get("risk_financial"),
        "risk_urgency": case_doc.get("risk_urgency"),
        "risk_legal_strength": case_doc.get("risk_legal_strength"),
        "risk_complexity": case_doc.get("risk_complexity"),
        "deadline": case_doc.get("deadline"),
        "deadline_description": case_doc.get("deadline_description"),
        "financial_exposure": case_doc.get("financial_exposure"),
        "ai_summary": case_doc.get("ai_summary"),
        "ai_findings": case_doc.get("ai_findings", []),
        "ai_next_steps": case_doc.get("ai_next_steps", []),
        "risk_score_history": case_doc.get("risk_score_history", []),
        "battle_preview": case_doc.get("battle_preview"),
        "success_probability": case_doc.get("success_probability"),
        "procedural_defects": case_doc.get("procedural_defects", []),
        "key_insight": case_doc.get("key_insight"),
        "leverage_points": case_doc.get("leverage_points", []),
        "recent_case_law": case_doc.get("recent_case_law", []),
        "case_law_updated": case_doc.get("case_law_updated"),
    }

    # Get document names only (not content)
    docs = await db.documents.find(
        {"case_id": share["case_id"]},
        {"_id": 0, "file_name": 1, "status": 1, "uploaded_at": 1, "is_key_document": 1}
    ).to_list(50)

    # Get timeline
    events = await db.case_events.find(
        {"case_id": share["case_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    return {
        "share": {
            "user_name": share.get("user_name", "User"),
            "optional_message": share.get("optional_message"),
            "expires_at": share["expires_at"],
            "views_count": share.get("views_count", 0) + 1
        },
        "case": safe_case,
        "documents": docs,
        "events": events,
        "comments": comments
    }

@api_router.post("/shared/{token}/comments")
async def add_shared_case_comment(token: str, data: SharedCaseComment):
    """Add a comment to a shared case (public, no auth)"""
    share = await db.shared_cases.find_one({"token": token}, {"_id": 0})
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")
    if share.get("is_revoked"):
        raise HTTPException(status_code=410, detail="This link has been revoked.")
    now = datetime.now(timezone.utc).isoformat()
    if share["expires_at"] < now:
        raise HTTPException(status_code=410, detail="This link has expired.")

    comment_doc = {
        "comment_id": f"cmt_{uuid.uuid4().hex[:12]}",
        "share_id": share["share_id"],
        "case_id": share["case_id"],
        "commenter_name": data.commenter_name[:100],
        "comment": data.comment[:2000],
        "created_at": now
    }
    await db.shared_case_comments.insert_one(comment_doc)

    return {"comment_id": comment_doc["comment_id"], "status": "created"}

# ================== Seed Data ==================

@api_router.post("/seed/lawyers")
async def seed_lawyers():
    """Seed lawyer data — US + Belgian lawyers"""
    lawyers_data = [
        # ===== US LAWYERS =====
        {
            "lawyer_id": "lawyer_sarah",
            "name": "Sarah Mitchell, Esq.",
            "specialty": "Employment Law",
            "bar_state": "New York",
            "years_experience": 12,
            "rating": 5.0,
            "sessions_count": 214,
            "tags": ["Wrongful termination", "Discrimination", "Unpaid wages"],
            "availability_status": "now",
            "availability_minutes": 0,
            "bio": "Specialized in employment disputes and workplace discrimination cases.",
            "photo_url": "https://images.unsplash.com/photo-1585240975858-7264fd020798?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjB3b21hbiUyMGF0dG9ybmV5fGVufDB8fHx8MTc3NTc2MTA2NHww&ixlib=rb-4.1.0&q=85",
            "country": "US",
            "language": "en"
        },
        {
            "lawyer_id": "lawyer_james",
            "name": "James Carter, Esq.",
            "specialty": "Contract Law",
            "bar_state": "California",
            "years_experience": 9,
            "rating": 4.9,
            "sessions_count": 187,
            "tags": ["Business disputes", "NDA", "Vendor contracts"],
            "availability_status": "soon",
            "availability_minutes": 8,
            "bio": "Expert in business contracts and commercial litigation.",
            "photo_url": "https://images.unsplash.com/photo-1644268756851-3f69ffb9553f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBsYXd5ZXJ8ZW58MHx8fHwxNzc1NzYxMDU5fDA&ixlib=rb-4.1.0&q=85",
            "country": "US",
            "language": "en"
        },
        {
            "lawyer_id": "lawyer_diana",
            "name": "Diana Torres, Esq.",
            "specialty": "Tenant Rights",
            "bar_state": "Texas",
            "years_experience": 7,
            "rating": 4.9,
            "sessions_count": 156,
            "tags": ["Lease disputes", "Eviction", "Deposits"],
            "availability_status": "soon",
            "availability_minutes": 22,
            "bio": "Dedicated to protecting tenant rights and housing law.",
            "photo_url": "https://images.unsplash.com/photo-1685760259914-ee8d2c92d2e0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjB3b21hbiUyMGF0dG9ybmV5fGVufDB8fHx8MTc3NTc2MTA2NHww&ixlib=rb-4.1.0&q=85",
            "country": "US",
            "language": "en"
        },
        {
            "lawyer_id": "lawyer_marcus",
            "name": "Marcus Johnson, Esq.",
            "specialty": "Immigration Law",
            "bar_state": "Washington DC",
            "years_experience": 15,
            "rating": 4.8,
            "sessions_count": 302,
            "tags": ["Visa contracts", "Work permits", "Green card"],
            "availability_status": "tomorrow",
            "availability_minutes": 0,
            "bio": "Immigration law specialist with federal court experience.",
            "photo_url": "https://images.unsplash.com/photo-1665224752561-85f4da9a5658?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBsYXd5ZXJ8ZW58MHx8fHwxNzc1NzYxMDU5fDA&ixlib=rb-4.1.0&q=85",
            "country": "US",
            "language": "en"
        },
        {
            "lawyer_id": "lawyer_rachel",
            "name": "Rachel Kim, Esq.",
            "specialty": "Consumer Rights",
            "bar_state": "Florida",
            "years_experience": 6,
            "rating": 4.9,
            "sessions_count": 98,
            "tags": ["Debt collection", "Scams", "FDCPA"],
            "availability_status": "now",
            "availability_minutes": 0,
            "bio": "Consumer protection and debt collection defense.",
            "photo_url": "https://images.unsplash.com/photo-1665224752123-a2ea29dddcb2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjB3b21hbiUyMGF0dG9ybmV5fGVufDB8fHx8MTc3NTc2MTA2NHww&ixlib=rb-4.1.0&q=85",
            "country": "US",
            "language": "en"
        },
        {
            "lawyer_id": "lawyer_david",
            "name": "David Park, Esq.",
            "specialty": "Business Law",
            "bar_state": "Illinois",
            "years_experience": 11,
            "rating": 4.8,
            "sessions_count": 241,
            "tags": ["Partnership disputes", "LLC", "Contracts"],
            "availability_status": "soon",
            "availability_minutes": 45,
            "bio": "Business formation and partnership dispute resolution.",
            "photo_url": "https://images.unsplash.com/photo-1762522926262-d96de462ad54?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBsYXd5ZXJ8ZW58MHx8fHwxNzc1NzYxMDU5fDA&ixlib=rb-4.1.0&q=85",
            "country": "US",
            "language": "en"
        },
        # ===== BELGIAN LAWYERS — FRANCOPHONE =====
        {
            "lawyer_id": "lawyer_be_sophie",
            "name": "Me Sophie Lecomte",
            "specialty": "Droit du travail",
            "bar_state": "Barreau de Bruxelles",
            "years_experience": 11,
            "rating": 4.9,
            "sessions_count": 187,
            "tags": ["Licenciement abusif", "Harcelement", "Preavis", "CCT 109"],
            "availability_status": "now",
            "availability_minutes": 0,
            "bio": "Specialisee en litiges du travail et protection contre le licenciement abusif. Ancienne collaboratrice du syndicat CSC.",
            "photo_url": "https://images.unsplash.com/photo-1702875581098-36844f1910f3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBldXJvcGVhbiUyMGxhd3llcnxlbnwwfHx8fDE3NzU4MzU1MTN8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "fr"
        },
        {
            "lawyer_id": "lawyer_be_thomas",
            "name": "Me Thomas Dupont",
            "specialty": "Droit du bail (Wallonie)",
            "bar_state": "Barreau de Liege",
            "years_experience": 7,
            "rating": 4.8,
            "sessions_count": 134,
            "tags": ["Bail residentiel", "Expulsion", "Garantie locative", "CWLHD"],
            "availability_status": "soon",
            "availability_minutes": 15,
            "bio": "Expert en droit du bail wallon. Intervient regulierement devant les justices de paix de la province de Liege.",
            "photo_url": "https://images.unsplash.com/photo-1591702694482-ecc51ff9642e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBldXJvcGVhbiUyMGxhd3llcnxlbnwwfHx8fDE3NzU4MzU1MTN8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "fr"
        },
        {
            "lawyer_id": "lawyer_be_julie",
            "name": "Me Julie Renard",
            "specialty": "Droit de la consommation",
            "bar_state": "Barreau de Namur",
            "years_experience": 9,
            "rating": 4.9,
            "sessions_count": 156,
            "tags": ["Protection consommateur", "Remboursement", "Contrats abusifs", "CDE"],
            "availability_status": "now",
            "availability_minutes": 0,
            "bio": "Specialisee en protection du consommateur et clauses abusives. Collabore avec le SPF Economie.",
            "photo_url": "https://images.unsplash.com/photo-1733348137479-2e726d326d9b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBldXJvcGVhbiUyMGxhd3llcnxlbnwwfHx8fDE3NzU4MzU1MTN8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "fr"
        },
        {
            "lawyer_id": "lawyer_be_alexandre",
            "name": "Me Alexandre Martin",
            "specialty": "Droit des contrats",
            "bar_state": "Barreau de Bruxelles",
            "years_experience": 14,
            "rating": 4.8,
            "sessions_count": 203,
            "tags": ["NDA", "Contrats commerciaux", "Rupture de contrat", "Non-concurrence"],
            "availability_status": "tomorrow",
            "availability_minutes": 0,
            "bio": "Expert en negociation de contrats commerciaux et clauses de non-concurrence. Bilingue FR/NL.",
            "photo_url": "https://images.unsplash.com/photo-1771244702701-6c9edac63255?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBoZWFkc2hvdCUyMHBvcnRyYWl0JTIwc3VpdCUyMG9mZmljZXxlbnwwfHx8fDE3NzU4MzU1MTh8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "fr/nl"
        },
        {
            "lawyer_id": "lawyer_be_emilie",
            "name": "Me Emilie Dubois",
            "specialty": "Droit de la famille",
            "bar_state": "Barreau de Mons",
            "years_experience": 12,
            "rating": 4.9,
            "sessions_count": 178,
            "tags": ["Divorce", "Garde alternee", "Pension alimentaire", "Succession"],
            "availability_status": "soon",
            "availability_minutes": 30,
            "bio": "Specialisee en droit familial et mediations familiales. Mediatrice agreee par la Commission federale de mediation.",
            "photo_url": "https://images.unsplash.com/photo-1685760259914-ee8d2c92d2e0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBldXJvcGVhbiUyMGxhd3llcnxlbnwwfHx8fDE3NzU4MzU1MTN8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "fr"
        },
        # ===== BELGIAN LAWYERS — NEDERLANDSTALIG =====
        {
            "lawyer_id": "lawyer_be_pieter",
            "name": "Mr. Pieter Van den Berg",
            "specialty": "Arbeidsrecht",
            "bar_state": "Balie Gent",
            "years_experience": 10,
            "rating": 4.9,
            "sessions_count": 165,
            "tags": ["Ontslag", "Niet-concurrentiebeding", "CAO", "RSZ"],
            "availability_status": "now",
            "availability_minutes": 0,
            "bio": "Gespecialiseerd in arbeidsgeschillen en bescherming tegen willekeurig ontslag. Voormalig juridisch adviseur ABVV.",
            "photo_url": "https://images.unsplash.com/photo-1758691737644-ef8be18256c3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBoZWFkc2hvdCUyMHBvcnRyYWl0JTIwc3VpdCUyMG9mZmljZXxlbnwwfHx8fDE3NzU4MzU1MTh8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "nl"
        },
        {
            "lawyer_id": "lawyer_be_laura",
            "name": "Mevr. Laura Janssen",
            "specialty": "Huurrecht Vlaanderen",
            "bar_state": "Balie Antwerpen",
            "years_experience": 8,
            "rating": 4.8,
            "sessions_count": 142,
            "tags": ["Huurgeschillen", "Uitzetting", "Vlaamse Woninghuurwet", "Huurwaarborg"],
            "availability_status": "soon",
            "availability_minutes": 20,
            "bio": "Expert in Vlaams huurrecht. Regelmatig aanwezig bij het vredegerecht van Antwerpen voor huurgeschillen.",
            "photo_url": "https://images.unsplash.com/photo-1702875581098-36844f1910f3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBldXJvcGVhbiUyMGxhd3llcnxlbnwwfHx8fDE3NzU4MzU1MTN8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "nl"
        },
        {
            "lawyer_id": "lawyer_be_luc",
            "name": "Mr. Luc Vermeersch",
            "specialty": "Consumentenrecht",
            "bar_state": "Balie Brussel",
            "years_experience": 11,
            "rating": 4.9,
            "sessions_count": 189,
            "tags": ["WER", "Onrechtmatige bedingen", "Ombudsman procedures", "E-commerce"],
            "availability_status": "now",
            "availability_minutes": 0,
            "bio": "Expert consumentenrecht en WER. Werkt regelmatig samen met Ombudsfin en de Ombudsman voor Verzekeringen. Tweetalig NL/FR.",
            "photo_url": "https://images.unsplash.com/photo-1568585105565-e372998a195d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBoZWFkc2hvdCUyMHBvcnRyYWl0JTIwc3VpdCUyMG9mZmljZXxlbnwwfHx8fDE3NzU4MzU1MTh8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "nl/fr"
        },
        {
            "lawyer_id": "lawyer_be_sarah_ds",
            "name": "Mevr. Sarah De Smedt",
            "specialty": "Contractenrecht",
            "bar_state": "Balie Leuven",
            "years_experience": 6,
            "rating": 4.8,
            "sessions_count": 98,
            "tags": ["NDA", "Handelscontracten", "Aansprakelijkheid", "IP-recht"],
            "availability_status": "tomorrow",
            "availability_minutes": 0,
            "bio": "Gespecialiseerd in contractenrecht en intellectueel eigendom. Docente KU Leuven.",
            "photo_url": "https://images.unsplash.com/photo-1733348137479-2e726d326d9b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBldXJvcGVhbiUyMGxhd3llcnxlbnwwfHx8fDE3NzU4MzU1MTN8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "nl"
        },
        # ===== BELGIAN LAWYERS — DEUTSCHSPRACHIG =====
        {
            "lawyer_id": "lawyer_be_klaus",
            "name": "Herr Klaus Mueller",
            "specialty": "Arbeitsrecht",
            "bar_state": "Kammer Eupen",
            "years_experience": 15,
            "rating": 4.8,
            "sessions_count": 87,
            "tags": ["Kuendigung", "Arbeitsvertrag", "Sozialrecht", "KAV"],
            "availability_status": "now",
            "availability_minutes": 0,
            "bio": "Spezialist fuer Arbeitsrecht in der Deutschsprachigen Gemeinschaft. Zweisprachig DE/FR.",
            "photo_url": "https://images.unsplash.com/photo-1758518729314-b02874db8c37?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBoZWFkc2hvdCUyMHBvcnRyYWl0JTIwc3VpdCUyMG9mZmljZXxlbnwwfHx8fDE3NzU4MzU1MTh8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "de/fr"
        },
        {
            "lawyer_id": "lawyer_be_anna",
            "name": "Frau Anna Schreiber",
            "specialty": "Mietrecht und Zivilrecht",
            "bar_state": "Kammer Malmedy",
            "years_experience": 9,
            "rating": 4.7,
            "sessions_count": 64,
            "tags": ["Mietvertraege", "Zivilrecht", "Vertragsrecht", "Familienrecht"],
            "availability_status": "soon",
            "availability_minutes": 45,
            "bio": "Mietrecht und allgemeines Zivilrecht in Ostbelgien. Zweisprachig DE/FR.",
            "photo_url": "https://images.unsplash.com/photo-1685760259914-ee8d2c92d2e0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBldXJvcGVhbiUyMGxhd3llcnxlbnwwfHx8fDE3NzU4MzU1MTN8MA&ixlib=rb-4.1.0&q=85",
            "country": "BE",
            "language": "de/fr"
        }
    ]
    
    # Clear existing lawyers
    await db.lawyers.delete_many({})
    
    # Insert new lawyers
    for lawyer in lawyers_data:
        await db.lawyers.insert_one(lawyer)
    
    return {"message": f"Seeded {len(lawyers_data)} lawyers"}


# ================== Document Library ==================

# Load templates
with open(os.path.join(os.path.dirname(__file__), "document_templates.json")) as f:
    DOC_TEMPLATES = json.load(f)

FREE_TEMPLATE_IDS = {t["id"] for t in DOC_TEMPLATES if t.get("free")}

CATEGORIES = [
    {"id": "all", "label": "All"},
    {"id": "employment", "label": "Employment"},
    {"id": "housing", "label": "Housing & Lease"},
    {"id": "business", "label": "Business"},
    {"id": "nda", "label": "NDA & Confidentiality"},
    {"id": "contracts", "label": "Contracts"},
    {"id": "consumer", "label": "Consumer & Demand Letters"},
    {"id": "debt", "label": "Debt & Finance"},
    {"id": "family", "label": "Family"},
    {"id": "realestate", "label": "Real Estate"},
    {"id": "freelance", "label": "Freelance"},
    {"id": "ip", "label": "Intellectual Property"},
    {"id": "court", "label": "Court & Legal"},
    {"id": "immigration", "label": "Immigration"},
]

@api_router.get("/library/templates")
async def get_library_templates(category: str = "all", search: str = ""):
    templates = DOC_TEMPLATES
    if category and category != "all":
        templates = [t for t in templates if t["cat"] == category]
    if search:
        q = search.lower()
        templates = [t for t in templates if q in t["name"].lower() or q in t["desc"].lower()]
    return {"templates": templates, "categories": CATEGORIES, "total": len(templates)}

class DocGenerateRequest(BaseModel):
    template_id: str
    fields: dict
    jurisdiction: str = "California"

@api_router.post("/library/generate")
async def generate_document(body: DocGenerateRequest, current_user: User = Depends(get_current_user)):
    template = next((t for t in DOC_TEMPLATES if t["id"] == body.template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    plan = current_user.plan or "free"
    if plan != "pro" and body.template_id not in FREE_TEMPLATE_IDS:
        raise HTTPException(status_code=403, detail="This template requires a Pro plan. Upgrade to access all 158+ templates.")
    
    fields_text = "\n".join(f"- {k}: {v}" for k, v in body.fields.items() if v)
    
    prompt = f"""Generate a complete, professional, legally sound {template['name']} for the jurisdiction of {body.jurisdiction}.

Use the following information provided by the user:
{fields_text}

The document must:
1. Include ALL standard clauses for this document type
2. Be jurisdiction-specific — reference applicable state/country law
3. Use proper legal language while remaining clear
4. Include all necessary sections, headings, and signature blocks
5. Be ready to sign immediately
6. Include the date {datetime.now(timezone.utc).strftime('%B %d, %Y')}

Return the complete document text formatted with clear sections and headings. Use markdown formatting (# for headings, ** for bold, etc). Include signature lines at the end with [SIGNATURE] placeholders."""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 4000,
                    "system": "You are a senior attorney drafting legal documents. Generate complete, jurisdiction-specific, professionally formatted legal documents. Never include disclaimers or notes — just the document itself.",
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            content = data["content"][0]["text"]
    except Exception as e:
        logger.error(f"Document generation error: {e}")
        raise HTTPException(status_code=500, detail="Could not generate document. Please try again.")
    
    doc_id = f"gendoc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc_record = {
        "doc_id": doc_id,
        "user_id": current_user.user_id,
        "template_id": body.template_id,
        "document_type": template["cat"],
        "document_name": template["name"],
        "generated_content": content,
        "fields": body.fields,
        "jurisdiction": body.jurisdiction,
        "signature_status": "draft",
        "signers": [],
        "created_at": now
    }
    await db.generated_documents.insert_one(doc_record)
    
    return {
        "doc_id": doc_id,
        "document_name": template["name"],
        "content": content,
        "jurisdiction": body.jurisdiction,
        "signature_status": "draft",
        "created_at": now
    }

@api_router.get("/library/generated")
async def get_generated_documents(current_user: User = Depends(get_current_user)):
    docs = await db.generated_documents.find(
        {"user_id": current_user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return docs

class SignatureRequest(BaseModel):
    doc_id: str
    signers: list
    message: str = ""

@api_router.post("/library/sign")
async def send_for_signature(body: SignatureRequest, current_user: User = Depends(get_current_user)):
    doc = await db.generated_documents.find_one(
        {"doc_id": body.doc_id, "user_id": current_user.user_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # HelloSign integration placeholder — needs API key
    hellosign_key = os.environ.get("HELLOSIGN_API_KEY")
    if not hellosign_key:
        now = datetime.now(timezone.utc).isoformat()
        signers_data = [{"name": s.get("name",""), "email": s.get("email",""), "status": "pending", "signed_at": None} for s in body.signers]
        await db.generated_documents.update_one(
            {"doc_id": body.doc_id},
            {"$set": {"signature_status": "pending", "signers": signers_data, "hellosign_request_id": f"mock_{uuid.uuid4().hex[:8]}"}}
        )
        return {
            "status": "pending",
            "message": "Signature request created (HelloSign integration pending — API key required)",
            "signers": signers_data,
            "doc_id": body.doc_id
        }
    
    # TODO: Real HelloSign API call when key is configured
    return {"status": "error", "message": "HelloSign integration not yet configured"}


# ================== Risk Monitor — Email Surveillance (MOCKED) ==================

@api_router.get("/risk-monitor/status")
async def get_risk_monitor_status(current_user: User = Depends(get_current_user)):
    """Get risk monitor connection status and stats"""
    monitor = await db.risk_monitors.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0}
    )
    if not monitor:
        return {
            "connected": False,
            "provider": None,
            "email": None,
            "emails_scanned": 0,
            "threats_detected": 0,
            "last_scan": None,
            "alerts": []
        }
    
    alerts = await db.risk_monitor_alerts.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("detected_at", -1).limit(10).to_list(10)
    
    return {
        "connected": monitor.get("connected", False),
        "provider": monitor.get("provider"),
        "email": monitor.get("email"),
        "emails_scanned": monitor.get("emails_scanned", 0),
        "threats_detected": monitor.get("threats_detected", 0),
        "last_scan": monitor.get("last_scan"),
        "alerts": alerts
    }

@api_router.post("/risk-monitor/connect")
async def connect_risk_monitor(request: Request, current_user: User = Depends(get_current_user)):
    """Connect email account for risk monitoring (MOCKED — requires OAuth credentials)"""
    body = await request.json()
    provider = body.get("provider", "gmail")
    
    if provider not in ["gmail", "outlook"]:
        raise HTTPException(status_code=400, detail="Provider must be 'gmail' or 'outlook'")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # MOCKED: Simulate successful connection
    monitor_data = {
        "user_id": current_user.user_id,
        "provider": provider,
        "email": current_user.email,
        "connected": True,
        "emails_scanned": 0,
        "threats_detected": 0,
        "last_scan": now,
        "connected_at": now
    }
    
    await db.risk_monitors.update_one(
        {"user_id": current_user.user_id},
        {"$set": monitor_data},
        upsert=True
    )
    
    # Simulate initial scan with some mock alerts
    mock_alerts = [
        {
            "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
            "user_id": current_user.user_id,
            "type": "legal_document",
            "severity": "high",
            "subject": "Notice of Intent to Sue — Account #4892",
            "sender": "collections@lawfirm-associates.com",
            "preview": "This letter serves as formal notice that our client intends to pursue legal action regarding the outstanding balance...",
            "detected_at": now,
            "status": "new",
            "recommended_action": "Upload this document to Jasper for full analysis"
        },
        {
            "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
            "user_id": current_user.user_id,
            "type": "contract",
            "severity": "medium",
            "subject": "Lease Renewal — New Terms Enclosed",
            "sender": "management@propertygroup.com",
            "preview": "Please review the attached lease renewal agreement. Note the following changes to your current terms...",
            "detected_at": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
            "status": "new",
            "recommended_action": "Use Contract Guard to review before signing"
        },
        {
            "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
            "user_id": current_user.user_id,
            "type": "deadline",
            "severity": "low",
            "subject": "Reminder: Policy Renewal Due Feb 28",
            "sender": "noreply@insurance-co.com",
            "preview": "Your current insurance policy is set to expire on February 28, 2026. Please review the renewal terms...",
            "detected_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "status": "new",
            "recommended_action": "Review renewal terms for any changes"
        }
    ]
    
    for alert in mock_alerts:
        await db.risk_monitor_alerts.insert_one(alert)
    
    await db.risk_monitors.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"emails_scanned": 147, "threats_detected": 3}}
    )
    
    return {
        "status": "connected",
        "provider": provider,
        "email": current_user.email,
        "message": f"Successfully connected to {provider.title()}. Initial scan complete — 3 items detected."
    }

@api_router.post("/risk-monitor/disconnect")
async def disconnect_risk_monitor(current_user: User = Depends(get_current_user)):
    """Disconnect email monitoring"""
    await db.risk_monitors.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"connected": False}}
    )
    return {"status": "disconnected"}

@api_router.put("/risk-monitor/alerts/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str, current_user: User = Depends(get_current_user)):
    """Dismiss a risk monitor alert"""
    await db.risk_monitor_alerts.update_one(
        {"alert_id": alert_id, "user_id": current_user.user_id},
        {"$set": {"status": "dismissed"}}
    )
    return {"status": "dismissed"}

# ================== Contract Guard Reviews ==================

@api_router.get("/contract-guard/reviews")
async def get_contract_guard_reviews(current_user: User = Depends(get_current_user)):
    """Get all contract guard reviews for the user"""
    reviews = await db.contract_guard_reviews.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return reviews


@api_router.get("/user/country-config")
async def get_country_config(current_user: User = Depends(get_current_user)):
    """Get country-specific configuration for the current user"""
    country = current_user.country or "US"
    if country == "BE":
        return {
            "country": "BE",
            "country_name": "Belgium",
            "regions": [
                {"id": "Wallonie", "label": "Wallonie", "language": "fr-BE"},
                {"id": "Bruxelles-Capitale", "label": "Bruxelles-Capitale", "language": "fr-BE"},
                {"id": "Flandre", "label": "Vlaanderen / Flandre", "language": "nl-BE"},
                {"id": "Communaute germanophone", "label": "Communaute germanophone", "language": "de-BE"}
            ],
            "languages": [
                {"id": "fr-BE", "label": "Francais"},
                {"id": "nl-BE", "label": "Nederlands"},
                {"id": "de-BE", "label": "Deutsch"}
            ],
            "currency": "EUR",
            "legal_refs": {
                "legislation": "www.ejustice.just.fgov.be",
                "cct": "www.cnt-nar.be",
                "jurisprudence": "www.juridat.be",
                "codes": "www.codesdroitbelge.be"
            }
        }
    return {
        "country": "US",
        "country_name": "United States",
        "regions": [],
        "languages": [{"id": "en", "label": "English"}],
        "currency": "USD",
        "legal_refs": {"courtlistener": "www.courtlistener.com"}
    }

# ================== Health Check ==================

@api_router.get("/")
async def root():
    return {"message": "Jasper API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize storage and seed data on startup"""
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    
    # Seed lawyers — re-seed if missing Belgian lawyers
    be_count = await db.lawyers.count_documents({"country": "BE"})
    if be_count == 0:
        logger.info("Seeding lawyer data (US + Belgian)...")
        await seed_lawyers()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

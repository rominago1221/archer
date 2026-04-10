from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response, Header, Query, Request, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
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

SENIOR_ATTORNEY_PERSONA = """You are a senior US attorney with 20 years of experience representing individuals — never corporations — in employment disputes, tenant rights cases, debt collection defense, contract disputes, consumer protection, and civil litigation.

You have personally handled over 2,000 cases similar to the ones you will analyze. You think like a litigator: you identify not just the risks, but the opposing party's likely strategy, the weakest points in their argument, and the exact leverage points your client can use to achieve the best outcome.

YOUR ANALYSIS PRINCIPLES:
1. Read every word of the document — details matter, especially what is MISSING
2. Identify procedural errors first — they are often the strongest defense
3. Look for violations of the opposing party's own obligations
4. Quantify financial exposure precisely — vague ranges are useless
5. Deadlines are sacred — never understate urgency
6. Look for what can be USED, not just what hurts
7. Consider the opposing party's incentives — do they want to go to court?
8. The cheapest resolution is usually the best — recommend deescalation when possible

YOU NEVER:
- Admit liability on behalf of the user
- Recommend paying without first disputing
- Ignore procedural defects in opposing documents
- Underestimate a deadline
- Give false reassurance when risk is genuinely high
- Use legal jargon without plain-English explanation

JURISDICTION: USA — Federal + applicable state law"""

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
  "case_type": "employment|housing|contract|debt|immigration|court|consumer|family|other",
  "suggested_case_title": "Short descriptive title max 60 chars",
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
    {{"text": "Specific finding", "impact": "high|medium|low", "type": "risk|opportunity|deadline|neutral"}}
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


async def call_claude(system_prompt: str, user_message: str, max_tokens: int = 2000) -> dict:
    """Make a single Claude API call and return parsed JSON"""
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
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_message}]
            },
            timeout=90.0
        )
        response.raise_for_status()
        data = response.json()
        text = data["content"][0]["text"]
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)


async def analyze_document_with_claude(extracted_text: str) -> dict:
    """Legacy single-pass analysis (fallback)"""
    try:
        result = await call_claude(CLAUDE_SYSTEM_PROMPT, f"Analyze this legal document and return JSON only:\n\n{extracted_text[:15000]}")
        return result
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        return _default_analysis()


async def analyze_document_advanced(extracted_text: str, user_context: str = "") -> dict:
    """Advanced 5-pass analysis system"""
    import asyncio
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
        # Determine case type from doc type mapping
        doc_to_case = {
            "eviction_notice": "housing", "lease": "housing",
            "employment_contract": "employment",
            "debt_collection": "debt", "demand_letter": "debt",
            "court_notice": "court", "nda": "contract"
        }
        inferred_case_type = doc_to_case.get(doc_type, "other")
        jurisprudence_text = load_jurisprudence(inferred_case_type, doc_type)

        # PASS 2: Legal analysis
        logger.info("Advanced analysis: Pass 2 — Legal analysis")
        legal_analysis = await call_claude(
            SENIOR_ATTORNEY_PERSONA,
            PASS2_PROMPT.format(
                facts_json=json.dumps(facts, indent=2),
                jurisprudence_section=jurisprudence_text
            ),
            max_tokens=3000
        )

        facts_str = json.dumps(facts, indent=2)
        analysis_str = json.dumps(legal_analysis, indent=2)

        # PASS 3, 4A, 4B in parallel
        logger.info("Advanced analysis: Pass 3+4A+4B — Strategy + Battle Preview")
        strategy_task = call_claude(
            SENIOR_ATTORNEY_PERSONA,
            PASS3_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
            max_tokens=2500
        )
        user_args_task = call_claude(
            PASS4A_SYSTEM,
            PASS4A_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
            max_tokens=1500
        )
        opposing_args_task = call_claude(
            PASS4B_SYSTEM,
            PASS4B_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
            max_tokens=1500
        )

        strategy, user_arguments, opposing_arguments = await asyncio.gather(
            strategy_task, user_args_task, opposing_args_task
        )

        logger.info("Advanced analysis: All 5 passes complete")

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
            }
        }

    except Exception as e:
        logger.error(f"Advanced analysis error: {e}")
        # Fallback to single-pass
        logger.info("Falling back to single-pass analysis")
        return await analyze_document_with_claude(extracted_text)


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
    "housing": [
        {"id": "PAYMENT_PLAN_PROPOSAL", "label": "Payment Plan Proposal", "desc": "Propose a structured payment plan to avoid eviction"},
        {"id": "DISPUTE_EVICTION_NOTICE", "label": "Dispute Eviction", "desc": "Challenge the legal validity of the eviction notice"},
        {"id": "DISPUTE_DAMAGES", "label": "Dispute Damages", "desc": "Challenge unfair or inflated damage claims"},
        {"id": "REQUEST_MEDIATION", "label": "Request Mediation", "desc": "Propose mediation to avoid court"}
    ],
    "employment": [
        {"id": "WRONGFUL_TERMINATION_RESPONSE", "label": "Contest Termination", "desc": "Formally contest termination and preserve rights"},
        {"id": "UNPAID_WAGES_DEMAND", "label": "Demand Unpaid Wages", "desc": "Formally demand unpaid wages before legal action"},
        {"id": "NON_COMPETE_CHALLENGE", "label": "Challenge Non-Compete", "desc": "Challenge enforceability of non-compete clause"},
        {"id": "HARASSMENT_OR_DISCRIMINATION_COMPLAINT", "label": "Report Harassment", "desc": "Document and report workplace issues"}
    ],
    "debt": [
        {"id": "DEBT_VALIDATION_REQUEST", "label": "Validate Debt", "desc": "Force collector to prove the debt is valid (FDCPA)"},
        {"id": "CEASE_AND_DESIST_COLLECTION", "label": "Cease & Desist", "desc": "Stop harassment from debt collectors"},
        {"id": "DEBT_SETTLEMENT_OFFER", "label": "Settlement Offer", "desc": "Negotiate a lower lump-sum payment"},
        {"id": "DISPUTE_CREDIT_REPORT", "label": "Dispute Credit Report", "desc": "Challenge inaccurate credit reporting"}
    ],
    "contract": [
        {"id": "CONTRACT_DISPUTE_RESPONSE", "label": "Dispute Response", "desc": "Formally contest a contract breach claim"},
        {"id": "DEMAND_LETTER_RESPONSE", "label": "Respond to Demand", "desc": "Respond professionally to a threatening letter"},
        {"id": "NDA_CLARIFICATION_REQUEST", "label": "NDA Clarification", "desc": "Seek clarification on NDA scope"},
        {"id": "SERVICE_DISPUTE", "label": "Service Dispute", "desc": "Dispute charges for services not rendered"}
    ],
    "consumer": [
        {"id": "REFUND_DEMAND", "label": "Demand Refund", "desc": "Formally demand refund from business"},
        {"id": "CHARGEBACK_SUPPORT_LETTER", "label": "Chargeback Support", "desc": "Support a credit card chargeback claim"},
        {"id": "WARRANTY_CLAIM", "label": "Warranty Claim", "desc": "Assert warranty rights"},
        {"id": "FTC_COMPLAINT_NOTICE", "label": "FTC Complaint Notice", "desc": "Notify of intent to file FTC complaint"}
    ],
    "immigration": [
        {"id": "SPONSOR_AGREEMENT_DISPUTE", "label": "Sponsor Dispute", "desc": "Address issues with employment sponsor"},
        {"id": "EMPLOYMENT_AUTHORIZATION_INQUIRY", "label": "Authorization Inquiry", "desc": "Inquire about work authorization status"},
        {"id": "VISA_CONTRACT_CLARIFICATION", "label": "Visa Clarification", "desc": "Request clarification on visa terms"},
        {"id": "STATUS_UPDATE_REQUEST", "label": "Status Update", "desc": "Request update on pending application"}
    ],
    "court": [
        {"id": "DEMAND_LETTER_RESPONSE", "label": "Respond to Demand", "desc": "Respond professionally to court notice"},
        {"id": "EXTENSION_REQUEST", "label": "Request Extension", "desc": "Request additional time to respond"},
        {"id": "DISPUTE_CLAIMS", "label": "Dispute Claims", "desc": "Formally dispute the claims made"},
        {"id": "SETTLEMENT_PROPOSAL", "label": "Settlement Proposal", "desc": "Propose out-of-court settlement"}
    ],
    "family": [
        {"id": "MEDIATION_REQUEST", "label": "Request Mediation", "desc": "Propose family mediation"},
        {"id": "CUSTODY_CONCERNS", "label": "Document Concerns", "desc": "Document custody concerns formally"},
        {"id": "SUPPORT_MODIFICATION", "label": "Modify Support", "desc": "Request modification of support terms"},
        {"id": "COMMUNICATION_GUIDELINES", "label": "Communication Request", "desc": "Establish communication guidelines"}
    ],
    "other": [
        {"id": "DEMAND_LETTER_RESPONSE", "label": "Formal Response", "desc": "Respond professionally to demands"},
        {"id": "DISPUTE_CLAIMS", "label": "Dispute Claims", "desc": "Contest the claims made against you"},
        {"id": "REQUEST_DOCUMENTATION", "label": "Request Documents", "desc": "Request supporting documentation"},
        {"id": "SETTLEMENT_PROPOSAL", "label": "Settlement Proposal", "desc": "Propose amicable resolution"}
    ]
}

class LetterRequest(BaseModel):
    case_id: str
    letter_type: str
    user_address: Optional[str] = None
    opposing_party_name: Optional[str] = None
    opposing_party_address: Optional[str] = None
    additional_context: Optional[str] = None

async def generate_letter_with_claude(letter_data: dict) -> dict:
    """Generate a response letter using Claude API"""
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
                    "max_tokens": 3000,
                    "system": LETTER_SYSTEM_PROMPT,
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
            "plan": "free",
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

# ================== Document Endpoints ==================

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    case_id: Optional[str] = Form(None),
    user_context: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Upload and analyze a document"""
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
    
    # Upload to storage
    storage_path = f"{APP_NAME}/documents/{current_user.user_id}/{uuid.uuid4()}.{file_ext}"
    try:
        put_object(storage_path, file_bytes, file.content_type or "application/octet-stream")
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        storage_path = None
    
    # Extract text
    extracted_text = ""
    if file_ext == "pdf":
        extracted_text = extract_text_from_pdf(file_bytes)
    elif file_ext in ["txt", "text"]:
        extracted_text = file_bytes.decode("utf-8", errors="ignore")
    
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
    
    # Analyze with Claude (Advanced 5-pass system)
    analysis = None
    if extracted_text:
        context_str = ""
        if user_context and user_context.strip():
            context_str = user_context.strip()[:500]
        analysis = await analyze_document_advanced(extracted_text, user_context=context_str)
    
    # Create or update case
    if case_id:
        # Update existing case
        case_doc = await db.cases.find_one({"case_id": case_id, "user_id": current_user.user_id}, {"_id": 0})
        if case_doc and analysis:
            old_score = case_doc.get("risk_score", 0)
            new_score = analysis["risk_score"]["total"]
            
            # Record risk score history
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
                        "deadline": analysis.get("deadline"),
                        "deadline_description": analysis.get("deadline_description"),
                        "financial_exposure": analysis.get("financial_exposure"),
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
                        "updated_at": now
                    },
                    "$push": {"risk_score_history": history_entry}
                }
            )
            
            # Create score update event
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
    else:
        # Create new case
        case_id = f"case_{uuid.uuid4().hex[:12]}"
        case_title = analysis.get("suggested_case_title", file.filename) if analysis else file.filename
        case_type = analysis.get("case_type", "other") if analysis else "other"
        
        case_doc = {
            "case_id": case_id,
            "user_id": current_user.user_id,
            "title": case_title,
            "type": case_type,
            "status": "active",
            "risk_score": analysis["risk_score"]["total"] if analysis else 0,
            "risk_financial": analysis["risk_score"]["financial"] if analysis else 0,
            "risk_urgency": analysis["risk_score"]["urgency"] if analysis else 0,
            "risk_legal_strength": analysis["risk_score"]["legal_strength"] if analysis else 0,
            "risk_complexity": analysis["risk_score"]["complexity"] if analysis else 0,
            "risk_score_history": [{
                "score": analysis["risk_score"]["total"],
                "financial": analysis["risk_score"]["financial"],
                "urgency": analysis["risk_score"]["urgency"],
                "legal_strength": analysis["risk_score"]["legal_strength"],
                "complexity": analysis["risk_score"]["complexity"],
                "document_name": file.filename,
                "date": now
            }] if analysis else [],
            "deadline": analysis.get("deadline") if analysis else None,
            "deadline_description": analysis.get("deadline_description") if analysis else None,
            "financial_exposure": analysis.get("financial_exposure") if analysis else None,
            "ai_summary": analysis.get("summary") if analysis else None,
            "ai_findings": analysis.get("findings", []) if analysis else [],
            "ai_next_steps": analysis.get("next_steps", []) if analysis else [],
            "recommend_lawyer": analysis.get("recommend_lawyer", False) if analysis else False,
            # Advanced analysis fields
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
            "documents_to_gather": analysis.get("documents_to_gather", []) if analysis else [],
            "document_count": 1,
            "created_at": now,
            "updated_at": now
        }
        await db.cases.insert_one(case_doc)
        
        # Update document with case_id
        await db.documents.update_one(
            {"document_id": document_id},
            {"$set": {"case_id": case_id}}
        )
        
        # Create case event
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
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {"status": "analyzed", "case_id": case_id}}
    )
    
    # Create document added event
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
        "status": "analyzed"
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
async def get_letter_types(case_type: str):
    """Get available letter types for a case type"""
    letter_types = LETTER_TYPES.get(case_type, LETTER_TYPES["other"])
    return {"case_type": case_type, "letter_types": letter_types}

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
    
    # Generate letter
    letter_result = await generate_letter_with_claude(letter_data)
    
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
    available_now: Optional[bool] = None
):
    """Get all lawyers"""
    query = {}
    if specialty:
        query["specialty"] = {"$regex": specialty, "$options": "i"}
    if available_now:
        query["availability_status"] = "now"
    
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
                    "system": OUTCOME_SYSTEM_PROMPT,
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
                        "deadline": analysis.get("deadline"),
                        "deadline_description": analysis.get("deadline_description"),
                        "financial_exposure": analysis.get("financial_exposure"),
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
        case_title = analysis.get("suggested_case_title", "Scanned Document")
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
            "deadline": analysis.get("deadline"),
            "deadline_description": analysis.get("deadline_description"),
            "financial_exposure": analysis.get("financial_exposure"),
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
    """Seed lawyer data"""
    lawyers_data = [
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
            "photo_url": "https://images.unsplash.com/photo-1585240975858-7264fd020798?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjB3b21hbiUyMGF0dG9ybmV5fGVufDB8fHx8MTc3NTc2MTA2NHww&ixlib=rb-4.1.0&q=85"
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
            "photo_url": "https://images.unsplash.com/photo-1644268756851-3f69ffb9553f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBsYXd5ZXJ8ZW58MHx8fHwxNzc1NzYxMDU5fDA&ixlib=rb-4.1.0&q=85"
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
            "photo_url": "https://images.unsplash.com/photo-1685760259914-ee8d2c92d2e0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjB3b21hbiUyMGF0dG9ybmV5fGVufDB8fHx8MTc3NTc2MTA2NHww&ixlib=rb-4.1.0&q=85"
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
            "photo_url": "https://images.unsplash.com/photo-1665224752561-85f4da9a5658?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBsYXd5ZXJ8ZW58MHx8fHwxNzc1NzYxMDU5fDA&ixlib=rb-4.1.0&q=85"
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
            "photo_url": "https://images.unsplash.com/photo-1665224752123-a2ea29dddcb2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDZ8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjB3b21hbiUyMGF0dG9ybmV5fGVufDB8fHx8MTc3NTc2MTA2NHww&ixlib=rb-4.1.0&q=85"
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
            "photo_url": "https://images.unsplash.com/photo-1762522926262-d96de462ad54?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHw0fHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhlYWRzaG90JTIwcG9ydHJhaXQlMjBsYXd5ZXJ8ZW58MHx8fHwxNzc1NzYxMDU5fDA&ixlib=rb-4.1.0&q=85"
        }
    ]
    
    # Clear existing lawyers
    await db.lawyers.delete_many({})
    
    # Insert new lawyers
    for lawyer in lawyers_data:
        await db.lawyers.insert_one(lawyer)
    
    return {"message": f"Seeded {len(lawyers_data)} lawyers"}

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
    
    # Seed lawyers if not exist
    lawyer_count = await db.lawyers.count_documents({})
    if lawyer_count == 0:
        logger.info("Seeding lawyer data...")
        await seed_lawyers()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

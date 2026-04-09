from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response, Header, Query, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import json
import pdfplumber
import io
import requests

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

# ================== Pydantic Models ==================

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

# ================== Claude AI Analysis ==================

CLAUDE_SYSTEM_PROMPT = """You are Jasper's legal analysis engine. You are NOT a lawyer and never claim to be one. You analyze legal documents for US residents and provide clear, actionable legal intelligence in plain English.

RULES:
- Never claim to provide legal advice — only legal information
- Never fabricate information not in the document
- Always cite specific clauses, amounts, dates, deadlines
- Recommend a lawyer call if Risk Score exceeds 65
- Be aware of US state law differences
- Plain English only — no legal jargon

LEGAL KNOWLEDGE BASE:
FDCPA, FLSA, FHA, FMLA, ADA, FCRA, UCC, state tenant laws (all 50 states), employment contract law (all US states), federal civil procedure, common court notice types, standard NDA and commercial contract clauses.

OUTPUT FORMAT — respond ONLY with this exact JSON, no other text:

{
  "document_type": "demand_letter|employment_contract|lease|court_notice|nda|debt_collection|other",
  "case_type": "employment|housing|contract|debt|immigration|court|consumer|family|other",
  "suggested_case_title": "Short descriptive title max 60 chars",
  "risk_score": {
    "total": 0-100,
    "financial": 0-100,
    "urgency": 0-100,
    "legal_strength": 0-100,
    "complexity": 0-100
  },
  "risk_level": "low|medium|high|critical",
  "deadline": "YYYY-MM-DD or null",
  "deadline_description": "Description of deadline or null",
  "summary": "2-3 sentences plain English summary",
  "financial_exposure": "Dollar amount e.g. up to $8,400 or null",
  "findings": [
    {
      "text": "Specific finding from the document",
      "impact": "high|medium|low",
      "type": "risk|opportunity|deadline|neutral"
    }
  ],
  "next_steps": [
    {
      "title": "Action title",
      "description": "What the user should do",
      "action_type": "book_lawyer|upload_document|draft_response|no_action"
    }
  ],
  "recommend_lawyer": true|false,
  "disclaimer": "This analysis provides legal information only, not legal advice."
}

Produce 3-6 findings and exactly 3 next steps."""

async def analyze_document_with_claude(extracted_text: str) -> dict:
    """Analyze document text using Claude API"""
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
                    "max_tokens": 2000,
                    "system": CLAUDE_SYSTEM_PROMPT,
                    "messages": [{
                        "role": "user",
                        "content": f"Analyze this legal document and return JSON only:\n\n{extracted_text[:15000]}"
                    }]
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            # Clean JSON from markdown code blocks
            text = text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        # Return default analysis on error
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

@api_router.post("/cases", response_model=Case)
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
    case_id: Optional[str] = None,
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
        result = put_object(storage_path, file_bytes, file.content_type or "application/octet-stream")
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
    
    # Analyze with Claude
    analysis = None
    if extracted_text:
        analysis = await analyze_document_with_claude(extracted_text)
    
    # Create or update case
    if case_id:
        # Update existing case
        case_doc = await db.cases.find_one({"case_id": case_id, "user_id": current_user.user_id}, {"_id": 0})
        if case_doc and analysis:
            old_score = case_doc.get("risk_score", 0)
            new_score = analysis["risk_score"]["total"]
            
            await db.cases.update_one(
                {"case_id": case_id},
                {"$set": {
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
                    "updated_at": now
                }}
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
            "deadline": analysis.get("deadline") if analysis else None,
            "deadline_description": analysis.get("deadline_description") if analysis else None,
            "financial_exposure": analysis.get("financial_exposure") if analysis else None,
            "ai_summary": analysis.get("summary") if analysis else None,
            "ai_findings": analysis.get("findings", []) if analysis else [],
            "ai_next_steps": analysis.get("next_steps", []) if analysis else [],
            "recommend_lawyer": analysis.get("recommend_lawyer", False) if analysis else False,
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

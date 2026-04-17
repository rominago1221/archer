"""Pydantic models for the Archer application."""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Any, Dict


class EmailRegister(BaseModel):
    email: str
    password: str
    name: str
    plan: str = "free"
    country: str = "US"
    jurisdiction: str = "US"
    region: Optional[str] = None
    language: Optional[str] = None
    account_type: str = "client"


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
    jurisdiction: str = "US"
    region: Optional[str] = None
    language: str = "en"
    state_of_residence: Optional[str] = None
    phone: Optional[str] = None
    account_type: str = "client"
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
    if val is None:
        return None
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        return val.get("date") or val.get("deadline") or str(val)
    return str(val)


def normalize_financial_exposure(val):
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
    # Jurisdiction system (Bug A + C)
    jurisdiction: Optional[str] = None              # effective jurisdiction used for analysis ("BE" | "US")
    detected_jurisdiction: Optional[str] = None     # auto-detected from document text
    jurisdiction_mismatch: bool = False             # detected ≠ user.country — show banner
    jurisdiction_override: bool = False             # user manually accepted the switch
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
    archer_question: Optional[dict] = None
    opposing_party_name: Optional[str] = None
    opposing_party_address: Optional[str] = None
    document_date: Optional[str] = None
    primary_amount: Optional[float] = None
    case_narrative: Optional[str] = None
    contradictions: List[dict] = []
    opposing_strategy_analysis: Optional[str] = None
    cumulative_financial_exposure: Optional[str] = None
    master_deadlines: List[dict] = []
    multi_doc_summary: Optional[str] = None
    # Dashboard V7 structured payloads (Sprint 1).
    strategy_narrative: Optional[dict] = None
    amounts: Optional[dict] = None
    analysis_depth: Optional[dict] = None
    # Sprints C/D/E — attorney portal integration
    attorney_status: Optional[str] = None      # Sprint C: waiting_assignment | assigned | unassigned_no_match
    payment_status: Optional[str] = None       # Sprint D: paid
    live_counsel_active: bool = False          # Sprint E: computed in GET /cases/:id
    # Refinement feature — post-analysis context + versioning
    current_analysis_version: int = 1
    refinement_count: int = 0
    refinement_in_progress: bool = False
    # Adversarial validation (PASS 5 + PASS 6)
    adversarial_attack: Optional[dict] = None

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
    jurisdiction: Optional[str] = None
    region: Optional[str] = None
    language: Optional[str] = None
    notif_risk_score: Optional[bool] = None
    notif_deadlines: Optional[bool] = None
    notif_calls: Optional[bool] = None
    notif_lawyers: Optional[bool] = None
    notif_promo: Optional[bool] = None
    data_sharing: Optional[bool] = None
    improve_ai: Optional[bool] = None


class LetterRequest(BaseModel):
    case_id: str
    letter_type: str
    user_address: Optional[str] = None
    opposing_party_name: Optional[str] = None
    opposing_party_address: Optional[str] = None
    additional_context: Optional[str] = None
    tone: str = "citizen"

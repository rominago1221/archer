Always reference the applicable law by name — Florida Statute § 83.56, FDCPA 15 U.S.C. § 1692, Belgian Labour Code Art. 37
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
Gratuity and end of service entitlements
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
financial exposure in specific dollar/EUR amount
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
    {{"text": "Finding title: short, specific, actionable — NEVER vague or generic", "impact": "high|medium|low", "type": "risk|opportunity|deadline|neutral", "legal_ref": "Exact statute, article, or case law citation (e.g. Fla. Stat. § 83.56(3) — Florida 3rd DCA 2023)", "jurisprudence": "Relevant case law if any", "impact_description": "What this means for the user RIGHT NOW in plain language — no legal jargon, written as if explaining to a friend", "do_now": "Exact next step the user MUST take — specific and actionable, never generic like 'consult an attorney'", "risk_if_ignored": "What happens if user does NOTHING — create urgency, explain real consequences of inaction"}}
  ],
  "recommend_lawyer": true,
  "disclaimer": "This analysis provides legal information only, not legal advice."
}}
Produce 3-6 findings. EVERY finding MUST have ALL 7 fields: text (title), impact, type, legal_ref (exact statute), jurisprudence, impact_description (plain language), do_now (specific action), risk_if_ignored (consequence of inaction). NEVER omit any field. Impact_description must be plain language. Do_now must be specific. Risk_if_ignored must create urgency."""

PASS3_PROMPT = """TASK: STRATEGIC RECOMMENDATIONS
Based on the facts and legal analysis below, provide concrete strategic recommendations. Think like a litigator preparing a client for the best outcome.

EXTRACTED FACTS:
{facts_json}

LEGAL ANALYSIS:
{analysis_json}

CRITICAL RULE — CASE STAGE DETECTION:
You MUST identify the current stage of the legal proceeding and adapt ALL recommendations accordingly:

STAGE 1 — Initial notice/violation received:
- User just received a notice (eviction, debt collection, termination, etc.)
- Actions: Respond within deadline, dispute validity, gather evidence
- Letter to: the original sender (landlord, employer, collector)

STAGE 2 — Pre-litigation / negotiation:
- Parties are negotiating, settlement offers made
- Actions: Counter-offer, document everything, prepare for court
- Letter to: opposing party or their attorney

STAGE 3 — Court proceedings filed:
- Case is before a court/judge, hearing date set
- The original sender is NO LONGER the right recipient — NEVER suggest writing to them
- Actions: Retain attorney, file court responses, prepare defense
- Letter to: Court clerk / opposing counsel
- Priority 1: Consult attorney (action_type: book_lawyer)
- Priority 2: File court response if deadline (action_type: send_letter to court)
- Priority 3: Gather defense evidence (action_type: gather_documents)

STAGE 4 — Judgment/ruling issued:
- Court has ruled
- Actions: Appeal if unfavorable (within deadline), enforce if favorable
- Letter to: Appellate court clerk

DETECTION SIGNALS:
- "court date", "hearing", "docket", "filed suit", "summons" = STAGE 3
- "notice", "demand letter", "pay or quit", "termination" = STAGE 1
- "settlement", "negotiate", "offer", "mediation" = STAGE 2
- "judgment", "ruling", "ordered", "appeal" = STAGE 4

MANDATORY: Each next_step MUST include a "recipient" field indicating WHO the letter/action is directed to.

Think through ALL possible paths:
1. Ideal outcome? 2. Fastest resolution? 3. Cheapest path? 4. Most leverage?
5. What should user do in next 24 hours? 6. What documents to gather? 7. Talk to lawyer first?

CRITICAL RULES — you MUST follow ALL of these:

RULE 1 — archer_question: You MUST generate exactly ONE specific clarifying question that references something specific found in the document. Always provide 2-4 answer options. NEVER skip this field.

RULE 2 — success_probability: Realistic outcome probabilities. No outcome below 2% or above 95%. All four values MUST sum to 100.

RULE 3 — next_steps: Each step MUST include a specific legal reference AND a recipient. NEVER suggest writing to the wrong party for the current stage.

Return ONLY this JSON — no other text:
{{
  "case_stage": "stage_1_notice|stage_2_negotiation|stage_3_court|stage_4_judgment",
  "recommended_strategy": {{
    "primary": "negotiate|dispute|comply|ignore|lawyer_immediately",
    "reasoning": "why this is best for THIS STAGE",
    "expected_outcome": "realistic outcome",
    "time_to_resolution": "3-7 days|1-4 weeks|1-3 months"
  }},
  "immediate_actions": [
    {{"action": "description", "deadline": "within 24 hours", "priority": "critical|high|medium"}}
  ],
  "next_steps": [
    {{
      "title": "Specific action verb + exact legal reference",
      "description": "Detailed description adapted to CURRENT STAGE",
      "action_type": "send_letter|book_lawyer|wait|gather_documents|no_action",
      "recipient": "Exact recipient for this stage (e.g. Court Clerk, Opposing Counsel, Landlord)",
      "letter_template": "Brief description of what letter to generate (REQUIRED for send_letter type)",
      "why_important": "Why this matters — reference specific law"
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
  "key_insight": "The most important thing the user must know in one sentence",
  "archer_question": {{
    "text": "A SPECIFIC clarifying question referencing a fact from the document (e.g. 'The notice mentions a $150 fee — did you agree to this fee in your lease?' or 'Avez-vous une preuve écrite de votre signalement de harcèlement ?')",
    "options": ["Answer option 1", "Answer option 2", "Answer option 3"]
  }}
}}
MANDATORY: archer_question MUST be present with 2-4 options. success_probability values MUST sum to 100 with no value below 2 or above 95. next_steps MUST have exactly 3 items with specific legal references."""

PASS4A_SYSTEM = """You are a senior attorney representing the user. Your job is to make the STRONGEST possible case for your client. Find every argument, every procedural defect, every legal protection that benefits your client. Be aggressive and thorough. You MUST produce exactly 4-5 strong arguments — NEVER leave arguments empty."""

PASS4A_PROMPT = """Based on these facts and legal analysis, make the strongest possible case for the user. What are their best arguments? What gives them the most leverage? What mistakes did the opposing party make?

FACTS:
{facts_json}

LEGAL ANALYSIS:
{analysis_json}

CRITICAL: You MUST generate exactly 4-5 strongest_arguments. NEVER return an empty array. Each argument must reference a specific law, statute, or legal principle. If the user's position seems weak, find procedural arguments, constitutional protections, or burden-of-proof arguments.

Return ONLY this JSON:
{{
  "strongest_arguments": [
    {{"argument": "description", "strength": "strong|medium|weak", "law_basis": "specific law/statute reference", "how_to_use": "how to use in response"}}
  ],
  "procedural_wins": ["list of procedural advantages"],
  "best_outcome_scenario": "description of best possible outcome",
  "opening_argument": "First sentence of response letter to maximize impact"
}}
MANDATORY: strongest_arguments MUST contain exactly 4-5 items. NEVER return fewer than 4."""

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
    """Make a Claude API call via Emergent integration — Sonnet for complex analysis"""
    for attempt in range(3):
        try:
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"analysis_{uuid.uuid4().hex[:8]}",
                system_message=system_prompt
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            msg = UserMessage(text=user_message + "\n\nRespond with valid JSON only. No markdown, no code blocks, just raw JSON.")
            response = await chat.send_message(msg)
            text = response.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except json.JSONDecodeError:
            if attempt < 2:
                logger.warning(f"JSON parse error from Claude, retrying (attempt {attempt+1}/3)")
                await asyncio.sleep(1)
                continue
            raise
        except Exception as e:
            if attempt < 2:
                wait = (attempt + 1) * 3
                logger.warning(f"Claude call error: {e}, retrying in {wait}s (attempt {attempt+1}/3)")
                await asyncio.sleep(wait)
                continue
            raise


async def call_claude_fast(system_prompt: str, user_message: str, max_tokens: int = 800) -> dict:
    """Fast Claude call with lower token limit — for simpler tasks (chat, Q&A, letter drafts)"""
    for attempt in range(2):
        try:
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"fast_{uuid.uuid4().hex[:8]}",
                system_message=system_prompt
            ).with_model("anthropic", "claude-4-sonnet-20250514")
            msg = UserMessage(text=user_message + "\n\nRespond with valid JSON only. No markdown, no code blocks, just raw JSON.")
            response = await chat.send_message(msg)
            text = response.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except json.JSONDecodeError:
            if attempt < 1:
                logger.warning(f"Fast call JSON parse error, retrying")
                await asyncio.sleep(1)
                continue
            raise
        except Exception as e:
            if attempt < 1:
                logger.warning(f"Fast call error: {e}, retrying")
                await asyncio.sleep(2)
                continue
            raise


import hashlib

async def get_cached_analysis(doc_hash: str) -> dict:
    """Check MongoDB for cached analysis result"""
    cached = await db.analysis_cache.find_one({"doc_hash": doc_hash}, {"_id": 0})
    if not cached:
        return None
    # Check 24h expiry
    cached_at = cached.get("cached_at", "")
    if cached_at:
        try:
            cached_time = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
            if cached_time.tzinfo is None:
                cached_time = cached_time.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - cached_time).total_seconds() > 86400:
                return None
        except Exception:
            return None
    return cached.get("result")


async def set_cached_analysis(doc_hash: str, result: dict):
    """Store analysis result in cache"""
    await db.analysis_cache.update_one(
        {"doc_hash": doc_hash},
        {"$set": {"doc_hash": doc_hash, "result": result, "cached_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )


async def fetch_courtlistener_opinions(case_type: str, state: str = "") -> list:
    """Fetch recent court opinions from CourtListener API filtered by case type AND jurisdiction"""
    type_to_query = {
        "housing": "eviction tenant landlord housing rental lease",
        "employment": "wrongful termination employment discrimination wages",
        "debt": "debt collection FDCPA creditor",
        "nda": "non-disclosure agreement trade secret",
        "contract": "breach of contract damages",
        "demand": "demand letter civil dispute",
        "court": "motion to dismiss summary judgment",
        "consumer": "consumer protection refund deceptive",
        "immigration": "immigration visa employment authorization",
        "family": "family law custody support divorce",
        "insurance": "insurance claim denial bad faith",
        "penal": "criminal defense sentencing",
        "commercial": "commercial dispute business",
    }
    query = type_to_query.get(case_type, "")
    if not query:
        return []  # Don't return random cases for unknown types
    
    # Add state/jurisdiction for targeted results
    if state:
        query = f"{state} {query}"
    
    # Map states to CourtListener court abbreviations for better filtering
    state_court_map = {
        "florida": "flaapp", "california": "cal", "new york": "ny",
        "texas": "tex", "illinois": "ill", "pennsylvania": "pa",
        "ohio": "ohio", "georgia": "ga", "michigan": "mich",
    }
    court_filter = ""
    if state:
        state_lower = state.lower().strip()
        court_filter = state_court_map.get(state_lower, "")
    
    try:
        params = {
            "type": "o",
            "q": query,
            "order_by": "dateFiled desc",
            "format": "json"
        }
        if court_filter:
            params["court"] = court_filter
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.courtlistener.com/api/rest/v4/search/",
                params=params,
                timeout=15.0,
                headers={"User-Agent": "Archer-Legal-AI/1.0"}
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
            logger.info(f"CourtListener: fetched {len(opinions)} opinions for '{query}' (state: {state or 'all'})")
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



# ═══ SHARED ANALYSIS HELPERS ═══
# Extracted from analyze_document_advanced / run_multi_doc_analysis_advanced to reduce complexity

DOC_TYPE_TO_CASE = {
    "eviction_notice": "housing", "lease": "housing",
    "employment_contract": "employment",
    "debt_collection": "debt",
    "demand_letter": "demand",
    "court_notice": "court", "nda": "nda"
}

def _build_realtime_law_context(courtlistener_opinions: list) -> str:
    """Build real-time case law context string from CourtListener opinions."""
    if not courtlistener_opinions:
        return ""
    ctx = "\n\nRECENT COURT DECISIONS (from CourtListener — real-time data):\n"
    for i, op in enumerate(courtlistener_opinions, 1):
        ctx += f"{i}. {op['case_name']} (Filed: {op['date_filed']}, Court: {op['court']})\n"
        if op.get('snippet'):
            clean_snippet = op['snippet'].replace('<em>', '').replace('</em>', '')
            ctx += f"   Excerpt: {clean_snippet}\n"
    ctx += "\nConsider these recent decisions when assessing the user's legal position.\n"
    return ctx


def _build_case_law_for_frontend(courtlistener_opinions: list) -> list:
    """Transform CourtListener opinions into frontend-ready case law dicts."""
    result = []
    for op in courtlistener_opinions:
        clean_snippet = (op.get("snippet", "") or "").replace("<em>", "").replace("</em>", "")
        result.append({
            "case_name": op["case_name"],
            "date": op["date_filed"],
            "court": op["court"],
            "ruling_summary": clean_snippet[:200] if clean_snippet else "Decision text available at source.",
            "source_url": op.get("url"),
            "cite_count": op.get("cite_count", 0)
        })
    return result


async def _validate_archer_question(strategy: dict, facts_str: str, persona: str, lang_instruction: str, language: str = "en") -> dict:
    """Ensure archer_question exists with valid text and options, retrying if needed."""
    jq = strategy.get("archer_question")
    if jq and isinstance(jq, dict) and jq.get("text") and jq.get("options") and len(jq.get("options", [])) >= 2:
        return jq

    logger.warning("Archer question missing or invalid — retrying")
    is_french = language.startswith("fr")
    is_dutch = language.startswith("nl")
    is_german = language.startswith("de")
    is_spanish = language.startswith("es")

    if is_french:
        retry_prompt = f"Sur base de cette analyse documentaire, genere UNE question specifique de clarification avec 2-4 options de reponse. La question DOIT referencer un fait precis du document. JAMAIS de question generique.\n\nFaits: {facts_str[:2000]}\n\nRetourne UNIQUEMENT JSON: {{\"text\": \"question specifique\", \"options\": [\"option1\", \"option2\", \"option3\"]}}"
        fallback = {"text": "Avez-vous d'autres documents lies a cette affaire ?", "options": ["Oui, j'ai d'autres documents", "Non, c'est tout", "Je ne suis pas sur"]}
    elif is_dutch:
        retry_prompt = f"Op basis van deze documentanalyse, genereer EEN specifieke verduidelijkingsvraag met 2-4 antwoordopties.\n\nFeiten: {facts_str[:2000]}\n\nRetourneer ALLEEN JSON: {{\"text\": \"specifieke vraag\", \"options\": [\"optie1\", \"optie2\", \"optie3\"]}}"
        fallback = {"text": "Heeft u andere documenten met betrekking tot deze zaak?", "options": ["Ja, ik heb meer documenten", "Nee, dat is alles", "Ik weet het niet zeker"]}
    elif is_german:
        retry_prompt = f"Basierend auf dieser Dokumentenanalyse, generiere EINE spezifische Klarungsfrage mit 2-4 Antwortoptionen.\n\nFakten: {facts_str[:2000]}\n\nGib NUR JSON zuruck: {{\"text\": \"spezifische Frage\", \"options\": [\"Option1\", \"Option2\", \"Option3\"]}}"
        fallback = {"text": "Haben Sie weitere Dokumente zu diesem Fall?", "options": ["Ja, ich habe weitere Dokumente", "Nein, das ist alles", "Ich bin nicht sicher"]}
    elif is_spanish:
        retry_prompt = f"Basado en este analisis del documento, genera UNA pregunta de clarificacion especifica con 2-4 opciones de respuesta.\n\nHechos: {facts_str[:2000]}\n\nDevuelve SOLO JSON: {{\"text\": \"pregunta especifica\", \"options\": [\"opcion1\", \"opcion2\", \"opcion3\"]}}"
        fallback = {"text": "Tiene otros documentos relacionados con este caso?", "options": ["Si, tengo mas documentos", "No, eso es todo", "No estoy seguro"]}
    else:
        retry_prompt = f"Based on this document analysis, generate ONE specific clarifying question with 2-4 answer options. The question must reference a specific fact from the document. NEVER a generic question.\n\nFacts: {facts_str[:2000]}\n\nReturn ONLY JSON: {{\"text\": \"specific question\", \"options\": [\"option1\", \"option2\", \"option3\"]}}"
        fallback = {"text": "Do you have any additional documents related to this case?", "options": ["Yes, I have more documents", "No, this is everything", "I'm not sure"]}

    try:
        await asyncio.sleep(1)
        jq_retry = await call_claude(persona, retry_prompt, max_tokens=500)
        if jq_retry and jq_retry.get("text") and jq_retry.get("options") and len(jq_retry.get("options", [])) >= 2:
            return jq_retry
    except Exception as e:
        logger.error(f"Archer question retry failed: {e}")

    return fallback


async def _validate_user_arguments(user_arguments: dict, facts_str: str, analysis_str: str, lang_instruction: str) -> dict:
    """Ensure user arguments contain at least 3 strongest_arguments, retrying if needed."""
    ua = user_arguments.get("strongest_arguments", []) if isinstance(user_arguments, dict) else []
    if len(ua) >= 3:
        return user_arguments

    logger.warning(f"User arguments too few ({len(ua)}) — retrying Pass 4A")
    try:
        await asyncio.sleep(1)
        ua_retry = await call_claude(
            PASS4A_SYSTEM + lang_instruction,
            PASS4A_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
            max_tokens=1500
        )
        if isinstance(ua_retry, dict) and len(ua_retry.get("strongest_arguments", [])) >= 3:
            return ua_retry
    except Exception as e:
        logger.error(f"User arguments retry failed: {e}")

    return user_arguments


async def _validate_belgian_user_arguments(user_arguments: dict, facts_str: str, analysis_str: str, lang_instruction: str) -> dict:
    """Ensure Belgian user arguments contain at least 3 strongest_arguments, retrying with BE prompts if needed.
    Also normalizes legacy 'strong_arguments' field to 'strongest_arguments'."""
    if isinstance(user_arguments, dict):
        # Normalize: if strong_arguments exists but strongest_arguments doesn't, copy it
        if "strong_arguments" in user_arguments and "strongest_arguments" not in user_arguments:
            user_arguments["strongest_arguments"] = user_arguments.pop("strong_arguments")

    ua = user_arguments.get("strongest_arguments", []) if isinstance(user_arguments, dict) else []
    if len(ua) >= 3:
        return user_arguments

    logger.warning(f"Belgian user arguments too few ({len(ua)}) — retrying Pass 4A with BE prompts")
    try:
        await asyncio.sleep(1)
        ua_retry = await call_claude(
            BE_PASS4A_SYSTEM + lang_instruction,
            BE_PASS4A_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str),
            max_tokens=1500
        )
        if isinstance(ua_retry, dict):
            if "strong_arguments" in ua_retry and "strongest_arguments" not in ua_retry:
                ua_retry["strongest_arguments"] = ua_retry.pop("strong_arguments")
            if len(ua_retry.get("strongest_arguments", [])) >= 3:
                return ua_retry
    except Exception as e:
        logger.error(f"Belgian user arguments retry failed: {e}")

    return user_arguments



def _validate_success_probability(strategy: dict, legal_analysis: dict) -> dict:
    """Clamp success probability to sum=100, each value 2-95%, with risk-based fallback."""
    sp = strategy.get("success_probability", {})
    if not isinstance(sp, dict):
        sp = {}

    keys = ["full_resolution_in_favor", "negotiated_settlement", "partial_loss", "full_loss"]
    total = sum(sp.get(k, 0) for k in keys)

    if total == 0 or any(sp.get(k, 0) == 0 for k in keys):
        # Risk-based fallback
        risk_score = legal_analysis.get("risk_score", {})
        risk_total = risk_score.get("total", 50) if isinstance(risk_score, dict) else 50
        if risk_total <= 30:
            return {"full_resolution_in_favor": 55, "negotiated_settlement": 30, "partial_loss": 10, "full_loss": 5}
        elif risk_total <= 60:
            return {"full_resolution_in_favor": 25, "negotiated_settlement": 45, "partial_loss": 22, "full_loss": 8}
        else:
            return {"full_resolution_in_favor": 10, "negotiated_settlement": 35, "partial_loss": 35, "full_loss": 20}

    # Clamp each value
    for k in keys:
        sp[k] = max(2, min(95, sp.get(k, 25)))
    clamped_total = sum(sp[k] for k in keys)
    if clamped_total != 100:
        sp[keys[1]] = sp[keys[1]] + (100 - clamped_total)
    return sp


def _build_standard_analysis_result(
    doc_type: str, inferred_case_type: str, legal_analysis: dict,
    strategy: dict, facts: dict, user_arguments: dict,
    opposing_arguments: dict, recent_case_law: list, now_date: str
) -> dict:
    """Build the standard result dict shared by single-doc and multi-doc analysis."""
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
        "next_steps": strategy.get("next_steps", legal_analysis.get("findings", [])[:3]),
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
        "archer_question": strategy.get("archer_question"),
        "battle_preview": {
            "user_side": user_arguments,
            "opposing_side": opposing_arguments
        },
        "recent_case_law": recent_case_law,
        "case_law_updated": now_date
    }


def _ensure_contract_guard_fields(result: dict) -> dict:
    """Ensure all required Contract Guard fields exist with defaults."""
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
    for field in ("red_lines", "negotiation_points", "missing_protections"):
        if field not in result:
            result[field] = []
    return result


BE_DOC_TYPE_TO_CASE = {
    "licenciement": "employment", "contrat_travail": "employment", "c4": "employment",
    "bail": "housing", "avis_resiliation_bail": "housing",
    "mise_en_demeure": "debt", "facture": "debt",
    "nda": "nda", "jugement": "court", "lettre_huissier": "court"
}


def _build_belgian_analysis_result(
    doc_type: str, inferred_case_type: str, legal_analysis: dict,
    strategy: dict, facts: dict, user_arguments: dict,
    opposing_arguments: dict, detected_region: str, language: str, now_date: str
) -> dict:
    """Build the standard result dict for Belgian single/multi-doc analysis."""
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
        "archer_question": strategy.get("archer_question"),
        "battle_preview": {"user_side": user_arguments, "opposing_side": opposing_arguments},
        "recent_case_law": [],
        "case_law_updated": now_date,
        "country": "BE",
        "region": detected_region,
        "language": language
    }




async def analyze_document_advanced(extracted_text: str, user_context: str = "", language: str = "en") -> dict:
    """Advanced 5-pass analysis system with real-time jurisprudence"""
    # Fix 5: Check cache first
    doc_hash = hashlib.sha256((extracted_text[:5000] + user_context + language).encode()).hexdigest()
    cached = await get_cached_analysis(doc_hash)
    if cached:
        logger.info("Advanced analysis: Returning cached result")
        return cached

    try:
        context_supplement = ""
        if user_context:
            context_supplement = f"\n\nADDITIONAL CONTEXT PROVIDED BY THE USER:\n{user_context}\n(Use this context to better understand the situation, identify the user's role, and extract more accurate facts.)"

        lang_instruction = get_language_instruction(language)
        persona = SENIOR_ATTORNEY_PERSONA + lang_instruction

        # PASS 1: Fact extraction
        logger.info("Advanced analysis: Pass 1 — Fact extraction")
        facts = await call_claude(persona, PASS1_PROMPT.format(document_text=extracted_text[:15000]) + context_supplement)

        # Load jurisprudence + real-time case law
        doc_type = facts.get("document_type", "other")
        inferred_case_type = DOC_TYPE_TO_CASE.get(doc_type, "other")
        jurisprudence_text = load_jurisprudence(inferred_case_type, doc_type)

        logger.info("Advanced analysis: Fetching real-time case law from CourtListener")
        state = facts.get("jurisdiction", facts.get("state", ""))
        courtlistener_opinions = await fetch_courtlistener_opinions(inferred_case_type, state)
        realtime_law_context = _build_realtime_law_context(courtlistener_opinions)

        # PASS 2: Legal analysis
        logger.info("Advanced analysis: Pass 2 — Legal analysis")
        legal_analysis = await call_claude(
            persona,
            PASS2_PROMPT.format(facts_json=json.dumps(facts, indent=2), jurisprudence_section=jurisprudence_text + realtime_law_context)
            + "\n\nIMPORTANT: Use the provided recent court decisions and jurisprudence to inform your analysis. Cite any relevant rulings in your findings.",
            max_tokens=2000
        )

        facts_str = json.dumps(facts, indent=2)
        analysis_str = json.dumps(legal_analysis, indent=2)

        # PASS 3 + 4A + 4B — RUN IN PARALLEL (60% faster)
        logger.info("Advanced analysis: Pass 3+4A+4B — Running in parallel")
        strategy, user_arguments, opposing_arguments = await asyncio.gather(
            call_claude(persona, PASS3_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str), max_tokens=1500),
            call_claude(PASS4A_SYSTEM + lang_instruction, PASS4A_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str), max_tokens=800),
            call_claude(PASS4B_SYSTEM + lang_instruction, PASS4B_PROMPT.format(facts_json=facts_str, analysis_json=analysis_str), max_tokens=800),
        )

        logger.info("Advanced analysis: All 5 passes complete")

        # ═══ VALIDATION — enforce global rules ═══
        strategy["archer_question"] = await _validate_archer_question(strategy, facts_str, persona, lang_instruction, language=language)
        user_arguments = await _validate_user_arguments(user_arguments, facts_str, analysis_str, lang_instruction)
        strategy["success_probability"] = _validate_success_probability(strategy, legal_analysis)

        # Build result
        recent_case_law = _build_case_law_for_frontend(courtlistener_opinions)
        now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        result = _build_standard_analysis_result(
            doc_type, inferred_case_type, legal_analysis, strategy, facts,
            user_arguments, opposing_arguments, recent_case_law, now_date
        )

        # Cache the result
        await set_cached_analysis(doc_hash, result)
        return result

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
    """Return default analysis on error — indicates AI analysis failed, not placeholder content"""
    return {
        "document_type": "other",
        "case_type": "other",
        "suggested_case_title": "Document Analysis",
        "risk_score": {"total": 0, "financial": 0, "urgency": 0, "legal_strength": 0, "complexity": 0},
        "risk_level": "unknown",
        "deadline": None,
        "deadline_description": None,
        "summary": "AI analysis could not be completed. Please re-upload or try again.",
        "financial_exposure": None,
        "findings": [{"text": "AI analysis failed — please re-upload this document or click 'Re-analyze' to retry.", "impact": "high", "type": "risk"}],
        "next_steps": [
            {"title": "Re-analyze this document", "description": "Click re-analyze to retry the AI analysis on this document", "action_type": "no_action"},

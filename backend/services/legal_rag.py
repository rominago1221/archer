"""Belgian legal RAG — in-memory cosine retrieval on top of legal_db_v2.

Loads enriched+embedded legal documents from the MongoDB `legal_db_v2` collection
into RAM on first call, embeds the analysis query via Voyage AI, ranks by
cosine similarity, filters by jurisdiction/case_type, and returns a structured
result split into statutes vs. jurisprudence.

Usage from an analysis pipeline:

    from services.legal_rag import retrieve_relevant_law, format_rag_block

    rag = await retrieve_relevant_law(
        facts=facts_dict, jurisdiction="BE", language="fr",
        case_type="eviction", case_id=case_id,
    )
    if rag:
        prompt += format_rag_block(rag, language)

The integration is BE-only (the corpus is Belgian). For US cases we return None.
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Optional

import httpx
import numpy as np

logger = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────────────────
VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"
VOYAGE_MODEL = "voyage-3-large"
EMBEDDING_DIM = 1024
TOP_K_INITIAL = 20          # fetch wider than needed, then filter
TOP_K_FINAL = 10            # 5 statutes + 5 jurisprudence after split
MIN_COSINE_SCORE = 0.35     # below this the retrieval is noise — drop


# ─── In-memory cache ─────────────────────────────────────────────────────
@dataclass
class _RagCache:
    loaded: bool = False
    vectors: Optional[np.ndarray] = None              # (N, D) float32
    docs: list[dict] = field(default_factory=list)   # aligned with vectors rows
    loaded_at: float = 0.0
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


_cache = _RagCache()


async def _ensure_loaded(db) -> bool:
    """Populate the in-memory cache from legal_db_v2. Safe to call repeatedly.
    Returns True if the cache has any data, False if the collection is empty/missing."""
    if _cache.loaded:
        return _cache.vectors is not None and _cache.vectors.shape[0] > 0

    async with _cache.lock:
        if _cache.loaded:
            return _cache.vectors is not None and _cache.vectors.shape[0] > 0
        try:
            projection = {
                "_id": 0, "doc_id": 1, "source": 1, "source_type": 1,
                "jurisdiction": 1, "language": 1,
                "code_full_name": 1, "article_number": 1,
                "ecli": 1, "court": 1, "court_label": 1, "case_date": 1,
                "case_number": 1, "legal_domain": 1,
                "title": 1, "summary": 1, "key_principles": 1,
                "case_types_applicable": 1, "key_concepts": 1,
                "verified_url": 1, "embedding_vector": 1,
            }
            docs = []
            vectors = []
            async for row in db.legal_db_v2.find({}, projection):
                vec = row.pop("embedding_vector", None)
                if not vec:
                    continue
                vectors.append(vec)
                docs.append(row)
            if not vectors:
                logger.warning("legal_rag: legal_db_v2 collection empty or no embeddings")
                _cache.loaded = True
                return False
            arr = np.asarray(vectors, dtype=np.float32)
            # Pre-normalise rows so cosine sim = dot product.
            norms = np.linalg.norm(arr, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            arr = arr / norms
            _cache.vectors = arr
            _cache.docs = docs
            _cache.loaded_at = time.time()
            _cache.loaded = True
            logger.info(f"legal_rag: loaded {len(docs)} docs ({arr.shape[1]}d) into memory")
            return True
        except Exception as e:
            logger.exception(f"legal_rag: cache load failed — {e}")
            _cache.loaded = True  # stop retrying this request
            return False


# ─── Query builder ───────────────────────────────────────────────────────
def _build_query_from_facts(facts: dict, case_type: str) -> str:
    """Assemble a semantic query string from PASS 1 extracted facts."""
    # French-by-default phrasing (corpus is FR-weighted).
    type_doc = facts.get("type_document") or facts.get("document_type") or ""
    parties = facts.get("parties") or {}
    opp = (parties.get("partie_adverse") if isinstance(parties, dict) else None) or \
          (parties.get("opposing_party") if isinstance(parties, dict) else None) or {}
    opp_name = (opp.get("nom") if isinstance(opp, dict) else None) or \
               (opp.get("name") if isinstance(opp, dict) else None) or ""
    refs = facts.get("references_legales_citees") or facts.get("legal_references") or []
    ref_snippets = []
    for r in refs[:6]:
        if isinstance(r, dict):
            ref_snippets.append(r.get("reference") or r.get("description") or "")
        elif isinstance(r, str):
            ref_snippets.append(r)
    elements_manquants = facts.get("elements_manquants") or facts.get("missing_elements") or []
    claims = facts.get("allegations_partie_adverse") or facts.get("claims_made") or []
    claim_snippets = []
    for c in claims[:4]:
        if isinstance(c, dict):
            claim_snippets.append(c.get("allegation") or c.get("claim") or "")

    parts = [
        f"Type de dossier: {case_type}.",
        f"Type de document: {type_doc}." if type_doc else "",
        f"Partie adverse: {opp_name}." if opp_name else "",
        "Allégations: " + "; ".join(s for s in claim_snippets if s) if claim_snippets else "",
        "Références citées: " + "; ".join(s for s in ref_snippets if s) if ref_snippets else "",
        "Éléments manquants: " + "; ".join(s for s in elements_manquants[:5] if isinstance(s, str)) if elements_manquants else "",
    ]
    q = " ".join(p for p in parts if p).strip()
    return q or f"Affaire en droit belge, catégorie {case_type}."


# ─── Voyage embedding ────────────────────────────────────────────────────
async def _voyage_embed_query(text: str) -> Optional[np.ndarray]:
    api_key = os.environ.get("VOYAGE_API_KEY")
    if not api_key:
        logger.warning("legal_rag: VOYAGE_API_KEY missing — skipping retrieval")
        return None
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            r = await client.post(
                VOYAGE_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"input": [text], "model": VOYAGE_MODEL, "input_type": "query"},
            )
            r.raise_for_status()
            data = r.json()
            vec = np.asarray(data["data"][0]["embedding"], dtype=np.float32)
            n = np.linalg.norm(vec)
            if n > 0:
                vec = vec / n
            return vec
        except Exception as e:
            logger.error(f"legal_rag: voyage embed failed — {e}")
            return None


# ─── Retrieval ───────────────────────────────────────────────────────────
def _cosine_topk(query: np.ndarray, k: int) -> list[tuple[int, float]]:
    sims = _cache.vectors @ query  # already normalised on both sides
    if k >= sims.shape[0]:
        idx = np.argsort(-sims)
    else:
        idx = np.argpartition(-sims, k)[:k]
        idx = idx[np.argsort(-sims[idx])]
    return [(int(i), float(sims[i])) for i in idx]


async def retrieve_relevant_law(
    *,
    facts: dict,
    jurisdiction: str,
    language: str,
    case_type: str,
    case_id: Optional[str] = None,
    db=None,
) -> Optional[dict]:
    """Retrieve the most relevant Belgian statutes + jurisprudence for this case.

    Returns `None` when:
      - jurisdiction is not 'BE'
      - corpus not loaded or VOYAGE_API_KEY missing
      - no retrieval scored above MIN_COSINE_SCORE

    Side-effect: writes one row to db.rag_retrievals for post-hoc analytics.
    """
    if (jurisdiction or "").upper() != "BE":
        return None
    if db is None:
        from db import db as _db
        db = _db

    has_data = await _ensure_loaded(db)
    if not has_data:
        return None

    query_text = _build_query_from_facts(facts, case_type)
    q_vec = await _voyage_embed_query(query_text)
    if q_vec is None:
        return None

    ranked = _cosine_topk(q_vec, k=TOP_K_INITIAL)
    # Split by type + filter by case_type match + min score.
    articles: list[dict] = []
    jurisprudences: list[dict] = []
    for idx, score in ranked:
        if score < MIN_COSINE_SCORE:
            continue
        doc = _cache.docs[idx]
        ct_tags = doc.get("case_types_applicable") or []
        # Soft filter: if case_type is in the doc's applicable list, boost. If the
        # doc has NO tags we still let it through (corpus gap). If tags exist and
        # case_type absent → drop unless the cosine is very strong.
        if ct_tags and case_type not in ct_tags and score < 0.55:
            continue
        entry = {
            "doc_id": doc["doc_id"], "score": round(score, 4),
            "title": doc.get("title", ""), "summary": doc.get("summary", ""),
            "key_principles": doc.get("key_principles", []),
            "verified_url": doc.get("verified_url", ""),
            "language": doc.get("language", "fr"),
        }
        if (doc.get("source_type") or "") == "case_law":
            entry.update({
                "court_label": doc.get("court_label", ""),
                "case_date": doc.get("case_date", ""),
                "case_number": doc.get("case_number", ""),
                "legal_domain": doc.get("legal_domain", ""),
            })
            if len(jurisprudences) < 5:
                jurisprudences.append(entry)
        else:
            entry.update({
                "code_full_name": doc.get("code_full_name", ""),
                "article_number": doc.get("article_number", ""),
            })
            if len(articles) < 5:
                articles.append(entry)
        if len(articles) >= 5 and len(jurisprudences) >= 5:
            break

    top_score = (ranked[0][1] if ranked else 0.0)
    result = {
        "articles": articles,
        "jurisprudences": jurisprudences,
        "metadata": {
            "query_text": query_text,
            "top_score": round(top_score, 4),
            "case_type": case_type,
            "language": language,
        },
    }

    # Best-effort analytics log.
    try:
        from datetime import datetime, timezone
        from uuid import uuid4
        await db.rag_retrievals.insert_one({
            "retrieval_id": f"rag_{uuid4().hex[:12]}",
            "case_id": case_id,
            "jurisdiction": jurisdiction,
            "case_type": case_type,
            "language": language,
            "query_text": query_text[:500],
            "top_score": top_score,
            "articles_count": len(articles),
            "jurisprudences_count": len(jurisprudences),
            "retrieved_doc_ids": [a["doc_id"] for a in articles] + [j["doc_id"] for j in jurisprudences],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        logger.exception("legal_rag: failed to log retrieval")

    if not articles and not jurisprudences:
        return None
    return result


# ─── Prompt formatter ────────────────────────────────────────────────────
def format_rag_block(rag: dict, language: str = "fr") -> str:
    """Format the retrieval result as a prompt block injected before PASS 2.
    The caller appends this block to the PASS 2 user prompt."""
    lang_fr = (language or "fr").lower().startswith(("fr", "nl", "de"))
    if lang_fr:
        header = ("\n\nJURISPRUDENCE ET LÉGISLATION PERTINENTES (vérifiées par Archer, "
                  "à utiliser en PRIORITÉ pour tes citations) :\n")
        articles_h = "ARTICLES :"
        jur_h = "JURISPRUDENCES :"
        rule = (
            "\nRÈGLE CRITIQUE — NON-NÉGOCIABLE :\n"
            "• Cite UNIQUEMENT les articles et jurisprudences listés ci-dessus dans tes findings et ton analyse.\n"
            "• Si AUCUN ne s'applique réellement au cas, dis-le explicitement plutôt que d'inventer.\n"
            "• Toute citation hors de cette liste sera détectée comme HALLUCINATION par le contrôle qualité Archer.\n"
        )
    else:
        header = ("\n\nRELEVANT BELGIAN STATUTES AND CASE LAW (verified by Archer, "
                  "use these as PRIORITY citations):\n")
        articles_h = "STATUTES:"
        jur_h = "CASE LAW:"
        rule = (
            "\nCRITICAL RULE — NON-NEGOTIABLE:\n"
            "• Cite ONLY the articles and cases listed above in your findings and analysis.\n"
            "• If none actually apply, say so explicitly rather than inventing.\n"
            "• Any citation outside this list is flagged as HALLUCINATION by Archer quality control.\n"
        )

    lines = [header]
    if rag.get("articles"):
        lines.append(articles_h)
        for i, a in enumerate(rag["articles"], 1):
            title = a.get("title") or a.get("code_full_name") or "(sans titre)"
            ref = f"{a.get('code_full_name', '')} — Art. {a.get('article_number', '')}".strip(" —")
            lines.append(f"{i}. {ref}")
            if title and title not in ref:
                lines.append(f"   Titre : {title}")
            if a.get("summary"):
                lines.append(f"   Résumé : {a['summary'][:600]}")
            if a.get("key_principles"):
                lines.append(f"   Principes : {' ; '.join(a['key_principles'][:3])}")
            if a.get("verified_url"):
                lines.append(f"   URL : {a['verified_url']}")
            lines.append("")
    if rag.get("jurisprudences"):
        lines.append(jur_h)
        for i, j in enumerate(rag["jurisprudences"], 1):
            header_line = f"{j.get('court_label', '')}, {j.get('case_date', '')}".strip(", ")
            lines.append(f"{i}. {header_line}")
            if j.get("case_number"):
                lines.append(f"   Affaire : {j['case_number']}")
            if j.get("summary"):
                lines.append(f"   Résumé : {j['summary'][:600]}")
            if j.get("key_principles"):
                lines.append(f"   Principes : {' ; '.join(j['key_principles'][:3])}")
            if j.get("verified_url"):
                lines.append(f"   URL : {j['verified_url']}")
            lines.append("")
    lines.append(rule)
    return "\n".join(lines)


# ─── Cache control (admin) ───────────────────────────────────────────────
async def reload_cache(db) -> dict:
    """Force-refresh the in-memory cache. Returns stats."""
    _cache.loaded = False
    _cache.vectors = None
    _cache.docs = []
    has_data = await _ensure_loaded(db)
    return {
        "loaded": has_data,
        "count": len(_cache.docs),
        "dim": int(_cache.vectors.shape[1]) if _cache.vectors is not None else 0,
        "loaded_at": _cache.loaded_at,
    }


async def cache_stats(db) -> dict:
    await _ensure_loaded(db)
    return {
        "loaded": _cache.loaded and _cache.vectors is not None,
        "count": len(_cache.docs),
        "dim": int(_cache.vectors.shape[1]) if _cache.vectors is not None else 0,
        "loaded_at": _cache.loaded_at,
    }

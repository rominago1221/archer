"""Enrich raw scraped legal documents with Claude Opus 4.7.

Reads JSON files from `raw_documents/{source}/*.json`, sends each through
Opus 4.7 with a strict schema prompt, and writes the enriched JSON to
`enriched_documents/{source}/*.json`.

The enrichment is idempotent: if an enriched file already exists for a
given doc_id, we skip it. Resumable.

Usage:
  python enrich_documents.py loi_1978_contrat_travail --limit 10
  python enrich_documents.py loi_1978_contrat_travail --workers 5
  python enrich_documents.py loi_1978_contrat_travail        # full source
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

import httpx
from tenacity import (
    AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_exponential,
)

from dotenv import load_dotenv

# Load backend/.env so ANTHROPIC_API_KEY is available.
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger("enrich")

MODEL = "claude-opus-4-7"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
OUTPUT_SCHEMA = {
    "title": "concise descriptive title in the doc language (max 100 chars)",
    "summary": "200-word clear summary in French capturing key provisions & implications",
    "key_principles": ["3-5 essential legal principles as short bullets"],
    "case_types_applicable": [
        "which of Archer's 18 case_types: eviction | real_estate | "
        "wrongful_termination | severance | workplace_discrimination | harassment | "
        "consumer_disputes | debt | insurance_disputes | tax_disputes | identity_theft | "
        "medical_malpractice | disability_claims | family | criminal | immigration | traffic | other"
    ],
    "key_concepts": ["legal concepts mentioned (preavis, motif grave, CCT, ...)"],
    "related_articles": ["article references cited inside the text, e.g. 'Art. 35', 'CCT 109'"],
    "complexity_level": "basic | intermediate | advanced",
    "language_detected": "fr | nl | de",
}


ENRICHMENT_SYSTEM = """You are a Belgian legal database curator. Your job is to produce a structured JSON enrichment of raw legal texts (statute articles, law provisions, case law excerpts) so they can be indexed for semantic retrieval.

Rules:
- Summarize faithfully. Do not invent facts, articles, or interpretations not present in the source.
- Write the summary in French regardless of the source language (Belgian legal vocabulary is primarily French in cross-jurisdiction contexts).
- Identify the case_types from the fixed 18-value Archer taxonomy — pick only those that are legitimately relevant (often just 1-3, sometimes 0 → return empty list).
- Return ONLY valid JSON, no prose, no markdown fences, nothing else.
"""


@dataclass
class EnrichedDoc:
    doc_id: str
    source: str
    source_type: str
    jurisdiction: str
    language: str
    code_full_name: str
    article_number: str
    title: str
    summary: str
    key_principles: list
    case_types_applicable: list
    key_concepts: list
    related_articles: list
    complexity_level: str
    language_detected: str
    verified_url: str
    raw_text_preview: str    # first 400 chars of raw for auditing
    scraped_at: str
    enriched_at: str
    enrichment_model: str


def _build_prompt(raw_doc: dict) -> str:
    is_case_law = (raw_doc.get("source_type") or "statute") == "case_law"
    if is_case_law:
        body = raw_doc.get("summary_fiche") or raw_doc.get("raw_text", "")
        meta = (
            f"- source: {raw_doc.get('source', '')}\n"
            f"- source_type: case_law\n"
            f"- ECLI: {raw_doc.get('ecli', '')}\n"
            f"- court: {raw_doc.get('court_label') or raw_doc.get('court', '')}\n"
            f"- case_date: {raw_doc.get('case_date', '')}\n"
            f"- case_number: {raw_doc.get('case_number', '')}\n"
            f"- legal_domain: {raw_doc.get('legal_domain', '')}\n"
            f"- thesaurus: {', '.join(raw_doc.get('thesaurus') or [])}\n"
            f"- language_hint: {raw_doc.get('language', 'fr')}\n"
            f"- verified_url: {raw_doc.get('verified_url', '')}"
        )
    else:
        body = raw_doc.get("raw_text", "")
        meta = (
            f"- source: {raw_doc.get('source', '')}\n"
            f"- source_type: statute\n"
            f"- code_full_name: {raw_doc.get('code_full_name', '')}\n"
            f"- article_number: {raw_doc.get('article_number', '')}\n"
            f"- language_hint: {raw_doc.get('language', 'fr')}\n"
            f"- verified_url: {raw_doc.get('verified_url', '')}"
        )
    return f"""RAW LEGAL TEXT TO ENRICH:
---
{body[:8000]}
---

METADATA:
{meta}

REQUIRED JSON OUTPUT SCHEMA:
{json.dumps(OUTPUT_SCHEMA, ensure_ascii=False, indent=2)}

Return ONLY the JSON object matching this schema. No prose, no markdown."""


def _api_key() -> str:
    key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not set in env")
    return key


async def _call_opus(client: httpx.AsyncClient, raw_doc: dict) -> dict:
    """Single Opus call. Raises on non-retryable errors."""
    body = {
        "model": MODEL,
        "max_tokens": 2500,
        "system": ENRICHMENT_SYSTEM,
        "messages": [{"role": "user", "content": _build_prompt(raw_doc)}],
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": _api_key(),
        "anthropic-version": "2023-06-01",
    }
    r = await client.post(ANTHROPIC_URL, headers=headers, json=body, timeout=90.0)
    if r.status_code == 429 or 500 <= r.status_code < 600:
        raise httpx.HTTPStatusError(f"retryable {r.status_code}", request=r.request, response=r)
    r.raise_for_status()
    data = r.json()
    text = data["content"][0]["text"].strip()
    # Strip markdown fences if the model sneaks any in.
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)


async def enrich_one(client: httpx.AsyncClient, raw_path: Path, out_dir: Path,
                     sem: asyncio.Semaphore) -> tuple[str, str]:
    """Returns (doc_id, status) where status ∈ {'ok','skipped','error:<msg>'}."""
    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    doc_id = raw["doc_id"]
    out_path = out_dir / f"{doc_id}.json"
    if out_path.exists():
        return doc_id, "skipped"

    async with sem:
        try:
            async for attempt in AsyncRetrying(
                reraise=True,
                stop=stop_after_attempt(4),
                wait=wait_exponential(multiplier=2, min=3, max=40),
                retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException, json.JSONDecodeError)),
            ):
                with attempt:
                    enriched = await _call_opus(client, raw)
        except Exception as e:
            return doc_id, f"error: {type(e).__name__}: {str(e)[:200]}"

    # Preserve case-law-specific metadata (ecli, court, ...) by merging into the
    # same flat JSON shape. Statute-specific fields default to "" for case_law
    # docs and vice-versa.
    raw_text_preview = (raw.get("raw_text") or raw.get("summary_fiche") or "")[:400]
    enriched_row = {
        "doc_id": doc_id,
        "source": raw.get("source", ""),
        "source_type": raw.get("source_type", "statute"),
        "jurisdiction": "BE",
        "language": raw.get("language", "fr"),
        "code_full_name": raw.get("code_full_name", ""),
        "article_number": raw.get("article_number", ""),
        "ecli": raw.get("ecli", ""),
        "court": raw.get("court", ""),
        "court_label": raw.get("court_label", ""),
        "case_date": raw.get("case_date", ""),
        "case_number": raw.get("case_number", ""),
        "chamber": raw.get("chamber", ""),
        "legal_domain": raw.get("legal_domain", ""),
        "title": (enriched.get("title") or "")[:200],
        "summary": enriched.get("summary", ""),
        "key_principles": list(enriched.get("key_principles", []))[:8],
        "case_types_applicable": list(enriched.get("case_types_applicable", []))[:8],
        "key_concepts": list(enriched.get("key_concepts", []))[:12],
        "related_articles": list(enriched.get("related_articles", []))[:20],
        "complexity_level": enriched.get("complexity_level", "intermediate"),
        "language_detected": enriched.get("language_detected", raw.get("language", "fr")),
        "verified_url": raw.get("verified_url", ""),
        "raw_text_preview": raw_text_preview,
        "scraped_at": raw.get("scraped_at", ""),
        "enriched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "enrichment_model": MODEL,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(enriched_row, ensure_ascii=False, indent=2), encoding="utf-8")
    return doc_id, "ok"


async def run(source: str, limit: Optional[int], workers: int) -> None:
    root = Path(__file__).parent
    raw_dir = root / "raw_documents" / source
    out_dir = root / "enriched_documents" / source
    if not raw_dir.is_dir():
        raise SystemExit(f"no raw_documents/{source} — did you scrape it?")

    files = sorted(raw_dir.glob("*.json"))
    if limit:
        files = files[:limit]
    logger.info(f"enriching {len(files)} raw docs from {raw_dir} (workers={workers})")

    sem = asyncio.Semaphore(workers)
    started = time.time()
    async with httpx.AsyncClient() as client:
        tasks = [enrich_one(client, p, out_dir, sem) for p in files]
        results = await asyncio.gather(*tasks)
    elapsed = time.time() - started

    ok = sum(1 for _, s in results if s == "ok")
    skipped = sum(1 for _, s in results if s == "skipped")
    errors = [(d, s) for d, s in results if s.startswith("error")]
    logger.info(f"done in {elapsed:.1f}s — ok={ok} skipped={skipped} errors={len(errors)}")
    if errors:
        for d, s in errors[:10]:
            logger.error(f"  ✗ {d}: {s}")


def _cli() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("source", help="source folder name under raw_documents/")
    p.add_argument("--limit", type=int, default=None, help="max docs to enrich (for validation runs)")
    p.add_argument("--workers", type=int, default=5,
                   help="parallel Opus calls. Tier 2 = 1000 RPM — 5-10 threads is safe")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    asyncio.run(run(args.source, args.limit, args.workers))
    return 0


if __name__ == "__main__":
    sys.exit(_cli())

"""Generate Voyage AI embeddings for enriched legal documents.

Reads enriched JSON files, builds a semantic query text per doc, and produces
one embedding vector via voyage-3-large. Results are written to a single
JSONL file and a parallel .npy file (for fast in-memory load in the backend).

Requires VOYAGE_API_KEY in backend/.env. If absent, this script stops with a
clear error — we do NOT silently fall back to another provider.

Usage:
  python embed_documents.py --batch-size 64
  python embed_documents.py --sources loi_1978_contrat_travail,jurisprudence_be
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Iterator

import numpy as np
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent.parent
load_dotenv(BACKEND_DIR / ".env")

logger = logging.getLogger("embed")

MODEL = "voyage-3-large"      # 1024 dims (Voyage's top Sep-2024 model)
EMBEDDING_DIM = 1024

# For statutes, we embed: title + summary + principles + concepts.
# For case law, we embed: court label + date + fiche + keywords + thesaurus.


def _build_text_for_embedding(doc: dict) -> str:
    title = doc.get("title", "") or ""
    summary = doc.get("summary", "") or ""
    principles = doc.get("key_principles") or []
    concepts = doc.get("key_concepts") or []
    if doc.get("source_type") == "case_law":
        # Jurisprudence enrichment keeps the Fiche in `summary` after enrichment.
        parts = [
            title,
            doc.get("court_label", "") or "",
            f"{doc.get('case_date', '')} {doc.get('legal_domain', '')}".strip(),
            summary,
            "Principes: " + "; ".join(principles) if principles else "",
            "Concepts: " + ", ".join(concepts) if concepts else "",
        ]
    else:
        parts = [
            title,
            summary,
            "Principes: " + "; ".join(principles) if principles else "",
            "Concepts: " + ", ".join(concepts) if concepts else "",
        ]
    return " ".join(p for p in parts if p).strip()


def _load_enriched_docs(root: Path, sources: list[str] | None) -> list[dict]:
    base = root / "enriched_documents"
    if not base.is_dir():
        raise SystemExit(f"no enriched_documents/ under {root}")
    source_dirs = [d for d in sorted(base.iterdir()) if d.is_dir()]
    if sources:
        keep = set(sources)
        source_dirs = [d for d in source_dirs if d.name in keep]
    docs: list[dict] = []
    for d in source_dirs:
        for p in sorted(d.glob("*.json")):
            try:
                docs.append(json.loads(p.read_text(encoding="utf-8")))
            except Exception as e:
                logger.warning(f"skip {p}: {e}")
    return docs


def _voyage_embed(texts: list[str], api_key: str, batch_size: int = 64) -> np.ndarray:
    """Call Voyage API in batches. Returns (N, D) float32 array."""
    try:
        import voyageai
    except ImportError as e:
        raise SystemExit("voyageai not installed. Run: pip install voyageai") from e

    os.environ["VOYAGE_API_KEY"] = api_key
    client = voyageai.Client()
    out = np.zeros((len(texts), EMBEDDING_DIM), dtype=np.float32)
    for i in range(0, len(texts), batch_size):
        chunk = texts[i:i + batch_size]
        logger.info(f"  batch {i // batch_size + 1}: {len(chunk)} docs (cumulative {i + len(chunk)}/{len(texts)})")
        resp = client.embed(chunk, model=MODEL, input_type="document")
        arr = np.asarray(resp.embeddings, dtype=np.float32)
        if arr.shape[1] != EMBEDDING_DIM:
            raise RuntimeError(
                f"unexpected voyage dim {arr.shape[1]} (expected {EMBEDDING_DIM}). "
                f"Update EMBEDDING_DIM in this file."
            )
        out[i:i + len(chunk)] = arr
        time.sleep(0.1)  # tiny politeness gap
    return out


def run(sources: list[str] | None, batch_size: int, out_jsonl: Path, out_npy: Path):
    api_key = os.environ.get("VOYAGE_API_KEY")
    if not api_key:
        raise SystemExit(
            "VOYAGE_API_KEY is not set in backend/.env. Voyage uses a SEPARATE key "
            "from ANTHROPIC_API_KEY (even though Anthropic now owns Voyage). Get one "
            "at https://dash.voyageai.com and add VOYAGE_API_KEY=... to backend/.env"
        )

    docs = _load_enriched_docs(SCRIPT_DIR, sources)
    if not docs:
        raise SystemExit("no enriched docs found. Run enrich_documents.py first.")
    logger.info(f"loaded {len(docs)} enriched docs")

    texts = [_build_text_for_embedding(d) for d in docs]
    # Skip empties just in case
    nonempty_idx = [i for i, t in enumerate(texts) if t.strip()]
    if len(nonempty_idx) != len(docs):
        logger.warning(f"{len(docs) - len(nonempty_idx)} docs had empty embedding text — skipped")
    docs = [docs[i] for i in nonempty_idx]
    texts = [texts[i] for i in nonempty_idx]

    logger.info(f"embedding {len(texts)} docs with {MODEL} (dim={EMBEDDING_DIM}, batch={batch_size})")
    started = time.time()
    vectors = _voyage_embed(texts, api_key, batch_size=batch_size)
    elapsed = time.time() - started
    logger.info(f"embeddings done in {elapsed:.1f}s — shape={vectors.shape}")

    out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    with out_jsonl.open("w", encoding="utf-8") as f:
        for doc, t in zip(docs, texts):
            row = {
                "doc_id": doc["doc_id"],
                "source": doc["source"],
                "source_type": doc.get("source_type", "statute"),
                "jurisdiction": doc.get("jurisdiction", "BE"),
                "language": doc.get("language", "fr"),
                "code_full_name": doc.get("code_full_name", ""),
                "article_number": doc.get("article_number", ""),
                "ecli": doc.get("ecli", ""),
                "court": doc.get("court", ""),
                "court_label": doc.get("court_label", ""),
                "case_date": doc.get("case_date", ""),
                "case_number": doc.get("case_number", ""),
                "legal_domain": doc.get("legal_domain", ""),
                "title": doc.get("title", ""),
                "summary": doc.get("summary", ""),
                "key_principles": doc.get("key_principles", []),
                "case_types_applicable": doc.get("case_types_applicable", []),
                "key_concepts": doc.get("key_concepts", []),
                "complexity_level": doc.get("complexity_level", ""),
                "verified_url": doc.get("verified_url", ""),
                "embedding_text": t,
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    np.save(out_npy, vectors)
    logger.info(f"wrote {out_jsonl} + {out_npy}")


def _cli() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--sources", type=str, default=None,
                   help="Comma-sep list of source folder names to embed (default: all)")
    p.add_argument("--batch-size", type=int, default=64)
    p.add_argument("--out-jsonl", type=Path,
                   default=SCRIPT_DIR / "legal_db_v2.jsonl")
    p.add_argument("--out-npy", type=Path,
                   default=SCRIPT_DIR / "legal_db_v2_embeddings.npy")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    sources = [s.strip() for s in args.sources.split(",")] if args.sources else None
    run(sources, args.batch_size, args.out_jsonl, args.out_npy)
    return 0


if __name__ == "__main__":
    sys.exit(_cli())

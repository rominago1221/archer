# Belgian legal RAG — Phase 1

Build a Belgian-law retrieval-augmented corpus (Code civil, Code pénal,
Code judiciaire, Loi 1978 travail, Loi 1991 baux, jurisprudence Cassation + Conseil d'État), enriched
by Claude Opus 4.7 and embedded with Voyage AI. The backend retrieves the top
relevant docs and injects them into PASS 2 of the Belgian analysis pipelines
so Claude cites verified sources instead of hallucinating.

## Pipeline

```
┌──────────────────┐   ┌────────────────┐   ┌──────────────┐   ┌──────────┐
│  scrapers/*.py   │ → │ enrich_docs.py │ → │ embed_docs.py│ → │  seed.py │
│  raw_documents/  │   │ Opus 4.7       │   │ Voyage-3-L   │   │  MongoDB │
└──────────────────┘   └────────────────┘   └──────────────┘   └──────────┘
                              │                    │                  │
                              ▼                    ▼                  ▼
                    enriched_documents/   legal_db_v2.jsonl   legal_db_v2 coll.
                                          legal_db_v2_embeddings.npy
```

At runtime `backend/services/legal_rag.py` loads `legal_db_v2` into RAM,
cosine-searches per query, injects top results into PASS 2.

## Commands

Setup venv (one-time):
```
cd backend/scripts/legal_db_construction
python3 -m venv .venv
.venv/bin/pip install httpx beautifulsoup4 lxml tenacity numpy python-dotenv voyageai
```

Run pipeline:
```
# 1. Scrape statutes (≈ 2 500 articles, ~4 min)
.venv/bin/python scrapers/justel_be.py loi_1978_contrat_travail
.venv/bin/python scrapers/justel_be.py code_civil_ancien
.venv/bin/python scrapers/justel_be.py code_penal
.venv/bin/python scrapers/justel_be.py code_judiciaire_p1
.venv/bin/python scrapers/justel_be.py code_judiciaire_p2
.venv/bin/python scrapers/justel_be.py loi_1991_baux_residentiels

# 2. Scrape jurisprudences (~300 ECLIs, ~3 min for discovery + fetch)
.venv/bin/python scrapers/juportal_be.py --limit 300 --max-indices 20 --threads 8

# 3. Enrich all via Opus 4.7 (idempotent: skips already-enriched)
for src in loi_1978_contrat_travail code_civil_ancien code_penal \
           code_judiciaire_p1 code_judiciaire_p2 loi_1991_baux_residentiels \
           jurisprudence_be; do
    .venv/bin/python enrich_documents.py "$src" --workers 8
done

# 4. Embed with Voyage AI (requires VOYAGE_API_KEY in backend/.env)
.venv/bin/python embed_documents.py

# 5. Seed into MongoDB (run this on prod with prod MONGO_URL)
.venv/bin/python seed_legal_db_v2.py --drop-existing
```

## Deploy to Emergent

1. `git pull` on Emergent to get the latest code + scripts.
2. Copy the `legal_db_v2.jsonl` + `legal_db_v2_embeddings.npy` files produced
   locally into the Emergent pod (scp or rsync — they are not in git because
   they're large).
3. Run `python seed_legal_db_v2.py --drop-existing` inside the pod → loads
   the `legal_db_v2` collection.
4. Hit `POST /api/admin/legal-rag-stats/reload` to force the backend's
   in-memory cache to refresh without restart.
5. Verify `GET /api/admin/legal-rag-stats` shows `cache.count` > 0.

## Secrets

All pipeline secrets live in `backend/.env`:
- `ANTHROPIC_API_KEY` — Opus 4.7 enrichment
- `VOYAGE_API_KEY` — Voyage embeddings (SEPARATE from Anthropic key, even
  though Anthropic owns Voyage now — get it at https://dash.voyageai.com)
- `MONGO_URL` + `DB_NAME` — Mongo target

## Corpus state as of 2026-04-18

- **2 475 statutes** scraped and enriched (Loi 1978, Loi 1991 baux, Code civil
  ancien, Code pénal, Code judiciaire p1/p2)
- **100 jurisprudences** scraped and enriched (Cassation + Conseil d'État,
  2026). juportal.be rate-limited us beyond ~100 — to extend, re-run the
  juportal scraper with fresh sitemap dates.

## Why not Atlas Vector Search / FAISS

For 2 500–10 000 docs the in-memory cosine in numpy is ~0.5 ms/query and
dead-simple to reason about. Move to FAISS or Atlas Vector Search when the
corpus grows past ~50 000 docs (Phase 2).

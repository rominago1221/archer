"""Load the enriched+embedded corpus into MongoDB legal_db_v2.

Reads:
  - legal_db_v2.jsonl         (one enriched doc per line, no embedding in the row)
  - legal_db_v2_embeddings.npy  (N × 1024 float32 aligned with jsonl row order)

Writes into MongoDB `legal_db_v2` collection, one document per entry, with an
`embedding_vector` field storing the float array.

Usage:
  python seed_legal_db_v2.py                  # full load
  python seed_legal_db_v2.py --drop-existing  # wipe + reload
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
import os  # noqa: E402

logger = logging.getLogger("seed")


async def run(jsonl_path: Path, npy_path: Path, drop: bool):
    mongo_url = os.environ.get("MONGO_URL") or "mongodb://localhost:27017"
    db_name = os.environ.get("DB_NAME") or "archer"
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    coll = db["legal_db_v2"]

    if drop:
        logger.info("dropping existing legal_db_v2 collection")
        await coll.drop()

    vectors = np.load(npy_path)
    rows = []
    with jsonl_path.open("r", encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    if len(rows) != vectors.shape[0]:
        raise SystemExit(
            f"shape mismatch: jsonl has {len(rows)} rows but npy has {vectors.shape[0]} vectors"
        )

    logger.info(f"loading {len(rows)} docs into {db_name}.legal_db_v2")
    batch = []
    ok = 0
    BATCH = 200
    for i, row in enumerate(rows):
        row["embedding_vector"] = vectors[i].tolist()
        batch.append(row)
        if len(batch) >= BATCH:
            try:
                await coll.insert_many(batch, ordered=False)
                ok += len(batch)
            except Exception as e:
                logger.warning(f"batch insert failed: {e}")
            batch = []
    if batch:
        try:
            await coll.insert_many(batch, ordered=False)
            ok += len(batch)
        except Exception as e:
            logger.warning(f"final batch insert failed: {e}")

    # Indexes for filter queries.
    await coll.create_index("doc_id", unique=True)
    await coll.create_index([("jurisdiction", 1), ("case_types_applicable", 1)])
    await coll.create_index("source")
    await coll.create_index([("source_type", 1), ("case_date", -1)])

    count = await coll.count_documents({})
    logger.info(f"legal_db_v2 now has {count} docs (loaded {ok} this run)")


def _cli() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--jsonl", type=Path,
                   default=SCRIPT_DIR / "legal_db_v2.jsonl")
    p.add_argument("--npy", type=Path,
                   default=SCRIPT_DIR / "legal_db_v2_embeddings.npy")
    p.add_argument("--drop-existing", action="store_true",
                   help="Drop the collection before reloading (idempotent reload)")
    args = p.parse_args()

    if not args.jsonl.exists() or not args.npy.exists():
        raise SystemExit(
            f"missing {args.jsonl} or {args.npy}. Run embed_documents.py first."
        )
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    asyncio.run(run(args.jsonl, args.npy, args.drop_existing))
    return 0


if __name__ == "__main__":
    sys.exit(_cli())

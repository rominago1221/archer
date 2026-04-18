"""Scraper for ejustice.just.fgov.be — Belgian federal statutes.

ejustice publishes each law as ONE monolithic HTML page at
  /eli/loi/{yyyy}/{mm}/{dd}/{cn}/justel
Articles inside the page are anchored by
  <A NAME='Art.N'></A>Article <A HREF='...'> N</A>.  [article body]  <BR>
  ...next <A NAME='Art.N+1'>...
so we split on those anchors and clean up the body.

Usage (CLI):
  python justel_be.py 1978/07/03/1978070303 --limit 25
  python justel_be.py 1978/07/03/1978070303 --articles 1,2,3-10
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterator, Optional

import httpx
from bs4 import BeautifulSoup
from tenacity import (
    retry, retry_if_exception_type, stop_after_attempt, wait_exponential,
)

logger = logging.getLogger("justel_be")

BASE = "https://www.ejustice.just.fgov.be"
UA = "Mozilla/5.0 (Archer-RAG/1.0; +https://archer.legal) Python-httpx"

# Known laws we need for Phase 1 (cn path segment → metadata).
# cn codes were discovered via the ejustice_search.py probe (fallback mode) —
# the rech.pl HTML search endpoint is JS-rendered and unusable for scraping.
LAWS = {
    "loi_1978_contrat_travail": {
        "path": "1978/07/03/1978070303",
        "title": "Loi du 3 juillet 1978 relative aux contrats de travail",
        "short_code": "LCT_1978",
        "source_type": "statute",
        "language": "fr",
    },
    "code_civil_ancien": {
        "path": "1804/03/21/1804032150",
        "title": "Code civil belge (ancien, Livres I à III résiduels)",
        "short_code": "CC_ANCIEN",
        "source_type": "statute",
        "language": "fr",
    },
    "code_penal": {
        "path": "1867/06/08/1867060850",
        "title": "Code pénal belge",
        "short_code": "CP",
        "source_type": "statute",
        "language": "fr",
    },
    "code_judiciaire_p1": {
        "path": "1967/10/10/1967101054",
        "title": "Code judiciaire belge (partie 1 — art. 556-663)",
        "short_code": "CJ_P1",
        "source_type": "statute",
        "language": "fr",
    },
    "code_judiciaire_p2": {
        "path": "1967/10/10/1967101055",
        "title": "Code judiciaire belge (partie 2 — art. 664+)",
        "short_code": "CJ_P2",
        "source_type": "statute",
        "language": "fr",
    },
    "loi_1991_baux_residentiels": {
        "path": "1991/02/20/1991022032",
        "title": "Loi du 20 février 1991 modifiant les dispositions du Code civil relatives aux baux à loyer",
        "short_code": "LOI_1991_BAUX",
        "source_type": "statute",
        "language": "fr",
    },
    # DEFERRED to Phase 2:
    # - Code civil nouveau Livre 3 (biens), Livre 5 (obligations), Livre 6 (responsabilité)
    # - Ordonnance Bxl 27/07/2017, Décret wallon 15/03/2018, Vlaams Decreet 09/11/2018
    #   (codes régionaux qui ont régionalisé la loi 1991 sur les baux).
}


# ─── Models ──────────────────────────────────────────────────────────────
@dataclass
class ScrapedArticle:
    doc_id: str
    source: str              # e.g. "loi_1978_contrat_travail"
    source_type: str         # "statute" | "case_law"
    code_full_name: str
    article_number: str
    language: str
    raw_text: str
    verified_url: str
    scraped_at: str


# ─── HTTP layer ──────────────────────────────────────────────────────────
class EjusticeClient:
    def __init__(self, timeout: float = 25.0):
        self._client = httpx.Client(
            follow_redirects=True,
            timeout=timeout,
            headers={"User-Agent": UA, "Accept-Language": "fr,en;q=0.8"},
        )

    def close(self):
        self._client.close()

    @retry(
        reraise=True,
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1.5, min=2, max=20),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
    )
    def _get(self, url: str) -> httpx.Response:
        r = self._client.get(url)
        if r.status_code == 429 or 500 <= r.status_code < 600:
            raise httpx.HTTPStatusError(f"rate/server {r.status_code}", request=r.request, response=r)
        r.raise_for_status()
        r.encoding = "ISO-8859-1"
        return r

    def fetch_law_html(self, path: str) -> tuple[str, str]:
        """Try the modern /eli/loi/ URL first; fall back to the legacy
        /cgi_loi/change_lg.pl?cn=... endpoint for older laws not indexed by ELI.
        Returns (html, resolved_url)."""
        modern = f"{BASE}/eli/loi/{path}/justel"
        r = self._get(modern)
        # Stub pages are ~8 KB with no article anchors. If we get that back,
        # retry via the legacy endpoint using the cn (last path segment).
        if len(r.text) < 20_000:
            cn = path.rsplit("/", 1)[-1]
            legacy = f"{BASE}/cgi_loi/change_lg.pl?language=fr&la=F&cn={cn}&table_name=loi"
            r2 = self._get(legacy)
            if len(r2.text) > len(r.text):
                return r2.text, legacy
        return r.text, modern

    @staticmethod
    def law_url(path: str) -> str:
        return f"{BASE}/eli/loi/{path}/justel"


# ─── Parser ──────────────────────────────────────────────────────────────
# Article anchor. ejustice uses two shapes:
#   <A NAME='Art.1'></A>Article <A HREF='#Art.2'> 1</A>.       ← empty inner
#   <A NAME='Art.2' HREF='#Art.1'>Art.</A> <A HREF=...> 2</A>.  ← non-empty inner
# We only need the NAME= attribute to spot the anchor; the inner content varies.
_ART_ANCHOR = re.compile(
    r"<A\s+NAME=['\"]Art\.([\w./]+)['\"][^>]*>[^<]*</A>",
    re.IGNORECASE,
)

# Start of the article body section (after the TOC + heading "Texte").
_BODY_HEADING = re.compile(r"id=['\"]text['\"][^>]*>.*?</h2>", re.IGNORECASE | re.DOTALL)


def _find_body_start(html: str) -> int:
    m = _BODY_HEADING.search(html)
    return m.end() if m else 0


def _clean_article_html(article_number: str, fragment: str) -> str:
    """Strip tags, collapse whitespace, remove ejustice annotations."""
    soup = BeautifulSoup(fragment, "lxml")
    # Drop the modification history footnote superscripts (red digits).
    for sup in soup.find_all("sup"):
        sup.decompose()
    text = soup.get_text(" ", strip=True)

    # Strip the bare article number left over from the anchor inner text (e.g. " 2 .").
    # Match "<article_number> ." or "N .", with or without a preceding space.
    escaped = re.escape(article_number)
    text = re.sub(rf"^{escaped}\s*\.\s*", "", text, count=1).strip()
    text = re.sub(r"^Article\s+\d+[\w/]*\s*\.\s*", "", text, count=1).strip()
    text = re.sub(r"^Art\.\s*\d+[\w/]*\s*\.\s*", "", text, count=1).strip()

    # Strip the "modification history" trailer that ejustice appends at the end of
    # each article — things like "<L 1985-07-17/41, art. 1, 010>" and the footnote
    # block after "----------". We don't want them in the RAG content: they pollute
    # the signal and change the embedding without any legal value.
    text = re.sub(r"\s*<L\s+\d{4}-\d{2}-\d{2}[^>]*>\s*", " ", text)
    text = re.split(r"-{4,}", text, maxsplit=1)[0]
    # Also strip inline annotations like "< L ... >" with arbitrary whitespace.
    text = re.sub(r"<[^>]{0,200}>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_articles(html: str) -> Iterator[tuple[str, str]]:
    """Yield (article_number, raw_body_html) for every article found."""
    body_start = _find_body_start(html)
    body = html[body_start:]
    anchors = list(_ART_ANCHOR.finditer(body))
    for i, m in enumerate(anchors):
        start = m.end()
        end = anchors[i + 1].start() if i + 1 < len(anchors) else len(body)
        yield m.group(1), body[start:end]


# ─── High-level scrape ───────────────────────────────────────────────────
def scrape_law(law_key: str, *, article_filter: Optional[set] = None,
               limit: Optional[int] = None,
               client: Optional[EjusticeClient] = None) -> list[ScrapedArticle]:
    meta = LAWS[law_key]
    own_client = False
    if client is None:
        client = EjusticeClient()
        own_client = True
    try:
        html, resolved_url = client.fetch_law_html(meta["path"])
    finally:
        if own_client and client is not None:
            client.close()

    url = resolved_url
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    out: list[ScrapedArticle] = []
    for art_num, fragment in parse_articles(html):
        if article_filter is not None and art_num not in article_filter:
            continue
        text = _clean_article_html(art_num, fragment)
        if not text or len(text) < 20:
            continue
        doc_id = f"be_{meta['short_code'].lower()}_art{art_num.replace('/', '_')}"
        out.append(ScrapedArticle(
            doc_id=doc_id,
            source=law_key,
            source_type=meta["source_type"],
            code_full_name=meta["title"],
            article_number=art_num,
            language=meta["language"],
            raw_text=text,
            verified_url=f"{url}#Art.{art_num}",
            scraped_at=now,
        ))
        if limit and len(out) >= limit:
            break
    return out


def save_articles(articles: list[ScrapedArticle], out_dir: Path) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved = 0
    for a in articles:
        path = out_dir / f"{a.doc_id}.json"
        path.write_text(json.dumps(asdict(a), ensure_ascii=False, indent=2), encoding="utf-8")
        saved += 1
    return saved


# ─── Article range parser (CLI) ──────────────────────────────────────────
def _expand_range(spec: str) -> set[str]:
    """'1,2,3-5,10bis' → {'1','2','3','4','5','10bis'}"""
    out: set[str] = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part and all(x.isdigit() for x in part.split("-")):
            a, b = part.split("-")
            out.update(str(x) for x in range(int(a), int(b) + 1))
        else:
            out.add(part)
    return out


def _cli() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("law_key", help="key in LAWS dict (e.g. loi_1978_contrat_travail)")
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--articles", type=str, default=None,
                   help="Comma-separated list of article numbers or ranges, e.g. '1,2,3-10,30bis'")
    p.add_argument("--out-dir", type=Path,
                   default=Path(__file__).parent.parent / "raw_documents")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    if args.law_key not in LAWS:
        print(f"unknown law_key {args.law_key!r}. known: {list(LAWS)}", file=sys.stderr)
        return 2

    art_filter = _expand_range(args.articles) if args.articles else None
    logger.info(f"scraping {args.law_key} (limit={args.limit}, filter={art_filter})")
    articles = scrape_law(args.law_key, article_filter=art_filter, limit=args.limit)
    saved = save_articles(articles, args.out_dir / args.law_key)
    logger.info(f"parsed {len(articles)} articles, saved {saved} files → {args.out_dir / args.law_key}")
    # Print a short sample for visual inspection.
    for a in articles[:3]:
        preview = a.raw_text[:220].replace("\n", " ")
        print(f"  · Art. {a.article_number:>8}  ({len(a.raw_text)} chars)  {preview}…")
    return 0


if __name__ == "__main__":
    sys.exit(_cli())

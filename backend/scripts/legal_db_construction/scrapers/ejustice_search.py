"""Discover ejustice cn codes for the laws we need to scrape.

ejustice's search form lives at
    https://www.ejustice.just.fgov.be/cgi_loi/rech.pl
with GET parameters. Results list links like
    /eli/loi/2020/02/04/2020040407/justel
We probe the search for each law name, scrape the result list, and for every
returned law we do a HEAD fetch to confirm the body size (≥ 50 KB typically
means "real law content", < 10 KB means "landing / empty").
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

BASE = "https://www.ejustice.just.fgov.be"
UA = "Mozilla/5.0 (Archer-RAG/1.0) Python-httpx"


# Targets: short human keys → search terms.
# The search endpoint is picky about exact wording — use canonical wording.
TARGETS = {
    "code_civil_livre3_biens": {
        "terms": ["Code civil livre 3 biens"],
        "year_min": 2019, "year_max": 2024,
    },
    "code_civil_livre4_obligations": {
        "terms": ["Code civil livre 4 obligations", "Livre 5 obligations"],
        "year_min": 2019, "year_max": 2024,
    },
    "code_civil_livre5_obligations_2022": {
        "terms": ["Livre 5 obligations 2022", "Code civil obligations"],
        "year_min": 2022, "year_max": 2024,
    },
    "code_civil_ancien": {
        "terms": ["Code civil ancien"],
        "year_min": 1800, "year_max": 1900,
    },
    "loi_1991_baux_residentiels": {
        "terms": ["Loi du 20 février 1991 baux", "baux relatifs à la résidence principale"],
        "year_min": 1991, "year_max": 1991,
    },
    "code_judiciaire": {
        "terms": ["Code judiciaire"],
        "year_min": 1967, "year_max": 1968,
    },
    "code_penal": {
        "terms": ["Code pénal", "Code penal"],
        "year_min": 1867, "year_max": 1867,
    },
    "cct_109": {
        "terms": ["Convention collective de travail n° 109"],
        "year_min": 2014, "year_max": 2014,
    },
}


CLIENT_TIMEOUT = 25.0


@retry(reraise=True, stop=stop_after_attempt(3),
       wait=wait_exponential(multiplier=1.5, min=2, max=15))
def _get(client: httpx.Client, url: str) -> httpx.Response:
    r = client.get(url)
    if r.status_code == 429 or 500 <= r.status_code < 600:
        raise httpx.HTTPStatusError(f"retryable {r.status_code}", request=r.request, response=r)
    r.raise_for_status()
    return r


def build_search_url(term: str) -> str:
    # The classic ejustice search form uses POST but the GET variant also works
    # with text=... parameters. We try a text search that excludes royal decrees
    # and circulars (they explode the result set otherwise).
    params = {
        "language": "fr",
        "view_numac": "",
        "cn_search": "",
        "dt": "LOI",
        "trier": "promulgation",
        "fr": term,
        "choix1": "ET",
        "choix2": "ET",
        "nl": "",
        "chercher": "t",
    }
    return f"{BASE}/cgi_loi/rech.pl?{urlencode(params)}"


_CN_LINK_RE = re.compile(r"/eli/loi/(\d{4}/\d{2}/\d{2}/\d+)/justel", re.IGNORECASE)
_CN_CGI_RE = re.compile(r"cn_search=(\d+)", re.IGNORECASE)


def scan_results(html: str) -> list[dict]:
    """Extract candidate (path, title, year_hint) tuples from a search result page."""
    soup = BeautifulSoup(html, "lxml")
    hits = []
    # Approach 1: direct /eli/loi/ links
    for m in _CN_LINK_RE.finditer(html):
        path = m.group(1)
        yyyy = path.split("/")[0]
        # Context = 160 chars around the match
        ctx = html[max(0, m.start() - 200): m.end() + 80]
        title = re.sub(r"<[^>]+>", " ", ctx)
        title = re.sub(r"\s+", " ", title).strip()
        hits.append({
            "path": path,
            "cn": path.split("/")[-1],
            "year": int(yyyy),
            "url": f"{BASE}/eli/loi/{path}/justel",
            "context": title[:260],
        })
    # Deduplicate by cn
    seen = set()
    uniq = []
    for h in hits:
        if h["cn"] not in seen:
            seen.add(h["cn"])
            uniq.append(h)
    return uniq


def head_probe(client: httpx.Client, url: str) -> dict:
    """Fetch the law page and return {status, size, article_count}.
    >50 KB + articles present = real content; <10 KB = landing stub."""
    try:
        r = _get(client, url)
        r.encoding = "ISO-8859-1"
        size = len(r.text)
        art_count = len(re.findall(r"<A\s+NAME=['\"]Art\.[\w./]+['\"]", r.text, re.IGNORECASE))
        return {"status": r.status_code, "size": size, "article_count": art_count}
    except Exception as e:
        return {"status": 0, "size": 0, "article_count": 0, "error": str(e)[:120]}


def search_target(client: httpx.Client, key: str, cfg: dict, max_hits: int = 5) -> dict:
    found: list[dict] = []
    for term in cfg["terms"]:
        url = build_search_url(term)
        try:
            r = _get(client, url)
            r.encoding = "ISO-8859-1"
        except Exception as e:
            return {"target": key, "error": f"search failed: {e}"}
        hits = scan_results(r.text)
        # Filter by year window
        hits = [h for h in hits if cfg["year_min"] <= h["year"] <= cfg["year_max"]]
        found.extend(hits)
        if len(found) >= max_hits:
            break
        time.sleep(0.4)  # polite jitter
    # Deduplicate by cn across terms
    by_cn = {}
    for h in found:
        by_cn.setdefault(h["cn"], h)
    unique = list(by_cn.values())[:max_hits]

    # Probe each candidate
    for h in unique:
        probe = head_probe(client, h["url"])
        h["probe"] = probe
        time.sleep(0.3)
    # Keep only "real content" candidates (arbitrary threshold: >30 KB and ≥ 5 articles)
    unique.sort(key=lambda h: (h["probe"]["article_count"], h["probe"]["size"]), reverse=True)
    return {"target": key, "candidates": unique}


def _cli() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--only", type=str, default=None,
                   help="Comma-separated target keys to run (default: all)")
    p.add_argument("--out", type=Path,
                   default=Path(__file__).parent.parent / "cn_discovery.json")
    args = p.parse_args()

    keys = list(TARGETS.keys()) if not args.only else [k.strip() for k in args.only.split(",")]
    results: dict[str, dict] = {}
    with httpx.Client(follow_redirects=True, timeout=CLIENT_TIMEOUT,
                      headers={"User-Agent": UA, "Accept-Language": "fr"}) as client:
        for k in keys:
            print(f"→ searching {k}…", flush=True)
            r = search_target(client, k, TARGETS[k])
            results[k] = r
            best = (r.get("candidates") or [None])[0]
            if best:
                p = best.get("probe", {})
                print(f"   best: cn={best['cn']} year={best['year']} "
                      f"size={p.get('size')} arts={p.get('article_count')} url={best['url']}", flush=True)
            else:
                print(f"   no viable candidate. error={r.get('error')}", flush=True)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {args.out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(_cli())

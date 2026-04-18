"""Scraper for juportal.just.fgov.be — Belgian jurisprudence (Cassation + Cours d'appel).

Discovery: the juportal SPA is useless directly. The real content endpoint is
    https://juportal.just.fgov.be/content/{ECLI}
and ECLIs are enumerated via the sitemap index referenced from
    https://juportal.be/robots.txt

Strategy:
  1. Parse robots.txt → list of daily sitemap index URLs.
  2. For each index, pull every sub-sitemap → every <loc> points to
     e-justice.europa.eu with the ECLI baked into the path.
  3. Extract ECLI from those URLs and reconstruct the real juportal URL.
  4. Fetch each case page, parse metadata + Fiche (legal summary) + rechtsgebied
     + wettelijke bepalingen (cited statutes).
  5. Save one JSON per case to raw_documents/jurisprudence_be/.

Usage:
  python juportal_be.py --limit 300
  python juportal_be.py --courts CASS,GHCA,GHAGENT --limit 500
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterator, Optional

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger("juportal_be")

BASE = "https://juportal.just.fgov.be"
BASE_PUBLIC = "https://juportal.be"
UA = "Mozilla/5.0 (Archer-RAG/1.0) Python-httpx"

# ECLI courts we keep (Cassation + Cours d'appel, NL and FR).
# Full list: https://e-justice.europa.eu/ecli (ECLI-BE codes).
DEFAULT_COURTS = {
    "CASS",         # Cour de cassation / Hof van Cassatie
    "GHCA",         # Hof van Cassatie (alt)
    "GHANT",        # Hof van Beroep Antwerpen
    "GHBRU",        # Hof van Beroep Brussel
    "GHGNT",        # Hof van Beroep Gent
    "CABRL",        # Cour d'appel Bruxelles
    "CALIEGE",      # Cour d'appel Liège
    "CAMONS",       # Cour d'appel Mons
    "CAANVERS",
    "GHMIL",        # Cour militaire (rare but high value)
    "GHARBGNT",     # Arbeidshof Gent
    "GHARBANT",     # Arbeidshof Antwerpen
    "GHARBBRU",     # Arbeidshof Brussel
    "CTT",          # Cour du travail
    "CTLIEGE",
    "CTBRUXELLES",
    "CCONST",       # Cour constitutionnelle
    "GHGW",         # Grondwettelijk Hof
    "RVSCE",        # Raad van State / Conseil d'État
}


ECLI_RE = re.compile(r"ECLI:BE:[A-Z]+:\d{4}:[A-Z0-9.]+", re.IGNORECASE)


@dataclass
class ScrapedCase:
    doc_id: str
    source: str
    source_type: str           # always "case_law"
    ecli: str
    court: str                 # CASS, GHCA, ...
    court_label: str           # human-readable (FR/NL)
    case_date: str             # YYYY-MM-DD if parsed
    case_number: str           # rôle number
    parties: str
    chamber: str
    legal_domain: str
    summary_fiche: str         # the "Fiche" abstract — our RAG goldmine
    keywords: list
    thesaurus: list
    cited_provisions: list
    language: str              # "fr" or "nl"
    raw_text: str              # full cleaned page text (for fallback)
    verified_url: str
    scraped_at: str


# ─── HTTP utilities ───────────────────────────────────────────────────────
class JuportalClient:
    def __init__(self, timeout: float = 25.0):
        self._client = httpx.Client(
            follow_redirects=True, timeout=timeout,
            headers={"User-Agent": UA, "Accept-Language": "fr,nl;q=0.8"},
        )

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
        return False

    @retry(reraise=True, stop=stop_after_attempt(4),
           wait=wait_exponential(multiplier=1.5, min=2, max=25),
           retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)))
    def fetch(self, url: str) -> str:
        r = self._client.get(url)
        if r.status_code == 429 or 500 <= r.status_code < 600:
            raise httpx.HTTPStatusError(f"retryable {r.status_code}", request=r.request, response=r)
        r.raise_for_status()
        # Content is UTF-8 on juportal.
        r.encoding = r.encoding or "utf-8"
        return r.text


# ─── Sitemap discovery ────────────────────────────────────────────────────
def extract_sitemap_urls_from_robots(robots_txt: str) -> list[str]:
    urls = []
    for m in re.finditer(r"Sitemap:\s*(\S+)", robots_txt, re.IGNORECASE):
        u = m.group(1).strip()
        if u:
            urls.append(u)
    return urls


def walk_sitemap_for_eclis(client: JuportalClient, index_url: str,
                            pool: ThreadPoolExecutor) -> set[str]:
    """Fetch one sitemap index and all its sub-sitemaps in parallel."""
    eclis: set[str] = set()
    try:
        xml = client.fetch(index_url)
    except Exception as e:
        logger.warning(f"skipping index {index_url}: {e}")
        return eclis
    sub_urls = re.findall(r"<loc>([^<]+)</loc>", xml)

    def _fetch_sub(sub_url: str) -> set[str]:
        try:
            sub_xml = client.fetch(sub_url)
        except Exception:
            return set()
        out = set()
        for url in re.findall(r"<loc>([^<]+)</loc>", sub_xml):
            m = ECLI_RE.search(url)
            if m:
                out.add(m.group(0))
        return out

    futures = [pool.submit(_fetch_sub, su) for su in sub_urls]
    for fut in as_completed(futures):
        eclis.update(fut.result())
    return eclis


# ─── Case page parsing ────────────────────────────────────────────────────
def _court_label(court: str) -> str:
    labels = {
        "CASS": "Cour de cassation",
        "GHCA": "Hof van Cassatie",
        "GHANT": "Hof van Beroep Antwerpen",
        "GHBRU": "Hof van Beroep Brussel",
        "GHGNT": "Hof van Beroep Gent",
        "CABRL": "Cour d'appel de Bruxelles",
        "CALIEGE": "Cour d'appel de Liège",
        "CAMONS": "Cour d'appel de Mons",
        "CCONST": "Cour constitutionnelle",
        "GHGW": "Grondwettelijk Hof",
        "RVSCE": "Conseil d'État / Raad van State",
    }
    return labels.get(court, court)


def _field_after(text: str, label: str, max_len: int = 600) -> str:
    """Return the line(s) following a `Label:` marker in the flat text dump."""
    idx = text.find(label)
    if idx < 0:
        return ""
    chunk = text[idx + len(label): idx + len(label) + max_len]
    # Stop at the next known field header. Crude heuristic but works for the
    # juportal flat text layout (`Field:\nvalue\nNextField:\n...`).
    next_label_re = re.compile(r"\n\s*(ECLI nr|Rolnummer|Zaak|Kamer|Rechtsgebied|Invoerdatum|"
                              r"Raadplegingen|Versie|Conclusie|Fiche|Thesaurus|Vrije woorden|"
                              r"Wettelijke bepalingen|Juridiction|Date|N° de rôle|"
                              r"Sommaire|Mots-clés|Matière|Chambre|Affaire|Nombre|Observations|"
                              r"Dispositions légales|Section|Présidence|Rapporteur)\s*:", re.IGNORECASE)
    m = next_label_re.search(chunk)
    if m:
        chunk = chunk[:m.start()]
    return chunk.strip(" :\n\t\r")


def parse_case(html: str, ecli: str, url: str) -> ScrapedCase:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)

    # Court code from the ECLI (segment 3).
    parts = ecli.split(":")
    court = parts[2] if len(parts) >= 3 else ""
    year = parts[3] if len(parts) >= 4 else ""

    # Date: the page lists "Vonnis/arrest van DD MMMM YYYY" or "02 juni 2025".
    case_date = ""
    m = re.search(r"(\d{2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|"
                  r"janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})",
                  text, re.IGNORECASE)
    if m:
        months = {
            "januari":"01","februari":"02","maart":"03","april":"04","mei":"05","juni":"06",
            "juli":"07","augustus":"08","september":"09","oktober":"10","november":"11","december":"12",
            "janvier":"01","février":"02","mars":"03","avril":"04","mai":"05","juin":"06",
            "juillet":"07","août":"08","septembre":"09","octobre":"10","novembre":"11","décembre":"12",
        }
        dd = m.group(1).zfill(2)
        mm = months[m.group(2).lower()]
        case_date = f"{m.group(3)}-{mm}-{dd}"
    # Fallback: search ARR.YYYYMMDD in the ECLI
    if not case_date:
        m2 = re.search(r"ARR\.(\d{4})(\d{2})(\d{2})", ecli)
        if m2:
            case_date = f"{m2.group(1)}-{m2.group(2)}-{m2.group(3)}"

    case_number = _field_after(text, "Rolnummer:") or _field_after(text, "N° de rôle:")
    case_number = case_number.splitlines()[0].strip() if case_number else ""
    parties = (_field_after(text, "Zaak:") or _field_after(text, "Affaire:")).splitlines()[0].strip() if _field_after(text, "Zaak:") or _field_after(text, "Affaire:") else ""
    chamber = (_field_after(text, "Kamer:") or _field_after(text, "Chambre:")).splitlines()[0].strip() if _field_after(text, "Kamer:") or _field_after(text, "Chambre:") else ""
    legal_domain = (_field_after(text, "Rechtsgebied:") or _field_after(text, "Matière:")).splitlines()[0].strip() if _field_after(text, "Rechtsgebied:") or _field_after(text, "Matière:") else ""

    summary = _field_after(text, "Fiche", max_len=3000) or _field_after(text, "Sommaire", max_len=3000)
    summary = re.sub(r"\s+", " ", summary).strip()

    thes = _field_after(text, "Thesaurus CAS:", max_len=600) or _field_after(text, "Thésaurus CAS:", max_len=600)
    thesaurus = [t.strip() for t in re.split(r"[-–·\n]", thes) if t.strip() and len(t.strip()) < 80][:6]
    kw = _field_after(text, "Vrije woorden:", max_len=600) or _field_after(text, "Mots-clés:", max_len=600) or _field_after(text, "Mots clés libres:", max_len=600)
    keywords = [k.strip() for k in re.split(r"[-–·\n]", kw) if k.strip() and len(k.strip()) < 120][:10]

    provs_raw = _field_after(text, "Wettelijke bepalingen:", max_len=1500) or _field_after(text, "Dispositions légales:", max_len=1500)
    provisions = [p.strip() for p in provs_raw.split("\n") if p.strip() and "ELI link" not in p and len(p.strip()) < 240][:8]

    # Language heuristic: Dutch markers vs French
    lang = "nl" if any(m in text.lower() for m in ["rolnummer:", "kamer:", "rechtsgebied:", "wettelijke bepalingen:"]) else "fr"

    # Short doc_id: ECLI normalized (drop ':' → '_')
    doc_id = "be_jur_" + ecli.lower().replace(":", "_").replace(".", "_")

    return ScrapedCase(
        doc_id=doc_id,
        source="jurisprudence_be",
        source_type="case_law",
        ecli=ecli,
        court=court,
        court_label=_court_label(court),
        case_date=case_date,
        case_number=case_number,
        parties=parties,
        chamber=chamber,
        legal_domain=legal_domain,
        summary_fiche=summary[:5000],
        keywords=keywords,
        thesaurus=thesaurus,
        cited_provisions=provisions,
        language=lang,
        raw_text=text[:15000],  # cap
        verified_url=url,
        scraped_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


def content_url(ecli: str) -> str:
    return f"{BASE}/content/{ecli}"


# ─── Top-level scrape ────────────────────────────────────────────────────
def discover_eclis(client: JuportalClient, max_indices: int = 40,
                   sub_threads: int = 12) -> set[str]:
    """Walk at most `max_indices` daily sitemap indices.
    Sub-sitemaps inside each index are fetched in parallel (sub_threads)."""
    robots = client.fetch(f"{BASE_PUBLIC}/robots.txt")
    index_urls = extract_sitemap_urls_from_robots(robots)
    index_urls = index_urls[:max_indices]
    logger.info(f"walking {len(index_urls)} daily sitemap indices (sub-threads={sub_threads})")

    all_eclis: set[str] = set()
    with ThreadPoolExecutor(max_workers=sub_threads) as pool:
        for idx_url in index_urls:
            eclis = walk_sitemap_for_eclis(client, idx_url, pool)
            all_eclis.update(eclis)
            logger.info(f"  {idx_url.split('/')[-2]} → +{len(eclis)} ECLIs (total {len(all_eclis)})")
    return all_eclis


def scrape_one(client: JuportalClient, ecli: str) -> Optional[ScrapedCase]:
    url = content_url(ecli)
    try:
        html = client.fetch(url)
    except Exception as e:
        logger.warning(f"failed {ecli}: {e}")
        return None
    try:
        return parse_case(html, ecli, url)
    except Exception as e:
        logger.warning(f"parse error {ecli}: {e}")
        return None


def save_case(case: ScrapedCase, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{case.doc_id}.json"
    path.write_text(json.dumps(asdict(case), ensure_ascii=False, indent=2), encoding="utf-8")


def run(limit: Optional[int], courts: set[str], max_indices: int,
        threads: int, out_dir: Path) -> int:
    with JuportalClient() as client_disco:
        eclis = discover_eclis(client_disco, max_indices=max_indices)

    # Filter by court
    filtered = [e for e in eclis if e.split(":")[2] in courts]
    logger.info(f"discovered {len(eclis)} ECLIs, {len(filtered)} match courts={sorted(courts)[:6]}...")

    # Sort by year desc, take most recent `limit`
    def _year(e: str) -> int:
        try: return int(e.split(":")[3])
        except Exception: return 0
    filtered.sort(key=_year, reverse=True)
    if limit:
        filtered = filtered[:limit]

    # Parallel fetch
    saved = 0
    errors = 0
    logger.info(f"scraping {len(filtered)} cases with {threads} threads")
    shared_client = JuportalClient()
    try:
        with ThreadPoolExecutor(max_workers=threads) as pool:
            futures = {pool.submit(scrape_one, shared_client, e): e for e in filtered}
            for i, fut in enumerate(as_completed(futures), 1):
                case = fut.result()
                if case is None:
                    errors += 1
                    continue
                save_case(case, out_dir)
                saved += 1
                if i % 25 == 0:
                    logger.info(f"  progress {i}/{len(filtered)} saved={saved} errors={errors}")
    finally:
        shared_client.close()

    logger.info(f"DONE — saved {saved}, errors {errors}")
    return saved


def _cli() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=300)
    p.add_argument("--courts", type=str, default=None,
                   help="Comma-sep ECLI court codes (default: Cass + Cours d'appel + Cour const.)")
    p.add_argument("--max-indices", type=int, default=40,
                   help="How many daily sitemap indices to walk (more = more ECLIs)")
    p.add_argument("--threads", type=int, default=6)
    p.add_argument("--out-dir", type=Path,
                   default=Path(__file__).parent.parent / "raw_documents" / "jurisprudence_be")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    courts = (set(c.strip().upper() for c in args.courts.split(",")) if args.courts
              else DEFAULT_COURTS)
    run(args.limit, courts, args.max_indices, args.threads, args.out_dir)
    return 0


if __name__ == "__main__":
    sys.exit(_cli())

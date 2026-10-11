from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

from lxml import html

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "runs/wp1/search/aaai_ojs_catalog"
OUT.mkdir(parents=True, exist_ok=True)
BASE = "https://ojs.aaai.org/index.php/AAAI/issue/archive"
UA = "PhysicsManufacturingSurveyManifest/1.0 (public bibliographic metadata retrieval; research use)"

def fetch(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Referer": "https://aaai.org/"})
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = response.read()
        status, final_url, ctype = response.status, response.geturl(), response.headers.get("Content-Type")
    body = gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw
    return body, final_url, status, ctype

def clean(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()

def main():
    args=argparse.ArgumentParser();args.add_argument("--year",type=int,default=datetime.now(timezone.utc).year);target=args.parse_args().year
    run_id = "aaai_ojs_" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    pages, issues = [], {}
    next_url = BASE
    seen = set()
    while next_url and next_url not in seen:
        seen.add(next_url)
        body, final, code, ctype = fetch(next_url)
        digest = hashlib.sha256(body).hexdigest()
        parsed = html.fromstring(body)
        page_path = OUT / "archive_pages" / f"page_{len(pages)+1}.html"
        page_path.parent.mkdir(parents=True, exist_ok=True)
        page_path.write_bytes(body)
        page_meta = {"url": next_url, "final_url": final, "http_status": code, "sha256": digest,
                     "raw_response_path": str(page_path.relative_to(ROOT)).replace("\\", "/"),
                     "issue_links": 0}
        for a in parsed.xpath('//a[contains(@href,"/issue/view/")]'):
            href = urljoin(final, a.get("href"))
            title = clean(a.text_content())
            issue_id = href.rstrip("/").split("/")[-1]
            if not title or issue_id in issues:
                continue
            # Article archive is bounded to the preregistered range 2020–2026.
            year_match = re.search(r"AAAI[-– ]?(20\d\d|\d\d)", title, re.I)
            if not year_match:
                continue
            year_text = year_match.group(1)
            year = int(year_text) if len(year_text) == 4 else 2000 + int(year_text)
            if year != target:
                continue
            issues[issue_id] = {"issue_id": issue_id, "issue_title": title, "year": year, "url": href}
            page_meta["issue_links"] += 1
        pages.append(page_meta)
        next_nodes = parsed.xpath('//a[normalize-space(.)="Next"]/@href')
        next_url = urljoin(final, next_nodes[0]) if next_nodes else None
        print(json.dumps({"archive_page": len(pages), "issues_added": page_meta["issue_links"], "issues_total": len(issues), "next": bool(next_url)}, ensure_ascii=False), flush=True)
        time.sleep(0.2)

    for i, issue in enumerate(issues.values(), 1):
        body, final, code, ctype = fetch(issue["url"])
        digest = hashlib.sha256(body).hexdigest()
        parsed = html.fromstring(body)
        records = []
        for box in parsed.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," obj_article_summary ")]'):
            title = clean(" ".join(box.xpath('.//h3[contains(@class,"title")]//a//text()')))
            links = box.xpath('.//h3[contains(@class,"title")]//a[@href]')
            authors = clean(" ".join(box.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," authors ")]//text()')))
            pages = clean(" ".join(box.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," pages ")]//text()')))
            if not title or not links:
                continue
            article_url = urljoin(final, links[0].get("href"))
            records.append({"title": title, "authors": authors or None, "pages": pages or None,
                            "track": issue["issue_title"], "proceedings_url": article_url,
                            "abstract_url": article_url, "record_id": article_url.rstrip("/").split("/")[-1]})
        issue["final_url"] = final
        issue["http_status"] = code
        issue["content_type"] = ctype
        issue["raw_response_sha256"] = digest
        issue["record_count"] = len(records)
        issue["records"] = records
        print(json.dumps({"issue": issue["issue_id"], "year": issue["year"], "papers": len(records)}, ensure_ascii=False), flush=True)
        time.sleep(0.18)

    by_year = {}
    for issue in issues.values():
        y = str(issue["year"])
        by_year.setdefault(y, []).extend(issue["records"])
    summary_years = {}
    for year, rows in by_year.items():
        directory = OUT / f"aaai_{year}"
        directory.mkdir(parents=True, exist_ok=True)
        payload = {"schema_version": "1.0", "source_id": f"aaai_{year}", "venue": "AAAI",
                   "year": int(year), "track_scope": "official_OJS_issues_archived_under_AAAI_journal",
                   "run_id": run_id, "record_count": len(rows), "records": rows,
                   "issue_ids": [i["issue_id"] for i in issues.values() if str(i["year"]) == year]}
        p = directory / "records.json"
        p.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        summary_years[year] = {"record_count": len(rows), "issue_count": len(payload["issue_ids"]),
                               "records_path": str(p.relative_to(ROOT)).replace("\\", "/")}

    issue_file = OUT / f"{run_id}_issues.json"
    issue_file.write_text(json.dumps({"run_id": run_id, "archive_pages": pages, "issues": list(issues.values())}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {"schema_version": "1.0", "run_id": run_id, "retrieved_at": datetime.now(timezone.utc).isoformat(),
               "classification": "official_AAAI_OJS_issue_and_title_manifest; abstracts not yet fetched; not search-screened",
               "archive_url": BASE, "archive_pages": pages, "issue_manifest_path": str(issue_file.relative_to(ROOT)).replace("\\", "/"),
               "years": summary_years, "issues_retrieved": len(issues),
               "limitations": ["Issue and article title records are an official proceedings frame, not eligible-study counts.",
                              "AAAI archive may include technical tracks, special programs and demonstrations; track eligibility must be screened.",
                              "Article abstracts, deduplication, query screening, and 2026 cutoff adjudication remain pending."]}
    out = OUT / f"{run_id}_summary.json"
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"summary": str(out.relative_to(ROOT)), "years": summary_years}, ensure_ascii=False, indent=2), flush=True)

if __name__ == "__main__":
    main()

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
YEAR=datetime.now(timezone.utc).year
SEARCH = ROOT / "runs/wp1/search"
SUMMARY_GLOB = "catalog_2026_partial_*_summary.json"
OUT = SEARCH / "discovery_queue_2026_partial.json"
SERVICE_OUT = ROOT / "service/data/discovery_queue_2026_partial.json"

spec = importlib.util.spec_from_file_location("title_screen", ROOT / "scripts/screen_official_catalog_titles.py")
title_screen = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(title_screen)

VENUE_PATHS = {"AAAI": SEARCH/f"aaai_ojs_catalog/aaai_{YEAR}/records.json"}
for venue in ["CVPR","ICLR","ICML","IJCAI","NeurIPS","ECCV","ICCV"]:
    VENUE_PATHS[venue]=SEARCH/f"partial_2026_catalogs/{venue.lower()}_{YEAR}/records.json"

PERMISSIVE = re.compile(
    r"manufactur|industrial|defect|litho|fabricat|additive|physics|physical|synthe|generat|process|simulation|CAD|airfoil|assembly|inspection|anomal|3d.print|weld|machin|semiconductor|wafer|material|thermal|fluid|geometry|digital twin|sensor|melt pool|composite|battery|foundry|robotics",
    re.I,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    summaries = sorted((SEARCH / "partial_2026_catalogs").glob(SUMMARY_GLOB))
    if not summaries:
        raise FileNotFoundError("No partial 2026 catalog summary found")
    summary_path = summaries[-1]
    availability = json.loads(summary_path.read_text(encoding="utf-8"))
    catalogs: dict[str, dict] = {}
    for venue, path in VENUE_PATHS.items():
        if not path.is_file():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("venue") != venue or int(data.get("year", 0)) != YEAR:
            raise ValueError(f"Unexpected 2026 catalog metadata: {path}")
        if data.get("record_count") != len(data.get("records", [])):
            raise ValueError(f"Record count mismatch: {path}")
        catalogs[venue] = data

    queue: dict[tuple[str, str], dict] = {}
    frame = []
    for venue, data in catalogs.items():
        path = VENUE_PATHS[venue]
        frame.append({
            "venue": venue,
            "year": YEAR,
            "record_count": len(data["records"]),
            "track_scope": data.get("track_scope"),
            "source_url": data.get("source_url"),
            "retrieved_at": data.get("retrieved_at"),
            "catalog_file": path.relative_to(ROOT).as_posix(),
            "catalog_file_sha256": sha256(path),
            "raw_response_sha256": data.get("raw_response_sha256"),
        })
        for work in data["records"]:
            title = str(work.get("title") or "").strip()
            if venue == "AAAI" and "technical tracks" not in str(work.get("track", "")).casefold():
                continue
            title_query_ids = [qid for qid, expressions in title_screen.QUERIES.items()
                               if all(re.search(pattern, title, re.I) for pattern in expressions)]
            broad_routes = []
            if title_screen.BROAD_MFG.search(title):
                broad_routes.append("explicit_manufacturing_anchor")
            if title_screen.BROAD_PHYS.search(title) and title_screen.BROAD_GEN.search(title):
                broad_routes.append("physics_and_generation_title_pair")
            if (title_screen.BROAD_CAD.search(title) and title_screen.BROAD_GEN.search(title)
                    and re.search(r"manufactur|industrial|material|mechan|process|machine|design|physics|physical", title, re.I)):
                broad_routes.append("engineering_geometry_generation_pair")
            if title_query_ids:
                broad_routes.append("Q1_Q6_title_query")
            if PERMISSIVE.search(title):
                broad_routes.append("permissive_single_anchor_sensitivity")
            if not broad_routes:
                continue
            rid = str(work.get("record_id") or work.get("proceedings_url") or title_screen.normalize_title(title))
            key = (venue, rid)
            entry = queue.setdefault(key, {
                "queue_id": f"2026-{venue}-{hashlib.sha256(rid.encode()).hexdigest()[:12]}",
                "venue": venue,
                "year": YEAR,
                "title": title,
                "authors": work.get("authors"),
                "track": work.get("track"),
                "record_id": work.get("record_id"),
                "proceedings_url": work.get("proceedings_url"),
                "abstract_url": work.get("abstract_url"),
                "title_query_ids": [],
                "candidate_retrieval_routes": [],
                "review_priority": "focused_title_candidate",
                "screening_status": "awaiting_human_title_abstract_review",
                "scope_status": "unassessed",
                "release_status": "unassessed",
                "clean_start_status": "unassessed",
                "industrial_profile_status": "unassessed",
                "evidence_graph_registration": "not_registered_pending_review",
            })
            entry["title_query_ids"] = sorted(set(entry["title_query_ids"] + title_query_ids))
            entry["candidate_retrieval_routes"] = sorted(set(entry["candidate_retrieval_routes"] + broad_routes))
            entry["review_priority"] = ("sensitivity_only" if set(entry["candidate_retrieval_routes"]) == {"permissive_single_anchor_sensitivity"}
                                         else "focused_title_candidate")

    candidates = sorted(queue.values(), key=lambda x: (x["venue"], x["title"].casefold(), x["queue_id"]))
    priority_counts = {priority: sum(x["review_priority"] == priority for x in candidates)
                      for priority in ("focused_title_candidate", "sensitivity_only")}
    payload = {
        "schema_version": "1.0",
        "run_id": "discovery_queue_"+str(YEAR)+"_"+datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "classification": "partial-year official-conference title discovery queue; sensitivity and triage only; separate from completed 2020-2025 review and denominators",
        "source_cutoff_date": availability["cutoff_date"],
        "source_catalog_run_id": availability["run_id"],
        "monitored_year":YEAR,
        "latest_source_check_status":availability.get("venue_availability",[]),
        "source_catalog_summary": summary_path.relative_to(ROOT).as_posix(),
        "source_frame": frame,
        "source_frame_record_count": sum(x["record_count"] for x in frame),
        "title_candidate_count": len(candidates),
        "review_priority_counts": priority_counts,
        "candidates": candidates,
        "pending_venues": availability.get("venue_availability", []),
        "limitations": [
            "Title-based retrieval only; candidates require abstract/full-text review.",
            "No cross-venue or version deduplication is performed.",
            "Candidate presence does not establish scope eligibility, public code/model availability, clean-start runnability, rights, physical validity, or industrial readiness.",
            "Queue candidates do not enter the evidence graph, included-study set, or trend denominators until reviewer decisions are recorded.",
            "2026 is a partial-cycle sensitivity stream and is not merged into completed 2020-2025 results.",
        ],
    }
    serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    OUT.write_text(serialized, encoding="utf-8")
    SERVICE_OUT.write_text(serialized, encoding="utf-8")
    print(json.dumps({"output": str(OUT.relative_to(ROOT)), "venues": len(frame),
                      "frame_rows": payload["source_frame_record_count"], "title_candidates": len(candidates),
                      "status": "pending reviewer screening"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

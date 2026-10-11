from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEARCH = ROOT / "runs/wp1/search"
OUT = SEARCH / "title_query_screen_2020_2025.json"

# These are source-specific literal title-field translations of Q1–Q6, not an
# abstract or full-text search. Every hit remains a screening candidate only.
QUERIES = {
    "Q1": [r"manufactur|industrial|defect|inspection|assembly",
           r"synthetic\s+data|anomal(?:y|ies).{0,25}(?:generat|synth)|defect.{0,25}(?:synth|generat)|data.{0,25}(?:generat|augment)|inspection image.{0,20}generat"],
    "Q2": [r"physics[- ]informed|physics[- ]consistent|physics[- ]constrained|physics[- ]guided|physics[- ]based|conservation law",
           r"generat|diffusion|flow matching|normalizing flow|\bVAE\b|\bGAN\b|synthetic\s+data"],
    "Q3": [r"additive manufact|LPBF|welding|machining|\bcasting\b|semiconductor|lithography|wafer",
           r"synthetic|synthesi|generat|simulation|simulator|digital twin|diffusion"],
    "Q4": [r"physical simulation|differentiable simulation|domain randomization|sim.to.real|rendering",
           r"training data|synthetic|augmentation|generat"],
    "Q5": [r"neural operator|graph simulator|world model|Gaussian splatting",
           r"generat|sampling|synthetic|generative dynamics"],
    "Q6": [r"survey|review|systematic mapping", r"synthetic|generative", r"manufactur|physics|industrial"],
}
BROAD_MFG = re.compile(r"manufactur|industrial|defect|inspection|assembly|semiconductor|wafer|litho|fabricat|additive manufact|weld|machining|machine tool|machine vision|\bcasting\b|factory|production line|quality control|melt pool|powder bed", re.I)
BROAD_PHYS = re.compile(r"physics|physical|conservation|\bPDE\b|finite element|CFD|thermodynamic|mechanic|material property|constitutive|fluid dynamics", re.I)
BROAD_GEN = re.compile(r"generat|synthe|diffusion|GAN|VAE|flow matching|simulation|simulator|digital twin|domain randomization", re.I)
BROAD_CAD = re.compile(r"\bCAD\b|topology optimization|geometry|geometric|\b3D\b|3-D|shape|mesh|solid modeling", re.I)

def normalize_title(s: str) -> str:
    return re.sub(r"\W+", " ", s.casefold()).strip()

def source_payloads():
    paths = list((SEARCH / "historical_official_catalogs").glob("*/records.json"))
    paths += list((SEARCH / "official_proceedings_manifests").glob("*/records.json"))
    paths += list((SEARCH / "iclr_historical_official").glob("*/records.json"))
    paths += list((SEARCH / "aaai_ojs_catalog").glob("aaai_*/records.json"))
    out = {}
    for path in paths:
        d = json.loads(path.read_text(encoding="utf-8"))
        sid = d.get("source_id")
        if not sid or not d.get("records"):
            continue
        previous = out.get(sid)
        if previous:
            # Preserve the first copy and verify repeated captures agree on title frame.
            titles_a = [r.get("title") for r in previous["records"]]
            titles_b = [r.get("title") for r in d["records"]]
            assert titles_a == titles_b, f"conflicting duplicate catalog snapshots: {sid}"
            continue
        out[sid] = d
    return out

def main():
    manifests = source_payloads()
    works = []
    for sid, manifest in manifests.items():
        year = int(manifest["year"])
        if not 2020 <= year <= 2025:
            continue
        for row in manifest["records"]:
            if manifest["venue"] == "AAAI" and "technical tracks" not in str(row.get("track", "")).casefold():
                continue
            works.append({"source_id": sid, "venue": manifest["venue"], "year": year, **row})

    hits_by_query = {}
    all_hits = {}
    for qid, expressions in QUERIES.items():
        hits = []
        for work in works:
            title = work.get("title", "")
            if all(re.search(pattern, title, re.I) for pattern in expressions):
                hits.append(work)
                key = (work["source_id"], work.get("record_id"), normalize_title(title))
                all_hits[key] = work
        hits_by_query[qid] = hits
    title_candidates = []
    permissive_candidate_count = 0
    for work in works:
        title = work.get("title", "")
        key = (work["source_id"], work.get("record_id"), normalize_title(title))
        qmatch = key in all_hits
        permissive_match = re.search(r"manufactur|industrial|defect|litho|fabricat|additive|physics|physical|synthe|generat|process|simulation|CAD|airfoil|assembly|inspection|anomal|3d.print|weld|machin|semiconductor|wafer|material|thermal|fluid|geometry|digital twin|sensor|melt pool|composite|battery|foundry|robotics", title, re.I)
        if permissive_match:
            permissive_candidate_count += 1
        broad_match = (BROAD_MFG.search(title) or
                       (BROAD_PHYS.search(title) and BROAD_GEN.search(title)) or
                       (BROAD_CAD.search(title) and BROAD_GEN.search(title) and re.search(r"manufactur|industrial|material|mechan|process|machine|design|physics|physical", title, re.I)) or
                       qmatch)
        if broad_match:
            queries = [q for q, rows in hits_by_query.items() if any((x["source_id"],x.get("record_id"),normalize_title(x["title"])) == key for x in rows)]
            title_candidates.append({**work, "title_query_ids": queries,
                                     "candidate_retrieval_routes": [route for route, yes in (("explicit_manufacturing_anchor", bool(BROAD_MFG.search(title))),
                                        ("physics_generation_title_pair", bool(BROAD_PHYS.search(title) and BROAD_GEN.search(title))),
                                        ("engineering_geometry_generation_pair", bool(BROAD_CAD.search(title) and BROAD_GEN.search(title) and re.search(r"manufactur|industrial|material|mechan|process|machine|design|physics|physical", title, re.I))),
                                        ("Q1_Q6_title_query", qmatch)) if yes]})

    # Search-frame counts are kept per official source/year; no missing venue/year is filled with zero.
    frame = {sid: {"venue": d["venue"], "year": int(d["year"]), "index_record_count": len(d["records"]),
                   "screened_primary_track_count": sum(1 for r in d["records"] if d["venue"] != "AAAI" or "technical tracks" in str(r.get("track", "")).casefold()),
                   "source_url": d.get("source_url"), "raw_response_sha256": d.get("raw_response_sha256")}
             for sid, d in manifests.items() if 2020 <= int(d["year"]) <= 2025}
    payload = {"schema_version": "1.0", "run_id": "catalog_title_queries_20261011_v2",
               "executed_at": datetime.now(timezone.utc).isoformat(),
               "classification": "title-field search pilot only; not title-abstract search or systematic inclusion screening",
               "source_frame_manifest_count": len(frame), "source_frame_record_count": len(works),
               "source_frame": frame,
               "queries": {qid: {"literal_regexes_applied_to": "title", "regexes": expr,
                                 "hit_count": len(hits_by_query[qid]), "record_keys": [
                                     {"source_id": x["source_id"], "record_id": x.get("record_id"), "title": x["title"]} for x in hits_by_query[qid]]}
                           for qid, expr in QUERIES.items()},
               "query_union_count": len(all_hits), "broad_title_candidate_count": len(title_candidates),
               "permissive_single_anchor_title_candidate_count": permissive_candidate_count,
               "broad_title_candidate_logic": {"manufacturing_anchor": BROAD_MFG.pattern,
                   "physics_and_generation_title_pair": [BROAD_PHYS.pattern, BROAD_GEN.pattern],
                   "engineering_geometry_generation_pair": [BROAD_CAD.pattern, BROAD_GEN.pattern,
                     "plus manufacturing/industrial/material/mechanical/process/machine/design/physics anchor"],
                   "include_all_Q1_to_Q6_title_hits": True}, "candidates": title_candidates,
               "limitations": ["Queries applied to titles only; terms present only in abstracts are missed.",
                               "2026 is outside the completed 2020–2025 cycle search; official 2020–2025 venue-year manifests have been assembled; Work-level deduplication and systematic inclusion screening remain incomplete.",
                               "No work-level deduplication across venues or versions, abstract/fulltext screening, or independent review.",
                               "Counts are title matches and not eligible-study, public-release, or readiness counts."]}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUT.relative_to(ROOT)), "frame_manifests": len(frame),
                      "frame_record_rows": len(works), "query_hits": {q: len(v) for q,v in hits_by_query.items()},
                      "query_union": len(all_hits), "broad_title_candidates": len(title_candidates),
                      "deduplication": "within source record key only; not distinct works"}, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

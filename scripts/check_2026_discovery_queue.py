import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "runs/wp1/search/discovery_queue_2026_partial.json"
data = json.loads(path.read_text(encoding="utf-8"))
service_data = json.loads((ROOT / "service/data/discovery_queue_2026_partial.json").read_text(encoding="utf-8"))
assert data == service_data
assert data["classification"].startswith("partial-year official-conference title discovery queue")
assert data["source_frame_record_count"] == sum(x["record_count"] for x in data["source_frame"])
assert data["title_candidate_count"] == len(data["candidates"])
assert sum(data["review_priority_counts"].values()) == len(data["candidates"])
assert all(x["year"] == data.get("monitored_year",2026) for x in data["candidates"])
assert len({x["queue_id"] for x in data["candidates"]}) == len(data["candidates"])
assert all(x["screening_status"] == "awaiting_human_title_abstract_review" for x in data["candidates"])
assert all(x["evidence_graph_registration"] == "not_registered_pending_review" for x in data["candidates"])
assert all(x["review_priority"] in {"focused_title_candidate", "sensitivity_only"} for x in data["candidates"])
assert all(x["release_status"] == "unassessed" and x["clean_start_status"] == "unassessed"
           and x["industrial_profile_status"] == "unassessed" for x in data["candidates"])
assert any("not enter the evidence graph" in x for x in data["limitations"])
print(json.dumps({"validation": "passed", "venues": len(data["source_frame"]),
                  "frame_rows": data["source_frame_record_count"],
                  "candidates_pending_review": data["title_candidate_count"]}, indent=2))

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

DATA_FILE = Path(__file__).parent / "src" / "data" / "flows.json"

def main() -> None:
    flows = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    assert len(flows) == 8, "Expected eight controlled demo flows"
    assert len({flow["id"] for flow in flows}) == len(flows), "Flow IDs must be unique"
    pairs: dict[str, list[dict[str, object]]] = defaultdict(list)
    for flow in flows:
        pairs[flow["pairId"]].append(flow)
        assert flow["label"] in {"normal", "hidden_fee", "preselected_addon", "trial_to_paid"}
        assert 1 <= flow["feeFirstStep"] <= 4 or flow["feeFirstStep"] == 0
        assert 1 <= flow["renewalFirstStep"] <= 4 or flow["renewalFirstStep"] == 0
    assert len(pairs) == 4, "Expected four controlled pairs"
    for pair_id, members in pairs.items():
        assert len(members) == 2, f"{pair_id} must contain two variants"
        labels = {member["label"] for member in members}
        assert "normal" in labels and len(labels) == 2, f"{pair_id} needs normal and risk variants"
        for field in ("pairId", "templateId", "product", "currency", "basePrice", "changedFactor"):
            assert len({member[field] for member in members}) == 1, f"{pair_id} differs on {field}"
    counts = Counter(flow["label"] for flow in flows)
    print("Demo flow validation passed")
    print(f"Flows: {len(flows)} | Controlled pairs: {len(pairs)}")
    print("Labels: " + ", ".join(f"{label}={count}" for label, count in sorted(counts.items())))

if __name__ == "__main__":
    main()


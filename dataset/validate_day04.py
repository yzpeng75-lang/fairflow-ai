from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).parent
FLOWS = ROOT / "annotations" / "day04_flows.csv"
STATES = ROOT / "annotations" / "day04_page_states.jsonl"
SPLITS = ROOT / "annotations" / "day04_splits.json"


def main() -> None:
    with FLOWS.open(encoding="utf-8-sig", newline="") as handle:
        flows = list(csv.DictReader(handle))
    states = [json.loads(line) for line in STATES.read_text(encoding="utf-8").splitlines()]
    manifest = json.loads(SPLITS.read_text(encoding="utf-8"))

    assert len(flows) == 60
    assert len(states) == 240
    assert len({row["flow_id"] for row in flows}) == 60
    assert len({row["state_id"] for row in states}) == 240

    split_templates = {name: set(manifest[name]) for name in ("train", "validation", "test")}
    assert not split_templates["train"] & split_templates["validation"]
    assert not split_templates["train"] & split_templates["test"]
    assert not split_templates["validation"] & split_templates["test"]
    assert sum(map(len, split_templates.values())) == 10

    flow_map = {row["flow_id"]: row for row in flows}
    state_groups: dict[str, list[dict[str, object]]] = defaultdict(list)
    pairs: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in flows:
        pairs[row["pair_id"]].append(row)
        assert row["template_id"] in split_templates[row["split"]]
    for state in states:
        state_groups[state["flow_id"]].append(state)
        assert state["contains_sensitive_data"] is False
        assert state["split"] == flow_map[state["flow_id"]]["split"]
    for flow_id, members in state_groups.items():
        assert [row["step"] for row in members] == [1, 2, 3, 4], flow_id
    for pair_id, members in pairs.items():
        assert len(members) == 2, pair_id
        by_label = {row["label"]: row for row in members}
        risk_type = members[0]["risk_type"]
        assert set(by_label) == {"normal", risk_type}, pair_id
        for field in ("template_id", "split", "language", "scenario", "risk_type", "currency", "changed_factor"):
            assert len({row[field] for row in members}) == 1, f"{pair_id}: {field} differs"
        normal = by_label["normal"]
        risky = by_label[risk_type]
        allowed_changes = {
            "hidden_fee": {"flow_id", "label", "fee_first_step"},
            "preselected_addon": {"flow_id", "label", "addon_default_selected", "final_price"},
            "trial_to_paid": {"flow_id", "label", "renewal_first_step"},
        }[risk_type]
        actual_changes = {field for field in normal if normal[field] != risky[field]}
        assert actual_changes == allowed_changes, f"{pair_id}: unexpected differences {actual_changes}"
        if risk_type == "trial_to_paid":
            assert {row["auto_renewal"] for row in members} == {"True"}

    labels = Counter(row["label"] for row in flows)
    split_counts = Counter(row["split"] for row in flows)
    assert labels == Counter({"normal": 30, "hidden_fee": 10, "preselected_addon": 10, "trial_to_paid": 10})
    assert split_counts == Counter({"train": 36, "validation": 12, "test": 12})
    print("FairFlow-Bench Day 4 validation passed")
    print(f"Flows: {len(flows)} | States: {len(states)} | Pairs: {len(pairs)}")
    print(f"Templates: train=6, validation=2, test=2")
    print("Labels: " + ", ".join(f"{key}={labels[key]}" for key in sorted(labels)))


if __name__ == "__main__":
    main()

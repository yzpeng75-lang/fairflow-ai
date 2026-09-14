from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.detectors.choice_guard import (  # noqa: E402
    ChoiceGuardRequest,
    ChoiceObservation,
    PaidChoice,
    analyze_choice_guard,
)


def main() -> None:
    annotation_dir = ROOT / "dataset" / "annotations"
    with (annotation_dir / "day04_flows.csv").open(encoding="utf-8-sig", newline="") as handle:
        flow_rows = list(csv.DictReader(handle))
    states = [
        json.loads(line)
        for line in (annotation_dir / "day04_page_states.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    states_by_flow: dict[str, list[dict[str, object]]] = defaultdict(list)
    for state in states:
        states_by_flow[str(state["flow_id"])].append(state)

    examples = [row for row in flow_rows if row["risk_type"] == "preselected_addon"]
    predictions: list[dict[str, str]] = []
    for flow in examples:
        observations = []
        for state in states_by_flow[flow["flow_id"]]:
            choices = []
            if state["addon_visible"]:
                choices.append(
                    PaidChoice(
                        control_id=f"{flow['template_id']}-addon",
                        label=flow["addon_name"],
                        price=float(flow["addon_price"]),
                        selected=bool(state["addon_selected"]),
                        required=False,
                        selection_origin="page_default",
                    )
                )
            observations.append(
                ChoiceObservation(
                    step=int(state["step"]),
                    page_type=str(state["page_type"]),
                    currency=str(state["currency"]),
                    choices=choices,
                )
            )
        result = analyze_choice_guard(ChoiceGuardRequest(flow_id=flow["flow_id"], observations=observations))
        predictions.append({"truth": flow["label"], "prediction": result.label})

    tp = sum(row["truth"] == "preselected_addon" and row["prediction"] == "preselected_addon" for row in predictions)
    tn = sum(row["truth"] == "normal" and row["prediction"] == "normal" for row in predictions)
    fp = sum(row["truth"] == "normal" and row["prediction"] == "preselected_addon" for row in predictions)
    fn = sum(row["truth"] == "preselected_addon" and row["prediction"] == "normal" for row in predictions)
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    report = {
        "detector": "ChoiceGuard-v0.1",
        "dataset": "FairFlow-Bench preselected-add-on controlled pairs",
        "scope": "synthetic controlled benchmark only",
        "examples": len(predictions),
        "confusion_matrix": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        "metrics": {"precision": precision, "recall": recall, "f1": f1},
        "warning": "These results do not establish performance on unfamiliar real websites.",
    }
    report_dir = ROOT / "evaluation" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / "day06_choice_guard.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

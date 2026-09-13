from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.detectors.price_trace import LineItem, PriceObservation, PriceTraceRequest, analyze_price_trace  # noqa: E402


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

    examples = [row for row in flow_rows if row["risk_type"] == "hidden_fee"]
    predictions: list[dict[str, object]] = []
    for flow in examples:
        observations = []
        for state in states_by_flow[flow["flow_id"]]:
            items = []
            if state["fee_visible"]:
                items.append(LineItem(name=flow["fee_name"], amount=float(flow["fee_amount"]), kind="mandatory_fee"))
            observations.append(
                PriceObservation(
                    step=int(state["step"]),
                    page_type=str(state["page_type"]),
                    currency=str(state["currency"]),
                    visible_total=float(state["visible_total"]),
                    line_items=items,
                )
            )
        result = analyze_price_trace(PriceTraceRequest(flow_id=flow["flow_id"], observations=observations))
        predictions.append({"flow_id": flow["flow_id"], "truth": flow["label"], "prediction": result.label})

    tp = sum(row["truth"] == "hidden_fee" and row["prediction"] == "hidden_fee" for row in predictions)
    tn = sum(row["truth"] == "normal" and row["prediction"] == "normal" for row in predictions)
    fp = sum(row["truth"] == "normal" and row["prediction"] == "hidden_fee" for row in predictions)
    fn = sum(row["truth"] == "hidden_fee" and row["prediction"] == "normal" for row in predictions)
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    report = {
        "detector": "PriceTrace-v0.1",
        "dataset": "FairFlow-Bench Day 4 hidden-fee controlled pairs",
        "scope": "synthetic controlled benchmark only",
        "examples": len(predictions),
        "confusion_matrix": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        "metrics": {"precision": precision, "recall": recall, "f1": 2 * precision * recall / (precision + recall)},
        "warning": "These results do not establish performance on unfamiliar real websites.",
    }
    report_dir = ROOT / "evaluation" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / "day05_price_trace.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()


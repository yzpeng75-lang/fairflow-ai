from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

from text_baseline import MultinomialNaiveBayes


ROOT = Path(__file__).resolve().parents[1]
LABELS = ["normal", "hidden_fee", "preselected_addon", "trial_to_paid"]


def calculate_metrics(truths: list[str], predictions: list[str]) -> dict[str, object]:
    per_class = {}
    for label in LABELS:
        tp = sum(t == label and p == label for t, p in zip(truths, predictions))
        fp = sum(t != label and p == label for t, p in zip(truths, predictions))
        fn = sum(t == label and p != label for t, p in zip(truths, predictions))
        precision = tp / (tp + fp) if tp + fp else 0
        recall = tp / (tp + fn) if tp + fn else 0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
        per_class[label] = {"precision": precision, "recall": recall, "f1": f1}
    return {
        "accuracy": sum(t == p for t, p in zip(truths, predictions)) / len(truths),
        "macro_f1": sum(values["f1"] for values in per_class.values()) / len(LABELS),
        "per_class": per_class,
    }


def state_text(states: list[dict[str, object]], final_only: bool) -> str:
    selected = states[-1:] if final_only else states
    return " ".join(f"step_{state['step']} {state['evidence_text']}" for state in selected)


def full_flow_prediction(states: list[dict[str, object]]) -> str:
    first_total = float(states[0]["visible_total"])
    last_total = float(states[-1]["visible_total"])
    fee_steps = [int(state["step"]) for state in states if state["fee_visible"]]
    if fee_steps and min(fee_steps) > 1 and last_total > first_total:
        return "hidden_fee"
    if any(state["addon_visible"] and state["addon_selected"] for state in states):
        return "preselected_addon"
    renewal_steps = [int(state["step"]) for state in states if state["renewal_visible"] and state["auto_renewal"]]
    if renewal_steps and min(renewal_steps) >= int(states[-1]["step"]):
        return "trial_to_paid"
    return "normal"


def final_page_rules(state: dict[str, object]) -> str:
    if state["addon_visible"] and state["addon_selected"]:
        return "preselected_addon"
    if state["renewal_visible"] and state["auto_renewal"]:
        return "trial_to_paid"
    if state["fee_visible"]:
        return "hidden_fee"
    return "normal"


def main() -> None:
    annotation_dir = ROOT / "dataset" / "annotations"
    with (annotation_dir / "day04_flows.csv").open(encoding="utf-8-sig", newline="") as handle:
        flows = list(csv.DictReader(handle))
    states = [json.loads(line) for line in (annotation_dir / "day04_page_states.jsonl").read_text(encoding="utf-8").splitlines()]
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for state in states:
        grouped[str(state["flow_id"])].append(state)

    train = [flow for flow in flows if flow["split"] == "train"]
    test = [flow for flow in flows if flow["split"] == "test"]
    truths = [flow["label"] for flow in test]
    experiments: dict[str, list[str]] = {}

    for name, final_only in (("final_page_text_nb", True), ("sequence_text_nb", False)):
        model = MultinomialNaiveBayes().fit(
            [state_text(grouped[flow["flow_id"]], final_only) for flow in train],
            [flow["label"] for flow in train],
        )
        experiments[name] = model.predict([state_text(grouped[flow["flow_id"]], final_only) for flow in test])

    experiments["final_page_rules"] = [final_page_rules(grouped[flow["flow_id"]][-1]) for flow in test]
    experiments["full_flow_engine"] = [full_flow_prediction(grouped[flow["flow_id"]]) for flow in test]
    report = {
        "experiment": "Day 11 template-disjoint ablation",
        "train_flows": len(train),
        "test_flows": len(test),
        "train_templates": 6,
        "test_templates": 2,
        "results": {name: calculate_metrics(truths, predictions) for name, predictions in experiments.items()},
        "predictions": [
            {"flow_id": flow["flow_id"], "truth": truth, **{name: predictions[index] for name, predictions in experiments.items()}}
            for index, (flow, truth) in enumerate(zip(test, truths))
        ],
        "warning": "All results use synthetic controlled data; only the split methodology generalizes beyond it.",
    }
    output = ROOT / "evaluation" / "reports" / "day11_ablation.json"
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = {name: values["macro_f1"] for name, values in report["results"].items()}
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()


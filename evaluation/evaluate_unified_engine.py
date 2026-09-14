from __future__ import annotations

import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.analysis_engine import UnifiedAnalysisRequest, analyze_checkout  # noqa: E402
from app.detectors.choice_guard import ChoiceGuardRequest, ChoiceObservation, PaidChoice  # noqa: E402
from app.detectors.price_trace import LineItem, PriceObservation, PriceTraceRequest  # noqa: E402
from app.detectors.renewal_lens import RenewalLensRequest, RenewalObservation, RenewalTerm  # noqa: E402


LABELS = ["normal", "hidden_fee", "preselected_addon", "trial_to_paid"]


def metrics_for(label: str, truths: list[str], predictions: list[str]) -> dict[str, float]:
    tp = sum(truth == label and prediction == label for truth, prediction in zip(truths, predictions))
    fp = sum(truth != label and prediction == label for truth, prediction in zip(truths, predictions))
    fn = sum(truth == label and prediction != label for truth, prediction in zip(truths, predictions))
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {"precision": precision, "recall": recall, "f1": f1}


def main() -> None:
    annotation_dir = ROOT / "dataset" / "annotations"
    with (annotation_dir / "day04_flows.csv").open(encoding="utf-8-sig", newline="") as handle:
        flows = list(csv.DictReader(handle))
    states = [
        json.loads(line)
        for line in (annotation_dir / "day04_page_states.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    states_by_flow: dict[str, list[dict[str, object]]] = defaultdict(list)
    for state in states:
        states_by_flow[str(state["flow_id"])].append(state)

    truths: list[str] = []
    predictions: list[str] = []
    scores: list[int] = []
    for flow in flows:
        flow_states = states_by_flow[flow["flow_id"]]
        price_observations = []
        for state in flow_states:
            items = []
            if state["fee_visible"]:
                items.append(LineItem(name=flow["fee_name"], amount=float(flow["fee_amount"]), kind="mandatory_fee"))
            price_observations.append(
                PriceObservation(
                    step=int(state["step"]), page_type=str(state["page_type"]),
                    currency=str(state["currency"]), visible_total=float(state["visible_total"]),
                    line_items=items,
                )
            )
        price = PriceTraceRequest(flow_id=flow["flow_id"], observations=price_observations)

        choice = None
        if flow["risk_type"] == "preselected_addon":
            choice_observations = []
            for state in flow_states:
                choices = []
                if state["addon_visible"]:
                    choices.append(
                        PaidChoice(
                            control_id=f"{flow['template_id']}-addon", label=flow["addon_name"],
                            price=float(flow["addon_price"]), selected=bool(state["addon_selected"]),
                            required=False, selection_origin="page_default",
                        )
                    )
                choice_observations.append(
                    ChoiceObservation(
                        step=int(state["step"]), page_type=str(state["page_type"]),
                        currency=str(state["currency"]), choices=choices,
                    )
                )
            choice = ChoiceGuardRequest(flow_id=flow["flow_id"], observations=choice_observations)

        renewal = None
        if flow["risk_type"] == "trial_to_paid":
            renewal_observations = []
            for state in flow_states:
                terms = []
                if state["renewal_visible"]:
                    terms.append(
                        RenewalTerm(
                            term_id=f"{flow['template_id']}-renewal", trial_days=int(flow["trial_days"]),
                            renewal_price=float(flow["renewal_price"]), billing_interval=flow["billing_interval"],
                            auto_renewal=flow["auto_renewal"] == "True",
                            disclosure_text=str(state["evidence_text"]),
                        )
                    )
                renewal_observations.append(
                    RenewalObservation(
                        step=int(state["step"]), page_type=str(state["page_type"]),
                        currency=str(state["currency"]), terms=terms,
                    )
                )
            renewal = RenewalLensRequest(
                flow_id=flow["flow_id"], commitment_step=4, observations=renewal_observations
            )

        result = analyze_checkout(
            UnifiedAnalysisRequest(
                flow_id=flow["flow_id"], price_trace=price,
                choice_guard=choice, renewal_lens=renewal,
            )
        )
        prediction = result.findings[0].risk_type if result.findings else "normal"
        truths.append(flow["label"])
        predictions.append(prediction)
        scores.append(result.risk_score)

    per_class = {label: metrics_for(label, truths, predictions) for label in LABELS}
    confusion = {
        truth: {prediction: sum(t == truth and p == prediction for t, p in zip(truths, predictions)) for prediction in LABELS}
        for truth in LABELS
    }
    accuracy = sum(truth == prediction for truth, prediction in zip(truths, predictions)) / len(truths)
    report = {
        "engine": "FairFlow-Engine-v0.1",
        "dataset": "FairFlow-Bench full controlled release",
        "scope": "synthetic controlled benchmark only",
        "examples": len(truths),
        "accuracy": accuracy,
        "macro_f1": sum(item["f1"] for item in per_class.values()) / len(per_class),
        "per_class": per_class,
        "confusion_matrix": confusion,
        "risk_score_distribution": dict(sorted(Counter(scores).items())),
        "warning": "These results do not establish performance on unfamiliar real websites.",
    }
    report_dir = ROOT / "evaluation" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / "day08_unified_engine.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

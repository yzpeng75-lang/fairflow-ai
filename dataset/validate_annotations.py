from __future__ import annotations

import csv
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path


DATA_FILE = Path(__file__).parent / "annotations" / "day02_flow_pairs.csv"
LABELS = {"normal", "hidden_fee", "preselected_addon", "trial_to_paid"}
SEVERITIES = {"none", "low", "medium", "high"}
INTERVALS = {"none", "week", "month", "year"}
BOOLEAN_FIELDS = {"addon_selected", "auto_renewal"}
DECIMAL_FIELDS = {
    "initial_price",
    "final_price",
    "added_fee",
    "addon_price",
    "renewal_price",
}


def fail(message: str) -> None:
    raise ValueError(message)


def load_rows() -> list[dict[str, str]]:
    with DATA_FILE.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def validate() -> None:
    rows = load_rows()
    if len(rows) < 20:
        fail(f"Expected at least 20 rows, found {len(rows)}")

    ids = [row["flow_id"] for row in rows]
    if len(ids) != len(set(ids)):
        fail("flow_id values must be unique")

    pairs: dict[str, list[dict[str, str]]] = defaultdict(list)
    label_counts = Counter()

    for row in rows:
        label = row["label"]
        if label not in LABELS:
            fail(f"{row['flow_id']}: unknown label {label}")
        if row["severity"] not in SEVERITIES:
            fail(f"{row['flow_id']}: unknown severity")
        if row["billing_interval"] not in INTERVALS:
            fail(f"{row['flow_id']}: unknown billing interval")
        if row["language"] not in {"en", "zh"}:
            fail(f"{row['flow_id']}: unsupported language")
        if int(row["total_steps"]) < 2:
            fail(f"{row['flow_id']}: a flow needs at least two steps")
        if not row["evidence_text"].strip():
            fail(f"{row['flow_id']}: missing evidence")

        for field in BOOLEAN_FIELDS:
            if row[field] not in {"true", "false"}:
                fail(f"{row['flow_id']}: {field} must be true or false")
        for field in DECIMAL_FIELDS:
            if Decimal(row[field]) < 0:
                fail(f"{row['flow_id']}: {field} cannot be negative")

        # The seed release duplicates the provisional label across these fields only.
        # to exercise the future review schema. This is not human agreement.
        if not (
            row["annotator_1"]
            == row["annotator_2"]
            == row["adjudicated_label"]
            == label
        ):
            fail(f"{row['flow_id']}: seed-label fixture is inconsistent")

        if label == "normal" and row["severity"] != "none":
            fail(f"{row['flow_id']}: normal flow must have no severity")
        if label == "hidden_fee":
            expected_fee = Decimal(row["final_price"]) - Decimal(row["initial_price"])
            if Decimal(row["added_fee"]) != expected_fee or expected_fee <= 0:
                fail(f"{row['flow_id']}: inconsistent hidden fee")
        if label == "preselected_addon" and row["addon_selected"] != "true":
            fail(f"{row['flow_id']}: risky add-on must be selected")
        if label == "trial_to_paid":
            if row["auto_renewal"] != "true" or Decimal(row["renewal_price"]) <= 0:
                fail(f"{row['flow_id']}: recurring charge fields are incomplete")

        pairs[row["pair_id"]].append(row)
        label_counts[label] += 1

    for pair_id, pair_rows in pairs.items():
        if len(pair_rows) != 2:
            fail(f"{pair_id}: expected exactly two flows")
        labels = {row["label"] for row in pair_rows}
        if "normal" not in labels or len(labels) != 2:
            fail(f"{pair_id}: requires one normal and one risky flow")
        for field in ("template_id", "language", "scenario", "total_steps", "changed_factor"):
            if len({row[field] for row in pair_rows}) != 1:
                fail(f"{pair_id}: paired rows disagree on {field}")

    for label in LABELS:
        if label_counts[label] < 5:
            fail(f"{label}: expected at least five examples")

    print("FairFlow-Bench seed schema validation passed")
    print("Review status: provisional seed labels; independent human review pending")
    print(f"Rows: {len(rows)} | Pairs: {len(pairs)}")
    print("Labels: " + ", ".join(f"{k}={label_counts[k]}" for k in sorted(LABELS)))


if __name__ == "__main__":
    validate()

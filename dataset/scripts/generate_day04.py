from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "annotations"

TEMPLATES = [
    {"id": "airline_01", "split": "train", "language": "en", "scenario": "Flight booking", "brand": "Northstar Air", "product": "Economy flight", "currency": "USD", "base": 399.0, "fee": ["Carrier service fee", 60.0], "addon": ["Travel protection", 24.0], "trial": [7, 14.99, "month"]},
    {"id": "hotel_01", "split": "train", "language": "en", "scenario": "Hotel booking", "brand": "Juniper House", "product": "Garden room", "currency": "USD", "base": 520.0, "fee": ["Resort fee", 48.0], "addon": ["Flexible cancellation", 35.0], "trial": [14, 19.99, "month"]},
    {"id": "retail_01", "split": "train", "language": "zh", "scenario": "电子产品购买", "brand": "声屿商店", "product": "Arc无线降噪耳机", "currency": "CNY", "base": 899.0, "fee": ["订单处理费", 29.0], "addon": ["两年延长保障", 69.0], "trial": [7, 29.9, "month"]},
    {"id": "subscription_01", "split": "train", "language": "en", "scenario": "Music membership", "brand": "Luma Music", "product": "Luma Plus", "currency": "USD", "base": 49.0, "fee": ["Activation fee", 6.0], "addon": ["Hi-res audio pack", 8.0], "trial": [7, 15.99, "month"]},
    {"id": "rail_01", "split": "train", "language": "zh", "scenario": "火车票预订", "brand": "远行铁路", "product": "城际列车票", "currency": "CNY", "base": 240.0, "fee": ["出票服务费", 10.0], "addon": ["出行保障", 12.0], "trial": [14, 18.0, "month"]},
    {"id": "food_01", "split": "train", "language": "en", "scenario": "Food delivery", "brand": "Mallow Kitchen", "product": "Dinner order", "currency": "USD", "base": 38.0, "fee": ["Packaging fee", 5.0], "addon": ["Priority delivery", 7.0], "trial": [30, 9.99, "month"]},
    {"id": "course_01", "split": "validation", "language": "en", "scenario": "Online course", "brand": "Atlas Learning", "product": "Data course", "currency": "USD", "base": 99.0, "fee": ["Processing fee", 9.9], "addon": ["Mentor review", 25.0], "trial": [7, 39.0, "month"]},
    {"id": "flowers_01", "split": "validation", "language": "zh", "scenario": "鲜花配送", "brand": "春屿花店", "product": "季节花束", "currency": "CNY", "base": 129.0, "fee": ["包装服务费", 8.0], "addon": ["鲜花会员", 19.0], "trial": [14, 25.0, "month"]},
    {"id": "rental_01", "split": "test", "language": "en", "scenario": "Car rental", "brand": "Harbor Drive", "product": "Compact car", "currency": "USD", "base": 260.0, "fee": ["Location fee", 32.0], "addon": ["Premium coverage", 45.0], "trial": [7, 29.0, "month"]},
    {"id": "cloud_01", "split": "test", "language": "zh", "scenario": "云存储服务", "brand": "云栈", "product": "个人云空间", "currency": "CNY", "base": 59.0, "fee": ["账户开通费", 6.0], "addon": ["数据恢复服务", 15.0], "trial": [14, 29.9, "month"]},
]

FLOW_FIELDS = [
    "flow_id", "pair_id", "template_id", "split", "language", "scenario",
    "risk_type", "label", "changed_factor", "currency", "base_price",
    "final_price", "fee_name", "fee_amount", "fee_first_step", "addon_name",
    "addon_price", "addon_default_selected", "trial_days", "renewal_price",
    "billing_interval", "renewal_first_step", "auto_renewal", "total_steps",
    "data_origin",
]


def flow_row(template: dict[str, object], risk_type: str, risky: bool) -> dict[str, object]:
    suffix = "r" if risky else "n"
    pair_id = f"d04_{template['id']}_{risk_type}"
    base = float(template["base"])
    fee_name, fee_amount = template["fee"]
    addon_name, addon_price = template["addon"]
    trial_days, renewal_price, interval = template["trial"]
    row: dict[str, object] = {
        "flow_id": f"{pair_id}_{suffix}", "pair_id": pair_id,
        "template_id": template["id"], "split": template["split"],
        "language": template["language"], "scenario": template["scenario"],
        "risk_type": risk_type, "label": risk_type if risky else "normal",
        "changed_factor": "fee_disclosure_timing" if risk_type == "hidden_fee" else "default_selection" if risk_type == "preselected_addon" else "renewal_disclosure_timing",
        "currency": template["currency"], "base_price": base,
        "final_price": base, "fee_name": "", "fee_amount": 0.0,
        "fee_first_step": 0, "addon_name": "", "addon_price": 0.0,
        "addon_default_selected": False, "trial_days": 0,
        "renewal_price": 0.0, "billing_interval": "none",
        "renewal_first_step": 0, "auto_renewal": False,
        "total_steps": 4, "data_origin": "synthetic_controlled",
    }
    if risk_type == "hidden_fee":
        row.update(fee_name=fee_name, fee_amount=fee_amount,
                   fee_first_step=4 if risky else 1,
                   final_price=round(base + float(fee_amount), 2))
    elif risk_type == "preselected_addon":
        row.update(addon_name=addon_name, addon_price=addon_price,
                   addon_default_selected=risky,
                   final_price=round(base + (float(addon_price) if risky else 0), 2))
    else:
        row.update(base_price=0.0, final_price=0.0, trial_days=trial_days,
                   renewal_price=renewal_price, billing_interval=interval,
                   renewal_first_step=4 if risky else 1, auto_renewal=True)
    return row


def evidence_text(flow: dict[str, object], step: int) -> str:
    parts = [str(flow["scenario"]), f"step {step}"]
    if flow["risk_type"] == "hidden_fee" and int(flow["fee_first_step"]) <= step:
        parts.append(f"{flow['fee_name']} {flow['fee_amount']} {flow['currency']}")
    if flow["risk_type"] == "preselected_addon" and step >= 2:
        state = "selected" if flow["addon_default_selected"] else "not selected"
        parts.append(f"{flow['addon_name']} {flow['addon_price']} {flow['currency']} {state}")
    if flow["risk_type"] == "trial_to_paid" and int(flow["renewal_first_step"]) <= step:
        parts.append(f"{flow['trial_days']}-day trial then {flow['renewal_price']} {flow['currency']} per {flow['billing_interval']}")
    return " | ".join(parts)


def state_rows(flow: dict[str, object]) -> list[dict[str, object]]:
    rows = []
    page_types = ["product", "cart", "details", "review"]
    for step, page_type in enumerate(page_types, 1):
        fee_visible = bool(flow["fee_name"]) and int(flow["fee_first_step"]) <= step
        addon_visible = bool(flow["addon_name"]) and step >= 2
        renewal_visible = int(flow["trial_days"]) > 0 and int(flow["renewal_first_step"]) <= step
        visible_total = float(flow["base_price"])
        if fee_visible:
            visible_total += float(flow["fee_amount"])
        if addon_visible and flow["addon_default_selected"]:
            visible_total += float(flow["addon_price"])
        rows.append({
            "state_id": f"{flow['flow_id']}_s{step}", "flow_id": flow["flow_id"],
            "pair_id": flow["pair_id"], "template_id": flow["template_id"],
            "split": flow["split"], "step": step, "page_type": page_type,
            "language": flow["language"], "flow_label": flow["label"],
            "risk_type": flow["risk_type"], "currency": flow["currency"],
            "visible_total": round(visible_total, 2), "fee_visible": fee_visible,
            "fee_amount_visible": float(flow["fee_amount"]) if fee_visible else 0.0,
            "addon_visible": addon_visible,
            "addon_selected": bool(flow["addon_default_selected"]) if addon_visible else False,
            "renewal_visible": renewal_visible,
            "auto_renewal": bool(flow["auto_renewal"]) if renewal_visible else False,
            "evidence_text": evidence_text(flow, step),
            "contains_sensitive_data": False,
        })
    return rows


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    flows = [flow_row(template, risk, risky) for template in TEMPLATES
             for risk in ("hidden_fee", "preselected_addon", "trial_to_paid")
             for risky in (False, True)]
    states = [state for flow in flows for state in state_rows(flow)]

    with (OUTPUT / "day04_flows.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FLOW_FIELDS)
        writer.writeheader()
        writer.writerows(flows)
    with (OUTPUT / "day04_page_states.jsonl").open("w", encoding="utf-8") as handle:
        for state in states:
            handle.write(json.dumps(state, ensure_ascii=False) + "\n")
    manifest = {
        "strategy": "template-disjoint",
        "seed": 20260913,
        "train": [t["id"] for t in TEMPLATES if t["split"] == "train"],
        "validation": [t["id"] for t in TEMPLATES if t["split"] == "validation"],
        "test": [t["id"] for t in TEMPLATES if t["split"] == "test"],
    }
    (OUTPUT / "day04_splits.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(flows)} flows and {len(states)} page states")


if __name__ == "__main__":
    main()


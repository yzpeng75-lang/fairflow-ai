from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def observation(step: int, total: float, items: list[dict[str, object]] | None = None) -> dict[str, object]:
    return {
        "step": step,
        "page_type": "review" if step == 4 else "checkout",
        "currency": "USD",
        "visible_total": total,
        "line_items": items or [],
    }


def test_flags_late_mandatory_fee_with_evidence() -> None:
    payload = {
        "flow_id": "airline_hidden_fee",
        "observations": [
            observation(1, 399),
            observation(2, 399),
            observation(3, 399),
            observation(4, 459, [{"name": "Carrier service fee", "amount": 60, "kind": "mandatory_fee"}]),
        ],
    }
    response = client.post("/api/v1/analyze/price-trace", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["label"] == "hidden_fee"
    assert result["confidence"] == 0.97
    assert result["evidence"]["first_seen_step"] == 4
    assert result["evidence"]["increase"] == 60


def test_accepts_fee_disclosed_from_first_step() -> None:
    fee = [{"name": "Carrier service fee", "amount": 60, "kind": "mandatory_fee"}]
    payload = {
        "flow_id": "airline_clear",
        "observations": [observation(step, 459, fee) for step in range(1, 5)],
    }
    result = client.post("/api/v1/analyze/price-trace", json=payload).json()
    assert result["label"] == "normal"
    assert result["flagged"] is False


def test_does_not_call_optional_addon_a_hidden_fee() -> None:
    payload = {
        "flow_id": "optional_addon",
        "observations": [
            observation(1, 100),
            observation(2, 120, [{"name": "Protection", "amount": 20, "kind": "optional_addon"}]),
        ],
    }
    result = client.post("/api/v1/analyze/price-trace", json=payload).json()
    assert result["label"] == "normal"


def test_rejects_mixed_currency_timeline() -> None:
    payload = {
        "flow_id": "invalid",
        "observations": [observation(1, 100), {**observation(2, 120), "currency": "CNY"}],
    }
    response = client.post("/api/v1/analyze/price-trace", json=payload)
    assert response.status_code == 422


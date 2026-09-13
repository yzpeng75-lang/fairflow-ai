from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def price_request(*, risky: bool = False) -> dict[str, object]:
    fee = [{"name": "Service fee", "amount": 20, "kind": "mandatory_fee"}]
    return {
        "flow_id": "combined-flow",
        "observations": [
            {"step": 1, "page_type": "product", "currency": "USD", "visible_total": 100, "line_items": []},
            {
                "step": 4,
                "page_type": "review",
                "currency": "USD",
                "visible_total": 120 if risky else 100,
                "line_items": fee if risky else [],
            },
        ],
    }


def choice_request() -> dict[str, object]:
    return {
        "flow_id": "combined-flow",
        "observations": [
            {
                "step": 2,
                "page_type": "cart",
                "currency": "USD",
                "choices": [
                    {
                        "control_id": "cover",
                        "label": "Protection",
                        "price": 12,
                        "selected": True,
                        "required": False,
                        "selection_origin": "page_default",
                    }
                ],
            }
        ],
    }


def renewal_request() -> dict[str, object]:
    renewal = {
        "term_id": "plan",
        "trial_days": 7,
        "renewal_price": 15.99,
        "billing_interval": "month",
        "auto_renewal": True,
        "disclosure_text": "Then $15.99/month.",
    }
    return {
        "flow_id": "combined-flow",
        "commitment_step": 4,
        "observations": [
            {"step": 1, "page_type": "product", "currency": "USD", "terms": []},
            {"step": 4, "page_type": "review", "currency": "USD", "terms": [renewal]},
        ],
    }


def analyze(**detectors: object) -> dict[str, object]:
    payload = {"flow_id": "combined-flow", "price_trace": price_request(), **detectors}
    response = client.post("/api/v1/analyze/checkout", json=payload)
    assert response.status_code == 200
    return response.json()


def test_clear_when_applicable_detector_has_no_evidence_of_risk() -> None:
    result = analyze()
    assert result["risk_score"] == 0
    assert result["risk_level"] == "clear"
    assert result["findings"] == []


def test_hidden_fee_is_high_risk() -> None:
    payload = {"flow_id": "combined-flow", "price_trace": price_request(risky=True)}
    result = client.post("/api/v1/analyze/checkout", json=payload).json()
    assert result["risk_score"] == 45
    assert result["risk_level"] == "high"
    assert result["findings"][0]["risk_type"] == "hidden_fee"


def test_preselected_addon_is_moderate_risk() -> None:
    result = analyze(choice_guard=choice_request())
    assert result["risk_score"] == 30
    assert result["risk_level"] == "moderate"


def test_delayed_renewal_is_high_risk() -> None:
    result = analyze(renewal_lens=renewal_request())
    assert result["risk_score"] == 40
    assert result["risk_level"] == "high"


def test_multiple_findings_are_capped_at_critical_100() -> None:
    payload = {
        "flow_id": "combined-flow",
        "price_trace": price_request(risky=True),
        "choice_guard": choice_request(),
        "renewal_lens": renewal_request(),
    }
    result = client.post("/api/v1/analyze/checkout", json=payload).json()
    assert result["risk_score"] == 100
    assert result["risk_level"] == "critical"
    assert len(result["findings"]) == 3


def test_rejects_detector_data_from_another_flow() -> None:
    choice = choice_request()
    choice["flow_id"] = "another-flow"
    payload = {"flow_id": "combined-flow", "price_trace": price_request(), "choice_guard": choice}
    response = client.post("/api/v1/analyze/checkout", json=payload)
    assert response.status_code == 422


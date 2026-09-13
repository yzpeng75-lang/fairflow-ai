from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def payload(*, selected: bool, required: bool = False, origin: str = "page_default") -> dict[str, object]:
    return {
        "flow_id": "headphones",
        "observations": [
            {
                "step": 2,
                "page_type": "cart",
                "currency": "cny",
                "choices": [
                    {
                        "control_id": "warranty",
                        "label": "Two-year protection",
                        "price": 69,
                        "selected": selected,
                        "required": required,
                        "selection_origin": origin,
                    }
                ],
            }
        ],
    }


def test_flags_optional_paid_choice_selected_by_default() -> None:
    response = client.post("/api/v1/analyze/choice-guard", json=payload(selected=True))
    assert response.status_code == 200
    result = response.json()
    assert result["label"] == "preselected_addon"
    assert result["confidence"] == 0.98
    assert result["currency"] == "CNY"
    assert result["findings"][0]["price"] == 69
    assert result["findings"][0]["first_seen_step"] == 2


def test_accepts_unchecked_optional_choice() -> None:
    result = client.post("/api/v1/analyze/choice-guard", json=payload(selected=False)).json()
    assert result["label"] == "normal"
    assert result["findings"] == []


def test_accepts_choice_selected_by_user() -> None:
    result = client.post(
        "/api/v1/analyze/choice-guard", json=payload(selected=True, origin="user_action")
    ).json()
    assert result["label"] == "normal"


def test_accepts_required_selected_control() -> None:
    result = client.post(
        "/api/v1/analyze/choice-guard", json=payload(selected=True, required=True)
    ).json()
    assert result["label"] == "normal"


def test_rejects_duplicate_steps() -> None:
    request = payload(selected=True)
    request["observations"] = [request["observations"][0], request["observations"][0]]
    response = client.post("/api/v1/analyze/choice-guard", json=request)
    assert response.status_code == 422


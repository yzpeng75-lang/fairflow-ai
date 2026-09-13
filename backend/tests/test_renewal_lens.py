from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def term(*, auto_renewal: bool = True) -> dict[str, object]:
    return {
        "term_id": "music-plan",
        "trial_days": 7,
        "renewal_price": 15.99,
        "billing_interval": "month",
        "auto_renewal": auto_renewal,
        "disclosure_text": "7-day trial, then $15.99/month until cancelled.",
    }


def observation(step: int, terms: list[dict[str, object]] | None = None) -> dict[str, object]:
    return {
        "step": step,
        "page_type": "review" if step == 4 else "checkout",
        "currency": "usd",
        "terms": terms or [],
    }


def request(first_disclosure_step: int | None, *, auto_renewal: bool = True) -> dict[str, object]:
    return {
        "flow_id": "music-trial",
        "commitment_step": 4,
        "observations": [
            observation(step, [term(auto_renewal=auto_renewal)] if step == first_disclosure_step else [])
            for step in range(1, 5)
        ],
    }


def test_flags_automatic_renewal_first_disclosed_at_commitment() -> None:
    response = client.post("/api/v1/analyze/renewal-lens", json=request(4))
    assert response.status_code == 200
    result = response.json()
    assert result["label"] == "trial_to_paid"
    assert result["confidence"] == 0.98
    assert result["findings"][0]["first_disclosure_step"] == 4
    assert result["findings"][0]["renewal_price"] == 15.99


def test_accepts_automatic_renewal_disclosed_early() -> None:
    result = client.post("/api/v1/analyze/renewal-lens", json=request(1)).json()
    assert result["label"] == "normal"
    assert result["needs_review"] is False


def test_accepts_non_automatic_offer_at_commitment() -> None:
    result = client.post(
        "/api/v1/analyze/renewal-lens", json=request(4, auto_renewal=False)
    ).json()
    assert result["label"] == "normal"


def test_missing_terms_are_marked_for_review() -> None:
    result = client.post("/api/v1/analyze/renewal-lens", json=request(None)).json()
    assert result["label"] == "normal"
    assert result["needs_review"] is True
    assert result["confidence"] == 0.55


def test_rejects_unobserved_commitment_step() -> None:
    payload = request(1)
    payload["commitment_step"] = 5
    response = client.post("/api/v1/analyze/renewal-lens", json=payload)
    assert response.status_code == 422


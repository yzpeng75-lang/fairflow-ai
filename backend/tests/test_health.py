from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_scope_is_frozen_to_three_features() -> None:
    response = client.get("/api/v1/scope")
    assert response.status_code == 200
    assert response.json()["features"] == [
        "price_change",
        "preselected_paid_addon",
        "trial_to_paid_subscription",
    ]


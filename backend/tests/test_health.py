from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "no-referrer"


def test_scope_is_frozen_to_three_features() -> None:
    response = client.get("/api/v1/scope")
    assert response.status_code == 200
    assert response.json()["features"] == [
        "price_change",
        "preselected_paid_addon",
        "trial_to_paid_subscription",
    ]


def test_extension_origin_can_call_local_api() -> None:
    response = client.options(
        "/api/v1/analyze/checkout",
        headers={
            "Origin": "chrome-extension://abcdefghijklmnop",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "chrome-extension://abcdefghijklmnop"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="FairFlow API",
    description="Evidence-based checkout flow analysis.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "fairflow-api",
        "version": "0.1.0",
    }


@app.get("/api/v1/scope")
def scope() -> dict[str, object]:
    return {
        "features": [
            "price_change",
            "preselected_paid_addon",
            "trial_to_paid_subscription",
        ],
        "non_goals": [
            "legal_judgement",
            "automatic_purchase_or_cancellation",
            "sensitive_form_collection",
        ],
    }


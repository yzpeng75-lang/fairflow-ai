from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.detectors.choice_guard import ChoiceGuardRequest, ChoiceGuardResult, analyze_choice_guard
from app.detectors.price_trace import PriceTraceRequest, PriceTraceResult, analyze_price_trace
from app.detectors.renewal_lens import RenewalLensRequest, RenewalLensResult, analyze_renewal_lens


app = FastAPI(
    title="FairFlow API",
    description="Evidence-based checkout flow analysis.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
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


@app.post("/api/v1/analyze/price-trace", response_model=PriceTraceResult)
def price_trace(request: PriceTraceRequest) -> PriceTraceResult:
    return analyze_price_trace(request)


@app.post("/api/v1/analyze/choice-guard", response_model=ChoiceGuardResult)
def choice_guard(request: ChoiceGuardRequest) -> ChoiceGuardResult:
    return analyze_choice_guard(request)


@app.post("/api/v1/analyze/renewal-lens", response_model=RenewalLensResult)
def renewal_lens(request: RenewalLensRequest) -> RenewalLensResult:
    return analyze_renewal_lens(request)

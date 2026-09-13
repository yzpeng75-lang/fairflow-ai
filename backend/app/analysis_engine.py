from __future__ import annotations

from statistics import mean
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.detectors.choice_guard import ChoiceGuardRequest, ChoiceGuardResult, analyze_choice_guard
from app.detectors.price_trace import PriceTraceRequest, PriceTraceResult, analyze_price_trace
from app.detectors.renewal_lens import RenewalLensRequest, RenewalLensResult, analyze_renewal_lens


class UnifiedAnalysisRequest(BaseModel):
    flow_id: str = Field(min_length=1, max_length=120)
    price_trace: PriceTraceRequest
    choice_guard: ChoiceGuardRequest | None = None
    renewal_lens: RenewalLensRequest | None = None

    @model_validator(mode="after")
    def validate_flow_ids(self) -> "UnifiedAnalysisRequest":
        requests = [self.price_trace, self.choice_guard, self.renewal_lens]
        if any(item is not None and item.flow_id != self.flow_id for item in requests):
            raise ValueError("every detector request must use the top-level flow_id")
        return self


class UnifiedFinding(BaseModel):
    risk_type: Literal["hidden_fee", "preselected_addon", "trial_to_paid"]
    severity: Literal["moderate", "high"]
    score: int
    detector: str
    confidence: float = Field(ge=0, le=1)
    title: str
    evidence: str


class DetectorResults(BaseModel):
    price_trace: PriceTraceResult
    choice_guard: ChoiceGuardResult | None
    renewal_lens: RenewalLensResult | None


class UnifiedAnalysisResult(BaseModel):
    flow_id: str
    engine: Literal["FairFlow-Engine-v0.1"] = "FairFlow-Engine-v0.1"
    risk_score: int = Field(ge=0, le=100)
    risk_level: Literal["clear", "moderate", "high", "critical"]
    confidence: float = Field(ge=0, le=1)
    needs_review: bool
    summary: str
    findings: list[UnifiedFinding]
    detector_results: DetectorResults
    scoring_note: str


def _risk_level(score: int) -> Literal["clear", "moderate", "high", "critical"]:
    if score == 0:
        return "clear"
    if score <= 34:
        return "moderate"
    if score <= 69:
        return "high"
    return "critical"


def analyze_checkout(request: UnifiedAnalysisRequest) -> UnifiedAnalysisResult:
    price_result = analyze_price_trace(request.price_trace)
    choice_result = analyze_choice_guard(request.choice_guard) if request.choice_guard else None
    renewal_result = analyze_renewal_lens(request.renewal_lens) if request.renewal_lens else None

    findings: list[UnifiedFinding] = []
    if price_result.flagged:
        findings.append(
            UnifiedFinding(
                risk_type="hidden_fee",
                severity="high",
                score=45,
                detector=price_result.detector,
                confidence=price_result.confidence,
                title="Mandatory fee appeared late",
                evidence=price_result.evidence.explanation,
            )
        )
    if choice_result and choice_result.flagged:
        evidence = choice_result.findings[0]
        findings.append(
            UnifiedFinding(
                risk_type="preselected_addon",
                severity="moderate",
                score=30,
                detector=choice_result.detector,
                confidence=choice_result.confidence,
                title="Optional paid add-on was preselected",
                evidence=evidence.explanation,
            )
        )
    if renewal_result and renewal_result.flagged:
        evidence = renewal_result.findings[0]
        findings.append(
            UnifiedFinding(
                risk_type="trial_to_paid",
                severity="high",
                score=40,
                detector=renewal_result.detector,
                confidence=renewal_result.confidence,
                title="Automatic renewal was disclosed at commitment",
                evidence=evidence.explanation,
            )
        )

    applicable = [price_result, *([choice_result] if choice_result else []), *([renewal_result] if renewal_result else [])]
    confidence = round(mean(result.confidence for result in applicable), 2)
    needs_review = any(result.confidence < 0.8 for result in applicable) or bool(
        renewal_result and renewal_result.needs_review
    )
    score = min(100, sum(finding.score for finding in findings))
    if findings:
        summary = "; ".join(finding.title for finding in findings) + "."
    elif needs_review:
        summary = "No confirmed risk, but at least one applicable detector needs more evidence."
    else:
        summary = "No supported risk was found by the applicable detectors."

    return UnifiedAnalysisResult(
        flow_id=request.flow_id,
        risk_score=score,
        risk_level=_risk_level(score),
        confidence=confidence,
        needs_review=needs_review,
        summary=summary,
        findings=findings,
        detector_results=DetectorResults(
            price_trace=price_result,
            choice_guard=choice_result,
            renewal_lens=renewal_result,
        ),
        scoring_note="Category weights are fixed MVP policy values, not learned probabilities.",
    )


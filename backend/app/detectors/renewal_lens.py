from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class RenewalTerm(BaseModel):
    term_id: str = Field(min_length=1, max_length=120)
    trial_days: int = Field(ge=1, le=730)
    renewal_price: float = Field(gt=0)
    billing_interval: Literal["day", "week", "month", "year"]
    auto_renewal: bool
    disclosure_text: str = Field(min_length=1, max_length=500)


class RenewalObservation(BaseModel):
    step: int = Field(ge=1, le=20)
    page_type: str = Field(min_length=1, max_length=60)
    currency: str = Field(min_length=3, max_length=3)
    terms: list[RenewalTerm] = Field(default_factory=list, max_length=20)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class RenewalLensRequest(BaseModel):
    flow_id: str = Field(min_length=1, max_length=120)
    commitment_step: int = Field(ge=1, le=20)
    observations: list[RenewalObservation] = Field(min_length=2, max_length=20)

    @model_validator(mode="after")
    def validate_timeline(self) -> "RenewalLensRequest":
        steps = [observation.step for observation in self.observations]
        if steps != sorted(set(steps)):
            raise ValueError("observations must use unique, ascending steps")
        if self.commitment_step not in steps:
            raise ValueError("commitment_step must identify an observed step")
        currencies = {observation.currency for observation in self.observations}
        if len(currencies) != 1:
            raise ValueError("all observations must use the same currency")
        return self


class RenewalEvidence(BaseModel):
    term_id: str
    trial_days: int
    renewal_price: float
    billing_interval: str
    auto_renewal: bool
    first_disclosure_step: int
    commitment_step: int
    disclosure_text: str
    explanation: str


class RenewalLensResult(BaseModel):
    flow_id: str
    detector: Literal["RenewalLens-v0.1"] = "RenewalLens-v0.1"
    label: Literal["normal", "trial_to_paid"]
    flagged: bool
    needs_review: bool
    confidence: float = Field(ge=0, le=1)
    currency: str
    findings: list[RenewalEvidence]
    inspected_term_count: int
    limitations: list[str]


def analyze_renewal_lens(request: RenewalLensRequest) -> RenewalLensResult:
    first_seen: dict[str, tuple[int, RenewalTerm]] = {}
    for observation in request.observations:
        for term in observation.terms:
            first_seen.setdefault(term.term_id, (observation.step, term))

    delayed = [
        (step, term)
        for step, term in first_seen.values()
        if term.auto_renewal and step >= request.commitment_step
    ]
    findings = [
        RenewalEvidence(
            term_id=term.term_id,
            trial_days=term.trial_days,
            renewal_price=round(term.renewal_price, 2),
            billing_interval=term.billing_interval,
            auto_renewal=term.auto_renewal,
            first_disclosure_step=step,
            commitment_step=request.commitment_step,
            disclosure_text=term.disclosure_text,
            explanation=(
                f"Automatic renewal after {term.trial_days} days at {term.renewal_price:.2f} "
                f"{request.observations[0].currency} per {term.billing_interval} was first disclosed "
                f"at commitment step {step}."
            ),
        )
        for step, term in delayed
    ]
    flagged = bool(findings)
    needs_review = not first_seen
    if flagged:
        confidence = 0.98
    elif needs_review:
        confidence = 0.55
    else:
        confidence = 0.96

    return RenewalLensResult(
        flow_id=request.flow_id,
        label="trial_to_paid" if flagged else "normal",
        flagged=flagged,
        needs_review=needs_review,
        confidence=confidence,
        currency=request.observations[0].currency,
        findings=findings,
        inspected_term_count=len(first_seen),
        limitations=[
            "Missing renewal text is marked for review rather than treated as proof that no renewal exists.",
            "The detector evaluates disclosure timing and does not make a legal judgement.",
        ],
    )


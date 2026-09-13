from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class LineItem(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    amount: float = Field(ge=0)
    kind: Literal["base", "mandatory_fee", "optional_addon", "discount", "other"]


class PriceObservation(BaseModel):
    step: int = Field(ge=1, le=20)
    page_type: str = Field(min_length=1, max_length=60)
    currency: str = Field(min_length=3, max_length=3)
    visible_total: float = Field(ge=0)
    line_items: list[LineItem] = Field(default_factory=list, max_length=50)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class PriceTraceRequest(BaseModel):
    flow_id: str = Field(min_length=1, max_length=120)
    observations: list[PriceObservation] = Field(min_length=2, max_length=20)

    @model_validator(mode="after")
    def validate_timeline(self) -> "PriceTraceRequest":
        steps = [observation.step for observation in self.observations]
        if steps != sorted(set(steps)):
            raise ValueError("observations must use unique, ascending steps")
        currencies = {observation.currency for observation in self.observations}
        if len(currencies) != 1:
            raise ValueError("all observations must use the same currency")
        return self


class PricePoint(BaseModel):
    step: int
    page_type: str
    visible_total: float


class PriceEvidence(BaseModel):
    baseline_total: float
    final_total: float
    increase: float
    fee_name: str | None
    fee_amount: float
    first_seen_step: int | None
    explanation: str


class PriceTraceResult(BaseModel):
    flow_id: str
    detector: Literal["PriceTrace-v0.1"] = "PriceTrace-v0.1"
    label: Literal["normal", "hidden_fee"]
    flagged: bool
    confidence: float = Field(ge=0, le=1)
    currency: str
    evidence: PriceEvidence
    timeline: list[PricePoint]
    limitations: list[str]


def _item_key(item: LineItem) -> tuple[str, float]:
    return item.name.casefold().strip(), round(item.amount, 2)


def analyze_price_trace(request: PriceTraceRequest) -> PriceTraceResult:
    observations = request.observations
    first = observations[0]
    last = observations[-1]
    baseline = round(first.visible_total, 2)
    final = round(last.visible_total, 2)
    increase = round(final - baseline, 2)

    first_items = {_item_key(item) for item in first.line_items if item.kind == "mandatory_fee"}
    late_fees: list[tuple[int, LineItem]] = []
    seen: set[tuple[str, float]] = set(first_items)
    for observation in observations[1:]:
        for item in observation.line_items:
            key = _item_key(item)
            if item.kind == "mandatory_fee" and key not in seen:
                late_fees.append((observation.step, item))
                seen.add(key)

    fee_step, fee = late_fees[0] if late_fees else (None, None)
    fee_amount = round(fee.amount, 2) if fee else 0.0
    amount_matches = fee is not None and increase > 0 and abs(increase - fee_amount) <= 0.01
    flagged = bool(amount_matches)

    if flagged:
        appears_at_end = fee_step == last.step
        confidence = 0.97 if appears_at_end else 0.91
        explanation = (
            f"Visible total increased by {increase:.2f} {first.currency}; mandatory item "
            f"'{fee.name}' ({fee_amount:.2f} {first.currency}) first appeared at step {fee_step}."
        )
    else:
        confidence = 0.94 if increase <= 0 or not late_fees else 0.72
        explanation = "No late mandatory fee that explains a visible total increase was found."

    return PriceTraceResult(
        flow_id=request.flow_id,
        label="hidden_fee" if flagged else "normal",
        flagged=flagged,
        confidence=confidence,
        currency=first.currency,
        evidence=PriceEvidence(
            baseline_total=baseline,
            final_total=final,
            increase=increase,
            fee_name=fee.name if fee else None,
            fee_amount=fee_amount,
            first_seen_step=fee_step,
            explanation=explanation,
        ),
        timeline=[
            PricePoint(step=item.step, page_type=item.page_type, visible_total=round(item.visible_total, 2))
            for item in observations
        ],
        limitations=[
            "Rule-based MVP; it does not infer whether a fee is legally permissible.",
            "It requires comparable totals and line-item roles from at least two checkout steps.",
        ],
    )


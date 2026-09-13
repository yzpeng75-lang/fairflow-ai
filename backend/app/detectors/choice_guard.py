from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class PaidChoice(BaseModel):
    control_id: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=160)
    price: float = Field(ge=0)
    selected: bool
    required: bool = False
    selection_origin: Literal["page_default", "user_action", "unknown"]


class ChoiceObservation(BaseModel):
    step: int = Field(ge=1, le=20)
    page_type: str = Field(min_length=1, max_length=60)
    currency: str = Field(min_length=3, max_length=3)
    choices: list[PaidChoice] = Field(default_factory=list, max_length=50)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class ChoiceGuardRequest(BaseModel):
    flow_id: str = Field(min_length=1, max_length=120)
    observations: list[ChoiceObservation] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def validate_timeline(self) -> "ChoiceGuardRequest":
        steps = [observation.step for observation in self.observations]
        if steps != sorted(set(steps)):
            raise ValueError("observations must use unique, ascending steps")
        currencies = {observation.currency for observation in self.observations}
        if len(currencies) != 1:
            raise ValueError("all observations must use the same currency")
        return self


class ChoiceEvidence(BaseModel):
    control_id: str
    label: str
    price: float
    first_seen_step: int
    selected_by_default: bool
    explanation: str


class ChoiceGuardResult(BaseModel):
    flow_id: str
    detector: Literal["ChoiceGuard-v0.1"] = "ChoiceGuard-v0.1"
    label: Literal["normal", "preselected_addon"]
    flagged: bool
    confidence: float = Field(ge=0, le=1)
    currency: str
    findings: list[ChoiceEvidence]
    inspected_choice_count: int
    limitations: list[str]


def analyze_choice_guard(request: ChoiceGuardRequest) -> ChoiceGuardResult:
    first_seen: dict[str, tuple[int, PaidChoice]] = {}
    for observation in request.observations:
        for choice in observation.choices:
            first_seen.setdefault(choice.control_id, (observation.step, choice))

    risky = [
        (step, choice)
        for step, choice in first_seen.values()
        if choice.price > 0
        and choice.selected
        and not choice.required
        and choice.selection_origin == "page_default"
    ]
    findings = [
        ChoiceEvidence(
            control_id=choice.control_id,
            label=choice.label,
            price=round(choice.price, 2),
            first_seen_step=step,
            selected_by_default=True,
            explanation=(
                f"Optional paid choice '{choice.label}' ({choice.price:.2f} "
                f"{request.observations[0].currency}) was already selected when first seen at step {step}."
            ),
        )
        for step, choice in risky
    ]
    unknown_selected = any(
        choice.price > 0 and choice.selected and not choice.required and choice.selection_origin == "unknown"
        for _, choice in first_seen.values()
    )
    flagged = bool(findings)
    confidence = 0.98 if flagged else 0.75 if unknown_selected else 0.95
    return ChoiceGuardResult(
        flow_id=request.flow_id,
        label="preselected_addon" if flagged else "normal",
        flagged=flagged,
        confidence=confidence,
        currency=request.observations[0].currency,
        findings=findings,
        inspected_choice_count=len(first_seen),
        limitations=[
            "The detector needs the control state captured before user interaction.",
            "It reports interface behavior, not a legal judgement about the offer.",
        ],
    )


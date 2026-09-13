# Technical Decisions

## TD-001: Sequence-first analysis

FairFlow stores ordered page states. Risk is derived from changes between states, not merely from suspicious words on one page.

## TD-002: Hybrid and explainable

Deterministic extraction handles prices and controls. Machine learning handles contextual classification. Every model output must point to observable evidence.

## TD-003: Privacy by minimization

Sensitive form values are never required for the three MVP features and therefore must not be collected.

## TD-004: Honest uncertainty

When evidence is incomplete or contradictory, the product reports `uncertain` instead of making a definitive claim.

## TD-005: Evaluation split by template/site

Pages from the same template or website must not appear in both training and held-out evaluation sets.


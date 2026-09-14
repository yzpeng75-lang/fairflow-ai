# Evaluation

## PriceTrace

Run the first detector against all 20 hidden-fee controlled flows:

```powershell
python evaluation/evaluate_price_trace.py
```

The script writes `reports/day05_price_trace.json`. Its metrics apply only to the synthetic controlled benchmark and must not be presented as real-web performance.

## ChoiceGuard

Run the detector against all 20 preselected-add-on controlled flows:

```powershell
python evaluation/evaluate_choice_guard.py
```

The script writes `reports/day06_choice_guard.json`. ChoiceGuard separates a page default from a later user action so that an add-on intentionally selected by the user is not misclassified.

## RenewalLens

Run the detector against all 20 trial-to-paid controlled flows:

```powershell
python evaluation/evaluate_renewal_lens.py
```

The script writes `reports/day07_renewal_lens.json`. RenewalLens treats automatic renewal disclosed at the commitment step as a delayed disclosure. If no renewal text is observable, it requests review instead of claiming that the flow is safe.

## Unified engine

Run all three applicable detectors across the full 60-flow release:

```powershell
python evaluation/evaluate_unified_engine.py
```

The script writes `reports/day08_unified_engine.json` with four-class metrics, a confusion matrix, and the risk-score distribution. The fixed scoring policy is documented in `docs/RISK_SCORING.md`.

## Trainable baseline and ablation

```powershell
python evaluation/evaluate_ablation.py
```

This trains a dependency-free multinomial Naive Bayes text baseline on six templates and tests on two unseen templates. It compares final-page text, sequence text, final-page rules, and full-flow structured analysis. The generated report includes every prediction, not only aggregate scores.

Evaluation work begins after the dataset schema is frozen. The final report will compare rules, text-only classification, and full-flow analysis using held-out page templates.

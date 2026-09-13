# Judging guide

| Criterion | What to show | Evidence in repository |
|---|---|---|
| Real-world usefulness | A shopper sees an unavoidable price change before payment. | Demo store, extension popup, actionable report |
| Technical implementation | Active-tab capture feeds three typed detectors and a unified API. | `extension/src`, `backend/app` |
| ML understanding | Trainable text baseline is compared with structured temporal analysis on unseen templates. | `evaluation/evaluate_ablation.py` |
| Innovation | Controlled counterfactual pairs isolate disclosure timing and default selection. | `dataset`, dataset card |
| Explainability | Every finding contains step, amount or term, confidence, and recommended action. | Detector result models and reporting layer |
| Responsible AI | Missing evidence triggers review; sensitive fields are excluded by construction. | Privacy model and automated privacy check |
| Reproducibility | Data generator, fixed splits, per-example predictions, tests, and one final check. | Reproducibility guide and evaluation reports |

## Honest boundary

FairFlow currently supports its controlled page adapter and a synthetic benchmark. Do not describe the reported perfect full-flow score as real-web accuracy. Present it as pipeline correctness and use the weaker unseen-template baselines to motivate future data collection.


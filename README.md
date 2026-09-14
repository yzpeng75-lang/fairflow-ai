# FairFlow AI

**See the real cost before you click.**

FairFlow AI is a privacy-conscious browser assistant that compares the steps of an online checkout and explains price changes, preselected add-ons, and trial-to-paid subscriptions before payment.

## Competition scope

The 14-day MVP is intentionally limited to three auditable risks:

1. Price changes between the product page and checkout.
2. Optional paid services selected by default.
3. Free trials that convert into recurring subscriptions.

FairFlow does not make legal accusations, automate purchases, collect payment credentials, or attempt to support every website during the competition.

## Why sequence matters

The held-out-template experiment compares four approaches on 12 test flows:

| Method | Accuracy | Macro-F1 |
|---|---:|---:|
| Final-page text Naive Bayes | 0.417 | 0.417 |
| Sequence-text Naive Bayes | 0.417 | 0.417 |
| Final-page rules | 0.667 | 0.708 |
| Full-flow structured engine | 1.000 | 1.000 |

These are synthetic controlled-benchmark results. The perfect full-flow value verifies the designed pipeline; it is not a claim of universal real-site accuracy. See `docs/DAY11_ABLATION.md` for the protocol and limitations.

## Repository structure

```text
fairflow-ai/
├── backend/       FastAPI analysis service
├── extension/     React + TypeScript browser interface
├── demo-store/    Controlled checkout flows
├── dataset/       FairFlow-Bench data and labels
├── evaluation/    Baselines, metrics, and reports
└── docs/          Scope, architecture, and decisions
```

## Quick start

### Backend

```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/health`. The expected response is:

```json
{"status":"ok","service":"fairflow-api","version":"0.1.0"}
```

### Browser interface

```powershell
cd extension
npm install
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`. Keep the local backend running, then capture at least two steps of a controlled checkout before selecting **Analyze evidence**. The extension requests temporary active-tab access and has no persistent all-sites content script.

### Controlled demo store

```powershell
cd demo-store
npm install
npm run dev
```

Open `http://127.0.0.1:5174` and choose normal and risky variants from the same controlled pair.

## Privacy principles

- Audits begin only after the user explicitly starts them.
- Password, card, authentication, and address fields are excluded.
- Evidence is minimized and processed locally whenever practical.
- Every warning includes evidence and confidence.
- Uncertain findings are labeled for human review.

## Capabilities

- Frozen three-risk scope with documented annotation guidelines and controlled pairs.
- Interactive four-step checkout lab with normal and risky counterfactual flows.
- Reproducible benchmark with 60 flows, 240 page states, and template-disjoint splits.
- PriceTrace, ChoiceGuard, and RenewalLens detectors with evidence and confidence.
- Unified analysis engine with transparent risk scoring and actionable reports.
- Privacy-first Chrome capture with local retention and explicit user activation.
- Trainable text baseline and template-disjoint ablation evaluation.
- Automated privacy, accessibility, data, API, evaluation, and build checks.
- Submission story, demo script, architecture, cover art, and reproducibility guide.

## Release verification

From an environment with backend requirements and npm dependencies installed:

```powershell
backend/.venv/Scripts/python scripts/final_check.py
```

See `REPRODUCIBILITY.md` for the complete setup and `submission/README.md` for the competition materials.

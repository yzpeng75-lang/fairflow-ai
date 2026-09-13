# FairFlow AI

**See the real cost before you click.**

FairFlow AI is a privacy-conscious browser assistant that compares the steps of an online checkout and explains price changes, preselected add-ons, and trial-to-paid subscriptions before payment.

## Competition scope

The 14-day MVP is intentionally limited to three auditable risks:

1. Price changes between the product page and checkout.
2. Optional paid services selected by default.
3. Free trials that convert into recurring subscriptions.

FairFlow does not make legal accusations, automate purchases, collect payment credentials, or attempt to support every website during the competition.

## Repository structure

```text
fairflow-ai/
├── backend/       FastAPI analysis service
├── extension/     React + TypeScript browser interface
├── demo-store/    Controlled checkout flows (Day 3)
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
npm run dev
```

Open the local address printed by Vite. On Day 1 it displays the frozen product scope and checks the backend connection.

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

## Status

- Day 1: repository skeleton, frozen scope, backend health endpoint, and browser interface.
- Day 2: annotation guidelines, data dictionary, 15 controlled flow pairs, and automated validation.
- Day 3: interactive four-step checkout lab with eight flows and four controlled pairs.
- Day 4: reproducible benchmark release with 60 flows, 240 page states, and template-disjoint splits.
- Day 5: PriceTrace hidden-fee detector, evidence API, live trace UI, and controlled benchmark evaluation.
- Day 6: ChoiceGuard preselected-add-on detector, interaction provenance, live evidence UI, and controlled evaluation.
- Day 7: RenewalLens delayed-renewal detector, uncertainty handling, live evidence UI, and controlled evaluation.
- Day 8: unified analysis engine with auditable risk scoring, combined evidence, and four-class evaluation.

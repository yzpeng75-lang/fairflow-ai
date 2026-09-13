# FairFlow AI

## Tagline

FairFlow watches how checkout changes—not just what the final page says—so hidden fees, preselected extras, and last-minute renewals become visible before payment.

## Inspiration

Online checkout risks are often temporal. A fee may appear only after several steps, an optional service may already be selected, or a free trial may reveal its recurring price only at confirmation. A screenshot of the final page cannot reliably show what changed. We built FairFlow to preserve that missing context while collecting as little user data as possible.

## What it does

FairFlow is a privacy-first Chrome extension and local analysis service. The user captures multiple checkout steps, and three explainable detectors analyze the sequence:

- **PriceTrace** finds mandatory fees that appear late and explains the exact price increase.
- **ChoiceGuard** identifies optional paid controls selected before any user action.
- **RenewalLens** finds automatic-renewal terms disclosed only at the commitment step.

The unified engine produces a transparent 0–100 priority score, confidence, observable evidence, and a neutral next action. Missing evidence is marked for review instead of being presented as safe.

## How we built it

The Chrome Manifest V3 popup uses React and TypeScript. It runs only after an explicit click, reads allow-listed checkout evidence from the active tab, excludes sensitive form values, and keeps snapshots in local extension storage for at most 24 hours. A FastAPI service validates the observations with Pydantic, runs the three detectors, combines their findings, and creates a stable audit report.

We also created FairFlow-Bench: 60 synthetic flows, 30 controlled normal/risk pairs, 240 ordered page states, and template-disjoint train, validation, and test splits. A dependency-free multinomial Naive Bayes model provides a trainable text baseline. All evaluation outputs and individual predictions are versioned.

## Challenges

The hardest problem was separating suspicious content from suspicious timing. Normal and risky controlled flows can contain the same fee or renewal language on the final page; the causal difference is when it appears. We also had to distinguish a page default from a later user choice and make missing text an uncertainty signal rather than proof of safety.

## Accomplishments

- Complete evidence-to-report pipeline with three auditable detectors.
- Chrome extension without permanent all-sites access or a background content script.
- Controlled benchmark with exact one-variable counterfactual pairs.
- Reproducible template-disjoint ablation with all predictions published.
- Automated API, privacy, accessibility, data, and build checks.

## What we learned

Small, structured temporal signals can be more useful than a larger opaque text model when the task is to explain a change. We also learned that responsible uncertainty and data minimization must be part of the architecture, not text added after implementation.

## What's next

Next we would add consented adapters for unfamiliar sites, recruit independent annotators, calibrate the priority score through user studies, and evaluate on a legally and ethically collected real-world benchmark. Until then, FairFlow clearly labels its current results as controlled synthetic evidence.

## Built with

`React` `TypeScript` `Vite` `Chrome Extensions` `Manifest V3` `Python` `FastAPI` `Pydantic` `Pytest` `Naive Bayes` `HTML` `CSS` `REST API` `JSONL` `CSV` `Responsible AI` `Privacy by Design`

## Links

- Source: https://github.com/yzpeng75-lang/fairflow-ai
- Demo: run locally using the repository instructions


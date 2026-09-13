# FairFlow-Bench Dataset Card

## Version

Day 4 synthetic release, generated with seed `20260913`.

## Purpose

FairFlow-Bench supports development and evaluation of models that detect material price and consent changes across multi-step checkout flows.

## Composition

- 60 flows arranged into 30 controlled normal/risk pairs
- 240 ordered page states, four per flow
- 10 synthetic website templates
- English and Chinese interfaces
- 30 normal flows
- 10 hidden-fee flows
- 10 preselected-paid-add-on flows
- 10 delayed trial-to-paid disclosure flows

## Split strategy

Templates, not individual pages, determine the split:

- Train: 6 templates, 36 flows
- Validation: 2 templates, 12 flows
- Test: 2 templates, 12 flows

No template appears in more than one split. The test set therefore measures performance on unseen layouts rather than repeated pages from a known template.

## Controlled-pair design

Each pair keeps its template, language, scenario, product, currency, and core price constant. One decision-relevant factor changes:

- mandatory-fee disclosure moves from step 1 to step 4;
- an optional paid add-on changes from unselected to selected by default; or
- an automatic renewal disclosure moves from step 1 to step 4.

Consequential values, such as the visible total, may change after the controlled factor changes.

## Provenance and privacy

All companies, products, flows, and prices are synthetic. No real checkout, personal information, payment data, or third-party page capture is included.

## Limitations

This release is suitable for pipeline development and controlled evaluation. It is not evidence of performance on the open web. Real-world evaluation requires separately reviewed public or permissioned examples, additional layout diversity, and independent human annotation.

## Reproduction

```powershell
python dataset/scripts/generate_day04.py
python dataset/validate_day04.py
```


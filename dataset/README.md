# FairFlow-Bench

FairFlow-Bench evaluates whether a system can identify evidence-backed risks across an online purchase flow rather than memorizing isolated keywords or page templates.

## Seed annotation release

`annotations/day02_flow_pairs.csv` contains 30 flow-level records:

- 15 controlled pairs;
- one normal and one risky flow in every pair;
- five hidden-fee pairs;
- five preselected-paid-add-on pairs;
- five trial-to-paid-subscription pairs;
- both English and Chinese interfaces;
- difficult normal examples containing legitimate fees or subscription language.

The paired design changes one decision-relevant property while keeping the scenario and template constant. Full page-state sequences and held-out templates will be added on Days 3 and 4.

The labels are seed annotations for schema and pipeline testing. The duplicated annotator fields are fixtures, not evidence of independent human agreement. They must be replaced by two genuine independent reviews before the benchmark is described as gold-labelled or an agreement score is reported.

## Files

- `DATA_DICTIONARY.md`: definitions and allowed values for every column.
- `ANNOTATION_GUIDELINES.md`: decision rules and examples for human annotators.
- `annotations/day02_flow_pairs.csv`: provisional flow-level annotations.
- `validate_annotations.py`: dependency-free integrity checks.

## Validate

From the repository root:

```powershell
python dataset/validate_annotations.py
```

Generate and validate the page-state release:

```powershell
python dataset/scripts/generate_day04.py
python dataset/validate_day04.py
```

The release contains 60 flows and 240 ordered page states with template-disjoint train, validation, and test splits. See `DATASET_CARD.md` for its scope and limitations.

No performance claim may be published unless it can be reproduced from the versioned data and evaluation code.

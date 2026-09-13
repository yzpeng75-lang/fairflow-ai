# Annotation Guidelines v1.0

## Annotation unit

Annotate the complete purchase flow, not an isolated sentence or screenshot. Review all ordered steps before choosing a label.

## Labels

### `normal`

Use when all mandatory costs and recurring terms are clearly disclosed before the user makes the relevant decision, and optional paid controls are not selected by default.

Subscription words alone do not make a flow risky. A clearly disclosed, affirmatively selected subscription is a difficult but valid normal example.

### `hidden_fee`

Use only when a mandatory non-tax charge is absent from the initial decision point and introduced in a later step. A fee shown clearly in the initial total is normal.

Record the amount as:

\[
\text{added\_fee}=P_{final}-P_{initial}
\]

Taxes and delivery costs are not automatically risky. Label them as hidden only when the benchmark scenario deliberately withholds a mandatory amount until a later step.

### `preselected_addon`

Use when an optional paid product or service is already selected without an affirmative action by the user. Required choices and free accessibility options are not add-ons.

The evidence must name the selected item and, when visible, its price.

### `trial_to_paid`

Use when a free trial automatically creates a recurring charge and that material term is delayed, visually weakened, or coupled to default consent. A clear trial with an unchecked opt-in is normal.

Record trial duration, recurring price, billing interval, and the first disclosure step whenever available.

## Severity rubric

- `none`: no benchmark risk is present.
- `low`: clear disclosure exists, but presentation could cause minor confusion.
- `medium`: a material cost or consent change is delayed or selected by default.
- `high`: recurring payment or substantial cost is both automatic and disclosed only at the final step.

## Evidence rules

- Copy only text visible in the interface.
- Do not infer legal intent.
- Do not use a company name as evidence.
- Use `uncertain` in future page-state annotations if essential evidence is missing; do not force a risk label.

## Paired-sample rule

Every Day 2 risk flow must have exactly one normal partner with the same `pair_id`, `template_id`, language, scenario, and number of steps. The pair should differ only in the factor named by `changed_factor`.

## Independent review

Two annotators label a flow independently. When their labels differ, they discuss the evidence using this document and store the resolved value in `adjudicated_label`. Agreement is reported separately from model accuracy.

The values currently present in the Day 2 CSV are duplicated seed-label fixtures used to exercise the schema validator. They are not independent annotations and must never be presented as measured agreement. Genuine review is scheduled after the page-state flows exist.

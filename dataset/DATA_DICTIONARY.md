# FairFlow-Bench Data Dictionary

Each row represents one complete checkout flow. Ordered page-state records are linked by `flow_id`.

| Field | Type | Allowed values / meaning |
|---|---|---|
| `flow_id` | string | Unique identifier, e.g. `ff_d02_001_n` |
| `pair_id` | string | Connects one normal flow with one controlled risky variant |
| `template_id` | string | Visual/site template; used later for leakage-safe splitting |
| `language` | category | `en` or `zh` |
| `scenario` | string | Short human-readable purchase context |
| `label` | category | `normal`, `hidden_fee`, `preselected_addon`, or `trial_to_paid` |
| `severity` | category | `none`, `low`, `medium`, or `high` |
| `total_steps` | integer | Number of page states in the flow; minimum 2 |
| `initial_price` | decimal | Price presented at the first decision point |
| `final_price` | decimal | Total payable before completing payment |
| `added_fee` | decimal | Mandatory amount first introduced after the initial step |
| `addon_selected` | boolean | Whether an optional paid add-on is selected by default |
| `addon_price` | decimal | Price of the optional add-on |
| `auto_renewal` | boolean | Whether a trial automatically converts to recurring payment |
| `trial_days` | integer | Free-trial duration; `0` if not applicable |
| `renewal_price` | decimal | Recurring amount after the trial; `0` if not applicable |
| `billing_interval` | category | `none`, `week`, `month`, or `year` |
| `first_disclosure_step` | integer | First step where the material term is visible; `0` if not applicable |
| `evidence_text` | string | Exact interface text supporting the annotation |
| `changed_factor` | category | The single controlled difference from the paired variant |
| `annotator_1` | category | Provisional seed label; later replaced by first human review |
| `annotator_2` | category | Pipeline fixture; must be replaced by a second independent human review |
| `adjudicated_label` | category | Pipeline fixture; becomes final only after genuine disagreement resolution |
| `notes` | string | Concise explanation of why the example is normal or risky |

## Derived values

For non-zero initial prices:

\[
\text{increase\_pct}=\frac{P_{final}-P_{initial}}{P_{initial}}\times 100
\]

Derived values are calculated during evaluation and are not manually entered into the source annotations.

## Review status

The annotator columns intentionally duplicate the seed label so the validation pipeline can be tested. They do **not** establish inter-annotator agreement. The dataset remains provisional until two people review the flows independently and their identities or anonymized reviewer IDs are recorded in a separate review manifest.

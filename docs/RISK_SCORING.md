# FairFlow risk scoring v0.1

The unified score is a transparent prioritization aid, not a probability or legal judgement.

## Fixed category weights

| Finding | Points | Rationale |
|---|---:|---|
| Preselected paid add-on | 30 | The user can usually reverse it, but the default can cause unintended spending. |
| Delayed automatic-renewal disclosure | 40 | It can create a future recurring charge that is easy to miss. |
| Late mandatory fee | 45 | It changes the unavoidable price after the user has invested effort in checkout. |

Category points are added once per category and capped at 100. Multiple controls within one category remain visible as evidence but do not inflate the score.

## Levels

| Score | Level |
|---:|---|
| 0 | Clear on observed evidence |
| 1–34 | Moderate |
| 35–69 | High |
| 70–100 | Critical |

“Clear” is limited to the detectors that were applicable and the steps actually observed. Missing or ambiguous evidence sets `needs_review` rather than reducing the score or being treated as proof of safety.

## Calibration status

These values are versioned MVP policy weights chosen for understandable ordering. They are not learned from user-harm data. A later release should calibrate them with user studies and report sensitivity analyses across alternative thresholds.


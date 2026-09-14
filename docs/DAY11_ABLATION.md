# Template-disjoint ablation

## Question

Does FairFlow need ordered checkout evidence, or can a classifier inspect only the final page?

## Protocol

- Train: 36 flows from six templates.
- Test: 12 flows from two templates never seen during training.
- Classes: normal, hidden fee, preselected add-on, and trial-to-paid.
- Text model: dependency-free multinomial Naive Bayes with Laplace smoothing.
- Full-flow method: structured temporal evidence used by the three auditable detectors.

## Results

| Method | Test accuracy | Macro-F1 |
|---|---:|---:|
| Final-page text Naive Bayes | 0.417 | 0.417 |
| Sequence-text Naive Bayes | 0.417 | 0.417 |
| Final-page rules | 0.667 | 0.708 |
| Full-flow structured engine | 1.000 | 1.000 |

The final page often contains identical fee or renewal language in both members of a controlled pair. Timing—not the presence of a keyword—is the causal difference. Concatenating text does not reliably encode that structure in this small dataset; explicit ordered observations do.

## Interpretation limits

The benchmark is synthetic and constructed around FairFlow’s three target patterns. The perfect full-flow score is a pipeline correctness result, not proof of real-world generalization. The text baseline is intentionally small and is not presented as a state-of-the-art language model.

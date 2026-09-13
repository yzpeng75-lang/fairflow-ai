# Short project story

FairFlow AI protects shoppers from checkout risks that become visible only over time. It compares multiple checkout steps and explains three patterns before payment: mandatory fees that appear late, optional paid add-ons selected by default, and automatic-renewal terms disclosed only at confirmation.

The project combines a privacy-first Chrome extension with a local FastAPI analysis service. PriceTrace, ChoiceGuard, and RenewalLens produce observable evidence, confidence, a transparent risk score, and a neutral next action. The extension runs only after a user click, never reads form values or payment details, has no permanent all-sites permission, and removes local audit snapshots after 24 hours.

We built FairFlow-Bench with 60 synthetic flows, 30 controlled normal/risk pairs, 240 ordered page states, and template-disjoint splits. A trainable Naive Bayes baseline and a four-method ablation show the central lesson: final-page text cannot reliably explain when a fee or renewal term appeared, while structured full-flow analysis preserves that causal timing. All data generation, predictions, tests, privacy checks, and limitations are reproducible from the public repository.

Our biggest challenge was handling uncertainty honestly. Missing renewal text is marked for review rather than treated as safe, and controlled pairs differ in only one target factor. Next, we would add consented real-site adapters, independent annotation, and user-study calibration without claiming that the current synthetic score represents universal web performance.


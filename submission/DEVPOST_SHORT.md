# Short project story

FairFlow AI protects shoppers from checkout risks that become visible only over time. It compares multiple checkout steps and explains three patterns before payment: mandatory fees that appear late, optional paid add-ons selected by default, and automatic-renewal terms disclosed only at confirmation.

The project combines an automatic, privacy-conscious Chrome extension with a local FastAPI analysis service. PriceTrace, ChoiceGuard, and RenewalLens produce observable evidence, confidence, a transparent risk score, and a neutral next action. FairFlow watches only visible HTTP(S) pages, skips low-confidence non-commerce pages, never reads form values or payment details, supports global and per-site pause controls, and removes local audit snapshots after 24 hours.

We built FairFlow-Bench with 60 synthetic flows, 30 controlled normal/risk pairs, 240 ordered page states, and template-disjoint splits. A trainable Naive Bayes baseline and a four-method ablation show the central lesson: final-page text cannot reliably explain when a fee or renewal term appeared, while structured full-flow analysis preserves that causal timing. All data generation, predictions, tests, privacy checks, and limitations are reproducible from the public repository.

Our biggest challenge was handling uncertainty honestly. Missing renewal text is marked for review rather than treated as safe, controlled pairs differ in only one target factor, and the real-page adapter rejects ambiguous evidence instead of guessing. Next, we would add site-specific adapters, independent annotation, and user-study calibration without claiming that the current synthetic score represents universal web performance.

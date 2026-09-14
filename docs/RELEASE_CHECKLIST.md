# Release checklist — v0.1.0

## Automated — must pass

- [x] Dataset generation is deterministic.
- [x] Seed and benchmark schemas validate.
- [x] Train, validation, and test templates do not overlap.
- [x] Backend detector, engine, CORS, security-header, and report tests pass.
- [x] Individual detector and unified evaluation reports reproduce.
- [x] Trainable text baseline and ablation report reproduce.
- [x] Privacy and accessibility static contracts pass.
- [x] Demo store and extension production builds succeed.
- [x] Required submission files are present.

## Human — complete before Devpost submission

- [ ] Load the unpacked extension in Chrome and run every demo flow.
- [ ] Record the final two-minute demo with readable text and captions.
- [ ] Export the SVG cover to PNG if the upload form does not accept SVG.
- [ ] Test repository and demo links while signed out.
- [ ] Confirm member names, challenge track, and submission deadline.
- [ ] Submit the form and retain the confirmation page.

The automated release report is `evaluation/reports/day14_release_check.json`. Human-only items intentionally remain unchecked until a person verifies them.

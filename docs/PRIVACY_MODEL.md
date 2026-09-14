# Privacy model

## Data flow

FairFlow automatically observes visible HTTP(S) pages while the global switch and current-site switch are enabled. The extractor ignores pages without reliable commerce evidence, stores a minimized checkout trail locally, and sends it only to the loopback analysis API at `127.0.0.1`.

## Collected

- flow identifier and checkout step from the supported adapter;
- origin only, without URL path, query string, or fragment;
- visible total and currency;
- mandatory fee name and amount;
- optional paid control label, amount, selected state, and initial-state provenance;
- visible trial and renewal terms;
- a boolean trial-offer cue so missing renewal terms remain uncertain;
- count of excluded sensitive fields, never their contents.

## Never collected

- input values;
- names, email addresses, postal addresses, passwords, payment cards, or authentication tokens;
- full URLs or browsing history;
- screenshots or full-page text;
- evidence from background tabs.

## Permission design

Automatic monitoring requires a content script on HTTP(S) pages; this is the permission tradeoff that removes per-step user clicks. Monitoring is on by default, can be paused globally or for the current origin, ignores background tabs, and does no work when it cannot identify reliable checkout evidence. `activeTab` and `scripting` remain only for the manual fallback. Network host permission is limited to the local FairFlow API. The current audit remains in extension-local storage until the user clears it or the 24-hour retention window expires; storage is capped at 20 snapshots.

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| Sensitive form leakage | Sensitive-field exclusion, no reads of input values, evidence length limits, and an automated source guard. |
| Accidental cross-flow mixing | Flow IDs must match and repeated steps replace earlier snapshots. |
| Background surveillance | The monitor exits unless the document is visible; global and per-site pause controls are provided. |
| Remote evidence transmission | Host permission is restricted to the loopback API. |
| Unsupported-site overclaim | Generic extraction accepts only visible, high-signal evidence and reports ambiguous pages as unsupported; controlled benchmark scores are never presented as universal real-site accuracy. |

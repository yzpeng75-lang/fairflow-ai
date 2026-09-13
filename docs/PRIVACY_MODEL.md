# Privacy model

## Data flow

FairFlow runs only after an explicit user action. The injected extractor reads allow-listed checkout evidence, stores the current audit locally, and sends it only to the loopback analysis API at `127.0.0.1`.

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

The extension uses `activeTab` instead of permanent access to every site. It has no persistent content script and can contact only the local FairFlow API. The current audit remains in extension-local storage until the user clears it.

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| Sensitive form leakage | Allow-listed selectors; no reads of input values; automated source guard. |
| Accidental cross-flow mixing | Flow IDs must match and repeated steps replace earlier snapshots. |
| Background surveillance | Capture begins only through the popup on the active tab. |
| Remote evidence transmission | Host permission is restricted to the loopback API. |
| Unsupported-site overclaim | Day 9 explicitly supports the controlled `data-ff-*` adapter only. |

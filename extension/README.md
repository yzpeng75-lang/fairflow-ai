# FairFlow Chrome extension

The extension automatically captures a minimized checkout trail from the visible tab and analyzes it entirely on-device after two distinct checkout steps are observed.

## Build and load

```powershell
cd extension
npm install
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose `extension/dist`.

## Automatic workflow

1. Browse a supported product, cart, and checkout normally.
2. FairFlow observes visible page changes, deduplicates steps, and analyzes automatically after two distinct steps.
3. A red `!` badge and an in-page alert indicate a supported risk; `OK` indicates that no supported risk was found.
4. Open the popup only to review evidence, pause monitoring, clear the trail, or use the manual fallback.

Capturing the same step again replaces the earlier snapshot. Switching origins starts a new local audit. Monitoring is enabled by default and can be paused globally or for the current site.

## Permission rationale

| Permission | Why it is required |
|---|---|
| Automatic content script access | Observes visible commerce evidence on HTTP(S) pages so users do not need to click at every step. |
| `activeTab` | Supports the optional manual capture fallback. |
| `scripting` | Runs the manual extractor across accessible frames when requested. |
| `storage` | Keeps the current audit trail locally between popup openings. |

No host permission is needed for an analysis server; detection runs inside the extension.

The automatic content script runs on HTTP(S) pages but exits immediately for background tabs, paused sites, pages without a reliable price candidate, and evidence below the confidence threshold. It does not read form values or send evidence to a remote service.

## Supported pages

FairFlow uses two extraction paths:

- Explicit `data-ff-*` roles provide deterministic evidence in the controlled research environment.
- A privacy-preserving adapter stack reads Schema.org/JSON-LD and commerce metadata, recognizes common Shopify, WooCommerce, and hosted-checkout structures, searches open Shadow DOM and accessible payment frames, and falls back to scored visible text across multiple currencies and languages.

Because commerce markup varies, generic captures are evidence candidates rather than claims of universal compatibility. The popup shows the extraction source, capture confidence, and warnings so the user can review ambiguous evidence before analysis. FairFlow never reads form values, page URL paths, names, email addresses, addresses, passwords, or card fields.

# FairFlow Chrome extension

The extension captures a minimized checkout trail and sends it to the local FairFlow API only when the user presses **Analyze evidence**.

## Build and load

```powershell
cd extension
npm install
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose `extension/dist`.

## Audit workflow

1. Open a supported checkout flow.
2. Open FairFlow and press **Capture current step**.
3. Continue checkout without entering real personal or payment information.
4. Capture at least one later step.
5. Press **Analyze evidence** before payment.

Capturing the same step again replaces the earlier snapshot. Switching to another flow requires clearing the current audit first.

## Permission rationale

| Permission | Why it is required |
|---|---|
| `activeTab` | Grants temporary access only after the user clicks the extension. |
| `scripting` | Runs the minimized evidence extractor on that active tab. |
| `storage` | Keeps the current audit trail locally between popup openings. |
| `http://127.0.0.1:8000/*` | Sends evidence to the local FairFlow analysis service. |

There is no `<all_urls>` permission and no always-running content script.

## Supported pages

FairFlow uses two extraction paths:

- Explicit `data-ff-*` roles provide deterministic evidence in the controlled research environment.
- A privacy-preserving adapter stack reads Schema.org/JSON-LD and commerce metadata, recognizes common Shopify, WooCommerce, and hosted-checkout structures, searches open Shadow DOM and accessible payment frames, and falls back to scored visible text across multiple currencies and languages.

Because commerce markup varies, generic captures are evidence candidates rather than claims of universal compatibility. The popup shows the extraction source, capture confidence, and warnings so the user can review ambiguous evidence before analysis. FairFlow never reads form values, page URL paths, names, email addresses, addresses, passwords, or card fields.

# FairFlow Chrome extension

The Day 9 extension captures a minimized checkout trail and sends it to the local FairFlow API only when the user presses **Analyze evidence**.

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

## Day 9 supported page contract

The controlled demo exposes `data-ff-*` roles for visible totals, mandatory fees, optional paid controls, renewal disclosures, flow ID, and step. General website adapters are later work; the extension does not claim universal site support.


# FairFlow Demo Store

A controlled checkout laboratory for developing and evaluating FairFlow without collecting personal information or depending on third-party websites.

## Scenarios

The store contains four controlled pairs and eight flows:

| Pair | Normal variant | Risk variant | Changed factor |
|---|---|---|---|
| Airline ticket | Full total disclosed at step 1 | Mandatory service fee appears at step 4 | Fee disclosure timing |
| Hotel room | Resort fee included at step 1 | Resort fee appears at step 4 | Fee disclosure timing |
| Headphones | Optional protection is unchecked | Protection is checked by default | Default selection |
| Music trial | Renewal requires opt-in and is disclosed at step 1 | Renewal is automatic and disclosed at step 4 | Renewal consent and disclosure |

No payment is processed. All products, companies, prices, and interfaces are synthetic.

## Run

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5174`.

## Machine-readable attributes

Important elements expose stable `data-ff-*` attributes. These are ground-truth hooks for development and testing, not features that the final detector may rely upon when analyzing an unfamiliar website.


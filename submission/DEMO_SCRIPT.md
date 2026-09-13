# Two-minute demo script

## 0:00–0:15 — problem

“A checkout page can look acceptable in isolation while hiding what changed across the journey. FairFlow records only the evidence needed to reveal those changes before payment.”

Show the Checkout Lab and the four controlled normal/risk pairs.

## 0:15–0:35 — controlled comparison

Open the normal airline flow and briefly show that the full total is visible from step 1. Return to the lab, open the hidden-fee airline flow, and capture step 1 with the extension.

Say: “These two flows differ only in fee disclosure timing.”

## 0:35–0:58 — PriceTrace

Advance the risky airline flow to step 4 and capture again. Select **Analyze evidence**.

Say: “PriceTrace connects the $399 starting total to the $459 final total and identifies the $60 mandatory fee that first appeared at confirmation.”

## 0:58–1:18 — ChoiceGuard

Open the preselected headphones flow and capture the cart step.

Say: “ChoiceGuard preserves the initial control state, so it can distinguish a page default from something the shopper selected later.”

Show the add-on name and price evidence.

## 1:18–1:38 — RenewalLens and uncertainty

Open the risky trial flow. Show “terms not visible yet” before the final step, then the late-renewal warning at step 4.

Say: “Missing terms are not called safe. RenewalLens waits for evidence and shows uncertainty explicitly.”

## 1:38–1:52 — responsible architecture

Show the privacy card in the extension.

Say: “FairFlow does not read form values, card details, full URLs, screenshots, or background tabs. Evidence stays local for no more than 24 hours and is sent only to the loopback API.”

## 1:52–2:00 — close

Show the ablation result table.

“On our controlled benchmark, final-page methods lose the timing signal. FairFlow makes checkout changes visible, explainable, and actionable.”


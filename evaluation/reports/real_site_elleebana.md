# Real-site checkout test: Elleebana Shop USA

Test scope: public product and cart pages only. No checkout was submitted and no personal or payment data was entered.

## Scenario

- Product: Elleebana White Brow Mapping Pencil
- Product price captured: USD 7.00
- Cart total captured: USD 7.00
- Default paid choice captured: Shipping Protection, USD 0.98
- Opt-out path observed: “Checkout without protection”

## FairFlow result

- Risk score: 30/100
- Risk level: moderate
- Finding: `preselected_addon`
- Confidence: 0.96 overall; 0.98 for ChoiceGuard
- User alert rendered successfully on the real cart page

## Compatibility fixes produced by this test

- Ignore zero-value cart counters when selecting the primary price.
- Treat button-based protection flows as paid choices even without a native checkbox.
- Exclude optional protection widgets from mandatory-fee extraction.
- Preserve decimal cents rendered as a superscript, such as `$7<sup>00</sup>`.

Automated extractor tests cover each regression.

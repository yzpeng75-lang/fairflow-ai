import assert from "node:assert/strict";
import test from "node:test";

import { analyzeEvidence } from "../dist-test/analysis.js";

function step(number, total, overrides = {}) {
  return {
    schemaVersion: "1.0",
    flowId: "shop-checkout",
    origin: "https://shop.example",
    capturedAt: new Date(0).toISOString(),
    step: number,
    pageType: number === 1 ? "product" : "cart",
    currency: "USD",
    visibleTotal: total,
    mandatoryFees: [],
    paidChoices: [],
    renewalTerms: [],
    trialOfferObserved: false,
    excludedSensitiveFieldCount: 0,
    extractionSource: "heuristic",
    captureConfidence: 0.9,
    captureWarnings: [],
    ...overrides,
  };
}

test("runs fully local analysis for a real-world preselected add-on", async () => {
  const result = await analyzeEvidence([
    step(1, 7),
    step(2, 7, { paidChoices: [{
      controlId: "shipping-protection",
      label: "Shipping Protection",
      price: 0.98,
      selected: true,
      required: false,
      selectionOrigin: "page_default",
    }] }),
  ]);
  assert.equal(result.risk_score, 30);
  assert.equal(result.risk_level, "moderate");
  assert.equal(result.findings[0].risk_type, "preselected_addon");
});

test("combines independent detector findings and caps the score", async () => {
  const result = await analyzeEvidence([
    step(1, 10, { trialOfferObserved: true }),
    step(4, 15, {
      mandatoryFees: [{ name: "Service fee", amount: 5 }],
      paidChoices: [{ controlId: "cover", label: "Cover", price: 2, selected: true, required: false, selectionOrigin: "page_default" }],
      renewalTerms: [{ termId: "plan", trialDays: 7, renewalPrice: 20, billingInterval: "month", autoRenewal: true, disclosureText: "Renews at $20 per month" }],
    }),
  ]);
  assert.equal(result.risk_score, 100);
  assert.equal(result.risk_level, "critical");
  assert.deepEqual(result.findings.map((item) => item.risk_type), ["hidden_fee", "preselected_addon", "trial_to_paid"]);
});

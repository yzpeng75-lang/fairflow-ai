import assert from "node:assert/strict";
import test from "node:test";

import { Window } from "happy-dom";


async function loadCapture(html, url) {
  const window = new Window({ url });
  window.document.write(html);
  Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value() {
      return { width: 160, height: 24, top: 0, right: 160, bottom: 24, left: 0, x: 0, y: 0, toJSON() {} };
    },
  });
  globalThis.document = window.document;
  globalThis.location = window.location;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  const moduleUrl = new URL(`../dist-test/capture.js?case=${Date.now()}-${Math.random()}`, import.meta.url);
  const { captureCheckoutEvidence } = await import(moduleUrl);
  return captureCheckoutEvidence();
}

test("extracts evidence from an unannotated real-world checkout shape", async () => {
  const result = await loadCapture(`
    <!doctype html>
    <html><head><title>Cart – Northstar Store</title></head><body>
      <main>
        <section class="order-summary">
          <div class="cart-total"><span>Order total</span><strong>$29.99</strong></div>
          <div class="line-item"><span>Shipping</span><span>$4.99</span></div>
        </section>
        <label><input id="protection" type="checkbox" checked> Shipping protection $2.00</label>
        <small>7-day free trial, then $12.00 per month. Automatically renews.</small>
        <input type="email" autocomplete="email">
        <input autocomplete="cc-number">
      </main>
    </body></html>
  `, "https://shop.example/cart");

  assert.equal(result.pageType, "cart");
  assert.equal(result.step, 2);
  assert.equal(result.currency, "USD");
  assert.equal(result.visibleTotal, 29.99);
  assert.deepEqual(result.mandatoryFees, [{ name: "Shipping", amount: 4.99 }]);
  assert.equal(result.paidChoices.length, 1);
  assert.equal(result.paidChoices[0].selectionOrigin, "page_default");
  assert.equal(result.renewalTerms.length, 1);
  assert.equal(result.renewalTerms[0].trialDays, 7);
  assert.equal(result.renewalTerms[0].renewalPrice, 12);
  assert.equal(result.trialOfferObserved, true);
  assert.equal(result.excludedSensitiveFieldCount, 2);
});

test("keeps deterministic annotated-page extraction", async () => {
  const result = await loadCapture(`
    <!doctype html>
    <html><head><title>Checkout</title></head><body>
      <main data-ff-flow-id="controlled-flow" data-ff-step="3">
        <strong data-ff-role="visible-total">Total €19.50</strong>
        <p data-ff-role="mandatory-fee">Service fee €2.50</p>
      </main>
    </body></html>
  `, "https://lab.example/checkout");

  assert.equal(result.flowId, "controlled-flow");
  assert.equal(result.pageType, "details");
  assert.equal(result.visibleTotal, 19.5);
  assert.equal(result.currency, "EUR");
  assert.equal(result.mandatoryFees[0].amount, 2.5);
});

test("rejects pages without an unambiguous visible price", async () => {
  await assert.rejects(
    () => loadCapture("<html><head><title>News</title></head><body><main>No commerce here.</main></body></html>", "https://example.com/news"),
    /No unambiguous visible price or total/,
  );
});

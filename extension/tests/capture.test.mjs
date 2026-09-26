import assert from "node:assert/strict";
import test from "node:test";

import { Window } from "happy-dom";


async function loadCapture(html, url, setup) {
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
  setup?.(window);
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
  const result = await loadCapture("<html><head><title>News</title></head><body><main>No commerce here.</main></body></html>", "https://example.com/news");
  assert.equal(result, null);
});

test("reads Schema.org Offer metadata when visual markup is nonstandard", async () => {
  const result = await loadCapture(`
    <html><head><title>Handmade Lamp</title>
      <script type="application/ld+json">{
        "@context": "https://schema.org", "@type": "Product", "name": "Lamp",
        "offers": { "@type": "Offer", "price": "48.90", "priceCurrency": "GBP" }
      }</script>
    </head><body><main><h1>Handmade Lamp</h1></main></body></html>
  `, "https://merchant.example/products/lamp");

  assert.equal(result.visibleTotal, 48.9);
  assert.equal(result.currency, "GBP");
  assert.equal(result.extractionSource, "structured_data");
});

test("recognizes a platform total with symbol-after European formatting", async () => {
  const result = await loadCapture(`
    <html><head><title>Warenkorb</title></head><body><main>
      <div class="order-total"><strong class="woocommerce-Price-amount">Gesamtbetrag 19,95 €</strong></div>
      <p>Versand 3,50 €</p>
    </main></body></html>
  `, "https://shop.example.de/warenkorb");

  assert.equal(result.visibleTotal, 19.95);
  assert.equal(result.currency, "EUR");
  assert.equal(result.extractionSource, "platform");
  assert.equal(result.mandatoryFees[0].amount, 3.5);
});

test("searches visible content inside open shadow roots", async () => {
  const result = await loadCapture(
    "<html><head><title>Cart</title></head><body><main><checkout-summary></checkout-summary></main></body></html>",
    "https://components.example/cart",
    (window) => {
      const host = window.document.querySelector("checkout-summary");
      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = '<strong data-testid="total-amount">Order total $72.00</strong>';
    },
  );

  assert.equal(result.visibleTotal, 72);
  assert.equal(result.extractionSource, "platform");
});

test("treats a visible single-page cart drawer as a new cart step", async () => {
  const result = await loadCapture(`
    <html><head><title>Dish Soap – Public Goods</title></head><body><main>
      <h1>Dish Soap</h1><strong class="price__regular">$9.95</strong>
      <aside class="cart-drawer" role="dialog">
        <h2>Your cart</h2>
        <strong class="totals__total-value">Order total $9.95</strong>
        <button>Continue to Checkout</button>
      </aside>
    </main></body></html>
  `, "https://shop.example/products/dish-soap");

  assert.equal(result.pageType, "cart");
  assert.equal(result.step, 2);
  assert.equal(result.visibleTotal, 9.95);
});

test("ignores a zero cart counter and reads the product offer", async () => {
  const result = await loadCapture(`
    <html><head><title>Mapping Pencil</title>
      <meta property="product:price:amount" content="7.00">
      <meta property="product:price:currency" content="USD">
    </head><body><main><h1>Mapping Pencil</h1><button>0 Cart</button><p>$7.00</p></main></body></html>
  `, "https://merchant.example/products/pencil");

  assert.equal(result.pageType, "product");
  assert.equal(result.visibleTotal, 7);
});

test("preserves cents rendered in a superscript", async () => {
  const result = await loadCapture(`
    <html><head><title>Mapping Pencil</title></head><body><main>
      <h1>Mapping Pencil</h1>
      <div class="price__regular"><span class="price-item--regular">$7<sup>00</sup></span></div>
    </main></body></html>
  `, "https://merchant.example/products/pencil");

  assert.equal(result.visibleTotal, 7);
});

test("captures button-based default shipping protection as a paid choice", async () => {
  const result = await loadCapture(`
    <html><head><title>Your Shopping Cart</title></head><body><main>
      <h1>Cart</h1>
      <strong class="order-total">Total $7.00</strong>
      <div id="nvd-standard-widget-container">
        <h3>Shipping Protection</h3>
        <span class="nvd-std-widget-price">$0.98</span>
        <button>Protected Checkout | $7.98</button>
        <button>Checkout without protection</button>
      </div>
    </main></body></html>
  `, "https://merchant.example/cart");

  assert.equal(result.pageType, "cart");
  assert.equal(result.paidChoices.length, 1);
  assert.deepEqual(result.paidChoices[0], {
    controlId: "nvd-standard-widget-container",
    label: "Shipping Protection",
    price: 0.98,
    selected: true,
    required: false,
    selectionOrigin: "page_default",
  });
  assert.equal(result.mandatoryFees.length, 0);
});

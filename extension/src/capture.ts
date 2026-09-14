export interface CapturedFee {
  name: string;
  amount: number;
}

export interface CapturedChoice {
  controlId: string;
  label: string;
  price: number;
  selected: boolean;
  required: boolean;
  selectionOrigin: "page_default" | "user_action" | "unknown";
}

export interface CapturedRenewal {
  termId: string;
  trialDays: number;
  renewalPrice: number;
  billingInterval: "day" | "week" | "month" | "year";
  autoRenewal: boolean;
  disclosureText: string;
}

export interface PageEvidence {
  schemaVersion: "1.0";
  flowId: string;
  origin: string;
  capturedAt: string;
  step: number;
  pageType: string;
  currency: string;
  visibleTotal: number;
  mandatoryFees: CapturedFee[];
  paidChoices: CapturedChoice[];
  renewalTerms: CapturedRenewal[];
  trialOfferObserved: boolean;
  excludedSensitiveFieldCount: number;
  extractionSource: "annotated" | "platform" | "structured_data" | "heuristic";
  captureConfidence: number;
  captureWarnings: string[];
}

export function captureCheckoutEvidence(): PageEvidence | null {
  const annotatedRoot = document.querySelector<HTMLElement>("[data-ff-flow-id]");
  const root = annotatedRoot ?? document.body;
  const amountPattern = /(?:US\$|CA\$|AU\$|NZ\$|HK\$|S\$|[$¥€£₹₩])\s*([0-9][0-9,.]*(?:[.,][0-9]{1,2})?)|([0-9][0-9,.]*(?:[.,][0-9]{1,2})?)\s*(?:USD|GBP|EUR|CNY|RMB|AUD|CAD|NZD|JPY|CHF|SEK|NOK|DKK|PLN|BRL|MXN|INR|KRW|[$¥€£₹₩])/gi;
  const sensitiveSelector = [
    "input[type='password']",
    "input[type='email']",
    "input[autocomplete*='cc-']",
    "input[autocomplete*='address']",
    "input[autocomplete*='name']",
    "input[autocomplete*='tel']",
    "[data-ff-sensitive]",
  ].join(",");

  function cleanText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  }

  function numericAmount(raw: string): number {
    const compact = raw.replace(/\s/g, "");
    if (compact.includes(",") && !compact.includes(".")) {
      const decimalComma = /,\d{1,2}$/.test(compact);
      return Number(decimalComma ? compact.replace(",", ".") : compact.replaceAll(",", ""));
    }
    return Number(compact.replaceAll(",", ""));
  }

  function amounts(text: string): number[] {
    amountPattern.lastIndex = 0;
    return [...text.matchAll(amountPattern)]
      .map((match) => numericAmount(match[1] ?? match[2] ?? "0"))
      .filter((value) => Number.isFinite(value));
  }

  function amount(text: string): number {
    return amounts(text).at(-1) ?? 0;
  }

  function currency(text: string): string {
    if (/\b(?:CNY|RMB)\b/i.test(text) || text.includes("¥")) return "CNY";
    if (/\bEUR\b/i.test(text) || text.includes("€")) return "EUR";
    if (/\bGBP\b/i.test(text) || text.includes("£")) return "GBP";
    if (/\bAUD\b/i.test(text) || text.includes("AU$")) return "AUD";
    if (/\bCAD\b/i.test(text) || text.includes("CA$")) return "CAD";
    if (/\bNZD\b/i.test(text) || text.includes("NZ$")) return "NZD";
    if (/\bJPY\b/i.test(text)) return "JPY";
    if (/\bCHF\b/i.test(text)) return "CHF";
    if (/\bSEK\b/i.test(text)) return "SEK";
    if (/\bNOK\b/i.test(text)) return "NOK";
    if (/\bDKK\b/i.test(text)) return "DKK";
    if (/\bPLN\b/i.test(text)) return "PLN";
    if (/\bBRL\b/i.test(text)) return "BRL";
    if (/\bMXN\b/i.test(text)) return "MXN";
    if (text.includes("₹")) return "INR";
    if (text.includes("₩")) return "KRW";
    return "USD";
  }

  function labelWithoutPrice(text: string): string {
    amountPattern.lastIndex = 0;
    return cleanText(text.replace(amountPattern, "").replace(/[·|]/g, " "));
  }

  function isSensitive(element: Element): boolean {
    return Boolean(element.matches(sensitiveSelector) || element.closest(sensitiveSelector));
  }

  function isVisible(element: HTMLElement): boolean {
    if (isSensitive(element) || element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  }

  function genericElements(selector: string): HTMLElement[] {
    const results: HTMLElement[] = [];
    const pending: Array<HTMLElement | ShadowRoot> = [root];
    const visited = new Set<HTMLElement | ShadowRoot>();
    while (pending.length && results.length < 2500) {
      const scope = pending.shift()!;
      if (visited.has(scope)) continue;
      visited.add(scope);
      results.push(...[...scope.querySelectorAll<HTMLElement>(selector)].filter(isVisible));
      for (const element of [...scope.querySelectorAll<HTMLElement>("*")].slice(0, 2500)) {
        if (element.shadowRoot) pending.push(element.shadowRoot);
      }
    }
    return [...new Set(results)].slice(0, 2500);
  }

  function structuredPrice() {
    const metaPrice = document.querySelector<HTMLMetaElement>("meta[itemprop='price'], meta[property='product:price:amount'], meta[property='og:price:amount']");
    const metaCurrency = document.querySelector<HTMLMetaElement>("meta[itemprop='priceCurrency'], meta[property='product:price:currency'], meta[property='og:price:currency']");
    const rawMetaPrice = metaPrice?.getAttribute("content") ?? "";
    const metaAmount = numericAmount(rawMetaPrice);
    const metaCurrencyCode = (metaCurrency?.getAttribute("content") ?? "USD").toUpperCase();
    if (metaPrice && rawMetaPrice.trim() && Number.isFinite(metaAmount)) {
      return { text: `${metaAmount} ${metaCurrencyCode}`, source: "structured_data" as const, confidence: 0.9 };
    }

    const offers: Array<{ price: number; currency: string }> = [];
    function visit(node: unknown, depth = 0): void {
      if (depth > 7 || node == null) return;
      if (Array.isArray(node)) {
        node.slice(0, 100).forEach((item) => visit(item, depth + 1));
        return;
      }
      if (typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      const type = Array.isArray(record["@type"]) ? record["@type"].join(" ") : String(record["@type"] ?? "");
      const rawPrice = record.price ?? record.lowPrice ?? record.highPrice;
      const price = numericAmount(String(rawPrice ?? ""));
      if (/Offer|PriceSpecification|Product/i.test(type) && String(rawPrice ?? "").trim() && Number.isFinite(price)) {
        offers.push({ price, currency: String(record.priceCurrency ?? "USD").toUpperCase() });
      }
      Object.keys(record).slice(0, 100).forEach((key) => visit(record[key], depth + 1));
    }
    for (const script of [...document.querySelectorAll<HTMLScriptElement>("script[type='application/ld+json']")].slice(0, 30)) {
      try { visit(JSON.parse(script.textContent ?? "null")); } catch { /* Ignore malformed public metadata. */ }
    }
    const offer = offers.find((item) => item.price >= 0);
    return offer ? { text: `${offer.price} ${offer.currency}`, source: "structured_data" as const, confidence: 0.86 } : null;
  }

  function totalScore(element: HTMLElement, text: string): number {
    const lower = text.toLowerCase();
    const identity = `${element.id} ${element.className} ${element.getAttribute("data-testid") ?? ""}`.toLowerCase();
    let score = 0;
    if (/(grand total|order total|total due|amount due|due today|pay now|应付总额|订单总计|实付|gesamtbetrag|zahlbetrag|montant total|importe total|totale ordine)/.test(lower)) score += 140;
    else if (/(\btotal\b|总计|合计|gesamt|totale|montant|importe|totaal|合計)/.test(lower)) score += 95;
    if (/(subtotal|estimated total|savings|discount|小计|预计|优惠|zwischensumme|sous-total|sottototale|subtotal estimado)/.test(lower)) score -= 90;
    if (/total|amount-due|order-summary|checkout|cart-summary|payment-summary/.test(identity)) score += 45;
    if (/(\bprice\b|\bplan\b|per month|per year|\/mo|\/yr|价格|套餐|每月|每年|monatlich|jährlich|mensuel|annuel)/.test(lower)) score += 18;
    if (["STRONG", "B", "OUTPUT"].includes(element.tagName)) score += 8;
    score += Math.max(0, 20 - Math.floor(text.length / 10));
    return score;
  }

  function findVisibleTotal() {
    const annotated = genericElements("[data-ff-role='visible-total']")[0];
    if (annotated) return { text: cleanText(annotated.textContent ?? ""), source: "annotated" as const, confidence: 1 };
    const platformSelector = [
      ".totals__total-value", ".cart__final-price", ".price-item--regular", ".price__regular",
      ".order-total .amount", ".order-total [class*='amount' i]", ".woocommerce-Price-amount", ".cart-subtotal + .order-total",
      "[data-testid='order-summary-total-amount']", "[data-testid='total-amount']", "[data-testid='hosted-payment-submit-button']",
      "[data-checkout-payment-due-target]", ".payment-due__price", ".OrderSummary-totalAmount",
    ].join(",");
    const platformElements = genericElements(platformSelector);
    const likely = genericElements([
      "[data-testid*='total' i]",
      "[aria-label*='total' i]",
      "[id*='total' i]",
      "[class*='total' i]",
      "[data-testid*='price' i]",
      "[class*='price' i]",
      "main strong",
      "main output",
    ].join(","));
    const ranked = [...new Set([...platformElements, ...likely])]
      .map((element) => ({ element, text: cleanText(element.textContent ?? "") }))
      .filter((candidate) => candidate.text.length > 0 && candidate.text.length <= 220 && amounts(candidate.text).length > 0)
      .map((candidate) => {
        const platform = platformElements.includes(candidate.element);
        return { ...candidate, platform, score: totalScore(candidate.element, candidate.text) + (platform ? 60 : 0) };
      })
      .sort((left, right) => right.score - left.score || left.text.length - right.text.length);
    const best = ranked[0];
    if (best) {
      return {
        text: best.text,
        source: best.platform ? "platform" as const : "heuristic" as const,
        confidence: best.platform ? 0.94 : best.score >= 130 ? 0.88 : 0.72,
      };
    }
    return structuredPrice();
  }

  function inferPageType(): { pageType: string; step: number } {
    const hint = cleanText(`${document.title} ${document.body.getAttribute("data-page-type") ?? ""}`).toLowerCase();
    if (/payment|place order|complete order|review order|order review|付款|支付|提交订单|zahlung|paiement|pago/.test(hint)) return { pageType: "review", step: 4 };
    if (/shipping|delivery|contact information|customer information|checkout|配送|收货|结账|versand|livraison|envío/.test(hint)) return { pageType: "details", step: 3 };
    if (/cart|basket|bag|购物车|购物袋|warenkorb|panier|carrito/.test(hint)) return { pageType: "cart", step: 2 };
    return { pageType: /pricing|plans|subscription|价格|套餐|订阅|tarife|abonnement/.test(hint) ? "pricing" : "product", step: 1 };
  }

  function feeCandidates(): CapturedFee[] {
    const annotated = genericElements("[data-ff-role='mandatory-fee']");
    const candidates = annotated.length
      ? annotated
      : genericElements("tr, li, [role='row'], [class*='line-item' i], [class*='summary' i] > div, main p, main small");
    const seen = new Set<string>();
    return candidates.flatMap((element) => {
      const text = cleanText(element.textContent ?? "");
      if (text.length === 0 || text.length > 220 || amounts(text).length === 0) return [];
      if (!/(shipping|delivery|tax|service fee|booking fee|processing fee|platform fee|handling fee|surcharge|mandatory fee|运费|配送费|税费|税|服务费|手续费|附加费|versand|lieferung|steuer|servicegebühr|livraison|expédition|taxe|frais de service|envío|impuesto|tarifa de servicio|spedizione|imposta)/i.test(text)) return [];
      if (/(subtotal|grand total|order total|total due|小计|总计|合计|zwischensumme|gesamtbetrag|sous-total|montant total|importe total)/i.test(text)) return [];
      const item = { name: labelWithoutPrice(text).slice(0, 120) || "Mandatory fee", amount: amount(text) };
      const key = `${item.name.toLowerCase()}|${item.amount.toFixed(2)}`;
      if (item.amount < 0 || seen.has(key)) return [];
      seen.add(key);
      return [item];
    }).slice(0, 20);
  }

  function choiceFromContainer(element: HTMLElement, index: number, annotated: boolean, suppliedControl?: HTMLInputElement): CapturedChoice | null {
    const control = suppliedControl ?? element.querySelector<HTMLInputElement>("input[type='checkbox'], input[type='radio']");
    if (!control || isSensitive(control)) return null;
    const text = cleanText(element.textContent ?? "");
    const price = amount(text);
    if (price <= 0 || text.length > 260) return null;
    const declaredDefault = control.dataset.ffDefaultSelected;
    const defaultSelected = declaredDefault === "true" || (declaredDefault == null && control.defaultChecked);
    const selected = control.checked;
    const selectionOrigin: CapturedChoice["selectionOrigin"] = defaultSelected
      ? "page_default"
      : annotated && selected
        ? "user_action"
        : "unknown";
    return {
      controlId: control.id || control.name || `optional-choice-${index + 1}`,
      label: (labelWithoutPrice(text) || "Optional paid choice").slice(0, 160),
      price,
      selected,
      required: control.required,
      selectionOrigin,
    };
  }

  function choiceCandidates(): CapturedChoice[] {
    const annotated = genericElements("[data-ff-role='optional-addon']");
    if (annotated.length) {
      return annotated.map((element, index) => choiceFromContainer(element, index, true)).filter((item): item is CapturedChoice => item !== null);
    }
    const controls = genericElements("input[type='checkbox'], input[type='radio']") as HTMLInputElement[];
    return controls.map((control, index) => {
      const container = control.closest<HTMLElement>("label, [role='checkbox'], [role='radio'], li, tr, [class*='option' i], [class*='addon' i]") ?? control.parentElement;
      return container ? choiceFromContainer(container, index, false, control) : null;
    }).filter((item): item is CapturedChoice => item !== null).slice(0, 30);
  }

  function renewalCandidates(): CapturedRenewal[] {
    const annotated = genericElements("[data-ff-role='renewal-disclosure']");
    const candidates = annotated.length ? annotated : genericElements("main p, main li, main small, main label, main [class*='renew' i], main [class*='subscription' i], main [class*='trial' i]");
    const seen = new Set<string>();
    return candidates.flatMap((element, index) => {
      const text = cleanText(element.textContent ?? "");
      if (text.length === 0 || text.length > 500 || amounts(text).length === 0) return [];
      if (!/(renew|recurring|subscription|billed|billing|per\s+(?:day|week|month|year)|\/(?:day|week|mo(?:nth)?|yr|year)|after\s+(?:the\s+)?trial|自动续费|续订|订阅|每(?:天|周|月|年)|monatlich|jährlich|verlänger|abonnement|mensuel|annuel|renouvel|suscripción|mensual|anual|renovación)/i.test(text)) return [];
      const intervalRaw = text.match(/(?:per|every|\/|billed\s+)(?:\s*(?:one|1))?\s*(day|week|month|year|mo|yr)s?/i)?.[1]?.toLowerCase();
      const intervalMap: Record<string, "day" | "week" | "month" | "year"> = { day: "day", week: "week", month: "month", mo: "month", year: "year", yr: "year" };
      const billingInterval = intervalMap[intervalRaw ?? ""]
        ?? (/(每月|monatlich|mensuel|mensual)/i.test(text) ? "month" : undefined)
        ?? (/(每年|jährlich|annuel|anual)/i.test(text) ? "year" : undefined)
        ?? (/(每周|wöchentlich|hebdomadaire|semanal)/i.test(text) ? "week" : undefined)
        ?? (/(每天|täglich|quotidien|diario)/i.test(text) ? "day" : undefined);
      if (!billingInterval) return [];
      const trialDaysMatch = text.match(/(\d+)\s*-?\s*day(?:s)?(?:\s+(?:free\s+)?trial)?/i);
      const trialWeeksMatch = text.match(/(\d+)\s*-?\s*week(?:s)?(?:\s+(?:free\s+)?trial)?/i);
      const trialDays = trialDaysMatch ? Number(trialDaysMatch[1]) : trialWeeksMatch ? Number(trialWeeksMatch[1]) * 7 : 1;
      const disclosureText = text.slice(0, 500);
      const renewalPrice = amount(text);
      const trialSignal = /(trial|free\s+for|试用|体验期|probezeit|essai|prueba|prova)/i.test(text);
      const key = `${renewalPrice.toFixed(2)}|${billingInterval}|${disclosureText.toLowerCase()}`;
      if (renewalPrice <= 0 || seen.has(key)) return [];
      seen.add(key);
      return [{
        termId: `renewal-term-${index + 1}`,
        trialDays: Math.min(730, Math.max(1, trialDays)),
        renewalPrice,
        billingInterval,
        autoRenewal: trialSignal && /(auto(?:matically)?[ -]?renew|renew|recurring|subscription|after\s+(?:the\s+)?trial|自动续费|续订|订阅|verlänger|abonnement|renouvel|suscripción|renovación)/i.test(text),
        disclosureText,
      }];
    }).slice(0, 20);
  }

  const totalCandidate = findVisibleTotal();
  if (!totalCandidate) return null;
  const totalText = totalCandidate.text;
  const inferred = inferPageType();
  const step = Number(annotatedRoot?.dataset.ffStep ?? inferred.step);
  const mandatoryFees = feeCandidates();
  const paidChoices = choiceCandidates();
  const renewalTerms = renewalCandidates();
  const trialOfferObserved = Number(annotatedRoot?.dataset.ffTrialDays ?? "0") > 0
    || renewalTerms.some((term) => /\btrial\b/i.test(term.disclosureText));
  const captureWarnings = [
    ...(totalCandidate.confidence < 0.8 ? ["The total was inferred heuristically; verify it before analysis."] : []),
    ...(totalCandidate.source === "structured_data" ? ["The price came from public structured metadata and may represent the first available variant."] : []),
    ...(!annotatedRoot && paidChoices.some((choice) => choice.selected && choice.selectionOrigin === "unknown") ? ["A paid option is selected, but its initial state could not be proven."] : []),
  ];

  return {
    schemaVersion: "1.0",
    flowId: annotatedRoot?.dataset.ffFlowId || `${location.origin}-checkout`,
    origin: location.origin,
    capturedAt: new Date().toISOString(),
    step,
    pageType: annotatedRoot ? (["product", "cart", "details", "review"][step - 1] ?? "checkout") : inferred.pageType,
    currency: currency(totalText),
    visibleTotal: amount(totalText),
    mandatoryFees,
    paidChoices,
    renewalTerms,
    trialOfferObserved,
    excludedSensitiveFieldCount: root.querySelectorAll(sensitiveSelector).length,
    extractionSource: totalCandidate.source,
    captureConfidence: totalCandidate.confidence,
    captureWarnings,
  };
}

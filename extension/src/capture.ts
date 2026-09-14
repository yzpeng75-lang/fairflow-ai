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
}

export function captureCheckoutEvidence(): PageEvidence {
  const annotatedRoot = document.querySelector<HTMLElement>("[data-ff-flow-id]");
  const root = annotatedRoot ?? document.body;
  const amountPattern = /(?:US\$|CA\$|AU\$|NZ\$|HK\$|S\$|[$¥€£₹₩])\s*([0-9][0-9,.]*(?:[.,][0-9]{1,2})?)|([0-9][0-9,.]*(?:[.,][0-9]{1,2})?)\s*(?:USD|GBP|EUR|CNY|RMB|AUD|CAD|NZD)\b/gi;
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
    return [...root.querySelectorAll<HTMLElement>(selector)].filter(isVisible).slice(0, 2500);
  }

  function totalScore(element: HTMLElement, text: string): number {
    const lower = text.toLowerCase();
    const identity = `${element.id} ${element.className} ${element.getAttribute("data-testid") ?? ""}`.toLowerCase();
    let score = 0;
    if (/\b(grand total|order total|total due|amount due|due today|pay now)\b/.test(lower)) score += 140;
    else if (/\btotal\b/.test(lower)) score += 95;
    if (/\b(subtotal|estimated total|savings|discount)\b/.test(lower)) score -= 90;
    if (/total|amount-due|order-summary/.test(identity)) score += 45;
    if (/\b(price|plan|per month|per year|\/mo|\/yr)\b/.test(lower)) score += 18;
    if (["STRONG", "B", "OUTPUT"].includes(element.tagName)) score += 8;
    score += Math.max(0, 20 - Math.floor(text.length / 10));
    return score;
  }

  function findVisibleTotal(): HTMLElement | null {
    const annotated = root.querySelector<HTMLElement>("[data-ff-role='visible-total']");
    if (annotated) return annotated;
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
    const ranked = [...new Set(likely)]
      .map((element) => ({ element, text: cleanText(element.textContent ?? "") }))
      .filter((candidate) => candidate.text.length > 0 && candidate.text.length <= 220 && amounts(candidate.text).length > 0)
      .map((candidate) => ({ ...candidate, score: totalScore(candidate.element, candidate.text) }))
      .sort((left, right) => right.score - left.score || left.text.length - right.text.length);
    return ranked[0]?.element ?? null;
  }

  function inferPageType(): { pageType: string; step: number } {
    const hint = cleanText(`${document.title} ${document.body.getAttribute("data-page-type") ?? ""}`).toLowerCase();
    if (/payment|place order|complete order|review order|order review/.test(hint)) return { pageType: "review", step: 4 };
    if (/shipping|delivery|contact information|customer information|checkout/.test(hint)) return { pageType: "details", step: 3 };
    if (/cart|basket|bag/.test(hint)) return { pageType: "cart", step: 2 };
    return { pageType: /pricing|plans|subscription/.test(hint) ? "pricing" : "product", step: 1 };
  }

  function feeCandidates(): CapturedFee[] {
    const annotated = [...root.querySelectorAll<HTMLElement>("[data-ff-role='mandatory-fee']")];
    const candidates = annotated.length
      ? annotated
      : genericElements("tr, li, [role='row'], [class*='line-item' i], [class*='summary' i] > div, main p, main small");
    const seen = new Set<string>();
    return candidates.flatMap((element) => {
      const text = cleanText(element.textContent ?? "");
      if (text.length === 0 || text.length > 220 || amounts(text).length === 0) return [];
      if (!/(shipping|delivery|tax|service fee|booking fee|processing fee|platform fee|handling fee|surcharge|mandatory fee)/i.test(text)) return [];
      if (/\b(subtotal|grand total|order total|total due)\b/i.test(text)) return [];
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
    const annotated = [...root.querySelectorAll<HTMLElement>("[data-ff-role='optional-addon']")];
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
    const annotated = [...root.querySelectorAll<HTMLElement>("[data-ff-role='renewal-disclosure']")];
    const candidates = annotated.length ? annotated : genericElements("main p, main li, main small, main label, main [class*='renew' i], main [class*='subscription' i], main [class*='trial' i]");
    const seen = new Set<string>();
    return candidates.flatMap((element, index) => {
      const text = cleanText(element.textContent ?? "");
      if (text.length === 0 || text.length > 500 || amounts(text).length === 0) return [];
      if (!/(renew|recurring|subscription|billed|billing|per\s+(?:day|week|month|year)|\/(?:day|week|mo(?:nth)?|yr|year)|after\s+(?:the\s+)?trial)/i.test(text)) return [];
      const intervalRaw = text.match(/(?:per|every|\/|billed\s+)(?:\s*(?:one|1))?\s*(day|week|month|year|mo|yr)s?/i)?.[1]?.toLowerCase();
      const intervalMap: Record<string, "day" | "week" | "month" | "year"> = { day: "day", week: "week", month: "month", mo: "month", year: "year", yr: "year" };
      const billingInterval = intervalMap[intervalRaw ?? ""];
      if (!billingInterval) return [];
      const trialDaysMatch = text.match(/(\d+)\s*-?\s*day(?:s)?(?:\s+(?:free\s+)?trial)?/i);
      const trialWeeksMatch = text.match(/(\d+)\s*-?\s*week(?:s)?(?:\s+(?:free\s+)?trial)?/i);
      const trialDays = trialDaysMatch ? Number(trialDaysMatch[1]) : trialWeeksMatch ? Number(trialWeeksMatch[1]) * 7 : 1;
      const disclosureText = text.slice(0, 500);
      const renewalPrice = amount(text);
      const key = `${renewalPrice.toFixed(2)}|${billingInterval}|${disclosureText.toLowerCase()}`;
      if (renewalPrice <= 0 || seen.has(key)) return [];
      seen.add(key);
      return [{
        termId: `renewal-term-${index + 1}`,
        trialDays: Math.min(730, Math.max(1, trialDays)),
        renewalPrice,
        billingInterval,
        autoRenewal: /(auto(?:matically)?[ -]?renew|renew|recurring|subscription|after\s+(?:the\s+)?trial)/i.test(text),
        disclosureText,
      }];
    }).slice(0, 20);
  }

  const totalElement = findVisibleTotal();
  if (!totalElement) throw new Error("No unambiguous visible price or total was found on this page.");
  const totalText = cleanText(totalElement.textContent ?? "");
  const inferred = inferPageType();
  const step = Number(annotatedRoot?.dataset.ffStep ?? inferred.step);
  const mandatoryFees = feeCandidates();
  const paidChoices = choiceCandidates();
  const renewalTerms = renewalCandidates();
  const trialOfferObserved = Number(annotatedRoot?.dataset.ffTrialDays ?? "0") > 0
    || renewalTerms.some((term) => /\btrial\b/i.test(term.disclosureText));

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
  };
}

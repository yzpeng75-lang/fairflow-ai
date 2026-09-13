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
  const root = document.querySelector<HTMLElement>("[data-ff-flow-id]") ?? document.body;
  const amountPattern = /(?:US\$|CA\$|AU\$|[$¥€£])\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g;
  const sensitiveSelector = [
    "input[type='password']",
    "input[type='email']",
    "input[autocomplete*='cc-']",
    "input[autocomplete*='address']",
    "[data-ff-sensitive]",
  ].join(",");

  function amount(text: string): number {
    const matches = [...text.matchAll(amountPattern)];
    const raw = matches.at(-1)?.[1] ?? "0";
    return Number(raw.replaceAll(",", ""));
  }

  function currency(text: string): string {
    if (text.includes("¥")) return "CNY";
    if (text.includes("€")) return "EUR";
    if (text.includes("£")) return "GBP";
    return "USD";
  }

  function labelWithoutPrice(text: string): string {
    return text.replace(amountPattern, "").replace(/[·|]/g, " ").replace(/\s+/g, " ").trim();
  }

  const totalElement = root.querySelector<HTMLElement>("[data-ff-role='visible-total']");
  if (!totalElement) throw new Error("No supported visible total was found on this page.");
  const totalText = totalElement.textContent ?? "";
  const step = Number(root.dataset.ffStep ?? "1");

  const mandatoryFees = [...root.querySelectorAll<HTMLElement>("[data-ff-role='mandatory-fee']")].map((element) => {
    const text = element.textContent ?? "";
    return { name: labelWithoutPrice(text) || "Mandatory fee", amount: amount(text) };
  });

  const paidChoices = [...root.querySelectorAll<HTMLElement>("[data-ff-role='optional-addon']")].map((element, index) => {
    const control = element.querySelector<HTMLInputElement>("input[type='checkbox'], input[type='radio']");
    const text = element.textContent ?? "";
    const declaredDefault = control?.dataset.ffDefaultSelected;
    const defaultSelected = declaredDefault === "true" || (declaredDefault == null && Boolean(control?.defaultChecked));
    const selected = Boolean(control?.checked);
    const selectionOrigin: CapturedChoice["selectionOrigin"] = defaultSelected
      ? "page_default"
      : selected
        ? "user_action"
        : "page_default";
    return {
      controlId: control?.id || `optional-choice-${index + 1}`,
      label: labelWithoutPrice(text) || "Optional paid choice",
      price: amount(text),
      selected,
      required: Boolean(control?.required),
      selectionOrigin,
    };
  });

  const renewalTerms = [...root.querySelectorAll<HTMLElement>("[data-ff-role='renewal-disclosure']")].map((element, index) => {
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    const days = Number(text.match(/(\d+)\s*-?day/i)?.[1] ?? "0");
    const intervalMatch = text.match(/(?:per|\/)\s*(day|week|month|year)/i)?.[1]?.toLowerCase();
    const interval = (["day", "week", "month", "year"].includes(intervalMatch ?? "") ? intervalMatch : "month") as "day" | "week" | "month" | "year";
    return {
      termId: `renewal-term-${index + 1}`,
      trialDays: Math.max(days, 1),
      renewalPrice: amount(text),
      billingInterval: interval,
      autoRenewal: true,
      disclosureText: text,
    };
  }).filter((term) => term.renewalPrice > 0);

  return {
    schemaVersion: "1.0",
    flowId: root.dataset.ffFlowId || `${location.origin}-checkout`,
    origin: location.origin,
    capturedAt: new Date().toISOString(),
    step,
    pageType: ["product", "cart", "details", "review"][step - 1] ?? "checkout",
    currency: currency(totalText),
    visibleTotal: amount(totalText),
    mandatoryFees,
    paidChoices,
    renewalTerms,
    trialOfferObserved: Number(root.dataset.ffTrialDays ?? "0") > 0,
    excludedSensitiveFieldCount: root.querySelectorAll(sensitiveSelector).length,
  };
}

import type { PageEvidence } from "./capture";

export interface UnifiedResult {
  risk_score: number;
  risk_level: "clear" | "moderate" | "high" | "critical";
  confidence: number;
  needs_review: boolean;
  summary: string;
  findings: Array<{ risk_type: string; title: string; evidence: string; confidence: number; recommended_action: string }>;
}

export async function analyzeEvidence(items: PageEvidence[]): Promise<UnifiedResult> {
  const observations = [...items].sort((a, b) => a.step - b.step);
  if (observations.length < 2) throw new Error("Capture at least two different checkout steps before analysis.");
  const flowId = observations[0].flowId;
  if (observations.some((item) => item.flowId !== flowId)) throw new Error("Start a new audit before switching checkout flows.");

  const price_trace = {
    flow_id: flowId,
    observations: observations.map((item) => ({
      step: item.step,
      page_type: item.pageType,
      currency: item.currency,
      visible_total: item.visibleTotal,
      line_items: item.mandatoryFees.map((fee) => ({ name: fee.name, amount: fee.amount, kind: "mandatory_fee" })),
    })),
  };
  const hasChoices = observations.some((item) => item.paidChoices.length > 0);
  const choice_guard = hasChoices ? {
    flow_id: flowId,
    observations: observations.map((item) => ({
      step: item.step,
      page_type: item.pageType,
      currency: item.currency,
      choices: item.paidChoices.map((choice) => ({
        control_id: choice.controlId,
        label: choice.label,
        price: choice.price,
        selected: choice.selected,
        required: choice.required,
        selection_origin: choice.selectionOrigin,
      })),
    })),
  } : null;
  const hasRenewal = observations.some((item) => item.trialOfferObserved || item.renewalTerms.length > 0);
  const renewal_lens = hasRenewal ? {
    flow_id: flowId,
    commitment_step: observations.at(-1)!.step,
    observations: observations.map((item) => ({
      step: item.step,
      page_type: item.pageType,
      currency: item.currency,
      terms: item.renewalTerms.map((term) => ({
        term_id: term.termId,
        trial_days: term.trialDays,
        renewal_price: term.renewalPrice,
        billing_interval: term.billingInterval,
        auto_renewal: term.autoRenewal,
        disclosure_text: term.disclosureText,
      })),
    })),
  } : null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("http://127.0.0.1:8000/api/v1/analyze/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flow_id: flowId, price_trace, choice_guard, renewal_lens }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Analysis service rejected the evidence (${response.status}).`);
    return response.json() as Promise<UnifiedResult>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Analysis timed out. Confirm that the local FairFlow service is running.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

import type { CapturedChoice, CapturedFee, CapturedRenewal, PageEvidence } from "./capture";

export interface UnifiedFinding {
  risk_type: "hidden_fee" | "preselected_addon" | "trial_to_paid";
  severity: "moderate" | "high";
  score: number;
  detector: string;
  confidence: number;
  title: string;
  evidence: string;
  recommended_action: string;
}

export interface UnifiedResult {
  risk_score: number;
  risk_level: "clear" | "moderate" | "high" | "critical";
  confidence: number;
  needs_review: boolean;
  summary: string;
  findings: UnifiedFinding[];
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function riskLevel(score: number): UnifiedResult["risk_level"] {
  if (score === 0) return "clear";
  if (score <= 34) return "moderate";
  if (score <= 69) return "high";
  return "critical";
}

function firstLateFee(observations: PageEvidence[]): { step: number; fee: CapturedFee } | null {
  const key = (fee: CapturedFee) => `${fee.name.trim().toLocaleLowerCase()}|${money(fee.amount).toFixed(2)}`;
  const seen = new Set(observations[0].mandatoryFees.map(key));
  for (const observation of observations.slice(1)) {
    for (const fee of observation.mandatoryFees) {
      const fingerprint = key(fee);
      if (!seen.has(fingerprint)) return { step: observation.step, fee };
      seen.add(fingerprint);
    }
  }
  return null;
}

function firstChoices(observations: PageEvidence[]): Array<{ step: number; choice: CapturedChoice }> {
  const seen = new Set<string>();
  const result: Array<{ step: number; choice: CapturedChoice }> = [];
  for (const observation of observations) {
    for (const choice of observation.paidChoices) {
      if (seen.has(choice.controlId)) continue;
      seen.add(choice.controlId);
      result.push({ step: observation.step, choice });
    }
  }
  return result;
}

function firstRenewals(observations: PageEvidence[]): Array<{ step: number; term: CapturedRenewal }> {
  const seen = new Set<string>();
  const result: Array<{ step: number; term: CapturedRenewal }> = [];
  for (const observation of observations) {
    for (const term of observation.renewalTerms) {
      if (seen.has(term.termId)) continue;
      seen.add(term.termId);
      result.push({ step: observation.step, term });
    }
  }
  return result;
}

export async function analyzeEvidence(items: PageEvidence[]): Promise<UnifiedResult> {
  const observations = [...items].sort((a, b) => a.step - b.step);
  if (observations.length < 2) throw new Error("Capture at least two different checkout steps before analysis.");
  const flowId = observations[0].flowId;
  if (observations.some((item) => item.flowId !== flowId)) throw new Error("Start a new audit before switching checkout flows.");
  if (new Set(observations.map((item) => item.step)).size !== observations.length) throw new Error("Each checkout step must be unique.");
  if (new Set(observations.map((item) => item.currency)).size !== 1) throw new Error("Checkout steps use different currencies and cannot be compared safely.");

  const currency = observations[0].currency;
  const findings: UnifiedFinding[] = [];
  const confidences: number[] = [];
  const baseline = money(observations[0].visibleTotal);
  const final = money(observations.at(-1)!.visibleTotal);
  const increase = money(final - baseline);
  const lateFee = firstLateFee(observations);
  const hiddenFee = lateFee !== null && increase > 0 && Math.abs(increase - money(lateFee.fee.amount)) <= 0.01;
  const priceConfidence = hiddenFee ? (lateFee.step === observations.at(-1)!.step ? 0.97 : 0.91) : increase <= 0 || !lateFee ? 0.94 : 0.72;
  confidences.push(priceConfidence);
  if (hiddenFee && lateFee) findings.push({
    risk_type: "hidden_fee", severity: "high", score: 45, detector: "PriceTrace-v0.2-local", confidence: priceConfidence,
    title: "Mandatory fee appeared late",
    evidence: `Visible total increased by ${increase.toFixed(2)} ${currency}; mandatory item '${lateFee.fee.name}' (${money(lateFee.fee.amount).toFixed(2)} ${currency}) first appeared at step ${lateFee.step}.`,
    recommended_action: "Review the added fee and compare the final total before continuing.",
  });

  const choices = firstChoices(observations);
  if (choices.length > 0) {
    const riskyChoice = choices.find(({ choice }) => choice.price > 0 && choice.selected && !choice.required && choice.selectionOrigin === "page_default");
    const unknownSelected = choices.some(({ choice }) => choice.price > 0 && choice.selected && !choice.required && choice.selectionOrigin === "unknown");
    const choiceConfidence = riskyChoice ? 0.98 : unknownSelected ? 0.75 : 0.95;
    confidences.push(choiceConfidence);
    if (riskyChoice) findings.push({
      risk_type: "preselected_addon", severity: "moderate", score: 30, detector: "ChoiceGuard-v0.2-local", confidence: choiceConfidence,
      title: "Optional paid add-on was preselected",
      evidence: `Optional paid choice '${riskyChoice.choice.label}' (${money(riskyChoice.choice.price).toFixed(2)} ${currency}) was already selected when first seen at step ${riskyChoice.step}.`,
      recommended_action: "Decide whether you want this option; deselect it before payment if not.",
    });
  }

  const renewalApplicable = observations.some((item) => item.trialOfferObserved || item.renewalTerms.length > 0);
  let renewalNeedsReview = false;
  if (renewalApplicable) {
    const terms = firstRenewals(observations);
    const commitmentStep = observations.at(-1)!.step;
    const riskyRenewal = terms.find(({ step, term }) => term.autoRenewal && step >= commitmentStep);
    renewalNeedsReview = terms.length === 0;
    const renewalConfidence = riskyRenewal ? 0.98 : renewalNeedsReview ? 0.55 : 0.96;
    confidences.push(renewalConfidence);
    if (riskyRenewal) findings.push({
      risk_type: "trial_to_paid", severity: "high", score: 40, detector: "RenewalLens-v0.2-local", confidence: renewalConfidence,
      title: "Automatic renewal was disclosed at commitment",
      evidence: `Automatic renewal after ${riskyRenewal.term.trialDays} days at ${money(riskyRenewal.term.renewalPrice).toFixed(2)} ${currency} per ${riskyRenewal.term.billingInterval} was first disclosed at commitment step ${riskyRenewal.step}.`,
      recommended_action: "Review the renewal price and interval before starting the trial.",
    });
  }

  const needsReview = renewalNeedsReview || confidences.some((value) => value < 0.8);
  const score = Math.min(100, findings.reduce((sum, finding) => sum + finding.score, 0));
  const summary = findings.length > 0
    ? `${findings.map((finding) => finding.title).join("; ")}.`
    : needsReview ? "No confirmed risk, but at least one applicable detector needs more evidence." : "No supported risk was found by the applicable detectors.";
  return {
    risk_score: score,
    risk_level: riskLevel(score),
    confidence: money(confidences.reduce((sum, value) => sum + value, 0) / confidences.length),
    needs_review: needsReview,
    summary,
    findings,
  };
}

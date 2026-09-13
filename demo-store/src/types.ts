export type RiskLabel =
  | "normal"
  | "hidden_fee"
  | "preselected_addon"
  | "trial_to_paid";

export interface Flow {
  id: string;
  pairId: string;
  templateId: string;
  label: RiskLabel;
  language: "en" | "zh";
  category: string;
  brand: string;
  product: string;
  description: string;
  currency: "USD" | "CNY";
  basePrice: number;
  initialTotal: number;
  finalTotal: number;
  feeName: string | null;
  feeAmount: number;
  feeFirstStep: number;
  addonName: string | null;
  addonPrice: number;
  addonDefaultSelected: boolean;
  trialDays: number;
  renewalPrice: number;
  billingInterval: "none" | "month" | "year";
  renewalFirstStep: number;
  autoRenewal: boolean;
  changedFactor: string;
}


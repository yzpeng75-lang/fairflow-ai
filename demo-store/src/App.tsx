import { useEffect, useMemo, useState } from "react";
import "./choice-guard.css";
import flowData from "./data/flows.json";
import "./price-trace.css";
import "./renewal-lens.css";
import "./risk-summary.css";
import type { Flow } from "./types";

const flows = flowData as Flow[];
const steps = ["Product", "Cart", "Details", "Review"];

function money(value: number, currency: Flow["currency"]) {
  return new Intl.NumberFormat(currency === "CNY" ? "zh-CN" : "en-US", { style: "currency", currency }).format(value);
}

function visibleTotal(flow: Flow, step: number, addonSelected: boolean) {
  const fee = flow.feeName && flow.feeFirstStep <= step ? flow.feeAmount : 0;
  const addon = step >= 2 && addonSelected ? flow.addonPrice : 0;
  return flow.basePrice + fee + addon;
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const selected = useMemo(() => flows.find((flow) => flow.id === selectedId) ?? null, [selectedId]);
  const [addonSelected, setAddonSelected] = useState(false);

  useEffect(() => { if (selected) setAddonSelected(selected.addonDefaultSelected); }, [selected]);

  function start(flow: Flow) { setSelectedId(flow.id); setStep(1); setAddonSelected(flow.addonDefaultSelected); }
  function reset() { setSelectedId(null); setStep(1); }

  if (!selected) {
    return <main className="lab-shell">
      <header className="lab-header"><div><p className="kicker">FAIRFLOW RESEARCH ENVIRONMENT</p><h1>Checkout Lab</h1><p className="intro">Three evidence detectors combined into one auditable risk score.</p></div></header>
      <section className="pair-grid">{flows.map((flow) => <button className="flow-card" key={flow.id} onClick={() => start(flow)}><span className="card-topline"><span>{flow.pairId.replace("demo_pair_", "")}</span><span className={`label ${flow.label}`}>{flow.label.replaceAll("_", " ")}</span></span><strong>{flow.product}</strong><small>{flow.changedFactor.replaceAll("_", " ")}</small></button>)}</section>
      <footer className="lab-note">Select two flows with the same pair name to compare one controlled design change.</footer>
    </main>;
  }

  const currentTotal = visibleTotal(selected, step, addonSelected);
  const disclosureVisible = Boolean(selected.feeName && selected.feeFirstStep <= step);
  const renewalVisible = selected.trialDays > 0 && selected.renewalFirstStep <= step;
  const priceIncrease = Math.max(0, currentTotal - selected.initialTotal);
  const lateFeeDetected = Boolean(
    disclosureVisible && selected.feeFirstStep > 1 && Math.abs(priceIncrease - selected.feeAmount) < 0.01,
  );
  const choiceVisible = Boolean(step >= 2 && selected.addonName);
  const preselectedAddonDetected = Boolean(choiceVisible && selected.addonDefaultSelected);
  const trialFlow = selected.trialDays > 0;
  const delayedRenewalDetected = Boolean(
    renewalVisible && selected.autoRenewal && selected.renewalFirstStep >= 4,
  );
  const riskScore = Math.min(
    100,
    (lateFeeDetected ? 45 : 0) + (preselectedAddonDetected ? 30 : 0) + (delayedRenewalDetected ? 40 : 0),
  );
  const riskLevel = riskScore === 0 ? "clear" : riskScore <= 34 ? "moderate" : riskScore <= 69 ? "high" : "critical";
  const reviewPending = Boolean(trialFlow && !renewalVisible);
  const isChinese = selected.language === "zh";
  const symbol = selected.templateId.startsWith("airline") ? "✈" : selected.templateId.startsWith("hotel") ? "⌂" : selected.templateId.startsWith("retail") ? "◉" : "♫";

  return <main className={`store ${selected.templateId}`} data-ff-flow-id={selected.id} data-ff-step={step} data-ff-trial-days={selected.trialDays || undefined}>
    <header className="store-nav"><button className="back-link" onClick={reset}>← Checkout Lab</button><div className="store-brand">{selected.brand}</div><span className="secure">Test checkout</span></header>
    <ol className="steps" aria-label="Checkout progress">{steps.map((name, index) => <li className={index + 1 <= step ? "active" : ""} key={name}><span>{index + 1}</span>{name}</li>)}</ol>
    <section className="checkout-grid">
      <div className="main-panel"><p className="category">{selected.category}</p><h1>{selected.product}</h1><p className="description">{selected.description}</p>
        {step === 1 && <div className="product-visual" aria-label="Abstract product illustration"><span>{symbol}</span></div>}
        {step === 2 && <div className="form-block"><h2>{isChinese ? "检查购物车" : "Review your cart"}</h2><label>{isChinese ? "数量" : "Quantity"}<select defaultValue="1"><option>1</option></select></label>{selected.addonName && <label className="choice" data-ff-role="optional-addon"><input type="checkbox" checked={addonSelected} onChange={(event) => setAddonSelected(event.target.checked)} data-ff-default-selected={String(selected.addonDefaultSelected)} /><span><strong>{selected.addonName}</strong><small>{money(selected.addonPrice, selected.currency)} · {isChinese ? "可选" : "optional"}</small></span></label>}</div>}
        {step === 3 && <div className="form-block"><h2>{isChinese ? "联系信息" : "Contact details"}</h2><label>{isChinese ? "姓名" : "Name"}<input placeholder={isChinese ? "演示用户" : "Demo user"} data-ff-sensitive="name" /></label><label>{isChinese ? "电子邮箱" : "Email"}<input placeholder="demo@example.com" data-ff-sensitive="email" /></label><p className="privacy-note">{isChinese ? "这是测试页面，请勿输入真实个人信息。" : "This is a test page. Do not enter real personal information."}</p></div>}
        {step === 4 && <div className="form-block review-block"><h2>{isChinese ? "付款前确认" : "Review before payment"}</h2><p>{isChinese ? "请检查价格和条款。此演示不会处理付款。" : "Check the price and terms. This demo never processes payment."}</p>{renewalVisible && <label className={`choice renewal ${selected.autoRenewal ? "muted" : ""}`} data-ff-role="renewal-consent"><input type="checkbox" defaultChecked={selected.autoRenewal} data-ff-auto-renewal={String(selected.autoRenewal)} /><span><strong>{selected.autoRenewal ? "Continue after my trial" : "Subscribe after my trial"}</strong><small data-ff-role="renewal-term">After {selected.trialDays} days, {money(selected.renewalPrice, selected.currency)}/{selected.billingInterval}.</small></span></label>}<button className="pay-button" type="button" disabled>Payment disabled in research demo</button></div>}
        <section className={`risk-summary ${riskLevel}`} data-ff-role="unified-risk"><div className="risk-summary-top"><span>FAIRFLOW ENGINE · SCORE {riskScore}/100</span><strong>{reviewPending && riskScore === 0 ? "Review pending" : riskLevel}</strong></div><div className="risk-meter" aria-label={`Risk score ${riskScore} out of 100`}><span style={{ width: `${riskScore}%` }} /></div><p>{riskScore > 0 ? `${[lateFeeDetected && "late mandatory fee", preselectedAddonDetected && "preselected paid add-on", delayedRenewalDetected && "late automatic-renewal disclosure"].filter(Boolean).join(", ")}.` : reviewPending ? "No confirmed risk yet; renewal evidence is still incomplete." : "No supported risk found in the evidence observed so far."}</p></section>
      </div>
      <aside className="summary" data-ff-role="order-summary"><p className="summary-label">{isChinese ? "订单摘要" : "Order summary"}</p><div className="line"><span>{isChinese ? "基础价格" : "Base price"}</span><strong data-ff-role="base-price">{money(selected.basePrice, selected.currency)}</strong></div>{disclosureVisible && <div className="line evidence" data-ff-role="mandatory-fee" data-ff-first-step={selected.feeFirstStep}><span>{selected.feeName}</span><strong>{money(selected.feeAmount, selected.currency)}</strong></div>}{step >= 2 && addonSelected && selected.addonName && <div className="line evidence" data-ff-role="addon-price"><span>{selected.addonName}</span><strong>{money(selected.addonPrice, selected.currency)}</strong></div>}{renewalVisible && <div className="renewal-copy" data-ff-role="renewal-disclosure" data-ff-first-step={selected.renewalFirstStep}>{selected.trialDays}-day free trial. Then {money(selected.renewalPrice, selected.currency)} per {selected.billingInterval}.</div>}<div className="total"><span>{isChinese ? "当前合计" : "Current total"}</span><strong data-ff-role="visible-total">{money(currentTotal, selected.currency)}</strong></div><small className="step-evidence">Flow {selected.id} · step {step}/4</small><section className={`price-trace ${lateFeeDetected ? "alert" : "clear"}`} data-ff-role="price-trace"><div className="trace-heading"><span>PRICETRACE v0.1</span><strong>{lateFeeDetected ? "Hidden fee detected" : "Monitoring"}</strong></div><div className="trace-points">{Array.from({ length: step }, (_, index) => index + 1).map((traceStep) => <div key={traceStep}><span>S{traceStep}</span><strong>{money(visibleTotal(selected, traceStep, addonSelected), selected.currency)}</strong></div>)}</div><p>{lateFeeDetected ? `${selected.feeName} appeared at step ${selected.feeFirstStep}, raising the visible total by ${money(priceIncrease, selected.currency)}.` : "No late mandatory fee that explains a price increase has appeared."}</p></section>{choiceVisible && <section className={`choice-guard ${preselectedAddonDetected ? "alert" : "clear"}`} data-ff-role="choice-guard"><div className="choice-heading"><span>CHOICEGUARD v0.1</span><strong>{preselectedAddonDetected ? "Preselected add-on" : "Choice is clear"}</strong></div><p>{preselectedAddonDetected ? `${selected.addonName} (${money(selected.addonPrice, selected.currency)}) was selected before any user action.` : `${selected.addonName} is optional and was unchecked when first shown.`}</p></section>}{trialFlow && <section className={`renewal-lens ${delayedRenewalDetected ? "alert" : renewalVisible ? "clear" : "review"}`} data-ff-role="renewal-lens"><div className="renewal-heading"><span>RENEWALLENS v0.1</span><strong>{delayedRenewalDetected ? "Late renewal disclosure" : renewalVisible ? "Disclosed early" : "Terms not visible yet"}</strong></div><p>{delayedRenewalDetected ? `Automatic renewal at ${money(selected.renewalPrice, selected.currency)}/${selected.billingInterval} first appeared at the commitment step.` : renewalVisible ? `${selected.trialDays}-day trial and automatic renewal price were visible from step ${selected.renewalFirstStep}.` : "No renewal terms are visible yet; absence is marked for review, not treated as safe."}</p></section>}</aside>
    </section>
    <div className="actions"><button onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>Back</button>{step < 4 ? <button className="primary" onClick={() => setStep((value) => value + 1)}>Continue</button> : <button className="primary" onClick={reset}>Finish demo</button>}</div>
  </main>;
}

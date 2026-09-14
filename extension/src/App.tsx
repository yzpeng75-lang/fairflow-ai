import { useEffect, useState } from "react";

import { analyzeEvidence, type UnifiedResult } from "./analysis";
import { captureActiveTab, clearEvidence, isExtensionRuntime, loadEvidence, saveEvidence } from "./chrome-api";
import type { PageEvidence } from "./capture";


type ApiState = "checking" | "online" | "offline";

export default function App() {
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [evidence, setEvidence] = useState<PageEvidence[]>([]);
  const [result, setResult] = useState<UnifiedResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const extensionMode = isExtensionRuntime();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/health")
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        setApiState("online");
      })
      .catch(() => setApiState("offline"));
    loadEvidence().then(setEvidence).catch(() => setEvidence([]));
  }, []);

  async function capture() {
    setBusy(true);
    setError("");
    try {
      const snapshot = await captureActiveTab();
      if (evidence.length && evidence[0].flowId !== snapshot.flowId) {
        throw new Error("This is a different checkout flow. Clear the current audit before capturing it.");
      }
      const updated = [...evidence.filter((item) => item.step !== snapshot.step), snapshot]
        .sort((left, right) => left.step - right.step);
      await saveEvidence(updated);
      setEvidence(updated);
      setResult(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Capture failed.");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    setBusy(true);
    setError("");
    try {
      setResult(await analyzeEvidence(evidence));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    await clearEvidence();
    setEvidence([]);
    setResult(null);
    setError("");
  }

  const excludedCount = evidence.reduce((sum, item) => sum + item.excludedSensitiveFieldCount, 0);

  return <main className="shell" aria-busy={busy}>
    <header><div className="brand"><span aria-hidden="true">F</span><div>FairFlow AI<small>Private evidence capture</small></div></div><div className={`status ${apiState}`} role="status" aria-live="polite" aria-label={`Service ${apiState}`}>{apiState}</div></header>

    <section className="intro"><p className="eyebrow">PRIVACY-FIRST CHECKOUT AUDIT</p><h1>Capture the change,<br />not the customer.</h1><p>At each checkout step, capture only visible totals, fees, paid choices, and renewal terms.</p></section>

    {!extensionMode && <div className="notice">This preview shows the popup interface. Load the built <code>extension/dist</code> folder in Chrome to capture the active tab.</div>}
    {error && <div className="error" role="alert">{error}</div>}

    <section className="controls">
      <button className="primary" onClick={capture} disabled={busy || !extensionMode}>{busy ? "Working…" : "Capture current step"}</button>
      <button onClick={analyze} disabled={busy || evidence.length < 2 || apiState !== "online"}>Analyze evidence</button>
      <button className="text-button" onClick={reset} disabled={busy || evidence.length === 0}>Clear</button>
    </section>

    <section className="audit-card">
      <div className="section-heading"><span>LOCAL AUDIT TRAIL</span><strong>{evidence.length} step{evidence.length === 1 ? "" : "s"}</strong></div>
      {evidence.length === 0 ? <p className="empty">Capture the product page first, continue checkout, then capture again before payment.</p> : <ol className="timeline">{evidence.map((item) => <li key={item.step}><span>S{item.step}</span><div><strong>{item.pageType}</strong><small>{item.currency} {item.visibleTotal.toFixed(2)} · {item.mandatoryFees.length} fees · {item.paidChoices.length} choices · {item.renewalTerms.length} renewal terms{item.trialOfferObserved ? " · trial observed" : ""}</small><small>{(item.extractionSource ?? "legacy").replaceAll("_", " ")} · {Math.round((item.captureConfidence ?? 0.7) * 100)}% capture confidence</small>{item.captureWarnings?.map((warning) => <small className="capture-warning" key={warning}>{warning}</small>)}</div></li>)}</ol>}
    </section>

    <section className="privacy-card"><strong>Sensitive values excluded</strong><p>Names, email, addresses, passwords, card fields, page URLs, and form values are never captured.</p><small>{excludedCount} sensitive field appearances skipped across the stored snapshots.</small></section>

    {result && <section className={`result ${result.risk_level}`} aria-live="polite"><div className="score"><span>FAIRFLOW RISK</span><strong>{result.risk_score}<small>/100</small></strong></div><div className="meter" role="progressbar" aria-label="FairFlow risk score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.risk_score}><span style={{ width: `${result.risk_score}%` }} /></div><h2>{result.risk_level}</h2><p>{result.summary}</p>{result.findings.map((finding) => <article key={finding.risk_type}><strong>{finding.title}</strong><p>{finding.evidence}</p><p className="action-copy">Next: {finding.recommended_action}</p><small>{finding.risk_type.replaceAll("_", " ")} · confidence {Math.round(finding.confidence * 100)}%</small></article>)}{result.needs_review && <div className="review-note">Some evidence is incomplete and needs review.</div>}</section>}

    <footer><span>Local · 24h retention</span><span>No automatic clicks</span><span>Evidence only</span></footer>
  </main>;
}

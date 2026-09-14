import { useEffect, useState } from "react";

import { analyzeEvidence, type UnifiedResult } from "./analysis";
import { captureActiveTab, clearEvidence, isExtensionRuntime, loadAutomaticMode, loadCurrentSiteEnabled, loadEvidence, loadLatestResult, saveEvidence, setAutomaticMode, setCurrentSiteEnabled } from "./chrome-api";
import type { PageEvidence } from "./capture";


type ApiState = "checking" | "online" | "offline";

export default function App() {
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [evidence, setEvidence] = useState<PageEvidence[]>([]);
  const [result, setResult] = useState<UnifiedResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [captureNotice, setCaptureNotice] = useState("");
  const [automaticMode, setAutomaticModeState] = useState(true);
  const [siteEnabled, setSiteEnabledState] = useState(true);
  const extensionMode = isExtensionRuntime();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/health")
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        setApiState("online");
      })
      .catch(() => setApiState("offline"));
    Promise.all([loadEvidence(), loadLatestResult(), loadAutomaticMode(), loadCurrentSiteEnabled()])
      .then(([storedEvidence, storedResult, automatic, currentSite]) => {
        setEvidence(storedEvidence);
        setResult(storedResult);
        setAutomaticModeState(automatic);
        setSiteEnabledState(currentSite);
      })
      .catch(() => setEvidence([]));
  }, []);

  async function toggleAutomaticMode() {
    const next = !automaticMode;
    await setAutomaticMode(next);
    setAutomaticModeState(next);
  }

  async function toggleCurrentSite() {
    const next = !siteEnabled;
    await setCurrentSiteEnabled(next);
    setSiteEnabledState(next);
  }

  async function capture() {
    setBusy(true);
    setError("");
    setCaptureNotice("");
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
      setCaptureNotice(`Captured ${snapshot.pageType} as step ${snapshot.step}. The audit now has ${updated.length} step${updated.length === 1 ? "" : "s"}.`);
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
    setCaptureNotice("");
  }

  const excludedCount = evidence.reduce((sum, item) => sum + item.excludedSensitiveFieldCount, 0);
  const analysisBlockReason = apiState !== "online"
    ? "Start the local FairFlow service before analysis."
    : evidence.length < 2
      ? `Capture ${2 - evidence.length} more checkout step${evidence.length === 0 ? "s" : ""} before analysis.`
      : "";

  return <main className="shell" aria-busy={busy}>
    <header><div className="brand"><span aria-hidden="true">F</span><div>FairFlow AI<small>Private evidence capture</small></div></div><div className={`status ${apiState}`} role="status" aria-live="polite" aria-label={`Service ${apiState}`}>{apiState}</div></header>

    <section className="intro"><p className="eyebrow">AUTOMATIC CHECKOUT PROTECTION</p><h1>Browse normally.<br />FairFlow watches the price.</h1><p>Checkout steps are captured and analyzed automatically. Sensitive form values remain excluded.</p></section>

    {!extensionMode && <div className="notice">This preview shows the popup interface. Load the built <code>extension/dist</code> folder in Chrome to capture the active tab.</div>}
    {error && <div className="error" role="alert">{error}</div>}
    {captureNotice && <div className="capture-success" role="status">{captureNotice}</div>}

    <section className="auto-card">
      <div><strong>Automatic monitoring</strong><small>{automaticMode && siteEnabled ? "Watching this site" : automaticMode ? "Paused on this site" : "Paused everywhere"}</small></div>
      <button className={automaticMode ? "toggle active" : "toggle"} onClick={toggleAutomaticMode} aria-pressed={automaticMode}>{automaticMode ? "ON" : "OFF"}</button>
      <button className="site-toggle" onClick={toggleCurrentSite} disabled={!automaticMode}>{siteEnabled ? "Pause this site" : "Resume this site"}</button>
    </section>

    <div className="manual-label">MANUAL FALLBACK</div>
    <section className="controls">
      <button className="primary" onClick={capture} disabled={busy || !extensionMode}>{busy ? "Working…" : "Capture now"}</button>
      <button onClick={analyze} disabled={busy || Boolean(analysisBlockReason)} title={analysisBlockReason || "Analyze captured checkout evidence"}>Analyze evidence</button>
      <button className="text-button" onClick={reset} disabled={busy || evidence.length === 0}>Clear</button>
    </section>
    {analysisBlockReason && <p className="analysis-hint">{analysisBlockReason}</p>}

    <section className="audit-card">
      <div className="section-heading"><span>LOCAL AUDIT TRAIL</span><strong>{evidence.length} step{evidence.length === 1 ? "" : "s"}</strong></div>
      {evidence.length === 0 ? <p className="empty">No checkout evidence yet. Browse a product and continue to its cart; FairFlow will capture supported steps automatically.</p> : <ol className="timeline">{evidence.map((item) => <li key={item.step}><span>S{item.step}</span><div><strong>{item.pageType}</strong><small>{item.currency} {item.visibleTotal.toFixed(2)} · {item.mandatoryFees.length} fees · {item.paidChoices.length} choices · {item.renewalTerms.length} renewal terms{item.trialOfferObserved ? " · trial observed" : ""}</small><small>{(item.extractionSource ?? "legacy").replaceAll("_", " ")} · {Math.round((item.captureConfidence ?? 0.7) * 100)}% capture confidence</small>{item.captureWarnings?.map((warning) => <small className="capture-warning" key={warning}>{warning}</small>)}</div></li>)}</ol>}
    </section>

    <section className="privacy-card"><strong>Sensitive values excluded</strong><p>Names, email, addresses, passwords, card fields, page URLs, and form values are never captured.</p><small>{excludedCount} sensitive field appearances skipped across the stored snapshots.</small></section>

    {result && <section className={`result ${result.risk_level}`} aria-live="polite"><div className="score"><span>FAIRFLOW RISK</span><strong>{result.risk_score}<small>/100</small></strong></div><div className="meter" role="progressbar" aria-label="FairFlow risk score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.risk_score}><span style={{ width: `${result.risk_score}%` }} /></div><h2>{result.risk_level}</h2><p>{result.summary}</p>{result.findings.map((finding) => <article key={finding.risk_type}><strong>{finding.title}</strong><p>{finding.evidence}</p><p className="action-copy">Next: {finding.recommended_action}</p><small>{finding.risk_type.replaceAll("_", " ")} · confidence {Math.round(finding.confidence * 100)}%</small></article>)}{result.needs_review && <div className="review-note">Some evidence is incomplete and needs review.</div>}</section>}

    <footer><span>Local · 24h retention</span><span>No automatic clicks</span><span>Evidence only</span></footer>
  </main>;
}

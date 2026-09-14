import { analyzeEvidence, type UnifiedResult } from "./analysis";
import type { PageEvidence } from "./capture";


interface AutoCaptureMessage {
  type: "fairflow:auto-capture";
  evidence: PageEvidence;
}

interface MessageSender {
  tab?: { id?: number; url?: string };
}

interface ExtensionWorkerApi {
  runtime: {
    onMessage: {
      addListener(listener: (message: AutoCaptureMessage, sender: MessageSender, sendResponse: (response: unknown) => void) => boolean): void;
    };
  };
  storage: {
    local: {
      get(keys: string[]): Promise<Record<string, unknown>>;
      set(value: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
  };
  action: {
    setBadgeText(details: { tabId?: number; text: string }): Promise<void>;
    setBadgeBackgroundColor(details: { tabId?: number; color: string }): Promise<void>;
    setTitle(details: { tabId?: number; title: string }): Promise<void>;
  };
}

declare const chrome: ExtensionWorkerApi;

const EVIDENCE_KEY = "fairflow-current-audit";
const RESULT_KEY = "fairflow-latest-result";
const MAX_SNAPSHOTS = 20;

function quality(item: PageEvidence): number {
  return item.captureConfidence + (item.mandatoryFees.length + item.paidChoices.length + item.renewalTerms.length) * 0.03;
}

async function updateBadge(tabId: number | undefined, text: string, color: string, title: string): Promise<void> {
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text }),
    chrome.action.setBadgeBackgroundColor({ tabId, color }),
    chrome.action.setTitle({ tabId, title }),
  ]);
}

async function handleCapture(message: AutoCaptureMessage, sender: MessageSender): Promise<{ ok: true; result?: UnifiedResult }> {
  let topOrigin = message.evidence.origin;
  try {
    if (sender.tab?.url) topOrigin = new URL(sender.tab.url).origin;
  } catch {
    // Keep the extractor's origin if Chrome reports a non-standard tab URL.
  }
  const evidence: PageEvidence = message.evidence.extractionSource === "annotated"
    ? message.evidence
    : { ...message.evidence, origin: topOrigin, flowId: `${topOrigin}-checkout` };
  const stored = await chrome.storage.local.get([EVIDENCE_KEY, RESULT_KEY]);
  const previous = Array.isArray(stored[EVIDENCE_KEY]) ? stored[EVIDENCE_KEY] as PageEvidence[] : [];
  const sameFlow = previous.filter((item) => item.flowId === evidence.flowId);
  const existing = sameFlow.find((item) => item.step === evidence.step);
  const retained = existing && quality(existing) > quality(evidence) ? existing : evidence;
  const updated = [...sameFlow.filter((item) => item.step !== evidence.step), retained]
    .sort((left, right) => left.step - right.step)
    .slice(-MAX_SNAPSHOTS);
  await chrome.storage.local.set({ [EVIDENCE_KEY]: updated });

  if (updated.length < 2) {
    await chrome.storage.local.remove(RESULT_KEY);
    await updateBadge(sender.tab?.id, String(updated.length), "#347654", `FairFlow is monitoring · ${updated.length} step captured`);
    return { ok: true };
  }

  try {
    const result = await analyzeEvidence(updated);
    await chrome.storage.local.set({ [RESULT_KEY]: result });
    const flagged = result.risk_score > 0;
    await updateBadge(sender.tab?.id, flagged ? "!" : "OK", flagged ? "#b94b35" : "#347654", flagged ? `FairFlow found risk · ${result.risk_score}/100` : "FairFlow found no supported risk");
    return { ok: true, result };
  } catch {
    await updateBadge(sender.tab?.id, String(updated.length), "#a76a25", "FairFlow captured evidence; local analysis service is unavailable");
    return { ok: true };
  }
}

let captureQueue: Promise<unknown> = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "fairflow:auto-capture" || !message.evidence) return false;
  captureQueue = captureQueue
    .then(() => handleCapture(message, sender))
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false }));
  return true;
});

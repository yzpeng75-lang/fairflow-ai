import { captureCheckoutEvidence } from "./capture";


interface AutoCaptureResponse {
  ok: boolean;
  result?: { risk_score: number; risk_level: string; summary: string };
}

interface ExtensionRuntime {
  runtime: {
    sendMessage(message: unknown): Promise<AutoCaptureResponse>;
  };
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
    };
  };
}

const extension = (globalThis as typeof globalThis & { chrome?: ExtensionRuntime }).chrome;
const ENABLED_KEY = "fairflow-auto-enabled";
const DISABLED_ORIGINS_KEY = "fairflow-disabled-origins";
const ALERT_ID = "fairflow-automatic-alert";
let pending: number | undefined;
let lastSignature = "";

async function monitoringEnabled(): Promise<boolean> {
  if (!extension) return false;
  const settings = await extension.storage.local.get(ENABLED_KEY);
  if (settings[ENABLED_KEY] === false) return false;
  const disabled = await extension.storage.local.get(DISABLED_ORIGINS_KEY);
  return !(Array.isArray(disabled[DISABLED_ORIGINS_KEY]) && disabled[DISABLED_ORIGINS_KEY].includes(location.origin));
}

function showRiskAlert(result: NonNullable<AutoCaptureResponse["result"]>): void {
  if (document.getElementById(ALERT_ID)) return;
  const host = document.createElement("aside");
  host.id = ALERT_ID;
  host.setAttribute("aria-live", "polite");
  const shadow = host.attachShadow({ mode: "closed" });
  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;z-index:2147483647;right:20px;bottom:20px;width:min(340px,calc(100vw - 40px));padding:18px;border:1px solid #67f0ad;border-radius:14px;color:#e7f7ef;background:#07140f;box-shadow:0 18px 60px rgba(0,0,0,.35);font:14px/1.45 system-ui,sans-serif";
  const heading = document.createElement("strong");
  heading.textContent = `FairFlow warning · ${result.risk_score}/100`;
  heading.style.cssText = "display:block;margin-bottom:7px;color:#67f0ad;font-size:15px";
  const copy = document.createElement("p");
  copy.textContent = result.summary;
  copy.style.cssText = "margin:0;color:#c7d9d0";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Dismiss";
  close.style.cssText = "margin-top:12px;padding:6px 10px;border:1px solid #496357;border-radius:7px;color:#dcebe3;background:transparent;cursor:pointer";
  close.addEventListener("click", () => host.remove());
  panel.append(heading, copy, close);
  shadow.append(panel);
  document.documentElement.append(host);
}

async function inspectPage(): Promise<void> {
  if (!extension || document.visibilityState !== "visible" || !(await monitoringEnabled())) return;
  const evidence = captureCheckoutEvidence();
  if (!evidence || evidence.captureConfidence < 0.7) return;
  const signature = JSON.stringify([
    evidence.flowId,
    evidence.step,
    evidence.pageType,
    evidence.visibleTotal,
    evidence.mandatoryFees,
    evidence.paidChoices,
    evidence.renewalTerms,
  ]);
  if (signature === lastSignature) return;
  lastSignature = signature;
  const response = await extension.runtime.sendMessage({ type: "fairflow:auto-capture", evidence });
  if (response?.result && response.result.risk_score > 0) showRiskAlert(response.result);
}

function scheduleInspection(): void {
  if (pending != null) window.clearTimeout(pending);
  pending = window.setTimeout(() => {
    inspectPage().catch(() => undefined);
  }, 900);
}

const observer = new MutationObserver(scheduleInspection);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-hidden", "aria-expanded", "checked"],
});
window.addEventListener("pageshow", scheduleInspection);
window.addEventListener("popstate", scheduleInspection);
const originalPushState = history.pushState.bind(history);
history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
  originalPushState(data, unused, url);
  scheduleInspection();
};
const originalReplaceState = history.replaceState.bind(history);
history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
  originalReplaceState(data, unused, url);
  scheduleInspection();
};
document.addEventListener("visibilitychange", scheduleInspection);
document.addEventListener("change", scheduleInspection, true);
document.addEventListener("click", scheduleInspection, true);
window.setInterval(scheduleInspection, 5000);
scheduleInspection();

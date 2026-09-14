import { captureCheckoutEvidence, type PageEvidence } from "./capture";

interface ChromeApi {
  tabs: { query(query: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number; url?: string }>> };
  scripting: {
    executeScript<T>(details: { target: { tabId: number; allFrames?: boolean }; func: () => T }): Promise<Array<{ frameId?: number; result?: T }>>;
  };
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(value: Record<string, unknown>): Promise<void>;
      remove(key: string): Promise<void>;
    };
  };
}

function api(): ChromeApi | null {
  return (globalThis as typeof globalThis & { chrome?: ChromeApi }).chrome ?? null;
}

export function isExtensionRuntime(): boolean {
  return api() !== null;
}

export async function captureActiveTab(): Promise<PageEvidence> {
  const chrome = api();
  if (!chrome) throw new Error("Open the built FairFlow popup as a Chrome extension to capture a page.");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) throw new Error("No active browser tab is available.");
  let executions: Array<{ frameId?: number; result?: PageEvidence | null }>;
  try {
    executions = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: captureCheckoutEvidence,
    });
  } catch {
    executions = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: captureCheckoutEvidence,
    });
  }
  const candidates = executions
    .map((execution) => execution.result)
    .filter((result): result is PageEvidence => Boolean(result))
    .sort((left, right) => {
      const sourceRank = { annotated: 4, platform: 3, structured_data: 2, heuristic: 1 };
      const leftEvidence = left.mandatoryFees.length + left.paidChoices.length + left.renewalTerms.length;
      const rightEvidence = right.mandatoryFees.length + right.paidChoices.length + right.renewalTerms.length;
      return (sourceRank[right.extractionSource] - sourceRank[left.extractionSource])
        || (right.captureConfidence - left.captureConfidence)
        || (rightEvidence - leftEvidence);
    });
  const captured = candidates[0];
  if (!captured) throw new Error("The page did not return checkout evidence.");
  if (captured.extractionSource === "annotated" || !tab.url) return captured;
  const topOrigin = new URL(tab.url).origin;
  return { ...captured, origin: topOrigin, flowId: `${topOrigin}-checkout` };
}

const STORAGE_KEY = "fairflow-current-audit";
const RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_SNAPSHOTS = 20;

export async function loadEvidence(): Promise<PageEvidence[]> {
  const chrome = api();
  if (!chrome) return [];
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!Array.isArray(stored[STORAGE_KEY])) return [];
  const cutoff = Date.now() - RETENTION_MS;
  const fresh = (stored[STORAGE_KEY] as PageEvidence[]).filter((item) =>
    item?.schemaVersion === "1.0" && Number.isFinite(Date.parse(item.capturedAt)) && Date.parse(item.capturedAt) >= cutoff,
  ).slice(-MAX_SNAPSHOTS);
  if (fresh.length !== stored[STORAGE_KEY].length) await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
  return fresh;
}

export async function saveEvidence(items: PageEvidence[]): Promise<void> {
  const chrome = api();
  if (!chrome) return;
  await chrome.storage.local.set({ [STORAGE_KEY]: items.slice(-MAX_SNAPSHOTS) });
}

export async function clearEvidence(): Promise<void> {
  const chrome = api();
  if (!chrome) return;
  await chrome.storage.local.remove(STORAGE_KEY);
}

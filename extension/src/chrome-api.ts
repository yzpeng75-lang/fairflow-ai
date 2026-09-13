import { captureCheckoutEvidence, type PageEvidence } from "./capture";

interface ChromeApi {
  tabs: { query(query: { active: boolean; currentWindow: boolean }): Promise<Array<{ id?: number }>> };
  scripting: {
    executeScript<T>(details: { target: { tabId: number }; func: () => T }): Promise<Array<{ result?: T }>>;
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
  const [execution] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: captureCheckoutEvidence,
  });
  if (!execution?.result) throw new Error("The page did not return checkout evidence.");
  return execution.result;
}

const STORAGE_KEY = "fairflow-current-audit";

export async function loadEvidence(): Promise<PageEvidence[]> {
  const chrome = api();
  if (!chrome) return [];
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] as PageEvidence[] : [];
}

export async function saveEvidence(items: PageEvidence[]): Promise<void> {
  const chrome = api();
  if (!chrome) return;
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

export async function clearEvidence(): Promise<void> {
  const chrome = api();
  if (!chrome) return;
  await chrome.storage.local.remove(STORAGE_KEY);
}


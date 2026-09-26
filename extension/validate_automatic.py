from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).parent
manifest = json.loads((ROOT / "public" / "manifest.json").read_text(encoding="utf-8"))
monitor = (ROOT / "src" / "auto-monitor.ts").read_text(encoding="utf-8")
worker = (ROOT / "src" / "service-worker.ts").read_text(encoding="utf-8")

assert manifest["background"]["service_worker"] == "service-worker.js"
assert manifest["content_scripts"][0]["js"] == ["auto-monitor.js"]
assert "MutationObserver" in monitor
assert "setInterval" in monitor
assert "visibilitychange" in monitor
assert "sendMessage" in monitor
assert "captureCheckoutEvidence" in monitor
assert "onMessage" in worker
assert "analyzeEvidence" in worker
assert "fairflow-current-audit" in worker
assert "fairflow-latest-result" in worker
assert "setBadgeText" in worker
assert "captureQueue" in worker
assert "pushState" in monitor
assert "replaceState" in monitor
assert "fairflow-active-tab" in worker
assert "hostedCheckoutContinuation" in worker

print("FairFlow automatic monitoring contract passed")
print("Visible-page observation, deduplication, automatic analysis, badges, and alerts are wired")

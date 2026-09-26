from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).parent
manifest = json.loads((ROOT / "public" / "manifest.json").read_text(encoding="utf-8"))
capture = (ROOT / "src" / "capture.ts").read_text(encoding="utf-8")
analysis = (ROOT / "src" / "analysis.ts").read_text(encoding="utf-8")
monitor = (ROOT / "src" / "auto-monitor.ts").read_text(encoding="utf-8")
worker = (ROOT / "src" / "service-worker.ts").read_text(encoding="utf-8")

assert set(manifest["permissions"]) == {"activeTab", "scripting", "storage"}
assert "host_permissions" not in manifest
assert len(manifest["content_scripts"]) == 1
content_script = manifest["content_scripts"][0]
assert set(content_script["matches"]) == {"http://*/*", "https://*/*"}
assert content_script["js"] == ["auto-monitor.js"]
assert content_script["run_at"] == "document_idle"
assert content_script["all_frames"] is True
assert "<all_urls>" not in json.dumps(manifest)
assert manifest["content_security_policy"]["extension_pages"] == "script-src 'self'; object-src 'self'"
assert ".value" not in capture + monitor + worker
assert "location.href" not in capture
for required_filter in ("type='password'", "type='email'", "autocomplete*='cc-'", "data-ff-sensitive"):
    assert required_filter in capture
assert "fetch(" not in analysis
assert "PriceTrace-v0.2-local" in analysis
assert 'document.visibilityState !== "visible"' in monitor
assert "fairflow-auto-enabled" in monitor
assert "fairflow-disabled-origins" in monitor
assert "captureCheckoutEvidence" in monitor
assert 'type: "fairflow:auto-capture"' in monitor
assert "analyzeEvidence" in worker
assert "setBadgeText" in worker

print("FairFlow extension privacy validation passed")
print("Automatic access is limited to visible HTTP(S) pages; no URL path, form values, or remote analysis endpoint is collected")

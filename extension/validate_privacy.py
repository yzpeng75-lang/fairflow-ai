from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).parent
manifest = json.loads((ROOT / "public" / "manifest.json").read_text(encoding="utf-8"))
capture = (ROOT / "src" / "capture.ts").read_text(encoding="utf-8")
analysis = (ROOT / "src" / "analysis.ts").read_text(encoding="utf-8")

assert set(manifest["permissions"]) == {"activeTab", "scripting", "storage"}
assert manifest["host_permissions"] == ["http://127.0.0.1:8000/*"]
assert "content_scripts" not in manifest
assert "<all_urls>" not in json.dumps(manifest)
assert ".value" not in capture
assert "location.href" not in capture
for required_filter in ("type='password'", "type='email'", "autocomplete*='cc-'", "data-ff-sensitive"):
    assert required_filter in capture
assert "http://127.0.0.1:8000/api/v1/analyze/checkout" in analysis

print("FairFlow extension privacy validation passed")
print("No broad host access, persistent content script, URL path, or form values collected")


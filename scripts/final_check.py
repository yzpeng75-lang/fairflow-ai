from __future__ import annotations

import json
import shutil
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PYTHON = sys.executable
NPM = shutil.which("npm.cmd") or shutil.which("npm") or "npm"

CHECKS = [
    ("generate benchmark", [PYTHON, "dataset/scripts/generate_day04.py"]),
    ("validate seed annotations", [PYTHON, "dataset/validate_annotations.py"]),
    ("validate benchmark", [PYTHON, "dataset/validate_day04.py"]),
    ("validate demo flows", [PYTHON, "demo-store/validate_flows.py"]),
    ("backend tests", [PYTHON, "-m", "pytest", "-q"]),
    ("PriceTrace evaluation", [PYTHON, "evaluation/evaluate_price_trace.py"]),
    ("ChoiceGuard evaluation", [PYTHON, "evaluation/evaluate_choice_guard.py"]),
    ("RenewalLens evaluation", [PYTHON, "evaluation/evaluate_renewal_lens.py"]),
    ("unified engine evaluation", [PYTHON, "evaluation/evaluate_unified_engine.py"]),
    ("ablation evaluation", [PYTHON, "evaluation/evaluate_ablation.py"]),
    ("privacy contract", [PYTHON, "extension/validate_privacy.py"]),
    ("accessibility contract", [PYTHON, "extension/validate_accessibility.py"]),
    ("demo store build", [NPM, "--prefix", "demo-store", "run", "build"]),
    ("extension build", [NPM, "--prefix", "extension", "run", "build"]),
    ("whitespace check", ["git", "diff", "--check"]),
]

REQUIRED_FILES = [
    "LICENSE",
    "REPRODUCIBILITY.md",
    "dataset/DATASET_CARD.md",
    "docs/ARCHITECTURE.md",
    "docs/PRIVACY_MODEL.md",
    "docs/RISK_SCORING.md",
    "evaluation/reports/day11_ablation.json",
    "extension/public/manifest.json",
    "submission/DEVPOST.md",
    "submission/DEMO_SCRIPT.md",
    "submission/JUDGING_GUIDE.md",
    "submission/assets/fairflow-cover.svg",
]


def run() -> int:
    revision = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, text=True, encoding="utf-8",
        errors="replace", capture_output=True, check=True
    ).stdout.strip()
    results = []
    for name, command in CHECKS:
        started = time.perf_counter()
        completed = subprocess.run(
            command, cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True
        )
        output = (completed.stdout + completed.stderr).strip()
        results.append(
            {
                "name": name,
                "passed": completed.returncode == 0,
                "exit_code": completed.returncode,
                "duration_seconds": round(time.perf_counter() - started, 3),
                "output_tail": output[-600:],
            }
        )
        print(f"[{'PASS' if completed.returncode == 0 else 'FAIL'}] {name}")

    missing = [path for path in REQUIRED_FILES if not (ROOT / path).is_file()]
    results.append(
        {
            "name": "required release files",
            "passed": not missing,
            "exit_code": 0 if not missing else 1,
            "duration_seconds": 0,
            "output_tail": "All required files present" if not missing else f"Missing: {', '.join(missing)}",
        }
    )
    passed = all(result["passed"] for result in results)
    report = {
        "release": "FairFlow AI 0.1.0",
        "validated_revision": revision,
        "passed": passed,
        "checks_passed": sum(result["passed"] for result in results),
        "checks_total": len(results),
        "results": results,
        "claim_boundary": "Synthetic controlled benchmark; no universal real-site performance claim.",
    }
    output = ROOT / "evaluation" / "reports" / "day14_release_check.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Release check: {report['checks_passed']}/{report['checks_total']} passed")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(run())

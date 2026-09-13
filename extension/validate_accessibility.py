from pathlib import Path


app = (Path(__file__).parent / "src" / "App.tsx").read_text(encoding="utf-8")
for requirement in (
    'aria-live="polite"',
    'role="alert"',
    'aria-busy={busy}',
    'role="progressbar"',
    'aria-valuemin={0}',
    'aria-valuemax={100}',
    'aria-valuenow={result.risk_score}',
):
    assert requirement in app, f"missing accessibility requirement: {requirement}"

print("FairFlow extension accessibility contract passed")


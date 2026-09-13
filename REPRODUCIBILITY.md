# Reproducibility

## Requirements

- Python 3.11 or newer
- Node.js 20 or newer
- Chrome or another Chromium browser for the unpacked extension

## Install

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
npm --prefix demo-store ci
npm --prefix extension ci
```

## Regenerate and validate data

```powershell
python dataset/scripts/generate_day04.py
python dataset/validate_annotations.py
python dataset/validate_day04.py
python demo-store/validate_flows.py
```

## Run tests and evaluations

```powershell
backend/.venv/Scripts/python -m pytest -q
backend/.venv/Scripts/python evaluation/evaluate_price_trace.py
backend/.venv/Scripts/python evaluation/evaluate_choice_guard.py
backend/.venv/Scripts/python evaluation/evaluate_renewal_lens.py
backend/.venv/Scripts/python evaluation/evaluate_unified_engine.py
backend/.venv/Scripts/python evaluation/evaluate_ablation.py
python extension/validate_privacy.py
python extension/validate_accessibility.py
npm --prefix demo-store run build
npm --prefix extension run build
```

All generated evaluation reports are stored in `evaluation/reports`. Exact dependency versions are recorded in `backend/requirements.txt` and the two npm lockfiles.


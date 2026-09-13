# Evaluation

## PriceTrace (Day 5)

Run the first detector against all 20 hidden-fee controlled flows:

```powershell
python evaluation/evaluate_price_trace.py
```

The script writes `reports/day05_price_trace.json`. Its metrics apply only to the synthetic controlled benchmark and must not be presented as real-web performance.

Evaluation work begins after the dataset schema is frozen. The final report will compare rules, text-only classification, and full-flow analysis using held-out page templates.

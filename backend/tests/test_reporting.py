from app.analysis_engine import UnifiedAnalysisRequest, analyze_checkout
from app.reporting import build_audit_report


def risky_request() -> UnifiedAnalysisRequest:
    return UnifiedAnalysisRequest.model_validate(
        {
            "flow_id": "day10-hidden-fee",
            "price_trace": {
                "flow_id": "day10-hidden-fee",
                "observations": [
                    {"step": 1, "page_type": "product", "currency": "USD", "visible_total": 100},
                    {
                        "step": 4,
                        "page_type": "review",
                        "currency": "USD",
                        "visible_total": 125,
                        "line_items": [{"name": "Service fee", "amount": 25, "kind": "mandatory_fee"}],
                    },
                ],
            },
        }
    )


def test_end_to_end_request_becomes_actionable_report() -> None:
    analysis = analyze_checkout(risky_request())
    report = build_audit_report(analysis)
    assert report.risk_score == 45
    assert report.headline == "1 checkout risk found"
    assert report.findings[0].category == "hidden_fee"
    assert "Review" in report.findings[0].recommended_action
    assert report.report_id.startswith("ff-")


def test_same_evidence_produces_same_report_id() -> None:
    analysis = analyze_checkout(risky_request())
    assert build_audit_report(analysis).report_id == build_audit_report(analysis).report_id


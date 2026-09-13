from __future__ import annotations

from hashlib import sha256
from typing import Literal

from pydantic import BaseModel

from app.analysis_engine import UnifiedAnalysisResult


class ReportFinding(BaseModel):
    category: str
    severity: str
    title: str
    evidence: str
    recommended_action: str
    confidence: float


class AuditReport(BaseModel):
    report_id: str
    schema_version: Literal["1.0"] = "1.0"
    flow_id: str
    risk_score: int
    risk_level: str
    headline: str
    findings: list[ReportFinding]
    needs_review: bool
    interpretation: str
    privacy_note: str


def build_audit_report(result: UnifiedAnalysisResult) -> AuditReport:
    fingerprint = sha256(
        f"{result.flow_id}|{result.risk_score}|{'|'.join(item.risk_type for item in result.findings)}".encode()
    ).hexdigest()[:12]
    findings = [
        ReportFinding(
            category=item.risk_type,
            severity=item.severity,
            title=item.title,
            evidence=item.evidence,
            recommended_action=item.recommended_action,
            confidence=item.confidence,
        )
        for item in result.findings
    ]
    headline = (
        f"{len(findings)} checkout risk{'s' if len(findings) != 1 else ''} found"
        if findings
        else "No supported risk found in the observed evidence"
    )
    return AuditReport(
        report_id=f"ff-{fingerprint}",
        flow_id=result.flow_id,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        headline=headline,
        findings=findings,
        needs_review=result.needs_review,
        interpretation="This report describes observed interface behavior and is not a legal judgement.",
        privacy_note="The report contains minimized checkout evidence and no form values or payment credentials.",
    )


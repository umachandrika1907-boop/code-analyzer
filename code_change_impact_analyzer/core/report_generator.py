"""Report generator formatting impact analysis data into Markdown, JSON, and HTML."""

import json
from datetime import datetime
from typing import Dict, Any
from .impact_analyzer import ImpactReportData


class ReportGenerator:
    """Generates structured exportable reports from ImpactReportData."""

    def to_markdown(self, data: ImpactReportData) -> str:
        """Generate human-readable Markdown report."""
        date_str = data.analyzed_at or datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

        high_comps = [c for c in data.affected_components if c.impact_level == "HIGH"]
        med_comps = [c for c in data.affected_components if c.impact_level == "MEDIUM"]
        low_comps = [c for c in data.affected_components if c.impact_level == "LOW"]

        md = []
        md.append("# 📊 Code Change Impact Analysis Report")
        md.append(f"\n**Analysis Date:** {date_str}  ")
        md.append(f"**Analysis Model:** `{data.model_name}`\n")

        md.append("## 📈 Executive Summary")
        md.append(f"{data.summary}\n")

        md.append("### 🔢 Impact Blast-Radius Metrics")
        md.append("| Metric | Count |")
        md.append("| :--- | :--- |")
        md.append(f"| Changed Files | **{data.metrics.get('changed_files', len(data.changed_files))}** |")
        md.append(f"| Affected Repository Files | **{data.metrics.get('affected_files', 0)}** |")
        md.append(f"| 🔴 High Impact Components | **{data.metrics.get('high', len(high_comps))}** |")
        md.append(f"| 🟠 Medium Impact Components | **{data.metrics.get('medium', len(med_comps))}** |")
        md.append(f"| 🟢 Low Impact Components | **{data.metrics.get('low', len(low_comps))}** |\n")

        md.append("### 📁 Changed Files")
        for cf in data.changed_files:
            md.append(f"- `{cf}`")
        md.append("")

        # High Impact
        if high_comps:
            md.append("## 🔴 High Impact Components")
            md.append("| File | Component | Type | Reason |")
            md.append("| :--- | :--- | :--- | :--- |")
            for c in high_comps:
                md.append(f"| `{c.file}` | `{c.component}` | *{c.component_type}* | {c.reason} |")
            md.append("")

            md.append("### 🔍 High Impact Evidence")
            for c in high_comps:
                lines_info = f" (Lines {c.line_range})" if c.line_range else ""
                md.append(f"#### `{c.file}` :: `{c.component}`{lines_info}")
                md.append(f"**Reason:** {c.reason}\n")
                md.append("```python\n" + c.evidence.strip() + "\n```\n")

        # Medium Impact
        if med_comps:
            md.append("## 🟠 Medium Impact Components")
            md.append("| File | Component | Type | Reason |")
            md.append("| :--- | :--- | :--- | :--- |")
            for c in med_comps:
                md.append(f"| `{c.file}` | `{c.component}` | *{c.component_type}* | {c.reason} |")
            md.append("")

            md.append("### 🔍 Medium Impact Evidence")
            for c in med_comps:
                lines_info = f" (Lines {c.line_range})" if c.line_range else ""
                md.append(f"#### `{c.file}` :: `{c.component}`{lines_info}")
                md.append(f"**Reason:** {c.reason}\n")
                md.append("```python\n" + c.evidence.strip() + "\n```\n")

        # Low Impact
        if low_comps:
            md.append("## 🟢 Low Impact Components")
            for c in low_comps:
                md.append(f"- **`{c.file}`** (`{c.component}`): {c.reason}")
            md.append("")

        # API Impact
        if data.api_impact:
            md.append("## 🌐 API & Endpoint Impact")
            md.append("| Method | Endpoint | Severity | Reason |")
            md.append("| :--- | :--- | :--- | :--- |")
            for a in data.api_impact:
                md.append(f"| `{a.method}` | `{a.endpoint}` | **{a.impact_level}** | {a.reason} |")
            md.append("")

        # Test Impact
        if data.test_impact:
            md.append("## 🧪 Test Suite Impact")
            md.append("| Test File | Target Test | Action Required | Reason |")
            md.append("| :--- | :--- | :--- | :--- |")
            for t in data.test_impact:
                md.append(f"| `{t.test_file}` | `{t.test_name}` | *{t.action_required}* | {t.reason} |")
            md.append("")

        # Documentation Impact
        if data.documentation_impact:
            md.append("## 📚 Documentation Impact")
            for d in data.documentation_impact:
                md.append(f"- **`{d.doc_file}`** (Section: *{d.section}*): {d.reason}")
            md.append("")

        # Risks
        if data.risks:
            md.append("## ⚠️ Identified Risks & Mitigations")
            for r in data.risks:
                md.append(f"- **[{r.severity.upper()}] {r.risk}**  \n  *Mitigation:* {r.mitigation}")
            md.append("")

        # Recommended Validation
        if data.recommended_validation:
            md.append("## ✅ Recommended Validation Checklist")
            for idx, item in enumerate(data.recommended_validation, 1):
                md.append(f"{idx}. [ ] {item}")
            md.append("")

        md.append("---")
        md.append("*Generated by AI Studio Code Change Impact Analyzer.*")
        return "\n".join(md)

    def to_json(self, data: ImpactReportData) -> str:
        """Generate structured JSON report string."""
        raw = {
            "summary": data.summary,
            "model_name": data.model_name,
            "metrics": data.metrics,
            "changed_files": data.changed_files,
            "affected_components": [
                {
                    "file": c.file,
                    "component": c.component,
                    "component_type": c.component_type,
                    "impact_level": c.impact_level,
                    "reason": c.reason,
                    "evidence": c.evidence,
                    "line_range": c.line_range,
                    "is_grounded": c.is_grounded,
                }
                for c in data.affected_components
            ],
            "api_impact": [
                {
                    "endpoint": a.endpoint,
                    "method": a.method,
                    "impact_level": a.impact_level,
                    "reason": a.reason,
                }
                for a in data.api_impact
            ],
            "test_impact": [
                {
                    "test_file": t.test_file,
                    "test_name": t.test_name,
                    "reason": t.reason,
                    "action_required": t.action_required,
                }
                for t in data.test_impact
            ],
            "documentation_impact": [
                {
                    "doc_file": d.doc_file,
                    "section": d.section,
                    "reason": d.reason,
                }
                for d in data.documentation_impact
            ],
            "risks": [
                {
                    "risk": r.risk,
                    "severity": r.severity,
                    "mitigation": r.mitigation,
                }
                for r in data.risks
            ],
            "recommended_validation": data.recommended_validation,
        }
        return json.dumps(raw, indent=2)

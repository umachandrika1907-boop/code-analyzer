"""Impact analyzer synthesizing Git diffs, retrieved RAG context, and LLM analysis."""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Set
from .git_analyzer import GitDiffAnalyzer, ChangedFile
from .retriever import CodeRetriever, RetrievedChunk
from .chunker import CodeChunk


@dataclass
class AffectedComponent:
    file: str
    component: str
    component_type: str
    impact_level: str  # 'HIGH', 'MEDIUM', 'LOW'
    reason: str
    evidence: str
    line_range: str = ""
    is_grounded: bool = True
    grounding_notes: str = ""


@dataclass
class ApiImpact:
    endpoint: str
    method: str = "GET"
    impact_level: str = "MEDIUM"
    reason: str = ""


@dataclass
class TestImpact:
    test_file: str
    test_name: str
    reason: str
    action_required: str = "Run and verify test"


@dataclass
class DocImpact:
    doc_file: str
    section: str
    reason: str


@dataclass
class RiskItem:
    risk: str
    severity: str
    mitigation: str


@dataclass
class ImpactReportData:
    summary: str
    changed_files: List[str]
    affected_components: List[AffectedComponent]
    api_impact: List[ApiImpact]
    test_impact: List[TestImpact]
    documentation_impact: List[DocImpact]
    risks: List[RiskItem]
    recommended_validation: List[str]
    raw_diff: str = ""
    metrics: Dict[str, int] = field(default_factory=dict)
    analyzed_at: str = ""
    model_name: str = "gemini-3.8-flash"


class ImpactAnalyzer:
    """Orchestrates RAG retrieval, Gemini analysis, and strict evidence grounding verification."""

    def __init__(self, retriever: CodeRetriever, llm_service: Any):
        self.retriever = retriever
        self.llm_service = llm_service
        self.git_analyzer = GitDiffAnalyzer()

    def analyze_change(
        self,
        diff_text: str,
        repo_files: Dict[str, str],
        top_k: int = 15
    ) -> ImpactReportData:
        """Execute end-to-end impact analysis pipeline."""
        # 1. Parse Git diff
        changed_files = self.git_analyzer.parse(diff_text)
        if not changed_files:
            return ImpactReportData(
                summary="Empty or invalid Git diff provided. No changes detected.",
                changed_files=[],
                affected_components=[],
                api_impact=[],
                test_impact=[],
                documentation_impact=[],
                risks=[],
                recommended_validation=["Please provide a valid unified Git diff or patch."],
                raw_diff=diff_text,
                metrics={"changed_files": 0, "affected_files": 0, "high": 0, "medium": 0, "low": 0}
            )

        changed_file_names = [f.filename for f in changed_files]
        all_modified_symbols: List[str] = []
        diff_snippets: List[str] = []

        for cf in changed_files:
            all_modified_symbols.extend(cf.modified_symbols)
            diff_snippets.append(f"File: {cf.filename}")
            for h in cf.hunks:
                if h.added_lines:
                    diff_snippets.append("Added:\n" + "\n".join(h.added_lines[:15]))
                if h.deleted_lines:
                    diff_snippets.append("Deleted:\n" + "\n".join(h.deleted_lines[:15]))

        # 2. Build retrieval query
        query_text = (
            f"Changed files: {' '.join(changed_file_names)}\n"
            f"Modified symbols: {' '.join(all_modified_symbols)}\n"
            + "\n".join(diff_snippets[:10])
        )

        # 3. Retrieve relevant repository chunks
        retrieved_chunks = self.retriever.retrieve(
            query_text=query_text,
            target_symbols=all_modified_symbols,
            changed_files=changed_file_names,
            top_k=top_k
        )

        # 4. Invoke LLM for structured impact analysis
        diff_summary = self.git_analyzer.get_summary_text(changed_files)
        llm_raw_result = self.llm_service.analyze(
            raw_diff=diff_text,
            diff_summary=diff_summary,
            changed_files=changed_file_names,
            retrieved_chunks=retrieved_chunks,
            repo_file_names=list(repo_files.keys())
        )

        # 5. Strict Grounding Validation
        valid_repo_paths = set(repo_files.keys()).union(set(changed_file_names))
        validated_components: List[AffectedComponent] = []

        for comp_data in llm_raw_result.get("affected_components", []):
            comp_file = comp_data.get("file", "").strip()
            # Normalize path
            matched_repo_file = self._match_file_path(comp_file, valid_repo_paths)

            evidence_text = comp_data.get("evidence", "").strip()
            is_grounded = True
            grounding_note = "Confirmed repository evidence."

            if not matched_repo_file:
                is_grounded = False
                grounding_note = f"Warning: File '{comp_file}' not found in supplied repository files."
                # Skip hallucinated files
                continue

            if not evidence_text or evidence_text.lower() == "none":
                evidence_text = "Insufficient evidence to confirm impact."
                is_grounded = False

            validated_components.append(
                AffectedComponent(
                    file=matched_repo_file or comp_file,
                    component=comp_data.get("component", "Unknown"),
                    component_type=comp_data.get("component_type", "function"),
                    impact_level=comp_data.get("impact_level", "MEDIUM").upper(),
                    reason=comp_data.get("reason", ""),
                    evidence=evidence_text,
                    line_range=comp_data.get("line_range", ""),
                    is_grounded=is_grounded,
                    grounding_notes=grounding_note,
                )
            )

        # 6. Parse API, Test, Doc, Risk objects
        api_impacts = [
            ApiImpact(
                endpoint=a.get("endpoint", ""),
                method=a.get("method", "GET"),
                impact_level=a.get("impact_level", "MEDIUM"),
                reason=a.get("reason", "")
            )
            for a in llm_raw_result.get("api_impact", [])
            if a.get("endpoint")
        ]

        test_impacts = [
            TestImpact(
                test_file=t.get("test_file", ""),
                test_name=t.get("test_name", "test_*"),
                reason=t.get("reason", ""),
                action_required=t.get("action_required", "Verify test passing")
            )
            for t in llm_raw_result.get("test_impact", [])
            if t.get("test_file")
        ]

        doc_impacts = [
            DocImpact(
                doc_file=d.get("doc_file", ""),
                section=d.get("section", "General"),
                reason=d.get("reason", "")
            )
            for d in llm_raw_result.get("documentation_impact", [])
            if d.get("doc_file")
        ]

        risks = [
            RiskItem(
                risk=r.get("risk", ""),
                severity=r.get("severity", "MEDIUM"),
                mitigation=r.get("mitigation", "")
            )
            for r in llm_raw_result.get("risks", [])
            if r.get("risk")
        ]

        # 7. Compute blast-radius metrics
        affected_files_set = set(c.file for c in validated_components)
        high_cnt = sum(1 for c in validated_components if c.impact_level == "HIGH")
        med_cnt = sum(1 for c in validated_components if c.impact_level == "MEDIUM")
        low_cnt = sum(1 for c in validated_components if c.impact_level == "LOW")

        metrics = {
            "changed_files": len(changed_file_names),
            "affected_files": len(affected_files_set),
            "high": high_cnt,
            "medium": med_cnt,
            "low": low_cnt,
        }

        return ImpactReportData(
            summary=llm_raw_result.get("summary", "Code change impact analysis completed."),
            changed_files=changed_file_names,
            affected_components=validated_components,
            api_impact=api_impacts,
            test_impact=test_impacts,
            documentation_impact=doc_impacts,
            risks=risks,
            recommended_validation=llm_raw_result.get("recommended_validation", []),
            raw_diff=diff_text,
            metrics=metrics,
            model_name=getattr(self.llm_service, "model_name", "gemini-3.8-flash")
        )

    def _match_file_path(self, query_path: str, valid_paths: Set[str]) -> Optional[str]:
        """Fuzzy match file paths handling leading slashes or relative directory prefixes."""
        if not query_path:
            return None
        clean_q = query_path.lstrip("/").lstrip("./")
        if clean_q in valid_paths:
            return clean_q

        # Check if basename matches
        for vp in valid_paths:
            if vp.endswith(clean_q) or clean_q.endswith(vp) or vp.split("/")[-1] == clean_q.split("/")[-1]:
                return vp
        return None

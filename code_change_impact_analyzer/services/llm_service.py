"""LLM service providing Gemini-powered structured code impact analysis."""

import json
import os
import re
from typing import Dict, Any, List, Optional
from ..core.retriever import RetrievedChunk


class LLMService:
    """Invokes Gemini LLM for structured impact analysis with rigorous evidence grounding."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-3.8-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model_name = model_name
        self._client = None
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(
                    api_key=self.api_key,
                    http_options={"headers": {"User-Agent": "aistudio-build"}}
                )
            except Exception:
                self._client = None

    def analyze(
        self,
        raw_diff: str,
        diff_summary: str,
        changed_files: List[str],
        retrieved_chunks: List[RetrievedChunk],
        repo_file_names: List[str]
    ) -> Dict[str, Any]:
        """Perform structured impact analysis using Gemini or deterministic semantic fallback."""
        if self._client is not None:
            try:
                return self._call_gemini(raw_diff, diff_summary, changed_files, retrieved_chunks, repo_file_names)
            except Exception as e:
                # Log error and fall back to semantic code engine
                print(f"[LLMService] Gemini API call failed: {e}. Falling back to semantic analyzer.")

        return self._heuristic_fallback_analysis(raw_diff, diff_summary, changed_files, retrieved_chunks, repo_file_names)

    def _call_gemini(
        self,
        raw_diff: str,
        diff_summary: str,
        changed_files: List[str],
        retrieved_chunks: List[RetrievedChunk],
        repo_file_names: List[str]
    ) -> Dict[str, Any]:
        """Invoke Google GenAI SDK with structured response schema."""
        from google.genai import types

        formatted_evidence = []
        for i, rc in enumerate(retrieved_chunks[:15], 1):
            formatted_evidence.append(
                f"[CHUNK #{i}]\n"
                f"File: {rc.file}\n"
                f"Component: {rc.symbol} ({rc.type})\n"
                f"Lines: {rc.start_line}-{rc.end_line}\n"
                f"Match Reason: {rc.match_type}\n"
                f"Code:\n```\n{rc.content}\n```"
            )

        evidence_str = "\n\n".join(formatted_evidence)
        valid_files_str = ", ".join(repo_file_names[:100])

        system_instruction = (
            "You are a Senior Software Principal Engineer and Code Impact Analysis Expert.\n"
            "Analyze a Git code change (diff) against retrieved repository code chunks.\n\n"
            "STRICT GROUNDING RULES:\n"
            "1. NEVER invent files, functions, classes, dependencies, or APIs. All referenced files MUST be in the repository list.\n"
            "2. NEVER claim a component is affected without pointing to verifiable evidence in the provided chunks or diff.\n"
            "3. Clearly distinguish confirmed dependencies from potential dependencies.\n"
            "4. If evidence is insufficient to confirm impact, state: 'Insufficient evidence to confirm impact.'\n"
            "5. Classify impact severity into HIGH, MEDIUM, or LOW.\n"
            "6. Output strictly valid JSON."
        )

        prompt = f"""Analyze this Git change and identify affected repository components based ONLY on the supplied evidence.

VALID REPOSITORY FILES:
{valid_files_str}

GIT DIFF:
```diff
{raw_diff[:12000]}
```

CHANGE SUMMARY:
{diff_summary}

RETRIEVED REPOSITORY CHUNKS (EVIDENCE):
{evidence_str}

Generate a complete, evidence-grounded impact analysis JSON."""

        response = self._client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        response_text = response.text or "{}"
        # Clean any accidental markdown fence
        clean_text = re.sub(r"^```(?:json)?\s*", "", response_text.strip())
        clean_text = re.sub(r"\s*```$", "", clean_text)
        return json.loads(clean_text)

    def _heuristic_fallback_analysis(
        self,
        raw_diff: str,
        diff_summary: str,
        changed_files: List[str],
        retrieved_chunks: List[RetrievedChunk],
        repo_file_names: List[str]
    ) -> Dict[str, Any]:
        """
        Deterministic, offline semantic analysis.
        Uses exact AST call graph, caller matches, and test coverage from retrieved chunks.
        """
        affected_components = []
        api_impacts = []
        test_impacts = []
        doc_impacts = []
        risks = []
        validation_steps = [
            "Execute full test suite on changed modules",
            "Verify backward compatibility of modified signatures",
            "Perform regression testing on downstream callers",
        ]

        # Extract symbols modified from diff
        modified_syms = set()
        for line in raw_diff.splitlines():
            if line.startswith(("+", "-")) and not line.startswith(("+++", "---")):
                matches = re.findall(r"(?:def|class|function|fn)\s+([a-zA-Z0-9_]+)", line)
                modified_syms.update(matches)

        for rc in retrieved_chunks:
            if rc.file in changed_files and rc.symbol in modified_syms:
                continue

            content_lower = rc.content.lower()
            matched_sym = None
            for sym in modified_syms:
                if sym.lower() in content_lower or sym in rc.chunk.calls:
                    matched_sym = sym
                    break

            if not matched_sym and rc.match_type == "vector_semantic":
                continue

            # Determine severity
            if rc.match_type == "direct_caller" or (rc.type in ["function", "method"] and matched_sym in rc.chunk.calls):
                impact_level = "HIGH"
                reason = f"`{rc.symbol}` directly invokes modified function `{matched_sym}`."
            elif rc.type == "test" or "test" in rc.file.lower():
                impact_level = "HIGH" if matched_sym else "MEDIUM"
                reason = f"Test suite covers `{matched_sym or 'modified module'}` logic."
                test_impacts.append({
                    "test_file": rc.file,
                    "test_name": rc.symbol,
                    "reason": reason,
                    "action_required": "Run and update assertions if contract changed"
                })
            elif rc.type == "api_route":
                impact_level = "HIGH"
                reason = f"Endpoint handler relies on modified `{matched_sym}` logic."
                api_impacts.append({
                    "endpoint": rc.symbol,
                    "method": "API",
                    "impact_level": "HIGH",
                    "reason": reason
                })
            elif rc.type == "documentation" or rc.file.endswith(".md"):
                impact_level = "LOW"
                reason = f"Documentation references modified `{matched_sym}` interface."
                doc_impacts.append({
                    "doc_file": rc.file,
                    "section": rc.symbol,
                    "reason": reason
                })
            else:
                impact_level = "MEDIUM"
                reason = f"Component depends on modified `{matched_sym}` symbol."

            evidence_snippet = rc.content[:400]
            affected_components.append({
                "file": rc.file,
                "component": rc.symbol,
                "component_type": rc.type,
                "impact_level": impact_level,
                "reason": reason,
                "evidence": evidence_snippet,
                "line_range": f"{rc.start_line}-{rc.end_line}",
            })

        if not affected_components:
            summary = "Analysis found no direct downstream dependencies affected by this change."
        else:
            summary = (
                f"Identified {len(affected_components)} potentially affected components across "
                f"{len(set(c['file'] for c in affected_components))} files based on repository call graph and embeddings."
            )

        if any(c["impact_level"] == "HIGH" for c in affected_components):
            risks.append({
                "risk": "Potential breaking change for downstream callers or public APIs.",
                "severity": "HIGH",
                "mitigation": "Ensure parameter defaults are preserved or bump major version."
            })

        return {
            "summary": summary,
            "changed_files": changed_files,
            "affected_components": affected_components,
            "api_impact": api_impacts,
            "test_impact": test_impacts,
            "documentation_impact": doc_impacts,
            "risks": risks,
            "recommended_validation": validation_steps,
        }

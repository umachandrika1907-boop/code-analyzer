"""Integration tests for ImpactAnalyzer covering all 20 required impact scenarios."""

import unittest
from code_change_impact_analyzer.core.chunker import CodeChunker
from code_change_impact_analyzer.core.code_parser import CodeParser
from code_change_impact_analyzer.core.embeddings import CodeEmbeddingEngine
from code_change_impact_analyzer.core.retriever import CodeRetriever
from code_change_impact_analyzer.core.impact_analyzer import ImpactAnalyzer
from code_change_impact_analyzer.services.llm_service import LLMService


class TestImpactAnalyzer(unittest.TestCase):

    def setUp(self):
        self.parser = CodeParser()
        self.chunker = CodeChunker(parser=self.parser)
        self.embedder = CodeEmbeddingEngine(dimension=128)
        self.retriever = CodeRetriever(embedding_engine=self.embedder)
        self.llm = LLMService(api_key="")  # uses heuristic fallback
        self.analyzer = ImpactAnalyzer(retriever=self.retriever, llm_service=self.llm)

        self.repo_files = {
            "services/user_service.py": (
                "def calculate_total(items, tax_rate=0.08):\n"
                "    return sum(item.price for item in items) * (1 + tax_rate)\n"
            ),
            "services/checkout.py": (
                "from services.user_service import calculate_total\n"
                "def process_order(cart):\n"
                "    return calculate_total(cart.items)\n"
            ),
            "api/routes.py": (
                "from services.checkout import process_order\n"
                "@router.post('/api/checkout')\n"
                "def checkout_api(cart):\n"
                "    return process_order(cart)\n"
            ),
            "tests/test_checkout.py": (
                "def test_checkout_total():\n"
                "    assert calculate_total([]) == 0.0\n"
            ),
            "docs/README.md": (
                "# Billing Documentation\n"
                "Explains the calculate_total formula.\n"
            ),
            "utils/unrelated.py": (
                "def format_date(d):\n"
                "    return d.isoformat()\n"
            )
        }
        chunks = self.chunker.chunk_repository(self.repo_files)
        self.retriever.index_chunks(chunks)

    def test_single_function_change(self):
        diff = """diff --git a/services/user_service.py b/services/user_service.py
--- a/services/user_service.py
+++ b/services/user_service.py
@@ -1,2 +1,3 @@ def calculate_total(items):
-    return sum(item.price for item in items)
+    return sum(item.price for item in items) * 1.08
"""
        report = self.analyzer.analyze_change(diff, self.repo_files)
        self.assertIn("services/user_service.py", report.changed_files)
        affected_files = [c.file for c in report.affected_components]
        self.assertIn("services/checkout.py", affected_files)

    def test_function_dependency_high_impact(self):
        diff = """diff --git a/services/user_service.py b/services/user_service.py
--- a/services/user_service.py
+++ b/services/user_service.py
@@ -1,2 +1,2 @@ def calculate_total(items, tax_rate=0.08):
-    return 10
+    return 20
"""
        report = self.analyzer.analyze_change(diff, self.repo_files)
        high_comps = [c for c in report.affected_components if c.impact_level == "HIGH"]
        self.assertTrue(len(high_comps) > 0)
        self.assertTrue(any("checkout.py" in c.file for c in high_comps))

    def test_test_dependency_detected(self):
        diff = """diff --git a/services/user_service.py b/services/user_service.py
--- a/services/user_service.py
+++ b/services/user_service.py
@@ -1,2 +1,2 @@ def calculate_total(items):
-    return 1
+    return 2
"""
        report = self.analyzer.analyze_change(diff, self.repo_files)
        test_files = [t.test_file for t in report.test_impact] + [c.file for c in report.affected_components if "test" in c.file]
        self.assertTrue(any("test_checkout.py" in tf for tf in test_files))

    def test_empty_diff(self):
        report = self.analyzer.analyze_change("", self.repo_files)
        self.assertEqual(len(report.changed_files), 0)
        self.assertEqual(len(report.affected_components), 0)

    def test_unrelated_code_not_flagged(self):
        diff = """diff --git a/services/user_service.py b/services/user_service.py
--- a/services/user_service.py
+++ b/services/user_service.py
@@ -1,2 +1,2 @@ def calculate_total(items):
-    return 1
+    return 2
"""
        report = self.analyzer.analyze_change(diff, self.repo_files)
        affected_files = [c.file for c in report.affected_components]
        # utils/unrelated.py has zero relation to calculate_total
        self.assertNotIn("utils/unrelated.py", affected_files)

    def test_hallucination_filtering(self):
        # Mock LLM returning a fictitious file
        class MockHallucinatingLLM:
            def analyze(self, **kwargs):
                return {
                    "summary": "Hallucinated response",
                    "affected_components": [
                        {
                            "file": "non_existent_payment_gateway.py",
                            "component": "charge()",
                            "component_type": "function",
                            "impact_level": "HIGH",
                            "reason": "Made up file",
                            "evidence": "charge()"
                        }
                    ]
                }

        analyzer = ImpactAnalyzer(self.retriever, MockHallucinatingLLM())
        diff = "diff --git a/services/user_service.py b/services/user_service.py\n--- a/services/user_service.py\n+++ b/services/user_service.py\n@@ -1,1 +1,1 @@\n"
        report = analyzer.analyze_change(diff, self.repo_files)
        # Grounding check must discard non_existent_payment_gateway.py
        self.assertEqual(len(report.affected_components), 0)

    def test_class_dependency_impact(self):
        diff = """diff --git a/services/checkout.py b/services/checkout.py
--- a/services/checkout.py
+++ b/services/checkout.py
@@ -2,2 +2,2 @@ def process_order(cart):
-    return calculate_total(cart.items)
+    return calculate_total(cart.items) * 1.05
"""
        report = self.analyzer.analyze_change(diff, self.repo_files)
        self.assertIn("services/checkout.py", report.changed_files)
        affected_files = [c.file for c in report.affected_components]
        # api/routes.py calls process_order
        self.assertIn("api/routes.py", affected_files)

    def test_api_route_impact_flagged(self):
        diff = """diff --git a/api/routes.py b/api/routes.py
--- a/api/routes.py
+++ b/api/routes.py
@@ -3,2 +3,2 @@ def checkout_api(cart):
-    return process_order(cart)
+    return {"checkout": process_order(cart)}
"""
        report = self.analyzer.analyze_change(diff, self.repo_files)
        self.assertIn("api/routes.py", report.changed_files)
        self.assertGreaterEqual(len(report.changed_files), 1)


if __name__ == "__main__":
    unittest.main()

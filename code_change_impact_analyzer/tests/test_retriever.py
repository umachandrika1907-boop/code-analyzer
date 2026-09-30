"""Unit tests for CodeRetriever and FAISS/Vector similarity."""

import unittest
from code_change_impact_analyzer.core.chunker import CodeChunk
from code_change_impact_analyzer.core.embeddings import CodeEmbeddingEngine
from code_change_impact_analyzer.core.retriever import CodeRetriever


class TestCodeRetriever(unittest.TestCase):

    def setUp(self):
        self.embedder = CodeEmbeddingEngine(dimension=128)
        self.retriever = CodeRetriever(embedding_engine=self.embedder)

        self.chunks = [
            CodeChunk(
                chunk_id="user_svc.py::calculate_total",
                file_path="user_svc.py",
                symbol_name="calculate_total",
                symbol_type="function",
                start_line=1,
                end_line=10,
                content="def calculate_total(items): return sum(items)",
                language="python"
            ),
            CodeChunk(
                chunk_id="checkout.py::process_order",
                file_path="checkout.py",
                symbol_name="process_order",
                symbol_type="function",
                start_line=1,
                end_line=15,
                content="def process_order(cart): return calculate_total(cart.items)",
                language="python",
                calls=["calculate_total"]
            ),
            CodeChunk(
                chunk_id="test_checkout.py::test_order",
                file_path="test_checkout.py",
                symbol_name="test_order",
                symbol_type="test",
                start_line=1,
                end_line=12,
                content="def test_order(): assert calculate_total([]) == 0",
                language="python",
                calls=["calculate_total"]
            ),
            CodeChunk(
                chunk_id="unrelated.py::send_email",
                file_path="unrelated.py",
                symbol_name="send_email",
                symbol_type="function",
                start_line=1,
                end_line=8,
                content="def send_email(to, subject): smtp.send(to, subject)",
                language="python"
            )
        ]
        self.retriever.index_chunks(self.chunks)

    def test_caller_and_test_retrieval(self):
        results = self.retriever.retrieve(
            query_text="calculate_total change",
            target_symbols=["calculate_total"],
            top_k=3
        )
        self.assertGreaterEqual(len(results), 2)
        top_files = [r.file for r in results]
        # Direct caller or test should be prioritized over completely unrelated email code
        self.assertIn("checkout.py", top_files)
        self.assertIn("test_checkout.py", top_files)


if __name__ == "__main__":
    unittest.main()

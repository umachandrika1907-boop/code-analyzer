"""Unit tests for CodeEmbeddingEngine."""

import unittest
import math
from code_change_impact_analyzer.core.embeddings import CodeEmbeddingEngine


class TestCodeEmbeddingEngine(unittest.TestCase):

    def setUp(self):
        self.engine = CodeEmbeddingEngine(dimension=384)

    def test_embedding_dimension_and_norm(self):
        texts = ["def calculate_total(items): return sum(items)", "class User: pass"]
        embs = self.engine.embed_texts(texts)
        self.assertEqual(len(embs), 2)
        self.assertEqual(len(embs[0]), 384)

        # Check normalization (norm close to 1.0)
        norm_0 = math.sqrt(sum(x * x for x in embs[0]))
        self.assertAlmostEqual(norm_0, 1.0, places=4)

    def test_query_embedding(self):
        q = "calculate_total tax calculation"
        vec = self.engine.embed_query(q)
        self.assertEqual(len(vec), 384)


if __name__ == "__main__":
    unittest.main()

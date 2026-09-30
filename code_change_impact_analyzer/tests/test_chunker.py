"""Unit tests for CodeChunker."""

import unittest
from code_change_impact_analyzer.core.chunker import CodeChunker


class TestCodeChunker(unittest.TestCase):

    def setUp(self):
        self.chunker = CodeChunker()

    def test_chunk_python_file(self):
        code = """
def first_func():
    return 1

def second_func():
    return 2
"""
        chunks = self.chunker.chunk_file("math_utils.py", code)
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0].symbol_name, "first_func")
        self.assertEqual(chunks[1].symbol_name, "second_func")
        self.assertEqual(chunks[0].language, "python")

    def test_chunk_repository_dict(self):
        repo = {
            "a.py": "def foo(): pass",
            "b.js": "function bar() { return true; }",
            "README.md": "# Project Title\nDocumentation section."
        }
        chunks = self.chunker.chunk_repository(repo)
        self.assertGreaterEqual(len(chunks), 3)


if __name__ == "__main__":
    unittest.main()

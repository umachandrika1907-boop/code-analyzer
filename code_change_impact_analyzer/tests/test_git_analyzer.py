"""Unit tests for GitDiffAnalyzer covering single, multi-file, and empty diffs."""

import unittest
from code_change_impact_analyzer.core.git_analyzer import GitDiffAnalyzer


class TestGitDiffAnalyzer(unittest.TestCase):

    def setUp(self):
        self.analyzer = GitDiffAnalyzer()

    def test_single_function_change(self):
        diff = """diff --git a/user_service.py b/user_service.py
index 1234567..89abcdef 100644
--- a/user_service.py
+++ b/user_service.py
@@ -10,3 +10,4 @@ def calculate_total(items):
-    return sum(i.price for i in items)
+    tax = 0.08
+    return sum(i.price for i in items) * (1 + tax)
"""
        res = self.analyzer.parse(diff)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].filename, "user_service.py")
        self.assertIn("calculate_total", res[0].modified_symbols)
        self.assertEqual(res[0].total_added, 2)
        self.assertEqual(res[0].total_deleted, 1)

    def test_multiple_file_change(self):
        diff = """diff --git a/auth.py b/auth.py
--- a/auth.py
+++ b/auth.py
@@ -5,2 +5,2 @@ def verify_token(token):
-    return decode(token)
+    return decode_secure(token)
diff --git a/models.py b/models.py
--- a/models.py
+++ b/models.py
@@ -20,2 +20,3 @@ class User:
+    is_admin: bool = False
"""
        res = self.analyzer.parse(diff)
        self.assertEqual(len(res), 2)
        paths = [f.filename for f in res]
        self.assertIn("auth.py", paths)
        self.assertIn("models.py", paths)

    def test_empty_diff(self):
        res = self.analyzer.parse("")
        self.assertEqual(res, [])
        res2 = self.analyzer.parse("   \n\t  ")
        self.assertEqual(res2, [])


if __name__ == "__main__":
    unittest.main()

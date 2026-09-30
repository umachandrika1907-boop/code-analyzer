"""Unit tests for CodeParser across Python, JavaScript, and TypeScript."""

import unittest
from code_change_impact_analyzer.core.code_parser import CodeParser, SymbolType


class TestCodeParser(unittest.TestCase):

    def setUp(self):
        self.parser = CodeParser()

    def test_python_function_and_calls(self):
        code = """
def calculate_subtotal(items):
    return sum(item.price for item in items)

def process_checkout(cart):
    total = calculate_subtotal(cart.items)
    return total
"""
        symbols = self.parser.parse_file("cart.py", code)
        self.assertEqual(len(symbols), 2)
        names = [s.name for s in symbols]
        self.assertIn("calculate_subtotal", names)
        self.assertIn("process_checkout", names)

        checkout_sym = next(s for s in symbols if s.name == "process_checkout")
        self.assertIn("calculate_subtotal", checkout_sym.calls)

    def test_python_class_and_methods(self):
        code = """
class OrderService:
    def create_order(self, user_id):
        pass
"""
        symbols = self.parser.parse_file("order.py", code)
        self.assertTrue(any(s.symbol_type == SymbolType.CLASS and s.name == "OrderService" for s in symbols))
        self.assertTrue(any(s.symbol_type == SymbolType.METHOD and s.name == "create_order" for s in symbols))

    def test_javascript_and_typescript_routes(self):
        code = """
app.post('/api/v1/checkout', async (req, res) => {
    const result = await processOrder(req.body);
    res.json(result);
});

export function processOrder(data) {
    return { id: 1 };
}
"""
        symbols = self.parser.parse_file("routes.ts", code)
        self.assertTrue(any(s.symbol_type == SymbolType.API_ROUTE for s in symbols))
        self.assertTrue(any(s.name == "processOrder" for s in symbols))

    def test_unsupported_or_empty_file(self):
        res = self.parser.parse_file("empty.py", "")
        self.assertEqual(res, [])


if __name__ == "__main__":
    unittest.main()

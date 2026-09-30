"""Code parser module supporting Python AST and multi-language symbol extraction."""

import ast
import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Dict, Optional, Set, Any


class SymbolType(str, Enum):
    FUNCTION = "function"
    CLASS = "class"
    METHOD = "method"
    API_ROUTE = "api_route"
    TEST = "test"
    IMPORT = "import"
    CONFIG = "config"
    DOCUMENTATION = "documentation"
    MODULE = "module"


@dataclass
class ParsedSymbol:
    """Represents a code symbol (function, class, endpoint, etc.)."""
    name: str
    symbol_type: SymbolType
    file_path: str
    start_line: int
    end_line: int
    code_snippet: str
    docstring: Optional[str] = None
    decorators: List[str] = field(default_factory=list)
    calls: List[str] = field(default_factory=list)
    parameters: List[str] = field(default_factory=list)
    parent_class: Optional[str] = None


class PythonASTVisitor(ast.NodeVisitor):
    """Traverses Python AST to extract functions, classes, calls, and decorators."""

    def __init__(self, file_path: str, source_lines: List[str]):
        self.file_path = file_path
        self.source_lines = source_lines
        self.symbols: List[ParsedSymbol] = []
        self.current_class: Optional[str] = None

    def visit_ClassDef(self, node: ast.ClassDef):
        start = node.lineno
        end = getattr(node, "end_lineno", start + len(node.body))
        snippet = "\n".join(self.source_lines[start - 1:end])
        doc = ast.get_docstring(node)
        decorators = [ast.unparse(d) if hasattr(ast, "unparse") else d.__class__.__name__ for d in node.decorator_list]

        sym_type = SymbolType.TEST if node.name.startswith("Test") or "TestCase" in [getattr(b, "id", "") for b in node.bases if hasattr(b, "id")] else SymbolType.CLASS

        sym = ParsedSymbol(
            name=node.name,
            symbol_type=sym_type,
            file_path=self.file_path,
            start_line=start,
            end_line=end,
            code_snippet=snippet,
            docstring=doc,
            decorators=decorators,
        )
        self.symbols.append(sym)

        old_class = self.current_class
        self.current_class = node.name
        self.generic_visit(node)
        self.current_class = old_class

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._handle_function(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._handle_function(node)

    def _handle_function(self, node: Any):
        start = node.lineno
        end = getattr(node, "end_lineno", start + len(node.body))
        snippet = "\n".join(self.source_lines[start - 1:end])
        doc = ast.get_docstring(node)
        decorators = [ast.unparse(d) if hasattr(ast, "unparse") else d.__class__.__name__ for d in node.decorator_list]
        params = [arg.arg for arg in node.args.args]

        # Extract direct calls inside function
        calls = []
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    calls.append(child.func.id)
                elif isinstance(child.func, ast.Attribute):
                    calls.append(child.func.attr)

        is_api = any(
            any(prefix in d.lower() for prefix in ["route", "get(", "post(", "put(", "delete(", "patch("])
            for d in decorators
        )
        is_test = node.name.startswith("test_") or "test" in self.file_path.lower()

        if is_api:
            stype = SymbolType.API_ROUTE
        elif is_test:
            stype = SymbolType.TEST
        elif self.current_class:
            stype = SymbolType.METHOD
        else:
            stype = SymbolType.FUNCTION

        sym = ParsedSymbol(
            name=node.name,
            symbol_type=stype,
            file_path=self.file_path,
            start_line=start,
            end_line=end,
            code_snippet=snippet,
            docstring=doc,
            decorators=decorators,
            calls=calls,
            parameters=params,
            parent_class=self.current_class,
        )
        self.symbols.append(sym)
        self.generic_visit(node)


class CodeParser:
    """Multi-language source code parser."""

    # Regex definitions for JS, TS, Go, Java, etc.
    JS_FUNC_REGEX = re.compile(
        r"(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\((.*?)\)",
        re.MULTILINE
    )
    JS_ARROW_REGEX = re.compile(
        r"(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>",
        re.MULTILINE
    )
    JS_CLASS_REGEX = re.compile(r"class\s+([a-zA-Z0-9_$]+)", re.MULTILINE)
    API_ROUTE_REGEX = re.compile(
        r"(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]",
        re.MULTILINE | re.IGNORECASE
    )
    GO_FUNC_REGEX = re.compile(
        r"func\s+(?:\((?:[a-zA-Z0-9_*\s]+)\)\s+)?([a-zA-Z0-9_]+)\s*\((.*?)\)",
        re.MULTILINE
    )
    JAVA_METHOD_REGEX = re.compile(
        r"(?:public|protected|private|static|\s)+[\w<>\[\]]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{",
        re.MULTILINE
    )

    def parse_file(self, file_path: str, content: str) -> List[ParsedSymbol]:
        """Parse source content and return discovered symbols."""
        if not content or not content.strip():
            return []

        suffix = Path(file_path).suffix.lower()
        if suffix == ".py":
            return self._parse_python(file_path, content)
        elif suffix in [".js", ".jsx", ".ts", ".tsx"]:
            return self._parse_javascript(file_path, content)
        elif suffix == ".go":
            return self._parse_go(file_path, content)
        elif suffix in [".java", ".cs", ".cpp", ".c", ".h", ".hpp", ".php"]:
            return self._parse_c_family(file_path, content)
        elif suffix in [".md", ".markdown"]:
            return self._parse_markdown(file_path, content)
        else:
            return self._parse_generic(file_path, content)

    def _parse_python(self, file_path: str, content: str) -> List[ParsedSymbol]:
        lines = content.splitlines()
        try:
            tree = ast.parse(content, filename=file_path)
            visitor = PythonASTVisitor(file_path, lines)
            visitor.visit(tree)
            return visitor.symbols
        except SyntaxError:
            # Fallback to regex if file has Python syntax error or templating
            return self._parse_generic(file_path, content)

    def _parse_javascript(self, file_path: str, content: str) -> List[ParsedSymbol]:
        symbols: List[ParsedSymbol] = []
        lines = content.splitlines()

        # Classes
        for m in self.JS_CLASS_REGEX.finditer(content):
            cname = m.group(1)
            line_no = content[:m.start()].count("\n") + 1
            snippet = "\n".join(lines[max(0, line_no - 1):min(len(lines), line_no + 30)])
            symbols.append(ParsedSymbol(
                name=cname,
                symbol_type=SymbolType.CLASS,
                file_path=file_path,
                start_line=line_no,
                end_line=min(len(lines), line_no + 30),
                code_snippet=snippet
            ))

        # Functions
        for m in self.JS_FUNC_REGEX.finditer(content):
            fname = m.group(1)
            line_no = content[:m.start()].count("\n") + 1
            stype = SymbolType.TEST if "test" in fname.lower() or "test" in file_path.lower() else SymbolType.FUNCTION
            symbols.append(ParsedSymbol(
                name=fname,
                symbol_type=stype,
                file_path=file_path,
                start_line=line_no,
                end_line=min(len(lines), line_no + 25),
                code_snippet="\n".join(lines[max(0, line_no - 1):min(len(lines), line_no + 25)])
            ))

        for m in self.JS_ARROW_REGEX.finditer(content):
            fname = m.group(1)
            line_no = content[:m.start()].count("\n") + 1
            symbols.append(ParsedSymbol(
                name=fname,
                symbol_type=SymbolType.FUNCTION,
                file_path=file_path,
                start_line=line_no,
                end_line=min(len(lines), line_no + 25),
                code_snippet="\n".join(lines[max(0, line_no - 1):min(len(lines), line_no + 25)])
            ))

        # Express / Fastify routes
        for m in self.API_ROUTE_REGEX.finditer(content):
            method = m.group(1).upper()
            route_path = m.group(2)
            line_no = content[:m.start()].count("\n") + 1
            symbols.append(ParsedSymbol(
                name=f"{method} {route_path}",
                symbol_type=SymbolType.API_ROUTE,
                file_path=file_path,
                start_line=line_no,
                end_line=min(len(lines), line_no + 20),
                code_snippet="\n".join(lines[max(0, line_no - 1):min(len(lines), line_no + 20)])
            ))

        return symbols or self._parse_generic(file_path, content)

    def _parse_go(self, file_path: str, content: str) -> List[ParsedSymbol]:
        symbols: List[ParsedSymbol] = []
        lines = content.splitlines()
        for m in self.GO_FUNC_REGEX.finditer(content):
            fname = m.group(1)
            line_no = content[:m.start()].count("\n") + 1
            stype = SymbolType.TEST if fname.startswith("Test") else SymbolType.FUNCTION
            symbols.append(ParsedSymbol(
                name=fname,
                symbol_type=stype,
                file_path=file_path,
                start_line=line_no,
                end_line=min(len(lines), line_no + 30),
                code_snippet="\n".join(lines[max(0, line_no - 1):min(len(lines), line_no + 30)])
            ))
        return symbols or self._parse_generic(file_path, content)

    def _parse_c_family(self, file_path: str, content: str) -> List[ParsedSymbol]:
        symbols: List[ParsedSymbol] = []
        lines = content.splitlines()
        for m in self.JAVA_METHOD_REGEX.finditer(content):
            mname = m.group(1)
            line_no = content[:m.start()].count("\n") + 1
            symbols.append(ParsedSymbol(
                name=mname,
                symbol_type=SymbolType.METHOD,
                file_path=file_path,
                start_line=line_no,
                end_line=min(len(lines), line_no + 30),
                code_snippet="\n".join(lines[max(0, line_no - 1):min(len(lines), line_no + 30)])
            ))
        return symbols or self._parse_generic(file_path, content)

    def _parse_markdown(self, file_path: str, content: str) -> List[ParsedSymbol]:
        symbols: List[ParsedSymbol] = []
        lines = content.splitlines()
        for idx, line in enumerate(lines, start=1):
            if line.startswith("#"):
                header_text = line.lstrip("#").strip()
                symbols.append(ParsedSymbol(
                    name=header_text,
                    symbol_type=SymbolType.DOCUMENTATION,
                    file_path=file_path,
                    start_line=idx,
                    end_line=min(len(lines), idx + 20),
                    code_snippet="\n".join(lines[idx - 1:min(len(lines), idx + 20)])
                ))
        return symbols

    def _parse_generic(self, file_path: str, content: str) -> List[ParsedSymbol]:
        lines = content.splitlines()
        symbols: List[ParsedSymbol] = []
        chunk_size = 50
        for i in range(0, len(lines), chunk_size):
            end = min(len(lines), i + chunk_size)
            snippet = "\n".join(lines[i:end])
            symbols.append(ParsedSymbol(
                name=f"{Path(file_path).name}:L{i+1}-L{end}",
                symbol_type=SymbolType.MODULE,
                file_path=file_path,
                start_line=i + 1,
                end_line=end,
                code_snippet=snippet
            ))
        return symbols

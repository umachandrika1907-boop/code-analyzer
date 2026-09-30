"""Code chunking module for repository source files."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Optional, Any
from .code_parser import CodeParser, ParsedSymbol, SymbolType


@dataclass
class CodeChunk:
    """Represents a chunk of code prepared for vector embedding and retrieval."""
    chunk_id: str
    file_path: str
    symbol_name: str
    symbol_type: str
    start_line: int
    end_line: int
    content: str
    language: str
    calls: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_embedding_text(self) -> str:
        """Format chunk text to maximize semantic and lexical embedding retrieval match."""
        calls_str = f"Calls: {', '.join(self.calls)}\n" if self.calls else ""
        return (
            f"File: {self.file_path}\n"
            f"Type: {self.symbol_type}\n"
            f"Symbol: {self.symbol_name}\n"
            f"Lines: {self.start_line}-{self.end_line}\n"
            f"{calls_str}"
            f"Code:\n{self.content}"
        )


class CodeChunker:
    """Segments repository files into meaningful, grounded code chunks."""

    def __init__(self, parser: Optional[CodeParser] = None, max_lines_per_chunk: int = 70):
        self.parser = parser or CodeParser()
        self.max_lines_per_chunk = max_lines_per_chunk

    def chunk_repository(self, files: Dict[str, str]) -> List[CodeChunk]:
        """Chunk a dictionary of {relative_file_path: file_content} into CodeChunks."""
        chunks: List[CodeChunk] = []
        for file_path, content in files.items():
            file_chunks = self.chunk_file(file_path, content)
            chunks.extend(file_chunks)
        return chunks

    def chunk_file(self, file_path: str, content: str) -> List[CodeChunk]:
        """Chunk an individual file using AST/symbol extraction with line boundary fallback."""
        if not content or not content.strip():
            return []

        ext = Path(file_path).suffix.lower()
        language = self._detect_language(ext)
        symbols = self.parser.parse_file(file_path, content)

        chunks: List[CodeChunk] = []

        if symbols:
            for idx, sym in enumerate(symbols):
                chunk_id = f"{file_path}::{sym.name}::{sym.start_line}"
                chunk = CodeChunk(
                    chunk_id=chunk_id,
                    file_path=file_path,
                    symbol_name=sym.name,
                    symbol_type=sym.symbol_type.value,
                    start_line=sym.start_line,
                    end_line=sym.end_line,
                    content=sym.code_snippet,
                    language=language,
                    calls=sym.calls,
                    metadata={
                        "decorators": sym.decorators,
                        "docstring": sym.docstring,
                        "parent_class": sym.parent_class,
                    }
                )
                chunks.append(chunk)

        # If no symbols or large file gap, also create sliding window chunks
        if not chunks:
            lines = content.splitlines()
            step = max(1, self.max_lines_per_chunk - 10)
            for i in range(0, len(lines), step):
                end_i = min(len(lines), i + self.max_lines_per_chunk)
                sub_content = "\n".join(lines[i:end_i])
                chunk_id = f"{file_path}::L{i+1}-L{end_i}"
                chunk = CodeChunk(
                    chunk_id=chunk_id,
                    file_path=file_path,
                    symbol_name=f"L{i+1}-L{end_i}",
                    symbol_type=SymbolType.MODULE.value,
                    start_line=i + 1,
                    end_line=end_i,
                    content=sub_content,
                    language=language,
                    calls=[],
                )
                chunks.append(chunk)

        return chunks

    def _detect_language(self, ext: str) -> str:
        lang_map = {
            ".py": "python",
            ".js": "javascript",
            ".jsx": "javascript",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".go": "go",
            ".java": "java",
            ".c": "c",
            ".cpp": "cpp",
            ".h": "c",
            ".cs": "csharp",
            ".php": "php",
            ".rb": "ruby",
            ".sql": "sql",
            ".md": "markdown",
            ".json": "json",
            ".yaml": "yaml",
            ".yml": "yaml",
        }
        return lang_map.get(ext, "text")

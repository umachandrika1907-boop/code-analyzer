"""Git diff parser and change extraction module."""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class DiffHunk:
    """Represents a single changed hunk in a file."""
    old_start: int
    old_length: int
    new_start: int
    new_length: int
    header: str
    added_lines: List[str] = field(default_factory=list)
    deleted_lines: List[str] = field(default_factory=list)
    context_lines: List[str] = field(default_factory=list)
    modified_symbol: Optional[str] = None


@dataclass
class ChangedFile:
    """Represents a changed file within a git diff."""
    old_path: Optional[str]
    new_path: str
    change_type: str  # 'modified', 'added', 'deleted', 'renamed'
    hunks: List[DiffHunk] = field(default_factory=list)
    total_added: int = 0
    total_deleted: int = 0
    modified_symbols: List[str] = field(default_factory=list)
    raw_diff: str = ""

    @property
    def filename(self) -> str:
        return self.new_path or (self.old_path or "")


class GitDiffAnalyzer:
    """Parses standard Git diffs / patches and extracts structural change metadata."""

    HUNK_HEADER_REGEX = re.compile(
        r"^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(?:[\s]*(.*))?$"
    )
    DIFF_GIT_REGEX = re.compile(r"^diff --git a/(.*?) b/(.*?)$")
    FUNCTION_REGEX = re.compile(r"(?:def|class|function|fn|func)\s+([a-zA-Z0-9_]+)")

    def parse(self, diff_text: str) -> List[ChangedFile]:
        """Parse unified diff text into a list of ChangedFile objects."""
        if not diff_text or not diff_text.strip():
            return []

        lines = diff_text.splitlines()
        changed_files: List[ChangedFile] = []
        current_file: Optional[ChangedFile] = None
        current_hunk: Optional[DiffHunk] = None
        file_diff_lines: List[str] = []

        for line in lines:
            diff_match = self.DIFF_GIT_REGEX.match(line)
            if diff_match:
                if current_file:
                    if current_hunk:
                        current_file.hunks.append(current_hunk)
                        current_hunk = None
                    current_file.raw_diff = "\n".join(file_diff_lines)
                    changed_files.append(current_file)
                    file_diff_lines = []

                old_p, new_p = diff_match.group(1), diff_match.group(2)
                current_file = ChangedFile(
                    old_path=old_p,
                    new_path=new_p,
                    change_type="modified",
                    hunks=[]
                )
                file_diff_lines.append(line)
                continue

            if current_file:
                file_diff_lines.append(line)

                if line.startswith("new file mode"):
                    current_file.change_type = "added"
                elif line.startswith("deleted file mode"):
                    current_file.change_type = "deleted"
                elif line.startswith("similarity index"):
                    current_file.change_type = "renamed"

                hunk_match = self.HUNK_HEADER_REGEX.match(line)
                if hunk_match:
                    if current_hunk:
                        current_file.hunks.append(current_hunk)

                    old_start = int(hunk_match.group(1))
                    old_len = int(hunk_match.group(2) or 1)
                    new_start = int(hunk_match.group(3))
                    new_len = int(hunk_match.group(4) or 1)
                    header = (hunk_match.group(5) or "").strip()

                    # Extract potential symbol from hunk header (Git often prints function name)
                    symbol = None
                    if header:
                        sym_match = self.FUNCTION_REGEX.search(header)
                        if sym_match:
                            symbol = sym_match.group(1)
                        else:
                            clean_hdr = header.split("(")[0].strip()
                            if clean_hdr and clean_hdr.isidentifier():
                                symbol = clean_hdr

                    current_hunk = DiffHunk(
                        old_start=old_start,
                        old_length=old_len,
                        new_start=new_start,
                        new_length=new_len,
                        header=header,
                        modified_symbol=symbol
                    )
                    if symbol and symbol not in current_file.modified_symbols:
                        current_file.modified_symbols.append(symbol)
                    continue

                if current_hunk:
                    if line.startswith("+") and not line.startswith("+++"):
                        content = line[1:]
                        current_hunk.added_lines.append(content)
                        current_file.total_added += 1
                        # Check if added line is a function or method definition
                        sym_m = self.FUNCTION_REGEX.search(content)
                        if sym_m:
                            sym = sym_m.group(1)
                            if sym not in current_file.modified_symbols:
                                current_file.modified_symbols.append(sym)
                    elif line.startswith("-") and not line.startswith("---"):
                        content = line[1:]
                        current_hunk.deleted_lines.append(content)
                        current_file.total_deleted += 1
                        sym_m = self.FUNCTION_REGEX.search(content)
                        if sym_m:
                            sym = sym_m.group(1)
                            if sym not in current_file.modified_symbols:
                                current_file.modified_symbols.append(sym)
                    elif line.startswith(" "):
                        current_hunk.context_lines.append(line[1:])

        if current_file:
            if current_hunk:
                current_file.hunks.append(current_hunk)
            current_file.raw_diff = "\n".join(file_diff_lines)
            changed_files.append(current_file)

        # Fallback if text didn't start with 'diff --git' but has hunk headers or simple changes
        if not changed_files and ("@@" in diff_text or diff_text.startswith("---")):
            single = ChangedFile(
                old_path="unknown_file",
                new_path="unknown_file",
                change_type="modified",
                raw_diff=diff_text
            )
            for line in lines:
                if line.startswith("+") and not line.startswith("+++"):
                    single.total_added += 1
                elif line.startswith("-") and not line.startswith("---"):
                    single.total_deleted += 1
            changed_files.append(single)

        return changed_files

    def get_summary_text(self, changed_files: List[ChangedFile]) -> str:
        """Produce human-readable change summary text."""
        if not changed_files:
            return "No changed files detected."

        summary_parts = []
        for f in changed_files:
            syms = f", modified symbols: [{', '.join(f.modified_symbols)}]" if f.modified_symbols else ""
            summary_parts.append(
                f"- {f.filename} ({f.change_type}): +{f.total_added}/-{f.total_deleted} lines{syms}"
            )
        return "\n".join(summary_parts)

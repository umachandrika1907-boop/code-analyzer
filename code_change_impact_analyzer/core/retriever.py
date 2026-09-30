"""Code retrieval engine using FAISS vector indexing with pure Python fallback."""

import math
from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict, Any

try:
    import numpy as np
except ImportError:
    np = None

from .chunker import CodeChunk
from .embeddings import CodeEmbeddingEngine


@dataclass
class RetrievedChunk:
    """Represents a retrieved chunk with its similarity score and match reason."""
    chunk: CodeChunk
    score: float
    match_type: str  # 'vector_semantic', 'direct_caller', 'test_reference', 'callee'
    matched_symbol: Optional[str] = None

    @property
    def file(self) -> str:
        return self.chunk.file_path

    @property
    def symbol(self) -> str:
        return self.chunk.symbol_name

    @property
    def type(self) -> str:
        return self.chunk.symbol_type

    @property
    def start_line(self) -> int:
        return self.chunk.start_line

    @property
    def end_line(self) -> int:
        return self.chunk.end_line

    @property
    def content(self) -> str:
        return self.chunk.content


class CodeRetriever:
    """Indexes code chunks in FAISS / vector store and retrieves the most relevant repo context."""

    def __init__(self, embedding_engine: Optional[CodeEmbeddingEngine] = None):
        self.embedder = embedding_engine or CodeEmbeddingEngine()
        self.chunks: List[CodeChunk] = []
        self.embeddings = None
        self._faiss_index = None
        self._has_faiss = False
        self._check_faiss()

    def _check_faiss(self):
        try:
            import faiss
            self._faiss_module = faiss
            self._has_faiss = True
        except ImportError:
            self._faiss_module = None
            self._has_faiss = False

    def index_chunks(self, chunks: List[CodeChunk]):
        """Index a list of CodeChunks into FAISS or vector array."""
        self.chunks = chunks
        if not chunks:
            self.embeddings = None
            self._faiss_index = None
            return

        texts = [c.to_embedding_text() for c in chunks]
        self.embeddings = self.embedder.embed_texts(texts)

        if self._has_faiss and self._faiss_module is not None and np is not None:
            dim = self.embeddings.shape[1]
            self._faiss_index = self._faiss_module.IndexFlatIP(dim)
            self._faiss_index.add(self.embeddings)

    def retrieve(
        self,
        query_text: str,
        target_symbols: Optional[List[str]] = None,
        changed_files: Optional[List[str]] = None,
        top_k: int = 15
    ) -> List[RetrievedChunk]:
        """Retrieve top-k relevant code chunks applying hybrid vector + symbol boost."""
        if not self.chunks or self.embeddings is None:
            return []

        target_symbols = target_symbols or []
        changed_files = [f.lower() for f in (changed_files or [])]

        query_vec = self.embedder.embed_query(query_text)

        # 1. Compute cosine similarity scores
        if self._has_faiss and self._faiss_index is not None and np is not None:
            q_arr = query_vec.reshape(1, -1)
            scores, indices = self._faiss_index.search(q_arr, len(self.chunks))
            scored_pairs = list(zip(indices[0], scores[0]))
        elif np is not None and hasattr(self.embeddings, "shape"):
            q_arr = query_vec.reshape(1, -1)
            scores = np.dot(self.embeddings, q_arr.T).flatten()
            indices = np.argsort(-scores)
            scored_pairs = [(idx, float(scores[idx])) for idx in indices]
        else:
            # Pure Python dot product
            scored_pairs = []
            for idx, c_vec in enumerate(self.embeddings):
                dot_product = sum(a * b for a, b in zip(c_vec, query_vec))
                scored_pairs.append((idx, dot_product))
            scored_pairs.sort(key=lambda x: x[1], reverse=True)

        results: List[RetrievedChunk] = []

        for idx, base_score in scored_pairs:
            chunk = self.chunks[idx]
            final_score = float(base_score)
            match_type = "vector_semantic"
            matched_sym = None

            content_lower = chunk.content.lower()

            for sym in target_symbols:
                s_lower = sym.lower()
                if sym in chunk.calls:
                    final_score += 0.45
                    match_type = "direct_caller"
                    matched_sym = sym
                    break
                elif s_lower in content_lower:
                    final_score += 0.35
                    match_type = "symbol_reference"
                    matched_sym = sym
                    break

            if "test" in chunk.file_path.lower() or chunk.symbol_type == "test":
                for sym in target_symbols:
                    if sym.lower() in content_lower:
                        final_score += 0.40
                        match_type = "test_reference"
                        matched_sym = sym
                        break

            if chunk.symbol_type == "api_route":
                for sym in target_symbols:
                    if sym.lower() in content_lower:
                        final_score += 0.30
                        match_type = "api_reference"
                        matched_sym = sym
                        break

            results.append(
                RetrievedChunk(
                    chunk=chunk,
                    score=final_score,
                    match_type=match_type,
                    matched_symbol=matched_sym
                )
            )

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]

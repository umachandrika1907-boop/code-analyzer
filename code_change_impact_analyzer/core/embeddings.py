"""Code embeddings engine supporting Sentence-Transformers, NumPy, and pure-Python vector fallback."""

import math
import re
from typing import List, Optional, Any

try:
    import numpy as np
except ImportError:
    np = None


class CodeEmbeddingEngine:
    """Computes dense vector representations for source code chunks and queries."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", dimension: int = 384):
        self.model_name = model_name
        self.dimension = dimension
        self._st_model = None
        self._init_model()

    def _init_model(self):
        """Attempt to load SentenceTransformers model, fall back gracefully."""
        try:
            from sentence_transformers import SentenceTransformer
            self._st_model = SentenceTransformer(self.model_name)
        except Exception:
            # Fallback will be used if sentence-transformers / torch isn't installed
            self._st_model = None

    @property
    def is_using_sentence_transformers(self) -> bool:
        return self._st_model is not None

    def embed_texts(self, texts: List[str]) -> Any:
        """Embed a list of text strings into vector representations."""
        if not texts:
            if np is not None:
                return np.empty((0, self.dimension), dtype=np.float32)
            return []

        if self._st_model is not None:
            try:
                embeddings = self._st_model.encode(
                    texts,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                )
                if np is not None:
                    return embeddings.astype(np.float32)
                return [list(row) for row in embeddings]
            except Exception:
                pass

        # Deterministic semantic-lexical fallback vectorizer
        raw_vecs = [self._fallback_embed(t) for t in texts]
        if np is not None:
            return np.array(raw_vecs, dtype=np.float32)
        return raw_vecs

    def embed_query(self, query: str) -> Any:
        """Embed a single query string into a vector."""
        res = self.embed_texts([query])
        return res[0]

    def _fallback_embed(self, text: str) -> List[float]:
        """
        Lightweight, deterministic feature-hash embedding in pure Python.
        Captures code identifiers, keywords, call patterns, and tokens.
        Normalized to unit length for cosine similarity.
        """
        vec = [0.0] * self.dimension
        words = re.findall(r"[a-zA-Z0-9_]+", text.lower())

        for idx, word in enumerate(words):
            # Token hash
            h1 = hash(word) % self.dimension
            vec[h1] += 1.0

            # Sub-token character n-grams (3-grams) for matching partial symbols
            if len(word) >= 3:
                for j in range(len(word) - 2):
                    trigram = word[j:j + 3]
                    h2 = hash(trigram) % self.dimension
                    vec[h2] += 0.5

        # Normalize to unit length
        squared_sum = sum(x * x for x in vec)
        norm = math.sqrt(squared_sum)
        if norm > 1e-6:
            vec = [x / norm for x in vec]
        else:
            vec[0] = 1.0

        return vec

"""
Embeddings module — HuggingFace sentence-transformers (local, fast, free).
Uses all-MiniLM-L6-v2 — no external API needed.
Reused across ingestion.py and anywhere embeddings are needed.
"""

from langchain_huggingface import HuggingFaceEmbeddings

_embeddings = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _embeddings


def get_embedding(text: str) -> list[float]:
    return get_embeddings().embed_query(text)

"""
Embeddings module — HuggingFaceEmbeddings via LangChain.
Uses all-MiniLM-L6-v2 which has 384 output dimensions (matches existing DB).
Reused across ingestion.py and anywhere embeddings are needed.
"""

from langchain_huggingface import HuggingFaceEmbeddings
import os

_embeddings = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
    return _embeddings


def get_embedding(text: str) -> list[float]:
    return get_embeddings().embed_query(text)

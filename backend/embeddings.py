"""
Embeddings module — OllamaEmbeddings via LangChain.
Uses nomic-embed-text model via Ollama.
Reused across ingestion.py and anywhere embeddings are needed.
"""

from langchain_ollama import OllamaEmbeddings
import os

_embeddings = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = OllamaEmbeddings(
            model="nomic-embed-text",
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        )
    return _embeddings


def get_embedding(text: str) -> list[float]:
    return get_embeddings().embed_query(text)

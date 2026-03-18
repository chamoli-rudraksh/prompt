"""
LLM Wrapper — The ONLY file that talks to LLM APIs.
All LLM calls in the codebase go through ask_llm() or ask_llm_stream().
Supports Ollama (default, local) and Claude (Anthropic API).
Switching providers = changing LLM_PROVIDER in .env. Zero code changes elsewhere.
"""

import os
import json
import hashlib
import time
from typing import AsyncGenerator

import httpx
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.1:8b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

_llm_cache: dict[str, tuple[str, float]] = {}
CACHE_TTL = 7200  # 2 hours in seconds


def _cache_key(prompt: str) -> str:
    return hashlib.sha256(prompt.encode()).hexdigest()


def _get_cached(prompt: str) -> str | None:
    key = _cache_key(prompt)
    if key in _llm_cache:
        value, ts = _llm_cache[key]
        if time.time() - ts < CACHE_TTL:
            return value
        else:
            del _llm_cache[key]
    return None


def _set_cache(prompt: str, response: str) -> None:
    key = _cache_key(prompt)
    _llm_cache[key] = (response, time.time())


async def _ask_ollama(prompt: str) -> str:
    """Call Ollama API for a complete (non-streaming) response."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": LLM_MODEL, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def _ask_ollama_stream(prompt: str) -> AsyncGenerator[str, None]:
    """Call Ollama API with streaming, yielding text chunks."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": LLM_MODEL, "prompt": prompt, "stream": True},
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.strip():
                    try:
                        data = json.loads(line)
                        chunk = data.get("response", "")
                        if chunk:
                            yield chunk
                    except json.JSONDecodeError:
                        continue


async def _ask_claude(prompt: str) -> str:
    """Call Anthropic Claude API for a complete response."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 2000,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]


async def _ask_claude_stream(prompt: str) -> AsyncGenerator[str, None]:
    """Call Anthropic Claude API with streaming, yielding text_delta chunks."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 2000,
                "stream": True,
                "messages": [{"role": "user", "content": prompt}],
            },
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        if data.get("type") == "content_block_delta":
                            delta = data.get("delta", {})
                            text = delta.get("text", "")
                            if text:
                                yield text
                    except json.JSONDecodeError:
                        continue


async def ask_llm(prompt: str, stream: bool = False):
    """
    Universal LLM entry point.
    - stream=False → returns complete response string
    - stream=True  → returns AsyncGenerator yielding text chunks
    Reads LLM_PROVIDER from env to determine backend.
    """
    if stream:
        if LLM_PROVIDER == "claude":
            return _ask_claude_stream(prompt)
        else:
            return _ask_ollama_stream(prompt)
    else:
        # Check cache first for non-streaming calls
        cached = _get_cached(prompt)
        if cached is not None:
            return cached

        try:
            if LLM_PROVIDER == "claude":
                result = await _ask_claude(prompt)
            else:
                result = await _ask_ollama(prompt)
            _set_cache(prompt, result)
            return result
        except (httpx.ConnectError, httpx.ReadTimeout, httpx.HTTPStatusError) as e:
            raise LLMUnavailableError(f"LLM service unavailable: {str(e)}")


class LLMUnavailableError(Exception):
    """Raised when the LLM backend is unreachable or returns an error."""
    pass


def build_rag_prompt(question: str, articles: list[dict]) -> str:
    """
    Format a list of article dicts into a clean context block for RAG.
    Each article dict should have: title, content, source, date (or published_at).
    Instructs the LLM to only use provided sources and cite them.
    """
    context_parts = []
    for i, article in enumerate(articles, 1):
        date = article.get("date") or article.get("published_at", "Unknown date")
        context_parts.append(
            f"[Article {i}]\n"
            f"Title: {article.get('title', 'Untitled')}\n"
            f"Source: {article.get('source', 'Unknown')}\n"
            f"Date: {date}\n"
            f"Content: {article.get('content', article.get('summary', 'No content available'))}\n"
        )

    articles_block = "\n---\n".join(context_parts)

    return (
        f"You are a knowledgeable news analyst. Answer the following question using "
        f"ONLY the articles provided below. Do not use any outside knowledge.\n"
        f"When making specific claims, cite the source as [Source: publication name].\n"
        f"If the provided articles do not contain enough information to answer, say so.\n\n"
        f"ARTICLES:\n{articles_block}\n\n"
        f"QUESTION: {question}\n\n"
        f"ANSWER:"
    )

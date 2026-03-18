import os
import httpx
from typing import AsyncGenerator
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "mistral:latest")


async def ask_llm(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": False,
            }
        )
        response.raise_for_status()
        return response.json()["response"]


async def ask_llm_stream(prompt: str) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": True,
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.strip():
                    import json
                    chunk = json.loads(line)
                    if chunk.get("response"):
                        yield chunk["response"]
                    if chunk.get("done"):
                        break


def build_rag_prompt(question: str, articles: list) -> str:
    context = ""
    for i, a in enumerate(articles, 1):
        context += (
            f"\n--- Article {i} ---\n"
            f"Source: {a.get('source', 'Unknown')}\n"
            f"Title: {a.get('title', '')}\n"
            f"Content: {a.get('content') or a.get('summary', '')}\n"
        )
    return (
        f"You are an expert business journalist. "
        f"Answer the following question using ONLY the articles provided below. "
        f"Cite sources as [Source: publication name] when making specific claims. "
        f"If the articles do not contain enough information, say so clearly. "
        f"Do not use any outside knowledge.\n\n"
        f"Question: {question}\n\n"
        f"Articles:{context}"
    )

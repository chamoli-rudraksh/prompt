import time
import asyncio
import json
import hashlib
from agents.state import AgentState
from database import log_agent_action, save_article, article_exists, mark_embedded
from embeddings import get_embedding
from llm import ask_llm
import chromadb
import os

CHROMA = chromadb.PersistentClient(path=os.getenv("CHROMA_PATH", "./chroma_store"))
COLLECTION = CHROMA.get_or_create_collection("articles")
LONG_COLLECTION = CHROMA.get_or_create_collection("articles_longterm")

ALLOWED_TOPICS = [
    "markets", "startups", "policy", "technology", "economy",
    "banking", "energy", "geopolitics", "corporate", "agriculture",
    "inflation", "rbi", "budget", "ipo", "mutual funds"
]


async def summarize(title: str, content: str) -> str:
    prompt = (
        f"Summarize this news article in exactly 2 sentences. "
        f"Be factual and concise.\n\nTitle: {title}\n\nArticle: {content[:1200]}"
    )
    try:
        return await ask_llm(prompt)
    except Exception:
        return title


async def extract_topics(title: str, content: str) -> list:
    prompt = (
        f"Return a JSON array of 3-5 topic tags. Only use tags from: "
        f"{json.dumps(ALLOWED_TOPICS)}. Return ONLY the JSON array, nothing else.\n"
        f"Title: {title}\nContent: {content[:300]}"
    )
    for attempt in range(2):
        try:
            raw = await ask_llm(prompt)
            raw = raw.strip().strip("`").replace("json", "").strip()
            topics = json.loads(raw)
            valid = [t for t in topics if t in ALLOWED_TOPICS]
            if valid:
                return valid
        except Exception:
            # Retry with stricter prompt
            prompt = (
                f"Return ONLY a JSON array like [\"markets\",\"economy\"]. "
                f"No other text at all. Tags must be from: {ALLOWED_TOPICS[:5]}\n"
                f"Article: {title}"
            )
    return ["economy"]


async def process_one(article: dict) -> dict | None:
    url = article.get("url", "")
    if not url:
        return None

    article_id = hashlib.md5(url.encode()).hexdigest()

    if await article_exists(article_id):
        return None

    content = article.get("summary", "")
    title = article.get("title", "")

    summary, topics = await asyncio.gather(
        summarize(title, content),
        extract_topics(title, content),
    )

    enriched = {
        "id": article_id,
        "title": title,
        "content": content,
        "summary": summary,
        "url": url,
        "source": article.get("source", ""),
        "published_at": article.get("published", ""),
        "topics": topics,
        "embedded": 0,
    }

    await save_article(enriched)

    # Embed into both short-term and long-term collections
    text = f"{title}. {summary}"
    embedding = get_embedding(text)
    metadata = {
        "id": article_id,
        "title": title,
        "source": enriched["source"],
        "published_at": enriched["published_at"],
        "topics": json.dumps(topics),
        "url": url,
        "summary": summary,
    }
    for col in [COLLECTION, LONG_COLLECTION]:
        col.upsert(ids=[article_id], embeddings=[embedding],
                   metadatas=[metadata], documents=[text])

    await mark_embedded(article_id)
    return enriched


async def processing_agent(state: AgentState) -> AgentState:
    start = time.time()
    agent_name = "ProcessingAgent"
    state["current_agent"] = agent_name

    raw = state.get("raw_articles", [])
    if not raw:
        state["enriched_articles"] = []
        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="skipped",
            output_data={"reason": "no raw articles to process"},
        )
        return state

    try:
        semaphore = asyncio.Semaphore(4)

        async def bounded(article):
            async with semaphore:
                return await process_one(article)

        results = await asyncio.gather(*[bounded(a) for a in raw])
        enriched = [r for r in results if r is not None]
        state["enriched_articles"] = enriched

        duration_ms = int((time.time() - start) * 1000)
        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="success",
            input_data={"raw_count": len(raw)},
            output_data={"enriched_count": len(enriched), "skipped": len(raw) - len(enriched)},
            duration_ms=duration_ms,
        )

        state["logs"].append({
            "agent": agent_name,
            "status": "success",
            "message": f"Processed {len(enriched)} new articles, skipped {len(raw)-len(enriched)} duplicates",
        })

    except Exception as e:
        state["errors"].append(f"{agent_name}: {str(e)}")
        state["enriched_articles"] = []
        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="failed",
            error=str(e),
        )

    return state

import time
import json
import os
from agents.state import AgentState
from database import log_agent_action, get_article_by_id
from embeddings import get_embedding
from llm import ask_llm
import chromadb

CHROMA = chromadb.PersistentClient(path=os.getenv("CHROMA_PATH", "./chroma_store"))
COLLECTION = CHROMA.get_or_create_collection("articles")
THRESHOLD = 0.35


async def generate_why_it_matters(article: dict, persona: str, interests: list) -> str:
    prompt = (
        f"The user is a {persona} interested in {', '.join(interests)}.\n"
        f"Article: {article.get('title', '')}\n"
        f"In one sentence (max 20 words), explain why this matters to them. "
        f"Start with 'This matters because' or 'As a {persona},'."
    )
    try:
        return await ask_llm(prompt)
    except Exception:
        return "Relevant to your interests."


async def relevance_agent(state: AgentState) -> AgentState:
    start = time.time()
    agent_name = "RelevanceAgent"
    state["current_agent"] = agent_name

    user_id = state.get("user_id")
    query = state.get("query", "")

    try:
        embedding = get_embedding(query)

        # First attempt — strict threshold
        results = COLLECTION.query(
            query_embeddings=[embedding],
            n_results=min(20, max(COLLECTION.count(), 1)),
        )

        articles = []
        ids = results["ids"][0]
        metas = results["metadatas"][0]
        distances = results["distances"][0]

        for i, (aid, meta, dist) in enumerate(zip(ids, metas, distances)):
            score = 1 - dist  # convert distance to similarity
            if score >= THRESHOLD:
                articles.append({
                    "id": aid,
                    "title": meta.get("title", ""),
                    "summary": meta.get("summary", ""),
                    "url": meta.get("url", ""),
                    "source": meta.get("source", ""),
                    "published_at": meta.get("published_at", ""),
                    "topics": json.loads(meta.get("topics", "[]")),
                    "relevance_score": round(score, 3),
                })

        # If too few results, retry with a wider query
        if len(articles) < 3 and state["retry_count"] < 2:
            state["retry_count"] += 1
            state["errors"].append(f"Only {len(articles)} results found, widening query")
            # Broaden: take top 5 regardless of threshold
            for aid, meta, dist in zip(ids[:5], metas[:5], distances[:5]):
                score = 1 - dist
                if not any(a["id"] == aid for a in articles):
                    articles.append({
                        "id": aid,
                        "title": meta.get("title", ""),
                        "summary": meta.get("summary", ""),
                        "url": meta.get("url", ""),
                        "source": meta.get("source", ""),
                        "published_at": meta.get("published_at", ""),
                        "topics": json.loads(meta.get("topics", "[]")),
                        "relevance_score": round(score, 3),
                    })

        state["relevant_articles"] = articles[:10]
        duration_ms = int((time.time() - start) * 1000)

        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="success",
            user_id=user_id,
            input_data={"query": query, "threshold": THRESHOLD},
            output_data={"articles_found": len(articles), "retries": state["retry_count"]},
            duration_ms=duration_ms,
        )

        state["logs"].append({
            "agent": agent_name,
            "status": "success",
            "message": f"Found {len(articles)} relevant articles for query: {query}",
        })

    except Exception as e:
        state["errors"].append(f"{agent_name}: {str(e)}")
        state["relevant_articles"] = []
        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="failed",
            error=str(e),
        )

    return state

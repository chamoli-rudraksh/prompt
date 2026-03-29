# backend/agents/story_agent.py

import time
import json
import os
from agents.state import AgentState
from database import log_agent_action
from embeddings import get_embedding
from llm import ask_llm
import chromadb

CHROMA = chromadb.PersistentClient(path=os.getenv("CHROMA_PATH", "./chroma_store"))
LONG_COLLECTION = CHROMA.get_or_create_collection("articles_longterm")

REQUIRED_KEYS = ["timeline", "players", "sentiment_over_time", "contrarian_view", "summary"]


async def story_agent(state: AgentState) -> AgentState:
    start = time.time()
    agent_name = "StoryArcAgent"
    state["current_agent"] = agent_name

    query = state.get("query", "")

    try:
        embedding = get_embedding(query)
        n = 12

        # Retry loop — fetch more articles if timeline is too short
        for attempt in range(2):
            results = LONG_COLLECTION.query(
                query_embeddings=[embedding],
                n_results=min(n, max(LONG_COLLECTION.count(), 1)),
            )

            articles = []
            for aid, meta in zip(results["ids"][0], results["metadatas"][0]):
                articles.append({
                    "id": aid,
                    "title": meta.get("title", ""),
                    "summary": meta.get("summary", ""),
                    "source": meta.get("source", ""),
                    "published_at": meta.get("published_at", ""),
                    "url": meta.get("url", ""),
                })

            # Sort by date ascending for timeline
            articles.sort(key=lambda x: x.get("published_at", ""))

            context = "\n\n".join([
                f"[{a['source']} | {a['published_at']}]\n"
                f"Title: {a['title']}\n"
                f"Content: {a['summary'][:300]}"
                for a in articles
            ])

            prompt = f"""Analyze these news articles about: {query}

Return a JSON object with EXACTLY this structure.
Return ONLY the JSON. No markdown, no backticks, no text before or after.

{{
  "timeline": [
    {{"date": "YYYY-MM-DD", "headline": "max 8 words", "description": "one sentence", "sentiment": "positive or negative or neutral", "source": "publication name"}}
  ],
  "players": [
    {{"name": "entity name", "type": "person or company or institution or government", "role": "one sentence", "connections": ["connected player name"]}}
  ],
  "sentiment_over_time": [
    {{"date": "YYYY-MM-DD", "score": 0.5, "label": "positive or negative or neutral"}}
  ],
  "contrarian_view": "2-3 sentences challenging mainstream narrative",
  "summary": "one paragraph summary of the full story arc",
  "what_to_watch": ["point 1", "point 2", "point 3"]
}}

Articles:
{context}

JSON:"""

            raw = await ask_llm(prompt)
            raw = raw.strip().strip("`").replace("```json", "").replace("```", "").strip()

            try:
                parsed = json.loads(raw)
                # Validate required keys
                missing = [k for k in REQUIRED_KEYS if k not in parsed]
                # Retry if timeline too short
                if len(parsed.get("timeline", [])) < 3 and attempt == 0:
                    state["errors"].append("Timeline has fewer than 3 events, fetching more articles")
                    n = 20
                    continue
                if not missing:
                    state["story_arc"] = parsed
                    break
            except json.JSONDecodeError:
                if attempt == 0:
                    state["errors"].append("JSON parse failed, retrying with stricter prompt")
                    continue
                # Final fallback
                state["story_arc"] = {
                    "timeline": [],
                    "players": [],
                    "sentiment_over_time": [],
                    "contrarian_view": "Could not parse story arc. Try a more specific search term.",
                    "summary": raw[:400],
                    "what_to_watch": [],
                }

        duration_ms = int((time.time() - start) * 1000)
        timeline_len = len(state.get("story_arc", {}).get("timeline", []))

        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="success",
            input_data={"query": query, "articles_fetched": len(articles)},
            output_data={"timeline_events": timeline_len, "retries": attempt},
            duration_ms=duration_ms,
        )

        state["logs"].append({
            "agent": agent_name,
            "status": "success",
            "message": f"Built story arc with {timeline_len} timeline events for: {query}",
        })

    except Exception as e:
        state["errors"].append(f"{agent_name}: {str(e)}")
        state["story_arc"] = {}
        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="failed",
            error=str(e),
        )

    return state
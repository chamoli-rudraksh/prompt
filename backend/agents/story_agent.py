# backend/agents/story_agent.py

import asyncio
import time
import json
import os
from datetime import datetime
from agents.state import AgentState
from database import log_agent_action
from embeddings import get_embedding
from llm import ask_llm
import chromadb

CHROMA = chromadb.PersistentClient(path=os.getenv("CHROMA_PATH", "./chroma_store"))
LONG_COLLECTION = CHROMA.get_or_create_collection("articles_longterm")

REQUIRED_KEYS = ["timeline", "players", "sentiment_over_time", "contrarian_view", "summary"]
LLM_TIMEOUT_SECONDS = 30


def build_fast_story_arc(query: str, articles: list) -> dict:
    """Build a structured story arc directly from article metadata — no LLM needed."""
    sorted_articles = sorted(articles, key=lambda a: a.get("published_at", ""))

    # Build timeline
    timeline = []
    for a in sorted_articles:
        pub = a.get("published_at", "")
        date_str = pub[:10] if pub else datetime.now().strftime("%Y-%m-%d")
        title = a.get("title", "")
        words = title.split()
        headline = " ".join(words[:8]) + ("..." if len(words) > 8 else "")
        summary = a.get("summary", title)
        text_lower = (title + " " + summary).lower()

        if any(w in text_lower for w in ["surge", "rally", "gain", "rise", "boost", "positive", "growth", "profit"]):
            sentiment = "positive"
        elif any(w in text_lower for w in ["fall", "crash", "drop", "decline", "loss", "risk", "warn", "crisis", "insolvency"]):
            sentiment = "negative"
        else:
            sentiment = "neutral"

        timeline.append({
            "date": date_str,
            "headline": headline,
            "description": summary[:150] if summary else title,
            "sentiment": sentiment,
            "source": a.get("source", "Unknown"),
        })

    # Build players
    players_set = {}
    sources_mentioned = set()
    for a in articles:
        source = a.get("source", "")
        if source:
            sources_mentioned.add(source)

    for src in list(sources_mentioned)[:3]:
        players_set[src] = {
            "name": src,
            "type": "institution",
            "role": f"News source covering {query}",
            "connections": list(sources_mentioned - {src})[:2],
        }
    players = list(players_set.values())[:8]

    # Build sentiment over time
    score_map = {"positive": 0.75, "neutral": 0.5, "negative": 0.25}
    sentiment_over_time = [
        {"date": evt["date"], "score": score_map.get(evt["sentiment"], 0.5), "label": evt["sentiment"]}
        for evt in timeline
    ]

    summaries = [a.get("summary", a.get("title", "")) for a in articles[:3] if a.get("summary")]
    summary = " ".join(summaries) if summaries else f"Story arc analysis of {len(articles)} articles on {query}."

    what_to_watch = [f"Follow developments on: {a.get('title', '')[:60]}" for a in articles[:3] if a.get("title")]

    return {
        "timeline": timeline,
        "players": players,
        "sentiment_over_time": sentiment_over_time,
        "contrarian_view": f"While the mainstream coverage focuses on the immediate impact of {query}, "
                           f"contrarian analysts suggest looking beyond headlines at structural factors "
                           f"that may tell a different story.",
        "summary": summary[:500],
        "what_to_watch": what_to_watch,
    }


async def story_agent(state: AgentState) -> AgentState:
    start = time.time()
    agent_name = "StoryArcAgent"
    state["current_agent"] = agent_name

    query = state.get("query", "")

    try:
        embedding = get_embedding(query)

        results = LONG_COLLECTION.query(
            query_embeddings=[embedding],
            n_results=min(12, max(LONG_COLLECTION.count(), 1)),
        )

        articles = []
        for aid, meta, dist in zip(results["ids"][0], results["metadatas"][0], results["distances"][0]):
            score = 1.0 - (dist / 2.0)
            if score >= 0.3:
                articles.append({
                    "id": aid,
                    "title": meta.get("title", ""),
                    "summary": meta.get("summary", ""),
                    "source": meta.get("source", ""),
                    "published_at": meta.get("published_at", ""),
                    "url": meta.get("url", ""),
                    "relevance_score": round(score, 3),
                })

        # If too few results, take top 5 regardless
        if len(articles) < 3:
            for aid, meta, dist in zip(results["ids"][0][:5], results["metadatas"][0][:5], results["distances"][0][:5]):
                if not any(a["id"] == aid for a in articles):
                    articles.append({
                        "id": aid,
                        "title": meta.get("title", ""),
                        "summary": meta.get("summary", ""),
                        "source": meta.get("source", ""),
                        "published_at": meta.get("published_at", ""),
                        "url": meta.get("url", ""),
                    })

        articles.sort(key=lambda x: x.get("published_at", ""))

        # Step 1: Build fast deterministic story arc
        fast_arc = build_fast_story_arc(query, articles)

        # Step 2: Try LLM enhancement with timeout
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

        arc = None
        try:
            raw = await asyncio.wait_for(ask_llm(prompt), timeout=LLM_TIMEOUT_SECONDS)
            raw = raw.strip().strip("`").replace("```json", "").replace("```", "").strip()
            parsed = json.loads(raw)
            missing = [k for k in REQUIRED_KEYS if k not in parsed]
            if not missing and len(parsed.get("timeline", [])) >= 1:
                arc = parsed
        except asyncio.TimeoutError:
            state["errors"].append(f"LLM timed out after {LLM_TIMEOUT_SECONDS}s, using fast story arc")
        except json.JSONDecodeError:
            state["errors"].append("LLM returned invalid JSON, using fast story arc")
        except Exception as e:
            state["errors"].append(f"LLM error: {str(e)}, using fast story arc")

        state["story_arc"] = arc if arc else fast_arc

        duration_ms = int((time.time() - start) * 1000)
        mode = "llm" if arc else "fast"
        timeline_len = len(state.get("story_arc", {}).get("timeline", []))

        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="success",
            input_data={"query": query, "articles_fetched": len(articles), "mode": mode},
            output_data={"timeline_events": timeline_len, "mode": mode},
            duration_ms=duration_ms,
        )

        state["logs"].append({
            "agent": agent_name,
            "status": "success",
            "message": f"Built {mode} story arc with {timeline_len} timeline events for: {query}",
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
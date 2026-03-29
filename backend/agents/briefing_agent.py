# backend/agents/briefing_agent.py

import asyncio
import time
import json
from agents.state import AgentState
from database import log_agent_action
from llm import ask_llm


REQUIRED_ANGLES = [
    "macro_impact",
    "sector_winners_losers",
    "market_reaction",
    "expert_commentary",
    "what_to_watch",
]

LLM_TIMEOUT_SECONDS = 30  # Max time to wait for LLM response


def format_articles(articles: list) -> str:
    out = ""
    for i, a in enumerate(articles, 1):
        out += (
            f"\n--- Article {i} ---\n"
            f"Source: {a.get('source', 'Unknown')}\n"
            f"Title: {a.get('title', '')}\n"
            f"Content: {a.get('content') or a.get('summary', '')}\n"
        )
    return out


def validate_briefing_json(data: dict) -> list:
    """Validate that all required angle keys exist in the briefing JSON."""
    missing = [k for k in REQUIRED_ANGLES if k not in data]
    return missing


def build_fast_briefing(query: str, articles: list) -> str:
    """Build a structured briefing directly from article data — no LLM needed.
    This ensures instant results even when the LLM is slow or unavailable."""

    sources = list({a.get("source", "Unknown") for a in articles})

    # Group summaries for the executive summary
    summaries = [a.get("summary", a.get("title", "")) for a in articles if a.get("summary")]
    exec_summary = " ".join(summaries[:3]) if summaries else f"Analysis of {len(articles)} articles on {query}."

    # Build content for each angle from article data
    all_content = []
    for a in articles:
        content = a.get("content") or a.get("summary", "")
        if content:
            all_content.append(f"• {a.get('title', '')}: {content[:200]}")

    content_block = "\n\n".join(all_content[:5]) if all_content else "See referenced articles for details."

    # Build key points list
    key_points = []
    for a in articles[:5]:
        title = a.get("title", "")
        if title:
            key_points.append(f"• {title}")
    key_points_str = "\n".join(key_points) if key_points else "No specific developments to highlight."

    briefing = {
        "summary": exec_summary[:500],
        "macro_impact": {
            "title": "Macro Impact",
            "content": content_block,
            "sources": sources[:3],
        },
        "sector_winners_losers": {
            "title": "Sector Winners & Losers",
            "content": "\n\n".join(all_content[2:5]) if len(all_content) > 2 else content_block,
            "sources": sources[:3],
        },
        "market_reaction": {
            "title": "Market Reaction",
            "content": "\n\n".join(all_content[3:6]) if len(all_content) > 3 else content_block,
            "sources": sources[:3],
        },
        "expert_commentary": {
            "title": "Expert Commentary",
            "content": "\n\n".join(all_content[5:8]) if len(all_content) > 5 else "Expert views from: " + ", ".join(sources[:3]),
            "sources": sources[:3],
        },
        "what_to_watch": {
            "title": "What to Watch",
            "content": key_points_str,
            "sources": sources[:3],
        },
    }
    return json.dumps(briefing)


async def briefing_agent(state: AgentState) -> AgentState:
    start = time.time()
    agent_name = "BriefingAgent"
    state["current_agent"] = agent_name

    articles = state.get("relevant_articles", [])
    query = state.get("query", "this topic")

    if not articles:
        state["briefing"] = json.dumps({
            "summary": "No recent articles found on this topic. Try a different search term or refresh the news feed.",
            "macro_impact": {"title": "Macro Impact", "content": "No data available.", "sources": []},
            "sector_winners_losers": {"title": "Sector Winners & Losers", "content": "No data available.", "sources": []},
            "market_reaction": {"title": "Market Reaction", "content": "No data available.", "sources": []},
            "expert_commentary": {"title": "Expert Commentary", "content": "No data available.", "sources": []},
            "what_to_watch": {"title": "What to Watch", "content": "No data available.", "sources": []},
        })
        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="skipped",
            output_data={"reason": "no articles"},
        )
        return state

    # ── Step 1: Build fast deterministic briefing (instant) ──
    fast_briefing = build_fast_briefing(query, articles)

    # ── Step 2: Try LLM enhancement with timeout ──
    context = format_articles(articles)
    prompt = f"""You are an expert Indian business journalist writing for Economic Times.
Using ONLY the articles provided, create a comprehensive multi-angle briefing on: {query}

You MUST return a valid JSON object with EXACTLY this structure (no markdown, no backticks, no text before or after):

{{
  "summary": "A 2-3 sentence executive summary of the topic",
  "macro_impact": {{
    "title": "Macro Impact",
    "content": "2-3 paragraphs analyzing the macroeconomic impact",
    "sources": ["Source Name 1", "Source Name 2"]
  }},
  "sector_winners_losers": {{
    "title": "Sector Winners & Losers",
    "content": "2-3 paragraphs identifying which sectors benefit and which lose",
    "sources": ["Source Name 1"]
  }},
  "market_reaction": {{
    "title": "Market Reaction",
    "content": "2-3 paragraphs on market reactions",
    "sources": ["Source Name 1"]
  }},
  "expert_commentary": {{
    "title": "Expert Commentary",
    "content": "Views from economists and analysts mentioned in articles",
    "sources": ["Source Name 1"]
  }},
  "what_to_watch": {{
    "title": "What to Watch",
    "content": "3-5 forward-looking points to monitor",
    "sources": ["Source Name 1"]
  }}
}}

Articles:
{context}

Return ONLY the JSON object:"""

    briefing = None
    try:
        result = await asyncio.wait_for(ask_llm(prompt), timeout=LLM_TIMEOUT_SECONDS)
        result = result.strip().strip("`").replace("```json", "").replace("```", "").strip()
        parsed = json.loads(result)
        missing = validate_briefing_json(parsed)
        if not missing:
            briefing = json.dumps(parsed)
        else:
            state["errors"].append(f"LLM briefing missing angles: {missing}, using fast briefing")
    except asyncio.TimeoutError:
        state["errors"].append(f"LLM timed out after {LLM_TIMEOUT_SECONDS}s, using fast briefing")
    except json.JSONDecodeError as je:
        state["errors"].append(f"LLM returned invalid JSON: {str(je)}, using fast briefing")
    except Exception as e:
        state["errors"].append(f"LLM error: {str(e)}, using fast briefing")

    # Use LLM result if available, otherwise use fast briefing
    state["briefing"] = briefing if briefing else fast_briefing

    duration_ms = int((time.time() - start) * 1000)
    mode = "llm" if briefing else "fast"
    await log_agent_action(
        agent_name=agent_name,
        task=state["task"],
        status="success",
        input_data={"query": query, "article_count": len(articles), "mode": mode},
        output_data={"briefing_length": len(state["briefing"]), "mode": mode},
        duration_ms=duration_ms,
    )

    state["logs"].append({
        "agent": agent_name,
        "status": "success",
        "message": f"Generated {mode} briefing ({len(state['briefing'])} chars) for: {query}",
    })

    return state
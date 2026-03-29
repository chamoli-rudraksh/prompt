# backend/agents/briefing_agent.py

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

    context = format_articles(articles)

    prompt = f"""You are an expert Indian business journalist writing for Economic Times.
Using ONLY the articles provided, create a comprehensive multi-angle briefing on: {query}

You MUST return a valid JSON object with EXACTLY this structure (no markdown, no backticks, no text before or after):

{{
  "summary": "A 2-3 sentence executive summary of the topic",
  "macro_impact": {{
    "title": "Macro Impact",
    "content": "2-3 paragraphs analyzing the macroeconomic impact — GDP, inflation, fiscal deficit, global positioning",
    "sources": ["Source Name 1", "Source Name 2"]
  }},
  "sector_winners_losers": {{
    "title": "Sector Winners & Losers",
    "content": "2-3 paragraphs identifying which sectors/industries benefit and which lose. Be specific with company names where applicable.",
    "sources": ["Source Name 1"]
  }},
  "market_reaction": {{
    "title": "Market Reaction",
    "content": "2-3 paragraphs on how markets (equity, bonds, forex, commodities) have reacted or are likely to react",
    "sources": ["Source Name 1"]
  }},
  "expert_commentary": {{
    "title": "Expert Commentary",
    "content": "Quotes or paraphrased views from economists, analysts, or industry leaders mentioned in the articles",
    "sources": ["Source Name 1"]
  }},
  "what_to_watch": {{
    "title": "What to Watch",
    "content": "3-5 specific forward-looking points investors and business leaders should monitor",
    "sources": ["Source Name 1"]
  }}
}}

Articles:
{context}

Return ONLY the JSON object:"""

    briefing = None
    for attempt in range(2):
        try:
            result = await ask_llm(prompt)
            # Clean up markdown wrapping if any
            result = result.strip().strip("`").replace("```json", "").replace("```", "").strip()

            parsed = json.loads(result)
            missing = validate_briefing_json(parsed)

            if not missing:
                briefing = json.dumps(parsed)
                break
            else:
                state["errors"].append(
                    f"Briefing JSON missing angles: {missing}, retrying (attempt {attempt+1})"
                )
                prompt = prompt + (
                    f"\n\nIMPORTANT: Your previous response was missing these keys: "
                    f"{missing}. You MUST include ALL 5 angle sections."
                )
        except json.JSONDecodeError as je:
            state["errors"].append(f"{agent_name} JSON parse error attempt {attempt+1}: {str(je)}")
            # On retry, make the instruction even stricter
            prompt = prompt + "\n\nCRITICAL: Return ONLY valid JSON. No text, no markdown."
        except Exception as e:
            state["errors"].append(f"{agent_name} attempt {attempt+1}: {str(e)}")

    # If JSON parsing failed entirely, build a fallback structured response
    if briefing is None:
        try:
            # Try one more time with a simpler structure
            fallback_result = await ask_llm(
                f"Summarize the key points about '{query}' from these articles in 3-4 sentences:\n{context[:2000]}"
            )
            briefing = json.dumps({
                "summary": fallback_result,
                "macro_impact": {"title": "Macro Impact", "content": fallback_result, "sources": []},
                "sector_winners_losers": {"title": "Sector Winners & Losers", "content": "Analysis in progress.", "sources": []},
                "market_reaction": {"title": "Market Reaction", "content": "Analysis in progress.", "sources": []},
                "expert_commentary": {"title": "Expert Commentary", "content": "Analysis in progress.", "sources": []},
                "what_to_watch": {"title": "What to Watch", "content": "Check back for updates.", "sources": []},
            })
        except Exception:
            briefing = json.dumps({
                "summary": f"Briefing generation failed for: {query}",
                "macro_impact": {"title": "Macro Impact", "content": "Generation failed.", "sources": []},
                "sector_winners_losers": {"title": "Sector Winners & Losers", "content": "Generation failed.", "sources": []},
                "market_reaction": {"title": "Market Reaction", "content": "Generation failed.", "sources": []},
                "expert_commentary": {"title": "Expert Commentary", "content": "Generation failed.", "sources": []},
                "what_to_watch": {"title": "What to Watch", "content": "Generation failed.", "sources": []},
            })

    state["briefing"] = briefing

    duration_ms = int((time.time() - start) * 1000)
    await log_agent_action(
        agent_name=agent_name,
        task=state["task"],
        status="success" if briefing else "partial",
        input_data={"query": query, "article_count": len(articles)},
        output_data={"briefing_length": len(state["briefing"]), "retries": state["retry_count"]},
        duration_ms=duration_ms,
    )

    state["logs"].append({
        "agent": agent_name,
        "status": "success" if briefing else "partial",
        "message": f"Generated structured briefing ({len(state['briefing'])} chars) for: {query}",
    })

    return state
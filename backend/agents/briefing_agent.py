# backend/agents/briefing_agent.py

import time
from agents.state import AgentState
from database import log_agent_action
from llm import ask_llm

REQUIRED_SECTIONS = [
    "## Background",
    "## What happened",
    "## Why it matters",
    "## Key players",
    "## What to watch",
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


def validate_briefing(text: str) -> list:
    missing = [s for s in REQUIRED_SECTIONS if s.lower() not in text.lower()]
    return missing


async def briefing_agent(state: AgentState) -> AgentState:
    start = time.time()
    agent_name = "BriefingAgent"
    state["current_agent"] = agent_name

    articles = state.get("relevant_articles", [])
    query = state.get("query", "this topic")

    if not articles:
        state["briefing"] = (
            "No recent articles found on this topic. "
            "Try a different search term or refresh the news feed."
        )
        await log_agent_action(
            agent_name=agent_name,
            task=state["task"],
            status="skipped",
            output_data={"reason": "no articles"},
        )
        return state

    context = format_articles(articles)

    prompt = f"""You are an expert Indian business journalist writing for Economic Times.
Using ONLY the articles provided, write a comprehensive briefing on: {query}

Structure your response with EXACTLY these sections:

## Background
(2-3 sentences of context)

## What happened
(3-5 bullet points, each ending with [Source: publication name])

## Why it matters
(2-3 sentences on significance for Indian businesses and markets)

## Key players
(List main people, companies, institutions involved)

## What to watch next
(2-3 specific forward-looking points)

Articles:
{context}

Write the briefing now:"""

    briefing = None
    for attempt in range(2):
        try:
            result = await ask_llm(prompt)
            missing = validate_briefing(result)

            if not missing:
                briefing = result
                break
            else:
                # Retry with stricter instruction
                state["errors"].append(
                    f"Briefing missing sections: {missing}, retrying (attempt {attempt+1})"
                )
                prompt = prompt + (
                    f"\n\nIMPORTANT: Your previous response was missing these sections: "
                    f"{missing}. You MUST include all 5 sections."
                )
        except Exception as e:
            state["errors"].append(f"{agent_name} attempt {attempt+1}: {str(e)}")

    state["briefing"] = briefing or (
        "Briefing generation failed. Raw context available but could not format. "
        f"Topic: {query}"
    )

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
        "message": f"Generated briefing ({len(state['briefing'])} chars) for: {query}",
    })

    return state
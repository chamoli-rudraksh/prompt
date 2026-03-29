# backend/agents/translation_agent.py
"""
TranslationAgent — Translates and adapts article content into
a 60-second conversational Hindi script for audio synthesis.
Uses Ollama LLM via the shared ask_llm() interface.
"""

import time
from agents.state import AgentState
from database import log_agent_action
from llm import ask_llm


async def translate_to_hindi_script(
    title: str,
    content: str,
    source: str,
) -> str:
    """
    Translate and adapt an article into a conversational Hindi script
    suitable for 60-second audio narration.
    """
    prompt = f"""You are a professional Hindi news anchor for a popular Indian business podcast.

Translate and adapt this English news article into a 60-second conversational Hindi audio script.

RULES:
1. Write in Hindi (Devanagari script).
2. Keep it conversational, like a friendly anchor — NOT a formal news reader.
3. Explain any English financial jargon in simple Hindi equivalents.
4. The script must be 120-150 words (approximately 60 seconds when spoken).
5. Start with a warm greeting like "नमस्ते दोस्तों!" or "आइए जानते हैं आज की खबर।"
6. End with a sign-off like "तो ये थी आज की अहम खबर। बने रहिए हमारे साथ।"
7. Make it culturally adapted — use Indian references, analogies, and context.
8. Do NOT include any English text, stage directions, or square brackets.
9. Return ONLY the Hindi script text. No introduction, no translation notes.

Article Title: {title}
Source: {source}
Content: {content[:1500]}

Hindi Audio Script:"""

    try:
        script = await ask_llm(prompt)
        # Clean up any unwanted formatting
        script = script.strip()
        # Remove markdown or code block formatting if present
        if script.startswith("```"):
            script = script.split("\n", 1)[1] if "\n" in script else script
        if script.endswith("```"):
            script = script.rsplit("```", 1)[0]
        return script.strip()
    except Exception as e:
        raise RuntimeError(f"Hindi translation failed: {str(e)}")


async def translation_agent(state: AgentState) -> AgentState:
    """LangGraph-compatible agent node for Hindi translation."""
    start = time.time()
    agent_name = "TranslationAgent"
    state["current_agent"] = agent_name

    article = state.get("article_data", {})
    title = article.get("title", "")
    content = article.get("content") or article.get("summary", "")
    source = article.get("source", "")

    try:
        script = await translate_to_hindi_script(title, content, source)
        state["hindi_script"] = script

        duration_ms = int((time.time() - start) * 1000)
        await log_agent_action(
            agent_name=agent_name,
            task=state.get("task", "translate"),
            status="success",
            input_data={"title": title[:60], "content_length": len(content)},
            output_data={"script_length": len(script)},
            duration_ms=duration_ms,
        )

        state["logs"].append({
            "agent": agent_name,
            "status": "success",
            "message": f"Generated Hindi script ({len(script)} chars) for: {title[:50]}",
        })

    except Exception as e:
        state["errors"].append(f"{agent_name}: {str(e)}")
        state["hindi_script"] = ""
        await log_agent_action(
            agent_name=agent_name,
            task=state.get("task", "translate"),
            status="failed",
            error=str(e),
        )

    return state

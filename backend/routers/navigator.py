"""
Navigator router — POST /briefing, POST /chat
Agent-based briefings and interactive follow-up chat.
"""

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import (
    BriefingRequest, BriefingResponse, SourceInfo,
    ChatRequest, ChatResponse,
)
from database import (
    create_conversation, get_conversation,
    append_message, get_articles_by_ids,
)
from ingestion import search_articles
from llm import ask_llm, ask_llm_stream, ask_with_fallback
from agents.graph import briefing_graph, make_initial_state

router = APIRouter(tags=["navigator"])
logger = logging.getLogger(__name__)


@router.post("/briefing")
async def create_briefing(req: BriefingRequest):
    """
    Generate a deep AI briefing on any topic using the LangGraph agent pipeline.
    1. RelevanceAgent searches ChromaDB for matching articles
    2. BriefingAgent generates structured briefing via LLM
    """
    try:
        state = make_initial_state(
            task="briefing",
            query=req.topic,
            user_id=req.user_id,
        )
        final_state = await briefing_graph.ainvoke(state)

        # Store in conversation for follow-up chat
        relevant = final_state.get("relevant_articles", [])
        article_ids = [a.get("id", "") for a in relevant]
        conv_id = ""
        if relevant:
            conv_id = await create_conversation(
                user_id=req.user_id,
                topic=req.topic,
                article_ids=article_ids,
            )
            await append_message(conv_id, "assistant", final_state.get("briefing", ""))

        return {
            "conversation_id": conv_id,
            "briefing": final_state.get("briefing", ""),
            "sources": [
                {"title": a["title"], "url": a["url"], "source": a["source"]}
                for a in relevant
            ],
            "agent_logs": final_state.get("logs", []),
            "errors": final_state.get("errors", []),
        }
    except Exception as e:
        logger.error(f"Briefing generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate briefing: {str(e)}")


@router.post("/chat")
async def chat_follow_up(req: ChatRequest):
    """
    Handle follow-up chat questions about a briefing.
    Uses ask_with_fallback for general knowledge support.
    """
    try:
        conversation = await get_conversation(req.conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

        articles = await get_articles_by_ids(conversation["article_ids"])
        additional_articles = await search_articles(req.message, n=5)
        all_context_articles = articles + [
            a for a in additional_articles
            if a["id"] not in {ar.get("id", "") for ar in articles}
        ]

        formatted_articles = _format_articles_for_prompt(all_context_articles)
        await append_message(req.conversation_id, "user", req.message)

        if req.stream:
            history = conversation.get("messages", [])
            history_str = "\n".join(
                f"{m['role'].upper()}: {m['content']}" for m in history[-10:]
            )

            chat_prompt = (
                f"You are an expert Indian business journalist assistant.\n"
                f"Answer the user's question using the provided news context.\n"
                f"If the context does not answer the question, use your general knowledge\n"
                f"but clearly label it as: [General knowledge — not from today's news]\n\n"
                f"Always cite news sources as [Source: publication] when using article content.\n"
                f"Be concise and direct.\n\n"
                f"Previous conversation:\n{history_str}\n\n"
                f"News context:\n{formatted_articles}\n\n"
                f"User question: {req.message}\n\n"
                f"Your answer:"
            )

            async def generate():
                full_response = []
                try:
                    async for chunk in ask_llm_stream(chat_prompt):
                        full_response.append(chunk)
                        yield f"data: {json.dumps({'text': chunk})}\n\n"
                    yield "data: [DONE]\n\n"
                    complete = "".join(full_response)
                    await append_message(req.conversation_id, "assistant", complete)
                except Exception as e:
                    logger.error(f"Streaming error: {e}")
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    yield "data: [DONE]\n\n"

            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
        else:
            response_text = await ask_with_fallback(req.message, formatted_articles)
            await append_message(req.conversation_id, "assistant", response_text)
            sources_used = [
                SourceInfo(title=a["title"], url=a["url"], source=a["source"])
                for a in all_context_articles[:5]
            ]
            return ChatResponse(response=response_text, sources_used=sources_used)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


def _format_articles_for_prompt(articles: list[dict]) -> str:
    parts = []
    for i, a in enumerate(articles, 1):
        content = a.get("content", a.get("summary", ""))
        if len(content) > 800:
            content = content[:800] + "..."
        parts.append(
            f"[Article {i}]\n"
            f"Title: {a.get('title', 'Untitled')}\n"
            f"Source: {a.get('source', 'Unknown')}\n"
            f"Date: {a.get('published_at', 'Unknown')}\n"
            f"Content: {content}\n"
        )
    return "\n---\n".join(parts)